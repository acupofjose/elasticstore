import * as admin from 'firebase-admin'
import { CollectionReference, Query } from '@google-cloud/firestore';

export type FirebaseDocChangeType = "added" | "modified" | "removed"

export interface ElasticSearchOptions {
  requestTimeout: number
  maxSockets: number
  log: string
}

export interface Record {
  collection: string
  type: string
  index: string // "firestore"
  include?: Array<string>
  exclude?: Array<string>
  builder?: (ref: CollectionReference) => admin.firestore.Query
  filter?: (data: { [key: string]: any }) => boolean | null
  transform?: (data: admin.firestore.DocumentData) => { [key: string]: any }
}