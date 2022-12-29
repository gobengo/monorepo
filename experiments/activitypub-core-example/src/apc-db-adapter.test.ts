/**
 * @fileoverview modules related to activitypub-core db-adapters
 */

import test from 'ava';
import { createMockActor } from './actor.js';
import {ActivityPubActorFinder} from "./actor-finder.js";
import { SingleActorRepository } from './actor-repository.js';
import { DatabaseAdapter } from './apc-db-adapter.js';
import { asOrderedCollection } from './activitypub.js';
import { ActivityPubUrlParser } from './ap-url-parser.js';
import { ActivityPubUrlResolver } from './ap-url-resolver.js';
import { assert } from './ava.js';

test.only('create db adapter using actor-finder', async t => {
  const urlConfig = {
    outbox: 'fooOutbox',
  }
  const actorUrl = new URL('http://localhost/actor/')
  const actor1 = createMockActor()
  const actors = new SingleActorRepository(actorUrl, actor1)
  const resolver = ActivityPubUrlResolver.create({
    parser: ActivityPubUrlParser.fromPathSegmentUrlConfig(
      url => url.toString() === actorUrl.toString(),
      urlConfig,
    ),
    actors,
  })
  const dbAdapter = DatabaseAdapter.create({
    resolver,
  });
  // actor
  t.deepEqual(await dbAdapter.findEntityById(actorUrl), actor1, 'can resolve actor by id')
  // outbox
  const outbox = await dbAdapter.findEntityById(new URL(actorUrl + urlConfig.outbox))
  t.notThrows(() => asOrderedCollection(outbox));
})
