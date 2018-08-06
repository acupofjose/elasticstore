import * as admin from 'firebase-admin'
import { CollectionReference, Query } from '@google-cloud/firestore';

export type FirebaseDocChangeType = "added" | "modified" | "removed"
export type DynamicTypeIndex = (snap?: admin.firestore.DocumentSnapshot, parentSnap?: admin.firestore.DocumentSnapshot) => string

export interface ElasticSearchOptions {
  requestTimeout: number
  maxSockets: number
  log: string
}

export interface Reference {
  collection: string
  subcollection?: string
  index: DynamicTypeIndex | string
  type: DynamicTypeIndex | string
  include?: Array<string>
  exclude?: Array<string>
  builder?: (ref: CollectionReference) => admin.firestore.Query
  subBuilder?: (ref: CollectionReference) => admin.firestore.Query
  filter?: (data: admin.firestore.DocumentData) => boolean | null
  transform?: (data: {[key: string]: any}, parentSnap: admin.firestore.DocumentSnapshot ) => { [key: string]: any }
}