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

interface HasUrl {
  url: URL
}

export function createMockOutbox<SearchQuery, Item extends HasUrl>(
  {
    orderedItems = []
  }
  :{
    orderedItems?: Array<URL | Item>
  }
  ={}
): Outbox<SearchQuery> {
  return {
    type: "Outbox",
    toOrderedCollection: async () => ({
      type: "OrderedCollection",
      totalItems: 0,
      orderedItems: orderedItems.map(item => {
        if (item instanceof URL) { return item }
        return item.url;
      }),
    }),
    current: {
      type: "PagedCollection",
      search: (query: SearchQuery) => {
        return {
          toOrderedCollectionPage: () => ({
            type: "OrderedCollectionPage",
            orderedItems: orderedItems.map(item => {
              if (item instanceof URL) { return item }
              return item.url;
            }),
          })
        }
      }
    }
  }
}
