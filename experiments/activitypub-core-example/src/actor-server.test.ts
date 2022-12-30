import test from "ava";
import { ActorServer } from "./actor-server.js";
import { withHttpServer } from "./http.js";
import { mediaType as apMediaType, asOrderedCollection } from "./activitypub.js";
import { assertValidActor } from "./actor-test.js";
import assert from 'node:assert';
import { actorFetcher } from "./activitypub.js";
import { createMockActor } from "./actor.js";
import { SingleActorRepository } from "./actor-repository.js";
import { createActivityPubUrlResolver, createResolverForActor, IActivityPubUrlResolver, localhostResolver } from "./ap-url-resolver.js";
import { ActivityPubUrlParser } from "./ap-url-parser.js";
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import express from "express";
import { withHostname } from "./url.js";
import { hasActivityStreams2Type, mediaType as as2MediaType } from "./activitystreams2.js";
import { debuglog } from "util";
import { hasOwnProperty } from "./object.js";

const debug = debuglog('actor-server.test')

const fetchActor = actorFetcher(fetch);

function simpleMockResolver(): IActivityPubUrlResolver {
  const resolve: IActivityPubUrlResolver = async (url) => {
    debug('simpleMockResolver resolving', url.toString())
    switch (url.pathname) {
      case '/':
        return createMockActor()
    }
    return null;
  }
  return resolve;
}

test('testing works', t => {
  t.is(true, true)
})

test('ActorServer responds to GET / with 200', async t => withHttpServer(ActorServer.create({
  resolve: simpleMockResolver(),
}), async (baseUrl) => {
  const response = await fetch(baseUrl.toString());
  t.is(response.status, 200);
}));

test('ActorServer serves ActivityPub actor', async t =>{
  const actorServer = ActorServer.create({ resolve: simpleMockResolver() })
  await withHttpServer(actorServer, async (baseUrl) => {
    const response = await fetch(baseUrl.toString(), {
      headers: {
        accept: apMediaType
      }
    });
    t.is(response.status, 200);
    t.assert(([apMediaType, as2MediaType] as unknown[]).includes(response.headers.get('content-type')));
    const actor = await response.json() as unknown;
    assertValidActor(actor, assert);
  })
})

test.only('ActorServer serves actor outbox', async t => {
  const server = ActorServer.create({
    app: express().use(pinoHttp(
      pinoHttpPrint.httpPrintFactory()()
    )),
    resolve: simpleMockResolver(),
  });
  await withHttpServer(server, async (baseUrl) => {
    const actorUrl = baseUrl;
    const actor = await fetchActor(actorUrl);
    const { outbox } = actor;
    if (hasOwnProperty(outbox, 'type')) {
      t.deepEqual(outbox.type, 'OrderedCollection');
    } else {
      t.assert(outbox instanceof URL)
    }
    // assert(outboxUrl instanceof URL, 'outbox is a url');
    // const response = await fetch(new Request(outboxUrl.toString(), {
    //   headers: {
    //     accept: apMediaType
    //   }
    // }))
    // t.is(response.status, 200);
    // const outboxObject = await response.json() as unknown;
    // console.log({ outboxObject })
    // const outbox = asOrderedCollection(outboxObject);
    // console.log({ outbox })
  })
});
