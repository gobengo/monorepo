import { ActivityPubActorFinder } from "./actor-finder";
import type * as apc from 'activitypub-core-types';
import { ActivityPubUrlParser } from "./ap-url-parser";
import { ActivityPubUrlResolver, IActivityPubUrlResolver } from "./ap-url-resolver";

type IDatabaseAdapater = Pick<apc.DbAdapter, 'findEntityById'/*|'findOne'|'getActorByUserId'*/>

/**
 * An activitypub-core db-adapter.
 * Powered by underlying actor-finder
 */
export class DatabaseAdapter implements IDatabaseAdapater {
  static create(options: {
    resolver: IActivityPubUrlResolver,
  }) {
    return new DatabaseAdapter(options.resolver)
  }
  constructor(
    private readonly resolver: IActivityPubUrlResolver,
  ) {}

  async findEntityById(id: URL) {
    const resolution = await this.resolver.resolve(id)
    if ( ! resolution) return resolution
    console.log('DatabaseAdapter findEntityById', {
      id: id.toString(),
      resolution,
    })
    switch (resolution.type) {
      case 'Outbox':
        return resolution.toOrderedCollection()
    }
    return resolution;
  }
}
