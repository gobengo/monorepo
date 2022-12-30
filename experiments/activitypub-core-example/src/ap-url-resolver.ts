import { ActivityPubUrlParser, ActivityPubUrlParseResult } from "./ap-url-parser.js";
import type { IActorRepository } from './actor-repository.js';
import type { Actor } from "./actor.js";
import { Outbox } from "./outbox.js";
import { withHostname } from "./url.js";

export interface IActivityPubUrlResolver {
  (url: URL): Promise<null | Actor | Outbox>
}

export function createActivityPubUrlResolver(options: {
  parser: ActivityPubUrlParser,
  actors: IActorRepository,
}): IActivityPubUrlResolver {
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

export async function resolveActorRelation(
  actor: Actor,
  relation: ActivityPubUrlParseResult['relation']
): ReturnType<IActivityPubUrlResolver> {
  switch (relation) {
    case 'self':
      return actor;
    case 'outbox':
      return actor.outbox;
  }
  const _: never = relation
  throw new Error(`unexpected parsed activitypub url relation ${relation}`)
}

export function createResolverForActor(
  parser: ActivityPubUrlParser,
  actor: Actor
): IActivityPubUrlResolver {
  return async (url) => {
    const parsed = parser.parse(url);
    if ( ! parsed) return null;
    return resolveActorRelation(actor, parsed.relation)
  }
}

export function localhostResolver(resolve: IActivityPubUrlResolver): IActivityPubUrlResolver {
  return async (url) => {
    const localizedUrl = withHostname(url, 'localhost');
    console.log('localhostResolver resolving using localizedUrl', localizedUrl.toString())
    const resolution = await resolve(localizedUrl);
    // @todo consider rewriting URLs to the original host
    return resolution;
  }
}
