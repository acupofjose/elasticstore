import * as admin from "firebase-admin"
import { CollectionReference } from "@google-cloud/firestore"

export type ElasticSearchFieldType =
  | "text"
  | "keyword"
  | "date"
  | "long"
  | "double"
  | "boolean"
  | "ip"
  | "geo_point"
  | "geo_shape"
  | "completion"

export type FirebaseDocChangeType = "added" | "modified" | "removed"

export type DynamicTypeIndex = (
  snap?: admin.firestore.DocumentSnapshot,
  parentSnap?: admin.firestore.DocumentSnapshot
) => string

export interface ElasticSearchOptions {
  requestTimeout: number
}

export interface Reference {
  collection: string
  subcollection?: string
  index: DynamicTypeIndex | string
  include?: Array<string>
  exclude?: Array<string>
  mappings?: { [key: string]: { type: ElasticSearchFieldType; format?: string; dynamic?: boolean } }
  builder?: (ref: CollectionReference) => admin.firestore.Query
  subBuilder?: (ref: CollectionReference) => admin.firestore.Query
  filter?: (data: admin.firestore.DocumentData) => boolean | null
  transform?: (data: { [key: string]: any }, parentSnap: admin.firestore.DocumentSnapshot) => { [key: string]: any }
  onItemUpserted?: (data: { [key: string]: any }, parentSnap: admin.firestore.DocumentSnapshot) => void | Promise<void>
}
