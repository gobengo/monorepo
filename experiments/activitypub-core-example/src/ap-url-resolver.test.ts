import test from "ava";
import { createMockActor } from "./actor.js";
import { ActivityPubUrlParser } from "./ap-url-parser.js";
import { SingleActorRepository } from './actor-repository.js'
import { assert } from "./ava.js";
import { ActivityPubUrlResolver } from "./ap-url-resolver.js";

test('ActivityPubUrlResolver resolves object URLs from repo', async t => {
  const urlConfig = {
    outbox: 'fooOutbox',
  }
  const actorUrl = new URL('http://localhost/actor/')
  const actor1 = createMockActor()
  const actors = new SingleActorRepository(actorUrl, actor1)
  const parse = (url: URL) => ActivityPubUrlParser.fromPathSegmentUrlConfig(
    url => url.toString() === actorUrl.toString(),
    urlConfig,
  ).parse(url)
  const resolver = ActivityPubUrlResolver.create({
    parse,
    actors,
  })
  t.deepEqual(await resolver(actorUrl), actor1, 'resolves actor uri to actor')

  // resolve actor
  const resolvedActor = await resolver(actorUrl)
  assert(t, resolvedActor, 'resolved something from actor uri')
  assert(t, resolvedActor.type === 'Actor', 'resolved Actor from actor uri')

  // resolve outbox uri
  const resolvedOutbox = await resolver(new URL(actorUrl + urlConfig.outbox))
  assert(t, resolvedOutbox, 'resolved something from outbox uri')
  assert(t, resolvedOutbox.type === 'Outbox', 'resolved something from outbox uri')
  const outboxCollection = await resolvedOutbox.toOrderedCollection()
  t.deepEqual(outboxCollection.type, 'OrderedCollection', 'resolves outbox uri to OrderedCollection')
})
