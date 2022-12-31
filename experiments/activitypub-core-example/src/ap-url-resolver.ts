import { ActivityPubUrlParser, ActivityPubUrlParseResult } from "./ap-url-parser.js";
import type { IActorRepository } from './actor-repository.js';
import type { Actor } from "./actor.js";
import { Outbox, PagedCollection } from "./outbox.js";
import { withHostname } from "./url.js";

export interface IActivityPubUrlResolver<SearchQuery> {
  (url: URL): Promise<null | Actor | Outbox<SearchQuery> | PagedCollection<SearchQuery>>
}

export function createActivityPubUrlResolver<
  SearchQuery,
>(options: {
  parser: ActivityPubUrlParser,
  actors: IActorRepository,
}): IActivityPubUrlResolver<SearchQuery> {
  return async (url: URL) => {
    const { parser, actors } = options;
    const parsed = parser.parse(url);
    if ( ! parsed) return null;
    const actor = actors.getById(parsed.actor)
    if ( ! actor) {
      return null;
    }
    return resolveActorRelation(actor, parsed.relation)
  }
}

export async function resolveActorRelation<SearchQuery>(
  actor: Actor,
  relation: ActivityPubUrlParseResult['relation']
): ReturnType<IActivityPubUrlResolver<SearchQuery>> {
  switch (relation) {
    case 'self':
      return actor;
    case 'outbox':
      return actor.outbox;
  }
  const _: never = relation
  throw new Error(`unexpected parsed activitypub url relation ${relation}`)
}

export function createResolverForActor<SearchQuery>(
  parser: ActivityPubUrlParser,
  actor: Actor
): IActivityPubUrlResolver<SearchQuery> {
  return async (url) => {
    const parsed = parser.parse(url);
    if ( ! parsed) return null;
    return resolveActorRelation(actor, parsed.relation)
  }
}
