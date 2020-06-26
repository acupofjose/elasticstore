import Config from "./config"
import * as elasticsearch from "@elastic/elasticsearch"
import * as colors from "colors"
import * as admin from "firebase-admin"
import Worker from "./util/Worker"

export default class Elasticstore {
  private esClient: elasticsearch.Client
  private retryTimer: NodeJS.Timer
  private retryInterval: number = 5000

  init = async () => {
    await this.initElasticsearch()
    this.initFirebase()
    this.initWorker()
  }

  initElasticsearch = async () => {
    return new Promise((resolve, reject) => {
      this.esClient = new elasticsearch.Client({
        node: `${Config.ES_PROTOCOL}://${Config.ES_HOST}:${Config.ES_PORT}`,
        auth: {
          username: Config.ES_USER,
          password: Config.ES_PASS,
        },
        requestTimeout: Config.ES_OPTS.requestTimeout,
      })

      console.log(colors.grey("Connecting to ElasticSearch host %s:%s"), Config.ES_HOST, Config.ES_PORT)
      let retries = 0
      this.retryTimer = setInterval(async () => {
        try {
          await this.ping()
          console.log(colors.green("Connected to ElasticSearch host %s:%s"), Config.ES_HOST, Config.ES_PORT)
          clearInterval(this.retryTimer)
          resolve()
        } catch (e) {
          console.log(colors.red("Failed to connect to ElasticSearch host %s:%s"), Config.ES_HOST, Config.ES_PORT)
          console.log(colors.yellow("Retrying in %sms"), this.retryInterval)
          retries++
        }
      }, this.retryInterval)
    })
  }

  ping = () => {
    return new Promise((resolve, reject) => {
      this.esClient.ping((err, result) => {
        if (err) return reject(err)
        else return resolve(result)
      })
    })
  }

  initFirebase = () => {
    console.log(colors.grey("Connecting to Firebase %s"), Config.FB_URL)
    try {
      // Initialize firebase
      admin.initializeApp({
        credential: admin.credential.cert(
          Config.FB_SERVICE_ACCOUNT ? JSON.parse(Config.FB_SERVICE_ACCOUNT) : Config.FB_SERVICE_PATH
        ),
        databaseURL: Config.FB_URL,
      })
    } catch (e) {
      console.log(colors.red(e.message))
    }
  }

  initWorker = () => Worker.register(this.esClient)
}
