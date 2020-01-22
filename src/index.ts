import Config from './config'
import * as elasticsearch from 'elasticsearch'
import * as colors from 'colors'
import * as admin from 'firebase-admin'
import Worker from './util/Worker';

// Create Elasticsearch Client
const elasticsearchClient = new elasticsearch.Client({
  hosts: [{
    host: Config.ES_HOST,
    port: Config.ES_PORT,
    auth: (Config.ES_USER && Config.ES_PASS) ? Config.ES_USER + ':' + Config.ES_PASS : null,
    protocol: Config.ES_PROTOCOL,
  }],
  requestTimeout: Config.ES_OPTS.requestTimeout,
  maxSockets: Config.ES_OPTS.maxSockets,
  log: Config.ES_OPTS.log
})

console.log(colors.grey('Connecting to ElasticSearch host %s:%s'), Config.ES_HOST, Config.ES_PORT);

// Verify we are connected to Elasticsearch before continuing
const retryInterval = 5000;
const timeout = setInterval(async () => {
  try {
    await elasticsearchClient.ping(null)
    console.log(colors.green('Connected to ElasticSearch host %s:%s'), Config.ES_HOST, Config.ES_PORT);
    clearInterval(timeout)
    elasticstore();
  } catch (e) {
    console.log(colors.red('Failed to connect to ElasticSearch host %s:%s'), Config.ES_HOST, Config.ES_PORT)
    console.log(colors.yellow('Retrying in... %sms'), retryInterval)
  }
}, retryInterval)


// This is the bread and butter
function elasticstore() {
  console.log(colors.grey('Connecting to Firebase %s'), Config.FB_URL);
  try {
    // Initialize firebase
    admin.initializeApp({
      credential: admin.credential.cert(Config.FB_SERVICE_ACCOUNT ? JSON.parse(Config.FB_SERVICE_ACCOUNT) : Config.FB_SERVICE_PATH),
      databaseURL: Config.FB_URL
    });
    console.log(colors.green(`Connected to Firestore: ${Config.FB_URL}`))
    console.log(colors.grey('Registering worker...'))
    Worker.register(elasticsearchClient)
  } catch (e) {
    console.log(colors.red(e.message))
  }
}
