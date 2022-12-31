import { ActivityPubActorFinder } from "./actor-finder";
import type * as apc from 'activitypub-core-types';
import type { AP } from "activitypub-core-types"
import { ActivityPubUrlParser, IActivityPubTraversers } from "./ap-url-parser";
import { IActivityPubUrlResolver } from "./ap-url-resolver";
import { debuglog } from 'util';
import { toActivityPubCoreActor } from "./actor.js";
import { APCoreActor } from "./activitypub-core.js";
import { EdgeTraverser } from "./url";

type IDatabaseAdapater = apc.DbAdapter

/**
 * minimal db-adapter interface that seems to work for simple activitypub-core use cases
 */
export type IMinimalApcDatabaseAdapter = Pick<IDatabaseAdapater, 'findOne'|'getActorByUserId'> & {
  findEntityById(id: URL): Promise<
    | null
    | APCoreActor
    | apc.AP.OrderedCollection & { orderedItems: URL[] }
    | apc.AP.OrderedCollectionPage
  >
}

const debug = debuglog('apc-db-adapter')

/**
 * An activitypub-core db-adapter.
 * Powered by underlying actor-finder
 */
export class DatabaseAdapter implements IMinimalApcDatabaseAdapter {
  static create(options: {
    resolve: IActivityPubUrlResolver<URLSearchParams>,
    urls: IActivityPubTraversers,
    getExternalUrl?: (url: URL) => URL,
  }) {
    return new DatabaseAdapter(
      options.resolve,
      options.urls,
      options.getExternalUrl,
    )
  }
  protected constructor(
    private readonly resolve: IActivityPubUrlResolver<URLSearchParams>,
    private readonly urls: IActivityPubTraversers,
    /**
     * activitypub-core builds its own URL like 'http://localhost:3000/' for the id
     * This funtion should return the 'real' id fit for external presentation
     */
    private readonly getExternalUrl: (url: URL) => URL = (url)=>url,
  ) {}

  async findEntityById(wrongId: URL) {
    debug('findEntityById', wrongId.toString())
    const id = this.getExternalUrl(wrongId)
    debug('corrected apc id to external url id', id.toString())
    const resolution = await this.resolve(id)
    debug('DatabaseAdapter findEntityById', {
      id: id.toString(),
      resolution,
    })
    if ( ! resolution) return resolution
    switch (resolution.type) {
      case 'Outbox':
        return resolution.toOrderedCollection()
      case 'PagedCollection':
        return resolution.search(id.searchParams).toOrderedCollectionPage()
    }
    return toActivityPubCoreActor(resolution, {
      id,
      outbox: this.urls.outbox.follow(id),
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
