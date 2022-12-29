/**
 * @fileoverview modules related to activitypub-core db-adapters
 */

import test from 'ava';
import { createMockActor } from './actor.js';
import {ActivityPubActorFinder} from "./actor-finder.js";
import { SingleActorRepository } from './actor-repository.js';
import { DatabaseAdapter } from './apc-db-adapter.js';
import { asOrderedCollection } from './activitypub.js';

test.skip('create db adapter using actor-finder', async t => {
  const actorUrl = new URL('http://localhost/actor/')
  const actor1 = createMockActor()
  const dbAdapter = DatabaseAdapter.create({
    actorFinder: ActivityPubActorFinder.fromSingleActorRepository(
      new SingleActorRepository(actorUrl, actor1)
    ),
  });
  // actor
  t.deepEqual(await dbAdapter.findEntityById(actorUrl), actor1, 'can resolve actor by id')
  // outbox
  const outbox = await dbAdapter.findEntityById(new URL('http://localhost/actor/outbox/'))
  t.assert(outbox, 'outbox is not null')
  asOrderedCollection(outbox);

})