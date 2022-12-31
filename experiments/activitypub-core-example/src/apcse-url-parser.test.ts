import test from "ava";
import { debuglog } from "util"
import { ActivityPubServerResource } from "./ap-resolver.js";
import { createActivityPubCoreServerExpressUrlParser, UrlPathActorRef } from "./apcse-url-parser.js";
import { hasPathPrefix, IUrlPath, pathFromUrl, urlPathFromPathname } from "./url-path.js";

const debug = debuglog('apcse-url-parser.test')

test('can parse urls from activitypub-core-server-express', async t => {
  const createActorRefExtractor = (prefix: IUrlPath = []) => (url: URL): null | UrlPathActorRef => {
    const urlPath = pathFromUrl(url)
    if ( ! hasPathPrefix(prefix, urlPath)) {
      debug('does not have prefix', prefix, urlPath)
      return null
    }
    const actorRef: UrlPathActorRef = { type: 'Actor', path: urlPath.slice(0, prefix.length + 1) }
    return actorRef;
  }
  type ActorParser = (url: URL) => null | UrlPathActorRef
  const cases: Array<[ActorParser, URL, ActivityPubServerResource<UrlPathActorRef>]> = [
    // actor
    [createActorRefExtractor(), new URL('http://localhost/actor1'), { type: 'Actor', path: ['actor1'] }],
    [createActorRefExtractor(urlPathFromPathname('/.ap/actors')), new URL('http://localhost/.ap/actors/actor1'), { type: 'Actor', path: urlPathFromPathname('/.ap/actors/actor1') }],
    // // outbox
    [createActorRefExtractor(), new URL('http://localhost/actor1/outbox'), { type: 'Outbox', actor: { type: 'Actor', path: ['actor1'] }}],
    [createActorRefExtractor(urlPathFromPathname('/.ap/actors')), new URL('http://localhost/.ap/actors/actor1/outbox'), { type: 'Outbox', actor: { type: 'Actor', path: urlPathFromPathname('/.ap/actors/actor1') }}],
    // outbox current page
    [createActorRefExtractor(), new URL('http://localhost/actor1/outbox?current'), { type: 'OutboxPage', actor: { type: 'Actor', path: ['actor1'] }, page: 'current' }],
  ]
  for (const [extractActorRef, url, expected] of cases) {
    const parse = createActivityPubCoreServerExpressUrlParser({ extractActorRef })
    t.deepEqual(parse(url), expected, `parses ${url} to ${JSON.stringify(expected, null, 2)}`)
  }
})
