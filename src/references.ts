import { Reference } from "./types";

// Records should be added here to be indexed / made searchable
const references: Array<Reference> = [
  {
    collection: 'dioceses',
    type: 'dioceses',
    index: 'dioceses',
    include: ['name', 'organizationId', 'primaryGroupId']
  },
  {
    collection: 'groups',
    type: 'groups',
    index: 'groups',
    include: ['name', 'location', 'profile'],
    mappings: {
      geopoint: {
        type: 'geo_point'
      }
    },
    transform: (doc) => ({
      ...doc.location,
      ...doc.profile,
      geopoint: `${doc.location.geopoint._latitude},${doc.location.geopoint._longitude}`
    }),
  },
  {
    collection: 'prayers',
    type: 'prayers',
    index: 'prayers',
    include: ['message']
  },
  {
    collection: 'users',
    type: 'users',
    index: 'users',
    include: ['firstName', 'lastName', 'email'],
  }
]

export default references