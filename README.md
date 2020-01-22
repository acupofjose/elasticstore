# Elasticsearch + CloudFirestore = Elasticstore
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
[![Travisci <](https://travis-ci.com/acupajoe/elasticstore.svg?branch=master)](https://travis-ci.com/acupajoe/elasticstore)

A pluggable integration with ElasticSearch to provide advanced content searches in Firestore.

This script can:

- monitor multiple firestore `collections` and `subcollections` and add/modify/remove indexed elasticsearch data in real time
- `transform`, `filter`, `include`, `exclude` and `mapping` functionality for each document 
- communicates with client completely via Firebase (no elasticsearch client required, though a query builder is recommended)
- clean up outdated requests

Heavily Inspired by the Realtime Database implementation (Flashlight) by the [Firebase Team](https://github.com/firebase/flashlight)


## Getting Started:

- Install and run [Elasticsearch](https://www.elastic.co/) either locally or with a service
- `git clone https://github.com/acupajoe/elasticstore`
- `npm install`
- Supply `.env` with variables OR define them in your environment (see supplied `.env.sample`)
- Edit `src/references.ts` to include your configuration (see below)
- `npm run start`


## Documentation:

### How do I define a reference?

| Option          | Type                 | Parameters                                                                     | Return                                      | Description |
|-----------      |-------               |-----------                                                                     |-----------------                            |-------------|
|`collection`     |`string`              | n/a                                                                            | n/a                                         | Represents a single collection in firestore |
|`subcollection`  |`string`              | n/a                                                                            | n/a                                         | Represents a single subcollection of a document in firestore |
|`index`          |`string` or `function`| snap:`Firestore.DocumentSnapshot`, parentSnap:`Firestore.DocumentSnapshot`     | `string`        | Used by elasticsearch, `index` records will be placed under |
|`type`           |`string` or `function`| snap:`Firestore.DocumentSnapshot`, parentSnap:`Firestore.DocumentSnapshot`     | `string`        | Used by elasticsearch, `type` these records will be placed under |
|`mappings`       |`object`               | n/a                                                                           | n/a             | Used by elasticsearch, this should be an object containing {`fieldName`: {`type`: `ELASTICSEARCH_FIELD_TYPE`}}  |
|`include`        |`Array<string>`       | n/a                                                                            | `string[]`                                  | Fields from firestore to be included in records passed to elasticsearch`|
|`exclude`        |`Array<string>`       | n/a                                                                            | `string[]`                                  | Fields from firestore to be excluded in records passed to elasticsearch`|
|`builder`        |`function`            | `Firestore.CollectionReference`                                                | query                                       | Builds the collection query that firestore will bind to and insert records to elasticsearch from|
|`subBuilder`     |`function`            | `Firestore.CollectionReference`                                                | query                                       | Builds the subcollection query that firestore will bind to and insert records to elasticsearch from|
|`filter`         |`function`            | `Firestore.DocumentData`                                                       | boolean                                     | Run on an individual firestore record, if it returns false, the record will not be inserted|
|`transform`      |`function`            | data: `{[key: string]: any}`, parentSnap:`Firestore.DocumentSnapshot`          | object                                      | Transform data recieved from firestore to an object passed along to elasticsearch (run after filtering) |


So for instance, maybe I want to index a collection called `groups` that does a `tranform`ation on the data received from firestore, and maps a firestore `geopoint` to an elasticsearch `geo_point`
```
// firestore (in the console)
groups: {
  12341235: {
    title: "Group Name",                  // string
    description: "I'm a group",           // string
    location: "32,-74"                    // geo_point
    createdAt: "9/4/2018 00:00:00 GMT-0"  // date
  }
}

// references (in ./src/references.ts)
{
  ....
  {
    collection: "groups",
    index: "groups",
    type: "groups",
    mappings: {
      location: {
        type: "geo_point" // elasticsearch's definition of a geopoint
      }
    },
    transform: (data, parent) => ({
      ...data,
      location: `${data.location._latitude},${data.location._longitude}` // transform from firestore's geopoint to elasticsearch's
    })
  },
  ....
}
```

## Subcollections
When this repo was first made, Firestore had some limitations on how collections worked. You could have a root collection and every root Collection could have a Subcollection. Subcollections could not _not_ have Subcollections.

This repo supports the use of subcollections with the note that **this is expensive**. Why? Because when Firestore returns a Collection Query it does not return the Subcollection's data, meaning, to listen to changes on a Subcollection requires a listener **per Subcollection instance**.

Have a need for a Subcollection from 400 Collection instances? That's 400 listeners. AFAIK there's not a better way to do this given Firebase's current API.

So with those caveats, the repo allows you to specify some ways to narrow how many listeners you register by narrowing your queries.

**For Example**
```
// Firestore Data Model
{
  // Collection
  "users" : { 
      "UUID-1" : {
            email: "romeo@example.com",
            isPremium: true,
            // Subcollection
            "profile": { 
                 "firstName": "Romeo",
                  "public": false
                  ....
             } 
      } 
      "UUID-2" : {
            email: "juliet@example.com",
            isPremium: false,
            // Subcollection
            "profile": { 
                  "firstName": "Juliet"
                  "public": true,
                  ...
             } 
      } 
}
```

To listen to the `profile` Subcollection on `user` where the `profile` is public , you'd create a reference like this:
```
{
  collection: "users",
  subcollection: "profile",
  index: "user-profiles",
  type: "user-profiles",
  subBuilder: (ref) => ref.where('public', '==', true)
}
```

Or only `profile`s where the user `isPremium` and public (note that the index and type are changed, but that the change is arbitrary):
```
{
  collection: "users",
  subcollection: "profile",
  index: "user-premium-profiles",
  type: "user-premium-profiles",
  builder: (ref) => ref.where('isPremium', '==', false),
  subBuilder: (ref) => ref.where('public', '==', true)
}
```

# Making Searches (Client Side)

Elasticstore will listen to the `search/` root collection for a new document containing a `request` object key and a `null` `response` object key. Upon finding a request that is 'unfulfilled' (a `null` response). 

<small>* Note that these keys are defined in the `.env` file</small>

*Requests should be formed as new documents in the search collection.*

Assuming you're using the node.js Firebase SDK, making an Elasticsearch request through Firebase would look something like this:

```
const result = await firebase.firestore().collection('search').add({
  request: {
    index: 'users',
    type: 'users',
    q: 'John' // Shorthand query syntax
  },
  response: null
})
result.ref.onSnapshot(doc => {
  if (doc.response !== null) {
    // Do things
  }
})
```

Or with the normally expected Elasticsearch syntax body:
```
const result = await firebase.firestore().collection('search').add({
  request: {
    index: 'users',
    type: 'users',
    body: {
      query: {
         match: {
            "_all": "John"
         }
      }
  },
  response: null
})
result.ref.onSnapshot(doc => {
  if (doc.response !== null) {
    // Do things
  }
})
```

# Restrictions / Caveats

Be aware that on large `collection`s, this will need some tuning. Upon starting (and restarting) *ALL* data is re-indexed unless you choose to filter it yourself. This is a *VERY* expensive operation, as you will have to perform reads on every document you have in your `collection`.

When dealing with subcollections, a listener is added for each `collection` which then adds a listener to the specified `subcollection`. If you don't filter these, you may end up with a large number of listeners for data that doesn't get changed very often.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/ruslanpetrov"><img src="https://avatars1.githubusercontent.com/u/12451298?v=4" width="100px;" alt=""/><br /><sub><b>Ruslan Petrov</b></sub></a><br /><a href="https://github.com/acupajoe/elasticstore/commits?author=ruslanpetrov" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
