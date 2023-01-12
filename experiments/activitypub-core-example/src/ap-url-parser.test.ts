import test from "ava";
import { ActivityPubUrlParser } from './ap-url-parser.js';

test('ActivityPubUrlParser parses object URLs', async t => {
  const urlConfig = {
    outbox: 'fooOutbox',
  }
  const actorUrl = new URL('http://localhost/actor/')
  const urlParser = ActivityPubUrlParser.fromPathSegmentUrlConfig(
    url => url.toString() === actorUrl.toString(),
    urlConfig,
  )
  t.deepEqual(urlParser.parse(actorUrl), {
    actor: actorUrl,
    relation: 'self',
  })
  t.deepEqual(urlParser.parse(new URL(actorUrl + urlConfig.outbox)), {
    actor: actorUrl,
    relation: 'outbox',
  })
  t.deepEqual(urlParser.parse(new URL(actorUrl + 'invalidsuffix')), null)
})
