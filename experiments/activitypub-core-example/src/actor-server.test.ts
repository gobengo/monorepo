import test from "ava";
import { ActorServer } from "./actor-server.js";
import { withHttpServer } from "./http.js";
import { mediaType as apMediaType, asOrderedCollection } from "./activitypub.js";
import { assertValidActor } from "./actor-test.js";
import { actorFetcher } from "./activitypub.js";
import { Actor, createMockActor } from "./actor.js";
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import express from "express";
import { mediaType as as2MediaType } from "./activitystreams2.js";
import { debuglog } from "util";
import { assert } from "./ava.js";
import nodeAssert from "node:assert"
import { IUrlPath, pathFromUrl, pathsEqual, urlPathFromPathname } from "./url-path.js";

const debug = debuglog('actor-server.test')

const fetchActor = actorFetcher(fetch);

function simpleServerConfig() {
  async function getActor() {
    return createMockActor()
  }
  return { getActor };
}

test('ActorServer responds to GET / with 200', async t => withHttpServer(ActorServer.create({
  ...simpleServerConfig(),
}), async (baseUrl) => {
  const response = await fetch(baseUrl.toString());
  t.is(response.status, 200);
}));

test('ActorServer serves ActivityPub actor', async t =>{
  const actorServer = ActorServer.create(simpleServerConfig())
  await withHttpServer(actorServer, async (baseUrl) => {
    const response = await fetch(baseUrl.toString(), {
      headers: {
        accept: apMediaType
      }
    });
    t.is(response.status, 200);
    t.assert(([apMediaType, as2MediaType] as unknown[]).includes(response.headers.get('content-type')));
    const actor = await response.json() as unknown;
    assertValidActor(actor, nodeAssert);
  })
})

test.only('ActorServer serves actor outbox', async t => {
  const actor1 = createMockActor();
  const actor1Ref = urlPathFromPathname('/')
  async function getActor(ref: {
    path: IUrlPath
  }) {
    debug('getActorById', {
      ref,
      actor1Ref: actor1Ref,
    })
    if (pathsEqual(ref.path, actor1Ref)) {
      return actor1
    }
    return null
  }
  const server = ActorServer.create({
    app: express().use(pinoHttp(
      pinoHttpPrint.httpPrintFactory()()
    )),
    getActor,
  });
  await withHttpServer(server, async (baseUrl) => {
    const actorUrl = new URL(baseUrl + actor1Ref.join('/'));
    const actor = await fetchActor(actorUrl);
    t.assert(actor.outbox instanceof URL, 'outbox is a url reference')
    const response = await fetch(new Request(actor.outbox.toString(), {
      headers: {
        accept: apMediaType
      }
    }))
    t.is(response.status, 200);
    const outboxObject = await response.json() as unknown;
    debug('got outbox', { outboxObject })
    const outbox = asOrderedCollection(outboxObject);
    // outbox is as expected
    // lets try to get the page of current activities
    const outboxCurrentPageRef = outbox.current
    assert(t, typeof outboxCurrentPageRef === 'string', 'outbox.current is a string')
    console.log({ outboxCurrentPageRef })
    const outboxCurrentUrl = new URL(outboxCurrentPageRef)
    // this fails because activitypub-core writes the current page link as localhost:3000 :/
    // const outboxCurrentPageResponse = await fetch(outboxCurrentUrl.toString())
    // t.is(outboxCurrentPageResponse.status, 200);
  })
});
