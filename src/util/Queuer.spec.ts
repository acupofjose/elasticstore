import Config from "../config"
import Queuer from "./Queuer"

test("queue should process functions with specified delay", async () => {
  const startTime = new Date()
  const endTime = await Queuer.process(() => new Promise((res, rej) => res(new Date())))

  const diff = endTime.getTime() - startTime.getTime()

  expect(diff - Config.QUEUE_DELAY).toBeLessThan(10) // ms
})

test("queue should only process its limit of concurrent functions", async () => {
  const completedAt = []

  for (let i = 0; i < Config.QUEUE_CONCURRENT; i++) {
    const time = await Queuer.process(() => new Promise((res) => res(new Date())))
    completedAt.push(time)
  }

  const endTime = await Queuer.process(() => new Promise((res) => res(new Date())))

  const diff1 = endTime.getTime() - completedAt[0].getTime()
  expect(diff1).toBeGreaterThan(Config.QUEUE_DELAY)

  const diff2 = endTime.getTime() - completedAt[completedAt.length - 1].getTime()
  expect(diff2 - Config.QUEUE_DELAY).toBeLessThan(10) //ms
})
