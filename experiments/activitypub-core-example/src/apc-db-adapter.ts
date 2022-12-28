import { ActivityPubActorFinder } from "./actor-finder";
import type * as apc from 'activitypub-core-types';

type IDatabaseAdapater = Pick<apc.DbAdapter, 'findEntityById'/*|'findOne'|'getActorByUserId'*/>

/**
 * An activitypub-core db-adapter.
 * Powered by underlying actor-finder
 */
export class DatabaseAdapter implements IDatabaseAdapater {
  static create(options: {
    actorFinder: ActivityPubActorFinder,
  }) {
    return new DatabaseAdapter(options.actorFinder)
  }
  constructor(
    private readonly actorFinder: ActivityPubActorFinder,
  ) {}

  async findEntityById(id: URL) {
    const actor = await this.actorFinder.getByUrl(id);
    return actor;
  }
}
