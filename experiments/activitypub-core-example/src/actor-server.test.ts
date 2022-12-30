import test from "ava";
import { ActorServer } from "./actor-server.js";
import { withHttpServer } from "./http.js";
import { mediaType as apMediaType, asOrderedCollection } from "./activitypub.js";
import { assertValidActor } from "./actor-test.js";
import assert from 'node:assert';
import { actorFetcher } from "./activitypub.js";
import { Actor, createMockActor } from "./actor.js";
import { SingleActorRepository } from "./actor-repository.js";
import { createActivityPubUrlResolver, createResolverForActor, IActivityPubUrlResolver, localhostResolver } from "./ap-url-resolver.js";
import { ActivityPubUrlParser, IActivityPubTraversers } from "./ap-url-parser.js";
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import express from "express";
import { UrlPathTraverser, withHostname } from "./url.js";
import { hasActivityStreams2Type, mediaType as as2MediaType } from "./activitystreams2.js";
import { debuglog } from "util";
import { hasOwnProperty } from "./object.js";

const debug = debuglog('actor-server.test')

const fetchActor = actorFetcher(fetch);

function simpleServerConfig(): {
  getActorById: (id: URL) => Promise<Actor|null>
} {
  async function getActorById() {
    return createMockActor()
  }
  return { getActorById };
}

test('testing works', t => {
  t.is(true, true)
})

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
    assertValidActor(actor, assert);
  })
})

test('ActorServer serves actor outbox', async t => {
  const server = ActorServer.create({
    app: express().use(pinoHttp(
      pinoHttpPrint.httpPrintFactory()()
    )),
    ...simpleServerConfig(),
  });
  await withHttpServer(server, async (baseUrl) => {
    const actorUrl = baseUrl;
    const actor = await fetchActor(actorUrl);
    t.assert(actor.outbox instanceof URL, 'outbox is a url reference')
    const response = await fetch(new Request(actor.outbox.toString(), {
      headers: {
        accept: apMediaType
      }
    }))
    t.is(response.status, 200);
    const outboxObject = await response.json() as unknown;
    const outbox = asOrderedCollection(outboxObject);
  })
});
