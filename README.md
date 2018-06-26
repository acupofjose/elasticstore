# Elasticsearch + CloudFirestore = Elasticstore

A pluggable integration with ElasticSearch to provide advanced content searches in Firestore.

This script can:

- monitor multiple firestore collections and add/modify/remove indexed elasticsearch data in real time
- communicates with client completely via Firebase (no elasticsearch client required, though a query builder is recommended)
- clean up old, outdated requests (WIP)

Heavily Inspired by the Realtime Database implementation (Flashlight) by the [Firebase Team](https://github.com/firebase/flashlight)


## Getting Started:

- Install and run [Elasticsearch](https://www.elastic.co/) 
- `git clone https://github.com/acupajoe/elasticstore`
- `npm install`
- Edit `.env` with variables
- Edit `src/config.ts` 
- `npm run start`


## Documentation:

### How do I define a reference?

| Parameter   | Type            | Return          | Description |
|-----------  |-------          |-----------------|-------------|
|`collection` |`string`         | n/a             | Represents a single collection in firestore |
|`type`       |`string`         | n/a             | Used by elasticsearch, type these records will be placed under |
|`index`      |`string`         | n/a             | Used by elasticsearch, index records will be placed under |
|`include`    |`Array<string>`  | n/a             | Fields from firestore to be included in records passed to elasticsearch`|
|`exclude`    |`Array<string>`  | n/a             | Fields from firestore to be excluded in records passed to elasticsearch`|
|`builder`    |`function`       | query           | Builds the collection query that firestore will bind to and insert records to elasticsearch from|
|`filter`     |`function`       | boolean         | Run on an individual firestore record, if it returns false, the record will not be inserted|
|`transform`  |`function`       | object          | Transform data recieved from firestore to an object passed along to elasticsearch|
