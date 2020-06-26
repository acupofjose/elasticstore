import Config from "../config"
import { Client } from "@elastic/elasticsearch"
import FirestoreCollectionHandler from "./FirestoreHandler"
import { SearchHandler } from "./SearchHandler"

export default class Worker {
  static register(client: Client) {
    const firestoreHandlers: Array<FirestoreCollectionHandler> = []
    for (const record of Config.references) {
      firestoreHandlers.push(new FirestoreCollectionHandler(client, record))
    }
    new SearchHandler(client)
  }
}
