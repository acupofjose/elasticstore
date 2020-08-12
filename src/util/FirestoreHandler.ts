import { Reference, FirebaseDocChangeType, DynamicTypeIndex } from "../types"
import { Client } from "@elastic/elasticsearch"
import * as colors from "colors"
import * as admin from "firebase-admin"
import Queuer from "./Queuer"

/**
 * FirestoreCollectionHandler
 * This acts as the "state-keeper" between firestore and elasticsearch.
 *
 * A collection's children are watched for event changes and their corresponding
 * elasticsearch records are updated.
 *
 * Firestore fires the onSnapshot listener for *EVERY* document on bind.
 * THIS IS EXPENSIVE.
 */
export default class FirestoreCollectionHandler {
  private reference: Reference
  private client: Client
  private ref: admin.firestore.Query
  private listeners: { [key: string]: any }

  constructor(client: Client, reference: Reference) {
    this.listeners = {}
    this.reference = reference
    this.client = client

    this.ref = admin.firestore().collection(this.reference.collection)

    // Build new root query (add where clauses, etc.)
    if (this.reference.builder) {
      this.ref = this.reference.builder.call(this, this.ref)
    }

    this.bind()
  }

  private bind = async () => {
    // Custom Mappings

    if (this.reference.subcollection) {
      // Building a subcollection requires getting documents first
      this.ref.onSnapshot(this.handleBindingSubcollection)
    } else {
      console.log(
        colors.grey(`
      Begin listening to changes for collection: ${this.reference.collection}
        include: [ ${this.reference.include ? this.reference.include.join(", ") : ""} ]
        exclude: [ ${this.reference.exclude ? this.reference.exclude.join(", ") : ""} ]
      `)
      )
      this.ref.onSnapshot(this.handleSnapshot())
    }
  }

  private ensureIndex = async (index: string) => {
    if (this.reference.mappings) {
      const exists = await this.client.indices.exists({ index })
      if (!exists.body) {
        await this.client.indices.create({ index })
        await this.client.indices.putMapping({
          index,
          body: {
            dynamic: false,
            properties: this.reference.mappings,
          },
        })
      }
    } else {
      const exists = await this.client.indices.exists({ index })
      if (!exists.body) {
        await this.client.indices.create({ index })
      }
    }
  }

  private handleBindingSubcollection = async (snap: admin.firestore.QuerySnapshot) => {
    for (const change of snap.docChanges()) {
      const changeType: FirebaseDocChangeType = change.type
      if (changeType === "added") {
        let subref = admin
          .firestore()
          .collection(`${this.reference.collection}/${change.doc.id}/${this.reference.subcollection}`)

        // Build a subquery for each subcollection reference
        if (this.reference.subBuilder) {
          subref = this.reference.subBuilder.call(this, subref)
        }

        console.log(
          colors.grey(`
        Begin listening to changes for collection: ${this.reference.collection}
          documentId: ${change.doc.id}
          subcollection: ${this.reference.subcollection}
          include: [ ${this.reference.include ? this.reference.include.join(", ") : ""} ]
          exclude: [ ${this.reference.exclude ? this.reference.exclude.join(", ") : ""} ]
        `)
        )

        // Keep track of listeners as the parent document could be removed and leave us with a dangling listener
        this.listeners[change.doc.id] = subref.onSnapshot(this.handleSnapshot(change.doc))
      } else if (changeType === "removed") {
        if (this.listeners[change.doc.id]) {
          this.listeners[change.doc.id].call()
        }
      }
    }
  }

  private handleSnapshot = (parentSnap?: admin.firestore.DocumentSnapshot) => {
    return async (snap: admin.firestore.QuerySnapshot) => {
      for (const change of snap.docChanges()) {
        const changeType: FirebaseDocChangeType = change.type

        const index =
          typeof this.reference.index === "function"
            ? this.reference.index.call(this, change.doc, parentSnap)
            : this.reference.index

        await this.ensureIndex(index)

        switch (changeType) {
          case "added":
            this.handleAdded(change.doc, parentSnap, index)
            break
          case "modified":
            this.handleModified(change.doc, parentSnap, index)
            break
          case "removed":
            this.handleRemoved(change.doc, index)
            break
        }
      }
    }
  }

  private handleAdded = async (
    doc: admin.firestore.DocumentSnapshot,
    parentSnap: admin.firestore.DocumentSnapshot,
    index: string
  ) => {
    let body: any = FirestoreCollectionHandler.filter(this.reference, doc.data())

    // Filtering has excluded this record
    if (!body) return

    if (this.reference.transform) {
      body = this.reference.transform.call(this, body, parentSnap)
    }

    try {
      const exists = await Queuer.process(this.client.exists.bind(this, { id: doc.id, index }))
      if (exists) {
        // retryOnConflict added in reference to https://github.com/acupofjose/elasticstore/issues/2
        await Queuer.process(
          this.client.update.bind(this, {
            id: doc.id,
            index,
            body: { doc: body, doc_as_upsert: true },
            retry_on_conflict: 2,
          })
        )

        if (this.reference.onItemUpserted) {
          await this.reference.onItemUpserted.call(this, body, doc)
        }
      } else {
        await Queuer.process(this.client.index.bind(this, { id: doc.id, index, body: body }))

        if (this.reference.onItemUpserted) {
          await this.reference.onItemUpserted.call(this, body, doc)
        }
      }
      console.log(`Added [doc@${doc.id}]`)
    } catch (e) {
      console.error(`Error in \`FS_ADDED\` handler [doc@${doc.id}]: ${e.message}`)
      console.error(e)
    }
  }

  private handleModified = async (
    doc: admin.firestore.DocumentSnapshot,
    parentSnap: admin.firestore.DocumentSnapshot,
    index: string
  ) => {
    let body = FirestoreCollectionHandler.filter(this.reference, doc.data())

    // Filtering has excluded this record
    if (!body) return

    if (this.reference.transform) {
      body = this.reference.transform.call(this, body, doc)
    }

    try {
      // retryOnConflict added in reference to https://github.com/acupajoe/elasticstore/issues/2
      await Queuer.process(
        this.client.update.bind(this, {
          id: doc.id,
          index,
          body: { doc: body },
          retry_on_conflict: 2,
        })
      )

      if (this.reference.onItemUpserted) {
        await this.reference.onItemUpserted.call(this, body, doc)
      }
      console.log(`Updated [doc@${doc.id}]`)
    } catch (e) {
      console.error(`Error in \`FS_MODIFIED\` handler [doc@${doc.id}]: ${e.message}`)
      console.error(e)
    }
  }

  private handleRemoved = async (doc: admin.firestore.DocumentSnapshot, index: string) => {
    try {
      await Queuer.process(this.client.delete.bind(this, { id: doc.id, index }))
      console.log(`Removed [doc@${doc.id}]`)
    } catch (e) {
      console.error(`Error in \`FS_REMOVE\` handler [doc@${doc.id}]: ${e.message}`)
      console.error(e)
    }
  }

  static filter = (reference: Reference, data: any) => {
    let shouldInsert = true
    if (reference.filter) {
      shouldInsert = reference.filter.call(null, data)
    }

    if (!shouldInsert) {
      return null
    }

    if (reference.include) {
      for (const key of Object.keys(data)) {
        if (reference.include.indexOf(key) === -1) {
          delete data[key]
        }
      }
    }

    if (reference.exclude) {
      for (const key of reference.exclude) {
        if (data[key]) {
          delete data[key]
        }
      }
    }

    return data
  }
}
