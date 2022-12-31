import { OrderedCollection, OrderedCollectionPage } from "./activitypub"

export interface PagedCollection<SearchQuery> {
  type: "PagedCollection"
  search(query: SearchQuery): {
    toOrderedCollectionPage(): OrderedCollectionPage
  }
}

export type Outbox<SearchQuery> = {
  type: "Outbox",
  toOrderedCollection: () => Promise<OrderedCollection>
  current: PagedCollection<SearchQuery>
}

export function createMockOutbox<SearchQuery>(
  {
    orderedItems = []
  }
  :{
    orderedItems?: OrderedCollection["orderedItems"]
  }
  ={}
): Outbox<SearchQuery> {
  return {
    type: "Outbox",
    toOrderedCollection: async () => ({
      type: "OrderedCollection",
      totalItems: 0,
      orderedItems,
    }),
    current: {
      type: "PagedCollection",
      search: (query: SearchQuery) => {
        return {
          toOrderedCollectionPage: () => ({
            type: "OrderedCollectionPage",
            orderedItems,
          })
        }
      }
    }
  }
}
