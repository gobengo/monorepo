import test from "ava";
import { debuglog } from "util"

const debug = debuglog('apcse-url-parser.test')

type ActivityPubOutbox<ActorRef> = {
  type: 'Outbox'
  actor: ActorRef
}

type PageRef = 'current'|'first'|'last'

type ActivityPubOutboxPage<ActorRef, _PageRef=PageRef> = {
  type: 'OutboxPage'
  page: _PageRef
  actor: ActorRef
}

type ActivityPubServerResource<ActorRef> =
| ActorRef
| ActivityPubOutbox<ActorRef>
| ActivityPubOutboxPage<ActorRef>

interface ActivityPubServerResourceResolver<
  /** domain of things that can be resolved */
  Input,
  /** refers to a single actor */
  types extends {
    ActorRef: any
  }
> {
  (input: Input): null | ActivityPubServerResource<types['ActorRef']>;
}

/**
 * A URL Path.
 * Represented as a list of '/'-separated path segments
 */
type UrlPath = [...string[]]

type UrlPathActorRef = {
  type: "Actor",
  path: UrlPath
}

function pathFromUrl (url: URL): UrlPath {
  return url.pathname.slice(1).split('/') as UrlPath
}

function appendPath(path: UrlPath, appendedPath: UrlPath): UrlPath {
  const lastSegment = path[path.length - 1]
  const lastSegmentWithoutSlash = (lastSegment.endsWith('/')) ? lastSegment.slice(0, -1) : lastSegment
  return [...path.slice(0, -1), lastSegmentWithoutSlash, ...appendedPath]
}

function hasPathPrefix(prefix: UrlPath, fullPath: UrlPath) {
  for (let i=0; i < prefix.length; i++) {
    if (prefix[i] !== fullPath[i]) return false
  }
  return true;
}

function pathsEqual(path1: UrlPath, path2: UrlPath): boolean {
  if (path1.length !== path2.length) return false
  for (let i=0; i < path1.length; i++) {
    if (path1[i] !== path2[i]) return false
  }
  return true;
}

/**
 * can parse URLs expected by activitypub-core-server-express to well-defined commands
 */
function createActivityPubCoreServerExpressUrlParser(options: {
  parseActor: (url: URL) => null | UrlPathActorRef
}): ActivityPubServerResourceResolver<URL, { ActorRef: UrlPathActorRef }> {
  type ActorRef = UrlPathActorRef
  return (url: URL): null | ActivityPubServerResource<ActorRef> => {
    const actor = options.parseActor(url);
    if ( ! actor) {
      return null
    }
    const isOutboxPath = pathsEqual(pathFromUrl(url), appendPath(actor.path, ['outbox']))
    if (isOutboxPath) {
      if (url.searchParams.has('current')) {
        const outboxPageCurrentRef: ActivityPubOutboxPage<ActorRef, 'current'> = {
          type: 'OutboxPage',
          page: 'current',
          actor,
        }
        return outboxPageCurrentRef
      }
      const outboxRef: ActivityPubOutbox<ActorRef> = {
        type: 'Outbox',
        actor,
      }
      return outboxRef;
    }
    return actor;
  }
}

function urlPathFromPathname(pathname: `/${string}`): UrlPath {
  return pathname.slice(1).split('/')
}

test('can parse urls from activitypub-core-server-express', async t => {
  const createActorParser = (prefix: UrlPath = []) => (url: URL): null | UrlPathActorRef => {
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
    [createActorParser(), new URL('http://localhost/actor1'), { type: 'Actor', path: ['actor1'] }],
    [createActorParser(urlPathFromPathname('/.ap/actors')), new URL('http://localhost/.ap/actors/actor1'), { type: 'Actor', path: urlPathFromPathname('/.ap/actors/actor1') }],
    // // outbox
    [createActorParser(), new URL('http://localhost/actor1/outbox'), { type: 'Outbox', actor: { type: 'Actor', path: ['actor1'] }}],
    [createActorParser(urlPathFromPathname('/.ap/actors')), new URL('http://localhost/.ap/actors/actor1/outbox'), { type: 'Outbox', actor: { type: 'Actor', path: urlPathFromPathname('/.ap/actors/actor1') }}],
    // outbox current page
    [createActorParser(), new URL('http://localhost/actor1/outbox?current'), { type: 'OutboxPage', actor: { type: 'Actor', path: ['actor1'] }, page: 'current' }],
  ]
  for (const [parseActor, url, expected] of cases) {
    const parse = createActivityPubCoreServerExpressUrlParser({ parseActor })
    t.deepEqual(parse(url), expected, `parses ${url} to ${JSON.stringify(expected, null, 2)}`)
  }
})
