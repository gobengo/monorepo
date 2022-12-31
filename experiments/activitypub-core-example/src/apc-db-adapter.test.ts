/**
 * @fileoverview modules related to activitypub-core db-adapters
 */

import test from 'ava';
import { Actor, createMockActor } from './actor.js';
import { DatabaseAdapter } from './apc-db-adapter.js';
import { asOrderedCollection } from './activitypub.js';
import { assert, assertIs } from './ava.js';
import { UrlPathTraverser } from './url.js';
import { hasOwnProperty } from './object.js';
import { hasActivityStreams2Type } from './activitystreams2.js';
import { createActivityPubCoreServerExpressUrlParser, UrlPathActorRef } from "./apcse-url-parser.js"
import { ActivityPubOutbox, ActivityPubOutboxPage, ActivityPubServerResource, IActivityPubResourceResolver } from './ap-resolver.js';
import { Outbox, PagedCollection } from './outbox.js';
import { debuglog } from "util";
import { pathFromUrl, removePrefix, urlPathFromPathname } from './url-path.js';

const debug = debuglog('apc-db-adapter.test')

test('can create activitypub-core db adapter that finds entities', async t => {
  const actorUrl = new URL('http://localhost/actor/')
  const actor1 = createMockActor()
  const resolveResource: IActivityPubResourceResolver<UrlPathActorRef, URLSearchParams> = createActorResourceRefResolver(actor1);
  const parseUrlToActivityPubResourceRef = createActivityPubCoreServerExpressUrlParser({
    extractActorRef: (url: URL) => {
      return {
        type: "Actor",
        // only first segment
        path: pathFromUrl(url).slice(0,1)
      }
    }
  })
  async function resolve(url: URL) {
    const parsed = parseUrlToActivityPubResourceRef(url);
    debug(`parsed url ${url} to ${JSON.stringify(parsed)}`)
    if ( ! parsed) { return null }
    const parsedType = parsed.type;
    switch (parsedType) {
      case 'Actor':
        return resolveResource(parsed);
      case 'Outbox':
        return resolveResource(parsed);
      case 'OutboxPage':
        return resolveResource(parsed);
    }
    const _: never = parsedType
    return null;
  }
  const dbAdapter = DatabaseAdapter.create({
    resolve,
    urls: {
      outbox: UrlPathTraverser.create('outbox')
    }
  });
  // actor
  const actorFind = await dbAdapter.findEntityById(actorUrl);
  t.deepEqual(actorFind?.type, actor1.type, 'found actor of type')
  // outbox
  const outbox = await dbAdapter.findEntityById(new URL(actorUrl + 'outbox'))
  debug('dbAdapter got outbox', outbox)
  t.notThrows(() => asOrderedCollection(outbox));
  // outbox current page
  const outboxCurrent = await dbAdapter.findEntityById(new URL(actorUrl + 'outbox' + '?current'))
  console.log({outboxCurrent})
  assert(t, outboxCurrent, 'can find current Outbox CollectionPage by id')
  assert(t, hasOwnProperty(outboxCurrent || {}, 'type'), 'outbox current page has type property')
  assert(t, hasActivityStreams2Type(outboxCurrent, 'CollectionPage'), 'outbox current page has type CollectionPage');
})

function createActorResourceRefResolver(actor: Actor) {
  function resolveResource(resourceRef: UrlPathActorRef): Actor
  function resolveResource(resourceRef: ActivityPubOutbox<UrlPathActorRef>): Outbox<unknown>
  function resolveResource(resourceRef: ActivityPubOutboxPage<UrlPathActorRef>): PagedCollection<unknown>
  function resolveResource(resourceRef: ActivityPubServerResource<UrlPathActorRef>) {
    const resourceRefType = resourceRef.type;
    switch (resourceRefType) {
      case 'Actor':
        return actor;
      case 'Outbox':
        return actor.outbox;
      case 'OutboxPage':
        return actor.outbox.current
    }
    const _: never = resourceRef
    throw new Error(`Unexpected resourceRef type ${resourceRefType}`);
  }
  return resolveResource
}
