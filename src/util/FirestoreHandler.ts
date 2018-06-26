import { Record, FirebaseDocChangeType } from "../types";
import { Client } from "elasticsearch";
import * as colors from 'colors'
import * as admin from 'firebase-admin'


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
  private record: Record
  private client: Client
  private unsubscribe: () => void

  constructor(client: Client, record: Record) {
    this.record = record
    this.client = client

    console.log(colors.grey(`
    Begin listening to changes for collection: '${this.record.collection} 
      include: [ ${this.record.include ? this.record.include.join(', ') : ''} ]
      exclude: [ ${this.record.exclude ? this.record.exclude.join(', ') : ''} ]
    `))

    if (this.record.collection instanceof admin.firestore.Query) {
      this.unsubscribe = this.record.collection.onSnapshot(this.handleSnapshot)
    } else {
      this.unsubscribe = admin.firestore().collection(this.record.collection as string).onSnapshot(this.handleSnapshot)
    }
  }

  private handleSnapshot = (snap: admin.firestore.QuerySnapshot) => {
    for (const change of snap.docChanges) {
      const type: FirebaseDocChangeType = change.type
      switch (type) {
        case "added":
          this.handleAdded(change.doc)
          break;
        case "modified":
          this.handleModified(change.doc)
          break;
        case "removed":
          this.handleRemoved(change.doc)
          break;
      }
    }
  }

  private handleAdded = async (doc: admin.firestore.DocumentSnapshot) => {
    let body: any = this.filter(doc.data())

    // Filtering has excluded this record
    if (!body) return
    
    try {
      const exists = await this.client.exists({ id: doc.id, index: this.record.index, type: this.record.type })
      if (exists) {
        await this.client.update({ id: doc.id, index: this.record.index, type: this.record.type, body: { doc: body } })
      } else {
        await this.client.index({ id: doc.id, index: this.record.index, type: this.record.type, body: body })
      }
    } catch (e) {
      console.error(`Error on FS_ADDED handler [doc@${doc.id}]: ${e.message}`)
    }
  }

  private handleModified = async (doc: admin.firestore.DocumentSnapshot) => {
    const body = this.filter(doc.data())

    // Filtering has excluded this record
    if (!body) return
    
    try {
      await this.client.update({ id: doc.id, index: this.record.index, type: this.record.type, body: { doc: body } })
    } catch (e) {
      console.error(`Error on FS_MODIFIED handler [doc@${doc.id}]: ${e.message}`)
    }
  }

  private handleRemoved = async (doc: admin.firestore.DocumentSnapshot) => {
    try {
      await this.client.delete({ id: doc.id, index: this.record.index, type: this.record.type })
    } catch (e) {
      console.error(`Error on FS_REMOVE handler [doc@${doc.id}]: ${e.message}`)
    }
  }

  private filter = (data: any) => {
    let shouldInsert = true
    if (this.record.filter) {
      shouldInsert = this.record.filter.apply(this, data)
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