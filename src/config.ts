import * as path from "path"
import * as dotenv from "dotenv"
import { Reference, ElasticSearchOptions } from "./types"
import References from "./references"

const envPath = path.resolve(__dirname, "..", ".env")
dotenv.config({ path: envPath })

class Config {
  public FB_URL: string = process.env.FB_URL
  public FB_ES_COLLECTION: string = process.env.FB_ES_COLLECTION
  public FB_REQ: string = process.env.FB_REQ
  public FB_RES: string = process.env.FB_RES
  public FB_SERVICE_PATH: string = process.env.FB_SERVICE_PATH
  public FB_SERVICE_ACCOUNT: string = process.env.FB_SERVICE_ACCOUNT
  public ES_HOST: string = process.env.ES_HOST || "localhost"
  public ES_PORT: string = process.env.ES_PORT || "9200"
  public ES_USER: string = process.env.ES_USER || null
  public ES_PASS: string = process.env.ES_PASS || null
  public ES_PROTOCOL: string = process.env.ES_PROTOCOL || "http"
  public QUEUE_CONCURRENT: number = process.env.QUEUE_CONCURRENT ? parseInt(process.env.QUEUE_CONCURRENT) : 5
  public QUEUE_DELAY: number = process.env.QUEUE_DELAY ? parseInt(process.env.QUEUE_DELAY) : 125 //ms
  public ES_OPTS: ElasticSearchOptions = {
    requestTimeout: 60000,
  }
  public CLEANUP_INTERVAL: number =
    process.env.NODE_ENV === "production" ? 3600 * 1000 /* once an hour */ : 60 * 1000 /* once a minute */
  references: Array<Reference> = References
}

export default new Config()
