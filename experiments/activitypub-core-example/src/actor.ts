import { createMockOutbox, Outbox } from "./outbox.js"
import { ActorType } from "./activitystreams2";
import { APCoreActor } from "./activitypub-core.js";

type UUID = string

export type Actor<CollectionSearchQuery=unknown> = {
  type: ActorType
  uuid: UUID
  outbox: Outbox<CollectionSearchQuery>
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
}): Promise<APCoreActor & { discoverable: true }> {
  return {
    type: actor.type,
    id: urls.id,
    outbox: urls.outbox || await actor.outbox.toOrderedCollection(),
    inbox: new URL('/inbox', urls.id),
    discoverable: true,
  }
}
