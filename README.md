# Elasticsearch + CloudFirestore = Elasticstore

A pluggable integration with ElasticSearch to provide advanced content searches in Firestore.

This script can:

- monitor multiple firestore collections and add/modify/remove indexed elasticsearch data in real time
- communicates with client completely via Firebase (no elasticsearch client required, though a query builder is recommended)
- clean up old, outdated requests (WIP)

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
