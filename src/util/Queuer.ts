import Config from "../config"

type FuncParam = (...arg: any) => Promise<any>

type QueueItem = {
  resolver: (value?: unknown) => void
  rejector: (value?: unknown) => void
  func: FuncParam
}

// On smaller elasticsearch clusters with large firebase datasets,
// the initial load for inserting data will potentially call thousands
// of requests to elasticsearch.
//
// Depending on the hardware of the elasticsearch server, this will cause
// 429 errors, meaning documents will be missed.
//
// To remedy this, a queue system for elasticsearch requests will allow for
// requests to be made with a delay in promise style format so as to not
// overwhelm the server.
class Queuer {
  private queue: QueueItem[] = []
  private processing: QueueItem[] = []
  private concurrent: number = Config.QUEUE_CONCURRENT
  private delay: number = Config.QUEUE_DELAY

  constructor() {
    this.queue = []
    this.processing = []
  }

  // Receive a wrapped function that we can resolve later
  process = async (func: FuncParam): Promise<any> => {
    let resolver: (value?: unknown) => void = null
    let rejector: (value?: unknown) => void = null

    const promise = new Promise((resolve, reject) => {
      resolver = resolve
      rejector = reject
    })

    // Enqueue the wrapped function
    this.queue.push({ resolver, rejector, func })

    // Actually process it in the event that the queue is ready for it.
    if (this.processing.length <= this.concurrent) {
      this.loop()
    }

    return promise
  }

  private loop = async () => {
    if (this.processing.length >= this.concurrent || !this.queue.length) return

    const item = this.queue.shift()
    this.processing.push(item)

    // Delay the processing of the wrapped queue item
    setTimeout(async () => {
      try {
        const value = await item.func()
        item.resolver(value)
      } catch (err) {
        item.rejector(err)
      }

      const index = this.processing.indexOf(item)
      this.processing.splice(index, 1)

      if (this.queue.length) {
        this.loop()
      }
    }, this.delay)
  }
}

export default new Queuer()
