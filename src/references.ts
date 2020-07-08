import { Reference } from "./types"

// Records should be added here to be indexed / made searchable
const references: Array<Reference> = [
  {
    collection: "example",
    index: "example",
    include: ["name", "email", "biography", "updatedAt", "createdAt"],
  },
]

export default references
