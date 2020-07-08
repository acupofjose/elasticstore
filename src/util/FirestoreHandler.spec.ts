import { Reference } from "../types"
import FirestoreCollectionHandler from "./FirestoreHandler"

test("filter should only include specified keys", () => {
  const reference: Reference = {
    collection: "test",
    index: "test",
    include: ["name", "email"],
  }

  const testRecord = {
    name: "John Doe",
    email: "john.doe@example.com",
    birthday: new Date("June 1, 1990"),
  }

  const result = FirestoreCollectionHandler.filter(reference, testRecord)
  expect(Object.keys(result)).toContain("name")
  expect(Object.keys(result)).toContain("email")
  expect(Object.keys(result)).not.toContain("birthday")
})

test("filter should exclude specified keys", () => {
  const reference: Reference = {
    collection: "test",
    index: "test",
    exclude: ["name", "email"],
  }

  const testRecord = {
    name: "John Doe",
    email: "john.doe@example.com",
    birthday: new Date(),
  }

  const result = FirestoreCollectionHandler.filter(reference, testRecord)
  expect(Object.keys(result)).not.toContain("name")
  expect(Object.keys(result)).not.toContain("email")
  expect(Object.keys(result)).toContain("birthday")
})

test("filter should return `null` if the record does not match a custom filtering function", () => {
  const reference: Reference = {
    collection: "test",
    index: "test",
    exclude: ["name", "email"],
    filter: (d) => d.name !== "John Doe",
  }

  const testRecord1 = {
    name: "John Doe",
    email: "john.doe@example.com",
    birthday: new Date(),
  }

  const testRecord2 = {
    name: "Jane Doe",
    email: "jane.doe@example.com",
    birthday: new Date(),
  }

  const result1 = FirestoreCollectionHandler.filter(reference, testRecord1)
  expect(result1).toBe(null)

  const result2 = FirestoreCollectionHandler.filter(reference, testRecord2)
  expect(result2).not.toBe(null)
})
