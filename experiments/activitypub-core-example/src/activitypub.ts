import { AP as APCore } from "activitypub-core-types"
import * as as2 from "./activitystreams2"
import { assertValidActor } from "./actor-test"
import assert from "node:assert";
import { hasOwnProperty } from "./object.js";

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
  type: 'OrderedCollection'
}
export type ActorTypeString = typeof APCore.ActorTypes[keyof typeof APCore.ActorTypes]
export type ActorType = ActorTypeString | ActorTypeString[]

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
  assert(typeof outboxValue === 'string', 'actor outbox is a string')
  const outbox = new URL(outboxValue);
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
  const validTypes: ActorTypeString[] = []
  const typeArray = Array.isArray(type) ? type : [type];
  for (const definedActorType of Object.values(APCore.ActorTypes)) {
    if (typeArray.includes(definedActorType)) {
      validTypes.push(definedActorType)
    }
  }
  switch (validTypes.length) {
    case 0:
      throw new Error(`invalid actor type: ${type}`)
    case 1:
      return validTypes[0]
  }
  return validTypes
}

export function asOrderedCollection(object: unknown): OrderedCollection {
  assert(typeof object === 'object' && object !== null)
  assert(hasOwnProperty(object, 'type'))
  const typeArray = Array.isArray(object.type) ? object.type : [object.type];
  if ( ! typeArray.includes('OrderedCollection')) {
    throw new Error('not an ordered collection')
  }
  if (hasOwnProperty(object, 'totalItems')) {
    assert(typeof object.totalItems === 'number')
  }
  assert(hasOwnProperty(object, 'orderedItems') && Array.isArray(object.orderedItems))
  const orderedCollection = {
    ...object,
    type: 'OrderedCollection' as const,
    orderedItems: Array.from(object.orderedItems),
  }
  return orderedCollection;
}
