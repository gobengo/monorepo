import { Actor } from "./actor";
import { hasOwnProperty } from "./object";
import { Outbox, PagedCollection } from "./outbox";

export type ActivityPubOutbox<ActorRef> = {
  type: 'Outbox'
  actor: ActorRef
}

type PageRef = 'current'|'first'|'last'

export type ActivityPubOutboxPage<ActorRef, _PageRef=PageRef> = {
  type: 'OutboxPage'
  page: _PageRef
  actor: ActorRef
}

export type ActivityPubServerResource<ActorRef> =
| ActorRef
| ActivityPubOutbox<ActorRef>
| ActivityPubOutboxPage<ActorRef>

export type IActivityPubResourceResolver<ActorRef, SearchQuery> = {
  (query: ActorRef): Actor
  (query: ActivityPubOutbox<ActorRef>): Outbox<SearchQuery>
  (query: ActivityPubOutboxPage<ActorRef>): PagedCollection<SearchQuery>
}

export function createActorResourceRefResolver<ActorRef extends { type: "Actor" }, SearchQuery>(actor: Actor<SearchQuery>) {
  function resolveResource(resourceRef: ActorRef): Actor
  function resolveResource(resourceRef: ActivityPubOutbox<ActorRef>): Outbox<unknown>
  function resolveResource(resourceRef: ActivityPubOutboxPage<ActorRef>): PagedCollection<unknown>
  function resolveResource(resourceRef: ActivityPubServerResource<ActorRef>) {
    const resourceRefType = resourceRef.type;
    switch (resourceRefType) {
      case 'Actor':
        return actor;
      case 'Outbox':
        return actor.outbox;
      case 'OutboxPage':
        return actor.outbox.current
    }
    const _: never = resourceRef
    throw new Error(`Unexpected resourceRef type ${resourceRefType}`);
  }
  return resolveResource
}
