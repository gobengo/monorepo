import test from "ava";
import { ActorServer } from "./actor-server.js";
import { withHttpServer } from "./http.js";
import { mediaType as apMediaType } from "./activitypub.js";
import { assertValidActor } from "./actor-test.js";
import assert from 'node:assert';
import { actorFetcher } from "./activitypub.js";

const fetchActor = actorFetcher(fetch);

test('ActorServer responds to GET / with 200', t => withHttpServer(ActorServer.create(), async (baseUrl) => {
  const response = await fetch(baseUrl.toString());
  t.is(response.status, 200);
}));

test('ActorServer serves ActivityPub actor', t => withHttpServer(ActorServer.create(), async (baseUrl) => {
  const response = await fetch(baseUrl.toString(), {
    headers: {
      accept: apMediaType
    }
  });
  t.is(response.status, 200);
  const actor = await response.json() as unknown;
  assertValidActor(actor, assert);
}));

test('ActorServer serves actor outbox', t => withHttpServer(ActorServer.create(), async (baseUrl) => {
  const { outbox: outboxUrl } = await fetchActor(baseUrl);
  console.log('outboxUrl', outboxUrl.toString())
  assert(outboxUrl instanceof URL, 'outbox is a url');
  const response = await fetch(new Request(outboxUrl.toString(), {
    headers: {
      accept: apMediaType
    }
  }))
  t.is(response.status, 200);
  const outbox = await response.json() as unknown;
  console.log({ outbox })
}));
