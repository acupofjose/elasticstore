import { Reference } from "./types";

// Records should be added here to be indexed / made searchable
const references: Array<Reference> = [
  {
    collection: 'chats',
    subcollection: 'posts',
    index: 'chat-posts',
    type: 'chat-posts',
    transform: (data, parentSnap) => ({...data, chatId: parentSnap.id}),
    include: ['userId', 'userName', 'content', 'type', 'createdAt', 'updatedAt']
  },
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
    transform: (doc) => ({
      ...doc.location,
      ...doc.profile,
      geohash: `${doc.location.geopoint._latitude},${doc.location.geopoint._longitude}`
    }),
    builder: (ref) => ref.limit(100)
  },
  {
    collection: 'organizations',
    type: 'organizations',
    index: 'organizations',
    include: ['name', 'location', 'profile'],
    builder: (ref) => ref.limit(100)
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