import test from "ava";
import { createMockActor } from "./actor.js";
import { ActivityPubActorFinder } from "./actor-finder.js";
import { MultiActorRepository, SingleActorRepository } from "./actor-repository.js";

test('ActivityPubActorFinder with SingleActorRepository can get actor by url', async (t) => {
  const actorUrl = new URL('http://localhost/actor/')
  const actor1 = createMockActor()
  const finder = ActivityPubActorFinder.fromSingleActorRepository(new SingleActorRepository(actorUrl, actor1))
  const cases = [
    { url: new URL('http://localhost/actor/'), actor: actor1 },
    { url: new URL('http://localhost/actor'), actor: null },
    { url: new URL('http://localhost/actor/outbox/'), actor: actor1 },
    { url: new URL('http://localhost/actor1/outbox/'), actor: null },
  ]
  for (const { url, actor } of cases) {
    const found = await finder.getByUrl(url);
    if (actor) {
      t.is(found?.uuid, actor.uuid, `found actor by url ${url}`)
    } else {
      t.is(found, null, `found no actor by url ${url}`)
    }
  }
})

test('ActivityPubActorFinder with MultiActorRepository can get actor by url', async t => {
  const actor1 = createMockActor();
  const actor2 = createMockActor();
  const actorsUrl = new URL('http://localhost/foo/actors/')
  const actors = new MultiActorRepository({
    actorsUrl,
    byPathSegment: new Map([
      ['actor1', actor1],
      ['actor2', actor2],
    ])
  })
  const finder = ActivityPubActorFinder.fromMultiActorRepository(actors)
  const cases = [
    { url: new URL('actor1/', actorsUrl), actor: actor1 },
    { url: new URL('actor2/', actorsUrl), actor: actor2 },
    { url: new URL('actor3/', actorsUrl), actor: null },
    // will fail because no trailing slash
    { url: new URL('actor1', actorsUrl), actor: null },
    { url: new URL('actor1/outbox/', actorsUrl), actor: actor1 },
    { url: new URL('actor2/outbox/', actorsUrl), actor: actor2 },
    // will fail because no trailing slash
    { url: new URL('actor1/outbox', actorsUrl), actor: null },
  ]
  for (const { url, actor } of cases) {
    const found = await finder.getByUrl(url);
    if (actor) {
      t.is(found?.uuid, actor.uuid, `found actor by url ${url}`)
    } else {
      t.is(found, null, `found no actor by url ${url}`)
    }
  }
})
