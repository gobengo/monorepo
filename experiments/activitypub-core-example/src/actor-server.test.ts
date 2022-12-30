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
import { mediaType as as2MediaType } from "./activitystreams2.js";

const fetchActor = actorFetcher(fetch);

function simpleMockResolver(): IActivityPubUrlResolver {
  const resolve: IActivityPubUrlResolver = async (url) => {
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

// test.skip('ActorServer serves actor outbox', async t => {
//   const urlConfig = {
//     outbox: 'fooOutbox',
//   }
//   // note this is localhost because it's relative to the repository/resolver
//   // we dont know the external hostname until the http server boots below
//   const localActorUrl = new URL('http://localhost/actor/')
//   const actor1 = createMockActor()
//   const parser =  ActivityPubUrlParser.fromPathSegmentUrlConfig(
//     function isActor(url) {
//       // dont care about hostname here, only path
//       const matches = url.pathname === localActorUrl.pathname
//       console.log('test url resolver isActor url', { url: url.toString(), matches })
//       return matches
//     },
//     urlConfig,
//   )
//   const resolve: IActivityPubUrlResolver = createResolverForActor(parser, actor1)
//   const server = ActorServer.create({
//     app: express().use(pinoHttp(
//       pinoHttpPrint.httpPrintFactory()()
//     )),
//     resolve,
//   });
//   await withHttpServer(server, async (baseUrl) => {
//     const actorUrl = withHostname(localActorUrl, baseUrl.host)
//     console.log('actor-server started, about to fetch actor', actorUrl.toString())
//     const actor = await fetchActor(actorUrl);
//     console.log('fetched actor', actor)
//     const { outbox: outboxUrl } = actor;
//     console.log('outboxUrl', outboxUrl.toString())
//     // assert(outboxUrl instanceof URL, 'outbox is a url');
//     // const response = await fetch(new Request(outboxUrl.toString(), {
//     //   headers: {
//     //     accept: apMediaType
//     //   }
//     // }))
//     // t.is(response.status, 200);
//     // const outboxObject = await response.json() as unknown;
//     // console.log({ outboxObject })
//     // const outbox = asOrderedCollection(outboxObject);
//     // console.log({ outbox })
//   })
// });
