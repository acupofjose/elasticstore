import Config from '../config'
import { Client } from 'elasticsearch'
import FirestoreCollectionHandler from './FirestoreHandler';
import { SearchHandler } from './SearchHandler';

export default class Worker {
  static register(client: Client) {
    const firestoreHandlers: Array<FirestoreCollectionHandler> = []
    for (const record of Config.records) {
      firestoreHandlers.push(new FirestoreCollectionHandler(client, record))
    }
    new SearchHandler(client)
  }
}