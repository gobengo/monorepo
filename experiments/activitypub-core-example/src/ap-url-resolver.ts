import { ActivityPubUrlParser } from "./ap-url-parser.js";
import type { IActorRepository } from './actor-repository.js';
import type { Actor } from "./actor.js";
import { Outbox } from "./outbox.js";

export type IActivityPubUrlResolver = (url: URL) => Promise<null | Actor | Outbox>

export class ActivityPubUrlResolver {
  static create(options: {
    parse: ActivityPubUrlParser['parse'],
    actors: IActorRepository,
  }): IActivityPubUrlResolver {
    const resolver = async (url: URL) => {
      const parsed = options.parse(url);
      if ( ! parsed) return null;
      const actor = options.actors.getById(parsed.actor)
      if ( ! actor) {
        return null;
      }
      switch (parsed.relation) {
        case 'self':
          return actor;
        case 'outbox':
          return actor.outbox;
      }
      const _: never = parsed.relation
      throw new Error(`unexpected parsed activitypub url relation ${parsed.relation}`)
    }
    return resolver;
  }
}
