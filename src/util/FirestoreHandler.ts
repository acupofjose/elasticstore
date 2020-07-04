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
  private record: Reference
  private client: Client
  private ref: admin.firestore.Query
  private listeners: { [key: string]: any }

  constructor(client: Client, record: Reference) {
    this.listeners = {}
    this.record = record
    this.client = client

    this.ref = admin.firestore().collection(this.record.collection)

    // Build new root query (add where clauses, etc.)
    if (this.record.builder) {
      this.ref = this.record.builder.call(this, this.ref)
    }

    this.bind()
  }

  private bind = async () => {
    // Custom Mappings
    const index: string = this.record.index.toString()

    if (this.record.mappings) {
      const exists = await this.client.indices.exists({ index })
      if (!exists) {
        await this.client.indices.create({ index })
        await this.client.indices.putMapping({
          index,
          include_type_name: true,
          body: {
            properties: this.record.mappings,
          },
        })
      }
    } else {
      const exists = await this.client.indices.exists({ index })
      if (!exists) {
        await this.client.indices.create({ index })
      }
    }

    if (this.record.subcollection) {
      // Building a subcollection requires getting documents first
      this.ref.onSnapshot(this.handleBindingSubcollection)
    } else {
      console.log(
        colors.grey(`
      Begin listening to changes for collection: ${this.record.collection}
        include: [ ${this.record.include ? this.record.include.join(", ") : ""} ]
        exclude: [ ${this.record.exclude ? this.record.exclude.join(", ") : ""} ]
      `)
      )
      this.ref.onSnapshot(this.handleSnapshot())
    }
  }

  private handleBindingSubcollection = async (snap: admin.firestore.QuerySnapshot) => {
    for (const change of snap.docChanges()) {
      const changeType: FirebaseDocChangeType = change.type
      if (changeType === "added") {
        let subref = admin
          .firestore()
          .collection(`${this.record.collection}/${change.doc.id}/${this.record.subcollection}`)

        // Build a subquery for each subcollection reference
        if (this.record.subBuilder) {
          subref = this.record.subBuilder.call(this, subref)
        }

        console.log(
          colors.grey(`
        Begin listening to changes for collection: ${this.record.collection}
          documentId: ${change.doc.id}
          subcollection: ${this.record.subcollection}
          include: [ ${this.record.include ? this.record.include.join(", ") : ""} ]
          exclude: [ ${this.record.exclude ? this.record.exclude.join(", ") : ""} ]
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
    return (snap: admin.firestore.QuerySnapshot) => {
      for (const change of snap.docChanges()) {
        const changeType: FirebaseDocChangeType = change.type

        const index =
          typeof this.record.index === "function" ? this.record.index.call(this, snap, parentSnap) : this.record.index

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
    let body: any = this.filter(doc.data())

    // Filtering has excluded this record
    if (!body) return

    if (this.record.transform) {
      body = this.record.transform.call(this, body, parentSnap)
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

        if (this.record.onItemUpserted) {
          await this.record.onItemUpserted.call(this, body, doc)
        }
      } else {
        await Queuer.process(this.client.index.bind(this, { id: doc.id, index, body: body }))

        if (this.record.onItemUpserted) {
          await this.record.onItemUpserted.call(this, body, doc)
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
    let body = this.filter(doc.data())

    // Filtering has excluded this record
    if (!body) return

    if (this.record.transform) {
      body = this.record.transform.call(this, body, doc)
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

      if (this.record.onItemUpserted) {
        await this.record.onItemUpserted.call(this, body, doc)
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

  private filter = (data: any) => {
    let shouldInsert = true
    if (this.record.filter) {
      shouldInsert = this.record.filter.call(this, data)
    }

    if (!shouldInsert) {
      return null
    }

    if (this.record.include) {
      for (const key of Object.keys(data)) {
        if (this.record.include.indexOf(key) === -1) {
          delete data[key]
        }
      }
    }

    if (this.record.exclude) {
      for (const key of this.record.exclude) {
        if (data[key]) {
          delete data[key]
        }
      }
    }

    return data
  }
}
