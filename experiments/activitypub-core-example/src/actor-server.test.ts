import test from "ava";
import { ActorServer } from "./actor-server.js";
import { withHttpServer } from "./http.js";
import { mediaType as as2MediaType } from "./activitystreams2.js";
import { assertValidActor } from "./actor-test.js";
import assert from 'node:assert';

test('ActorServer responds to GET / with 200', t => withHttpServer(ActorServer.create(), async (baseUrl) => {
  const response = await fetch(baseUrl.toString());
  t.is(response.status, 200);
}));

test('ActorServer serves ActivityPub actor', t => withHttpServer(ActorServer.create(), async (baseUrl) => {
  const response = await fetch(baseUrl.toString(), {
    headers: {
      accept: as2MediaType
    }
  });
  t.is(response.status, 200);
  const actor = await response.json() as unknown;
  console.log({ actor })
  assertValidActor(actor, assert);
}));
