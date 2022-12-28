import test from "ava";
import { createMockActor } from "./actor.js";
import { SingleActorRepository } from "./actor-repository.js";

interface ActivityPubUrlParseResult {
  relation: 'self' | 'outbox'
  url: URL
}

class ActivityPubUrlParser {
  static forSingleActorRepository(repo: SingleActorRepository) {
    return new ActivityPubUrlParser();
  }
  parse(url: URL): ActivityPubUrlParseResult {
    return {
      url,
      relation: 'self',
    }
  }
}

test('ActivityPubUrlParser parses object URLs', async t => {
  const baseUrl = new URL('http://localhost');
  const actorUrl = new URL('http://localhost/actor')
  const actor1 = createMockActor()
  const urlParser = new ActivityPubUrlParser();
  
  t.deepEqual(urlParser.parse(baseUrl), {
    url: baseUrl,
    relation: 'self',
  })
})
