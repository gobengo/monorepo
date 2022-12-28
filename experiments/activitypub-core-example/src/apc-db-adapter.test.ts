/**
 * @fileoverview modules related to activitypub-core db-adapters
 */

import test from 'ava';
import { createMockActor } from './actor.js';
import {ActivityPubActorFinder} from "./actor-finder.js";
import { SingleActorRepository } from './actor-repository.js';
import { DatabaseAdapter } from './apc-db-adapter.js';

test.skip('create db adapter using actor-finder', async t => {
  const actorUrl = new URL('http://localhost/actor')
  const actor1 = createMockActor()
  const dbAdapter = DatabaseAdapter.create({
    actorFinder: ActivityPubActorFinder.fromSingleActorRepository(
      new SingleActorRepository(actorUrl, actor1)
    ),
  });

})