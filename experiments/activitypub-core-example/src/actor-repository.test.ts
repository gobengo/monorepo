import test from "ava";
import { IActorRepository, MultiActorRepository, SingleActorRepository } from "./actor-repository.js";
import { Actor, createMockActor } from "./actor.js";

test('SingleActorRepository can get by id', async (t) => {
  const actorUrl = new URL('http://localhost/actor')
  const actor1 = createMockActor()
  const actors = new SingleActorRepository(actorUrl, actor1)
  const found = await actors.getById(actorUrl)
  t.is(found?.uuid, actor1.uuid, 'found actor by id')
})

test('MultiActorRepository can get by path segment and id', async t => {
  const actor1 = createMockActor();
  const actor2 = createMockActor();
  const byPathSegmentMap = new Map([
    ['actor1', actor1],
    ['actor2', actor2],
  ])
  const actors = new MultiActorRepository({
    actorsUrl: new URL('http://localhost/actors/'),
    byPathSegment: byPathSegmentMap,
  })
  t.is(await actors.getByPathSegment('actor1'), actor1)
  t.is(await actors.getByPathSegment('actor2'), actor2)
  t.is(await actors.getByPathSegment('notreal'), null)
})
