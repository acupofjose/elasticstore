import Config from "../config"
import { Client } from "@elastic/elasticsearch"
import FirestoreCollectionHandler from "./FirestoreHandler"
import { SearchHandler } from "./SearchHandler"

export default class Worker {
  static register(client: Client) {
    const firestoreHandlers: Array<FirestoreCollectionHandler> = []

    // Delay added in regard to: https://github.com/acupofjose/elasticstore/issues/32
    let count = 0
    let delay = 5000
    for (const record of Config.references) {
      setTimeout(() => {
        firestoreHandlers.push(new FirestoreCollectionHandler(client, record))
      }, delay * count++)
    }

    new SearchHandler(client)
  }
}
