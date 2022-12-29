import { ActivityPubUrlParser } from "./ap-url-parser.js";
import type { IActorRepository } from './actor-repository.js';
import type { Actor } from "./actor.js";
import { Outbox } from "./outbox.js";

export interface IActivityPubUrlResolver {
  resolve(url: URL): Promise<null | Actor | Outbox>
}

export class ActivityPubUrlResolver implements IActivityPubUrlResolver {
  static create(options: {
    parser: ActivityPubUrlParser,
    actors: IActorRepository,
  }): IActivityPubUrlResolver {
    return new ActivityPubUrlResolver(
      options.parser,
      options.actors,
    )
  }
  protected constructor(
    protected parser: ActivityPubUrlParser,
    protected actors: IActorRepository,
  ) {}
  async resolve(url: URL) {
    const { parser, actors } = this;
    const parsed = parser.parse(url);
    if ( ! parsed) return null;
    const actor = actors.getById(parsed.actor)
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
}
