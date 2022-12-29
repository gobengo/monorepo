import { OrderedCollection } from "./activitypub"

export type Outbox = {
  type: "Outbox",
  toOrderedCollection: () => Promise<OrderedCollection>
}

export function createMockOutbox(): Outbox {
  return {
    type: "Outbox",
    toOrderedCollection: async () => ({
      type: "OrderedCollection",
      totalItems: 0,
      orderedItems: [],
    }),
  }
}
