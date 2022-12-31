import { AP as APCore } from "activitypub-core-types"
import * as as2 from "./activitystreams2.js"
import { assertValidActor } from "./actor-test"
import assert from "node:assert";
import { hasOwnProperty } from "./object.js";
import { ActorType } from "./activitystreams2"

/**
 * canonical rfc6838 media type for fetching activitypub objects
 */
export const mediaType = 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"' as const

export type Actor = Omit<APCore.Actor, 'type'> & {
  // this type is a bit more accurate than the activitypub-core-types type
  type: ActorType
}
export type OrderedCollection = Omit<APCore.OrderedCollection, 'type'> & {
  // this type is a bit more accurate than the activitypub-core-types type
  type: 'OrderedCollection',
  orderedItems: URL[],
}

export type OrderedCollectionPage = Omit<APCore.OrderedCollectionPage, 'type'> & {
  type: 'OrderedCollectionPage'
}

export function actorFetcher(fetch: typeof globalThis.fetch) {
  return async function fetchActor(url: URL): Promise<Actor> {
    const response = await fetch(url.toString(), {
      headers: {
        accept: mediaType
      }
    });
    if (!response.ok) {
      throw new Error(`fetchActor: ${response.status} ${response.statusText}`)
    }
    const responseObject = await response.json() as unknown
    try {
      return asActor(responseObject)
    } catch (error) {
      throw new Error('unable to parse actor', {
        cause: error,
      })
    }
  }
}

function asActor(object: unknown): Actor {
  assert(typeof object === 'object' && object !== null)
  const idValue = hasOwnProperty(object, 'id') && object.id;
  assert(typeof idValue === 'string', 'actor id is a string')
  const id = new URL(idValue);
  const type = asActorType(hasOwnProperty(object, 'type') && object.type)
  const inboxValue = hasOwnProperty(object, 'inbox') && object.inbox;
  assert(typeof inboxValue === 'string', 'actor inbox is a string')
  const inbox = new URL(inboxValue);
  const outboxValue = hasOwnProperty(object, 'outbox') && object.outbox;
  const outbox = (typeof outboxValue === 'string') ? new URL(outboxValue) : asOrderedCollection(outboxValue);
  const actor: Actor = {
    ...object,
    id,
    type,
    inbox,
    outbox,
  }
  return actor;
}

/**
 * parse a value as an activitypub actor 'type' property value
 */
function asActorType(type: unknown): ActorType {
  const foundActorTypes: as2.ActorTypeString[] = []
  const foundNonActorTypes: string[] = [];
  const allActorTypes = new Set(as2.ActorTypeStrings)
  const typeArray = Array.isArray(type) ? type : [type];
  for (const t of typeArray) {
    if (allActorTypes.has(t)) {
      foundActorTypes.push(t)
    } else {
      foundNonActorTypes.push(t)
    }
  }
  const [firstFoundActorType, ...restFoundActorTypes] = foundActorTypes
  if ( ! firstFoundActorType) {
    throw new Error(`invalid actor type: ${type}`)
  }
  const typesWithActorTypesFirst: ActorType = [
    firstFoundActorType,
    ...restFoundActorTypes,
    ...foundNonActorTypes,
  ]
  switch (typesWithActorTypesFirst.length) {
    case 0:
      throw new Error(`invalid actor type: ${type}`)
    case 1:
      return typesWithActorTypesFirst[0]
  }
  return typesWithActorTypesFirst
}

export function asOrderedCollection(object: unknown): OrderedCollection {
  assert(typeof object === 'object' && object !== null, 'orderedCollection is an object')
  assert(hasOwnProperty(object, 'type'), 'orderedCollection has a type')
  const typeArray = Array.isArray(object.type) ? object.type : [object.type];
  if ( ! typeArray.includes('OrderedCollection')) {
    throw new Error(`expected OrderedCollection type, but got ${typeArray.join(',')}`)
  }
  if (hasOwnProperty(object, 'totalItems')) {
    assert(typeof object.totalItems === 'number')
  }
  if (hasOwnProperty(object, 'orderedItems')) {
    assert(Array.isArray(object.orderedItems), 'orderedItems is an Array')
  }
  if (hasOwnProperty(object, 'items') && hasOwnProperty(object, 'orderedItems')) {
    throw new Error('OrderedCollection should not have both items and orderedItems')
  }
  const objectOrderedItems = hasOwnProperty(object, 'orderedItems') ? object.orderedItems : [];
  assert(Array.isArray(objectOrderedItems), 'orderedItems is an Array')
  const orderedItems = objectOrderedItems.map(item => {
    try {
      return new URL(item)
    } catch (error) {
      throw new Error(`invalid url orderedItem: ${item}`, {
        cause: error,
      })
    }
  })
  const orderedCollection = {
    ...object,
    type: 'OrderedCollection' as const,
    orderedItems,
  }
  return orderedCollection;
}
