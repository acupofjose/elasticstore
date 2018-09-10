import { Reference } from "./types";

// Set a reference to 3 days ago for updatedAt Queries
const date = new Date()
date.setDate(date.getDate() - 3)

// Records should be added here to be indexed / made searchable
const references: Array<Reference> = [
  {
    collection: 'dioceses',
    type: 'dioceses',
    index: 'dioceses',
    include: ['name', 'organizationId', 'primaryGroupId'],
    builder: (ref) => ref.where('updatedAt', '>=', date)
  },
  {
    collection: 'groups',
    type: 'groups',
    index: 'groups',
    mappings: {
      geopoint: {
        type: 'geo_point'
      }
    },
    transform: (doc) => ({
      ...doc,
      geopoint: `${doc.location.geopoint._latitude},${doc.location.geopoint._longitude}`
    }),
    builder: (ref) => ref.where('updatedAt', '>=', date)
  },
  {
    collection: 'prayers',
    type: 'prayers',
    index: 'prayers',
  },
  {
    collection: 'users',
    type: 'users',
    index: 'users',
    include: ['firstName', 'lastName', 'email'],
    builder: (ref) => ref.where('updatedAt', '>=', date)
  }
]

export default references