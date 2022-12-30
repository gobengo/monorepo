/**
 * @fileoverview modules related to activitypub-core db-adapters
 */

import test from 'ava';
import { createMockActor, toActivityPubCoreActor } from './actor.js';
import {ActivityPubActorFinder} from "./actor-finder.js";
import { SingleActorRepository } from './actor-repository.js';
import { DatabaseAdapter } from './apc-db-adapter.js';
import { asOrderedCollection } from './activitypub.js';
import { ActivityPubUrlParser } from './ap-url-parser.js';
import { createActivityPubUrlResolver } from './ap-url-resolver.js';
import { assert } from './ava.js';

test('can create activitypub-core db adapter that finds entities', async t => {
  const urlConfig = {
    outbox: 'fooOutbox',
  }
  const actorUrl = new URL('http://localhost/actor/')
  const actor1 = createMockActor()
  const actors = new SingleActorRepository(actorUrl, actor1)
  const resolve = createActivityPubUrlResolver({
    parser: ActivityPubUrlParser.fromPathSegmentUrlConfig(
      url => url.toString() === actorUrl.toString(),
      urlConfig,
    ),
    actors,
  })
  const dbAdapter = DatabaseAdapter.create({
    resolve,
  });
  // actor
  const actorFind = await dbAdapter.findEntityById(actorUrl);
  t.deepEqual(actorFind?.type, actor1.type, 'found actor of type')
  // outbox
  const outbox = await dbAdapter.findEntityById(new URL(actorUrl + urlConfig.outbox))
  t.notThrows(() => asOrderedCollection(outbox));
})
