import * as admin from 'firebase-admin'

export type FirebaseDocChangeType = "added" | "modified" | "removed"

export interface Record {
  collection: string | admin.firestore.Query
  type: string
  index: string // "firestore"
  include?: Array<string>
  exclude?: Array<string>
  filter?: (data: { [key: string]: any }) => boolean | null
}