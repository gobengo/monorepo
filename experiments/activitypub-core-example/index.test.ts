import test from "ava";
import { addressHttpURL } from "./index.js";

test('addressHttpURL', async (t) => {
  t.is(addressHttpURL({
    address: '::',
    port: 3000,
  }).toString(), 'http://localhost:3000/')
})

type UUID = string
type Actor = { uuid: UUID }

interface IActorRepository {
  getById(id: URL): Promise<null|Actor>
}

class SingleActorRepository implements IActorRepository {
  constructor(private id: URL, private actor: Actor) {}
  async getById(id: URL) {
    if (this.id !== id) {
      return null;
    }
    return this.actor
  }
}

function createMockActor(): Actor {
  return {
    uuid: `uuid-${Math.random().toString().slice(2)}`,
  }
}

test('SingleActorRepository can get by id', async (t) => {
  const actorUrl = new URL('http://localhost/actor')
  const actor1 = createMockActor()
  const actors = new SingleActorRepository(actorUrl, actor1)
  const found = await actors.getById(actorUrl)
  t.is(found?.uuid, actor1.uuid, 'found actor by id')
})

class ActivityPubEntityFinder {
  constructor(
    private options: {
      actors: IActorRepository,
      locality: UrlLocality,
    }
  ) {}
  getById(url: URL): null|Actor {
    if ( ! this.options.locality(url)) {
      return null;
    }
    return null;
  }
}

/**
 * represents a collection of 'local' resources.
 */
type UrlLocality = (url: URL) => boolean

function createBaseUrlLocality(baseUrl: URL): UrlLocality {
  return (url: URL) => url.toString().startsWith(baseUrl.toString())
}

test.skip('ActivityPubEntityFinder can find actor by id', async (t) => {
  const localityBaseUrl = new URL('http://localhost')
  const locality = createBaseUrlLocality(new URL('http://localhost'))
  const actorUrl = new URL('actor', localityBaseUrl)
  t.is(actorUrl.toString(), 'http://localhost/actor')
  const actor1 = createMockActor()
  const actors = new SingleActorRepository(actorUrl, actor1)

  const finder = new ActivityPubEntityFinder({ actors, locality })
  const found = finder.getById(actorUrl);
  t.assert(found, 'found actor by id')
})

/**
 * Given a URL, return a URL that should be used to fetch the resource's relevant ActivityPub actor.
 * Usually this is a purely syntactical transformation.
 */
type IActorUrlResolver = (url: URL) => URL|null

// class createActorUrlResolver(): IActorUrlResolver {

// }

// test('ActorUrlResolver can resolve URLs to actor URLs', async (t) => {
//   const actorUrls = new ActorUrlResolver();
// })

/**
 * a space of URLs
 */
interface UrlSpace {
  /** whether the UrlSpace includes the URL */
  includes(url: URL): boolean,
  toString(): string,
}

interface PathSegmentTester {
  test(segment: string): boolean,
  toString(): string,
}

type PathSegmentMatcher =
| undefined
| PathSegmentTester

/**
 * UrlSpace containing all the URLs that are a single path segment under a common baseUrl.
 * e.g. if baseUrl is 'http://localhost/foo', then 'http://localhost/foo/bar' is contained, but not 'http://localhost/foo/bar/baz'
 * @param baseUrl 
 */
function createPathSegmentUrlSpace(baseUrl: URL, segmentExpectations: Array<PathSegmentMatcher>): UrlSpace {
  if ( ! baseUrl.pathname.endsWith('/')) {
    throw new Error('baseUrl must end with a slash')
  }
  function includes(url: URL): boolean {
    const urlString = url.toString();
    const baseUrlString = baseUrl.toString();
    if ((segmentExpectations.length === 0) && (urlString === baseUrlString)) {
      // when there no segmentExpectations, the url must equal the baseUrl
      return true;
    }
    if ( ! urlString.startsWith(baseUrlString)) {
      // url is not under baseUrl
      return false;
    }
    const urlSuffix = url.toString().slice(baseUrl.toString().length)
    const segments = urlSuffix.split('/')
    if (segments.length !== segmentExpectations.length) {
      return false;
    }
    for (const [i, expectation] of segmentExpectations.entries()) {
      if (expectation && ! expectation.test(segments[i])) {
        return false;
      }
    }
    return true;
  }
  function toString() {
    const segmentsString = `[${new Array(segmentExpectations.length + 1).fill('').join(',')}]`
    return `PathSegmentUrlSpace(${baseUrl},${segmentsString})`
  }
  return { includes, toString }
}

test('PathSegmentUrlSpace cannot be created from baseUrl without trailing slash', async (t) => {
  t.throws(() => createPathSegmentUrlSpace(new URL('http://localhost/foo'), []))
})

test('PathSegmentUrlSpace detects whether any URL is within a single path segment of a baseUrl', async (t) => {
  const baseUrl = new URL('http://localhost')
  const matchers = {
    exact: (expectedValue: string) => ({
      test: (value: string) => value === expectedValue,
      toString() { return `exact(${expectedValue})` },
    }),
  }
  const cases: Array<[space: UrlSpace, includes: URL[], doesNotInclude: URL[]]> = [
    [
      // zero segment after baseUrl
      createPathSegmentUrlSpace(baseUrl, []),
      [new URL('', baseUrl)],
      [new URL('foo', baseUrl)]
    ],
    [
      // one segment after baseUrl
      createPathSegmentUrlSpace(baseUrl, [,]),
      [new URL('foo', baseUrl)],
      [new URL('foo/bar', baseUrl)]
    ],
    [
      // two segments after baseUrl
      createPathSegmentUrlSpace(baseUrl, [,,]),
      [new URL('foo/bar', baseUrl)],
      [new URL('foo', baseUrl), new URL('foo/bar/baz', baseUrl)]
    ],
    [
      // two segments after baseUrl
      createPathSegmentUrlSpace(baseUrl, [,matchers.exact('bar')]),
      [
        new URL('baz/bar', baseUrl),
        new URL('foo/bar', baseUrl)
      ],
      [
        new URL('baz/bip', baseUrl),
      ],
    ],
  ];
  for (const [space, shouldInclude, shouldNotInclude] of cases) {
    for (const url of shouldInclude) {
      t.assert(space.includes(url), `${url} should be included in ${space}`)
    }
    for (const url of shouldNotInclude) {
      t.assert( ! space.includes(url), `${url} should not be included in ${space}`)
    }
  }
})
