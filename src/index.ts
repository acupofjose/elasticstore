import Elasticstore from "./elasticstore"
import 'source-map-support/register'

async function main() {
  const elasticstore = new Elasticstore()
  elasticstore.init()
}

main()
