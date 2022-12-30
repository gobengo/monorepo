import { ActivityPubActorFinder } from "./actor-finder";
import type * as apc from 'activitypub-core-types';
import type { AP } from "activitypub-core-types"
import { ActivityPubUrlParser } from "./ap-url-parser";
import { IActivityPubUrlResolver } from "./ap-url-resolver";
import { debuglog } from 'util';
import { toActivityPubCoreActor } from "./actor.js";
import { APCoreActor } from "./activitypub-core.js";

type IDatabaseAdapater = apc.DbAdapter

/**
 * minimal db-adapter interface that seems to work for simple activitypub-core use cases
 */
export type IMinimalApcDatabaseAdapter = Pick<IDatabaseAdapater, 'findOne'|'getActorByUserId'> & {
  findEntityById(id: URL): Promise<null | APCoreActor | apc.AP.OrderedCollection>
}

const debug = debuglog('apc-db-adapter')

/**
 * An activitypub-core db-adapter.
 * Powered by underlying actor-finder
 */
export class DatabaseAdapter implements IMinimalApcDatabaseAdapter {
  static create(options: {
    resolve: IActivityPubUrlResolver,
  }) {
    return new DatabaseAdapter(options.resolve)
  }
  constructor(
    private readonly resolve: IActivityPubUrlResolver,
  ) {}

  async findEntityById(id: URL) {
    debug('findEntityById', id.toString())
    const resolution = await this.resolve(id)
    if ( ! resolution) return resolution
    console.log('DatabaseAdapter findEntityById', {
      id: id.toString(),
      resolution,
    })
    switch (resolution.type) {
      case 'Outbox':
        return resolution.toOrderedCollection()
    }
    return toActivityPubCoreActor(resolution, {
      id,
    });
  }

  async findOne() {
    debug('findOne', arguments)
    return undefined
  }

  /**
   * * called by activitypub-core EntityGetEndpoint first thing to determine the actor of an incoming request
   *   so that other lookups can be in the context of this 'authorizedActor'
   *   * we dont need this, so return undefined
   * @param userId 
   */
  async getActorByUserId(userId: string) {
    debug('getActorByUserId', userId)
    return undefined
  }
}
