import test from "ava";
import { addressHttpURL } from "./index.js";
import { withoutTrailingSlash } from "./url.js";

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

type IUrlResolver = (url: URL) => URL|null

interface ITestedUrlResolverOptions {
  test: (url: URL) => boolean,
  resolve: IUrlResolver  
}

function createTestedUrlResolver(options: ITestedUrlResolverOptions): IUrlResolver {
  return (url: URL) => {
    if (options.test(url)) {
      return options.resolve(url);
    }
    return null;
  };
}

test('createTestedUrlResolver can resolve URLs', async (t) => {
  const actorsUrl = new URL('http://localhost/actors/')
  const resolve = createTestedUrlResolver({
    test: (url) => createPathSegmentUrlSpace(actorsUrl, [undefined, matchers.exact('outbox')]).includes(url),
    resolve: (outboxUrl) => {
      // note: because there is no trailing slash on the outbox matcher, this will go from actor/outbox to actor
      const actorUrl = withoutTrailingSlash(new URL('.', outboxUrl))
      return actorUrl
    }
  });
  const resolved = resolve(new URL('defaultActor/outbox', actorsUrl))
  t.is(
    resolved?.toString(),
    'http://localhost/actors/defaultActor'
  )
})

function composeTestedUrlResolver(testResolveConfigs: Array<ITestedUrlResolverOptions>): IUrlResolver {
  return (url) => {
    for (const config of testResolveConfigs) {
      const singleResolve = createTestedUrlResolver(config)
      const resolution = singleResolve(url)
      if (resolution) {
        return resolution;
      }
    }
    return null;
  }
}

test('composeTestedUrlResolver can resolve URLs', async (t) => {
  const resolve = composeTestedUrlResolver([
    {
      test: (url) => (url.pathname === '/a'),
      resolve: (url) => url,
    },
    {
      test: (url) => (url.pathname === '/b'),
      resolve: (url) => url,
    }
  ])
  const baseUrl = new URL('http://localhost')
  t.is(resolve(new URL('/a', baseUrl))?.toString(), 'http://localhost/a')
  t.is(resolve(new URL('/b', baseUrl))?.toString(), 'http://localhost/b')
  t.is(resolve(new URL('/c', baseUrl)), null)
})

function createActorUrlResolver(actorUrl: URL): IUrlResolver {
  return composeTestedUrlResolver([
    // resolve / to /
    {
      test: (url) => actorUrl.toString() === url.toString(),
      resolve: (url) => url,
    },
    // resolve /outbox to /
    {
      test: (url) => {
        // createPathSegmentUrlSpace baseUrl must end with a slash, but the provided actorUrl may not
        const { baseUrl, baseUrlPathMatchers } = actorUrl.pathname.endsWith('/')
          ? { baseUrl: actorUrl,
              baseUrlPathMatchers: [], }
          : { baseUrl: new URL('/', actorUrl),
              baseUrlPathMatchers: actorUrl.pathname.slice(1).split('/').map(pathSegment => matchers.exact(pathSegment)),}
        const result = createPathSegmentUrlSpace(baseUrl, [...baseUrlPathMatchers, matchers.exact('outbox')]).includes(url)
        return result;
      },
      resolve: (outboxUrl) => {
        // note: because there is no trailing slash on the outbox matcher, this will go from actor/outbox to actor
        const actorUrl = withoutTrailingSlash(new URL('.', outboxUrl))
        return actorUrl
      }
    }
  ])
}

test('createActorUrlResolver can resolve URLs', async (t) => {
  const cases = [
    // actor at /
    { actor: new URL('http://localhost/'), url: new URL('http://localhost/') },
    { actor: new URL('http://localhost/'), url: new URL('http://localhost/outbox') },
    // actor at /defaultActor
    { actor: new URL('http://localhost/defaultActor'), url: new URL('http://localhost/defaultActor') },
    { actor: new URL('http://localhost/defaultActor'), url: new URL('http://localhost/defaultActor/outbox') },
  ]
  for (const { actor, url } of cases) {
    const resolve = createActorUrlResolver(actor)
    t.is(resolve(url)?.toString(), actor.toString(), `resolves '${url.toString()}' to actor url at '${actor.toString()}'`)
  }
})

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

const matchers = {
  exact: (expectedValue: string) => ({
    test: (value: string) => value === expectedValue,
    toString() { return `exact(${expectedValue})` },
  }),
}

/**
 * UrlSpace containing all the URLs that are a single path segment under a common baseUrl.
 * e.g. if baseUrl is 'http://localhost/foo', then 'http://localhost/foo/bar' is contained, but not 'http://localhost/foo/bar/baz'
 * @param baseUrl 
 */
function createPathSegmentUrlSpace(baseUrl: URL, segmentExpectations: Array<PathSegmentMatcher>, trailingSlash=false): UrlSpace {
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
    // if trailingSlash is expected, then splitting on '/' will have a final segment of ''
    const slashSplitSegmentExpectations = trailingSlash ? [...segmentExpectations, matchers.exact('')] : segmentExpectations
    const segments = urlSuffix.split('/')
    if (segments.length !== slashSplitSegmentExpectations.length) {
      return false;
    }
    for (const [i, expectation] of slashSplitSegmentExpectations.entries()) {
      if (expectation && ! expectation.test(segments[i])) {
        return false;
      }
    }
    return true;
  }
  function toString() {
    const segmentsString = `[${new Array(segmentExpectations.length + 1).fill('').join(',')}]`
    return `PathSegmentUrlSpace(${baseUrl}${segmentsString}${trailingSlash ? '/' : ''})`
  }
  return { includes, toString }
}

test('PathSegmentUrlSpace cannot be created from baseUrl without trailing slash', async (t) => {
  t.throws(() => createPathSegmentUrlSpace(new URL('http://localhost/foo'), []))
})

test('PathSegmentUrlSpace detects whether any URL is within a single path segment of a baseUrl', async (t) => {
  const baseUrl = new URL('http://localhost')
  const cases: Array<[space: UrlSpace, includes: URL[], doesNotInclude: URL[]]> = [
    [
      // zero segment after baseUrl without trailing slash
      createPathSegmentUrlSpace(baseUrl, [], false),
      [new URL('http://localhost')],
      [new URL('http://localhost/foo')]
    ],
    [
      // zero segment after baseUrl with trailing slash
      createPathSegmentUrlSpace(baseUrl, [], true),
      [new URL('http://localhost')],
      [new URL('http://localhost/bar')]
    ],
    [
      // one segment after baseUrl without trailing slash
      createPathSegmentUrlSpace(baseUrl, [,]),
      [new URL('foo', baseUrl)],
      [new URL('foo/bar', baseUrl)]
    ],
    [
      // one segment after baseUrl with trailing slash
      createPathSegmentUrlSpace(baseUrl, [,], true),
      [new URL('foo/', baseUrl)],
      [new URL('foo', baseUrl)]
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
