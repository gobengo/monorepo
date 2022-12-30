import { createMockOutbox, Outbox } from "./outbox.js"
import type * as APC from "activitypub-core-types";
import type { Actor as ActivityPubActor } from "./activitypub"
import { ActorType } from "./activitystreams2";
import { APCoreActor } from "./activitypub-core.js";

type UUID = string

export type Actor = {
  type: ActorType
  uuid: UUID
  outbox: Outbox
}

export function createMockActor({
  uuid = `uuid-${Math.random().toString().slice(2)}`,
  outbox = createMockOutbox(),
}={}): Actor {
  return {
    type: "Person",
    uuid,
    outbox,
  }
}

export async function toActivityPubCoreActor(actor: Actor, urls: {
  id: URL,
  inbox?: URL,
  outbox?: URL,
}): Promise<APCoreActor> {
  return {
    type: actor.type,
    id: urls.id,
    outbox: urls.outbox || await actor.outbox.toOrderedCollection(),
    inbox: urls.inbox || new URL('http://localhost/inbox/#todo-actor-toActivityPubCoreActor'),
  }
}
