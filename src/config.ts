import * as path from 'path'
import * as dotenv from 'dotenv'
import { Record } from './types';

const envPath = path.resolve(__dirname, '..', '.env')
dotenv.config({ path: envPath })

export interface ElasticSearchOptions {
  requestTimeout: number
  maxSockets: number
  log: string
}

function processBonsaiUrl(url: string) {
  var matches = url.match(/^https?:\/\/([^:]+):([^@]+)@([^/]+)\/?$/)
  process.env.ES_HOST = matches[3]
  process.env.ES_PORT = "80"
  process.env.ES_USER = matches[1]
  process.env.ES_PASS = matches[2]
}

if (process.env.BONSAI_URL) {
  processBonsaiUrl(process.env.BONSAI_URL)
}

// Records should be added here to be indexed / made searchable
const records: Array<Record> = [
  {
    collection: 'users',
    type: 'users',
    index: 'firestore',
    include: ['firstName', 'lastName', 'email']
  }
]

class Config {
  public FB_URL: string = process.env.FB_URL
  public FB_ES_COLLECTION: string = process.env.FB_ES_COLLECTION
  public FB_REQ: string = process.env.FB_REQ
  public FB_RES: string = process.env.FB_RES
  public FB_SERVICE_ACCOUNT: string = process.env.FB_ACC
  public ES_HOST: string = process.env.ES_HOST || 'localhost'
  public ES_PORT: string = process.env.ES_PORT || '9200'
  public ES_USER: string = process.env.ES_USER || null
  public ES_PASS: string = process.env.ES_PASS || null
  public ES_OPTS: ElasticSearchOptions = {
    requestTimeout: 60000,
    maxSockets: 100,
    log: 'error'
  }
  public CLEANUP_INTERVAL: number = process.env.NODE_ENV === 'production' ? 3600 * 1000 /* once an hour */ : 60 * 1000 /* once a minute */
  records: Array<Record> = records
}

export default new Config()