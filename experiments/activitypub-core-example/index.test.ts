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
  constructor(public actorId: URL, private actor: Actor) {}
  async getById(id: URL) {
    if (this.actorId.toString() !== id.toString()) {
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

class MultiActorRepository implements IActorRepository {
  constructor(
    private options: {
      actorsUrl: URL,
      byPathSegment: {
        get(pathSegment: string): Promise<null|Actor>,
      },
    }
  ) {
    if ( ! options.actorsUrl.toString().endsWith('/')) {
      throw new Error('actorsUrl must end with /')
    }
  }
  async getByPathSegment(pathSegment: string): Promise<null|Actor> {
    return this.options.byPathSegment.get(pathSegment) || null
  }
  async getById(url: URL) {
    const actorsUrlString = this.options.actorsUrl.toString();
    if ( ! url.pathname.startsWith(actorsUrlString)) {
      return null;
    }
    const actorSuffix = url.toString().slice(actorsUrlString.length)
    const actorPathSegment = actorSuffix.split('/')[0]
    return this.getByPathSegment(actorPathSegment)
  }
}

test('MultiActorRepository can get by path segment and id', async t => {
  const actor1 = createMockActor();
  const actor2 = createMockActor();
  const byPathSegmentMap = new Map([
    ['actor1', actor1],
    ['actor2', actor2],
  ])
  const actors = new MultiActorRepository({
    actorsUrl: new URL('http://localhost/actors/'),
    byPathSegment: {
      get: async (pathSegment: string) => byPathSegmentMap.get(pathSegment) ?? null
    }
  })
  t.is(await actors.getByPathSegment('actor1'), actor1)
  t.is(await actors.getByPathSegment('actor2'), actor2)
  t.is(await actors.getByPathSegment('notreal'), null)
})

class ActivityPubActorFinder {
  static fromSingleActorRepository(repo: SingleActorRepository): ActivityPubActorFinder {
    return new ActivityPubActorFinder({
      actors: repo,
      urlToActorId: createActorUrlResolver(repo.actorId),
    })
  }
  constructor(
    private options: {
      actors: IActorRepository,
      urlToActorId: IActorUrlResolver,
    }
  ) {}
  async getByUrl(url: URL): Promise<null|Actor> {
    const actorId = this.options.urlToActorId(url);
    if ( ! actorId) { return null; }
    const fromRepo = await this.options.actors.getById(actorId)
    return fromRepo;
  }
}

test('ActivityPubActorFinder with SingleActorRepository can get actor by url', async (t) => {
  const actorUrl = new URL('http://localhost/actor/')
  const actor1 = createMockActor()
  const finder = ActivityPubActorFinder.fromSingleActorRepository(new SingleActorRepository(actorUrl, actor1))
  const cases = [
    { url: new URL('http://localhost/actor/'), actor: actor1 },
    { url: new URL('http://localhost/actor'), actor: null },
    { url: new URL('http://localhost/actor/outbox/'), actor: actor1 },
    { url: new URL('http://localhost/actor1/outbox/'), actor: null },
  ]
  for (const { url, actor } of cases) {
    const found = await finder.getByUrl(url);
    if (actor) {
      t.is(found?.uuid, actor.uuid, `found actor by url ${url}`)
    } else {
      t.is(found, null, `found no actor by url ${url}`)
    }
  }
})

test.todo('ActivityPubActorFinder with MultiActorRepository can get actor by url')

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
    // resolve /outbox/ to /
    {
      test: (url) => {
        // createPathSegmentUrlSpace baseUrl must end with a slash, but the provided actorUrl may not
        const { baseUrl, baseUrlPathMatchers } = actorUrl.pathname.endsWith('/')
          ? { baseUrl: actorUrl,
              baseUrlPathMatchers: [], }
          : { baseUrl: new URL('/', actorUrl),
              baseUrlPathMatchers: actorUrl.pathname.slice(1).split('/').map(pathSegment => matchers.exact(pathSegment)),}
        const result = createPathSegmentUrlSpace(baseUrl, [...baseUrlPathMatchers, matchers.exact('outbox')], true).includes(url)
        return result;
      },
      resolve: (outboxUrl) => {
        // note: because there is a trailing slash on the outbox matcher, this will go from actor/outbox to actor
        const actorUrl = new URL('..', outboxUrl)
        return actorUrl
      }
    }
  ])
}

test('createActorUrlResolver can resolve URLs', async (t) => {
  const cases = [
    // actor at /
    { actor: new URL('http://localhost/'), url: new URL('http://localhost/') },
    { actor: new URL('http://localhost/'), url: new URL('http://localhost/outbox/') },
    // cant resolve outbox without trailing slash
    { actor: new URL('http://localhost/'), url: new URL('http://localhost/outbox'), expectUnresolvable: true },
    { actor: new URL('http://localhost/'), url: new URL('http://wrongdomain.com/outbox'), expectUnresolvable: true },
    // actor at /defaultActor
    { actor: new URL('http://localhost/defaultActor/'), url: new URL('http://localhost/defaultActor/') },
    { actor: new URL('http://localhost/defaultActor/'), url: new URL('http://localhost/defaultActor/outbox/') },
    // no trailing slash on actor url should not resolve (it's a different URL. If you want this to work, redirect from '' -> '/' and then resolution will go from there)
    { actor: new URL('http://localhost/defaultActor/'), url: new URL('http://localhost/defaultActor'), expectUnresolvable: true },
  ]
  for (const { actor, url, expectUnresolvable=false } of cases) {
    const resolve = createActorUrlResolver(actor)
    const resolution = resolve(url)
    if (expectUnresolvable) {
      t.is(resolution, null, `cannot resolve ${url.toString()}`)
    } else {
      t.is(resolution?.toString(), actor.toString(), `resolves '${url.toString()}' to actor url at '${actor.toString()}'`)
    }
  }
})

function createMultiActorUrlResolver(actorsBaseUrl: URL): IUrlResolver {
  const actorsBaseUrlString = actorsBaseUrl.toString()
  if ( ! actorsBaseUrlString.endsWith('/')) {
    throw new Error(`actorsBaseUrl must end with a slash, but it is '${actorsBaseUrlString}'`)
  }
  return (url) => {
    const actorsBaseUrlString = actorsBaseUrl.toString()
    if ( ! url.toString().startsWith(actorsBaseUrlString)) {
      // url is not in the actorsBaseUrl space
      return null;
    }
    const singleActorPath = url.toString().slice(actorsBaseUrlString.length)
    const actorPathSegment = singleActorPath.split('/')[0]
    const actorUrl = new URL(`${actorPathSegment}/`, actorsBaseUrl)
    const actorResolver = createActorUrlResolver(actorUrl)
    const actorResolution = actorResolver(url)
    return actorResolution;
  }
}

test('createMultiActorUrlResolver can resolve URLs', async (t) => {
  const cases = [
    // actors at /
    { actorsBase: new URL('http://localhost/'), actor: new URL('http://localhost/defaultActor/'), url: new URL('http://localhost/defaultActor/') },
    // { actorsBase: new URL('http://localhost/'), actor: new URL('http://localhost/defaultActor/'), url: new URL('http://localhost/defaultActor/outbox/') },
    { actorsBase: new URL('http://localhost/actors/'), actor: new URL('http://localhost/actors/defaultActor/'), url: new URL('http://localhost/actors/defaultActor/') },
    // cant resolve actor url without trailing slash (if you want this to work, redirect from sans-trailing-slash to with-trailing-slash and then resolution will go from there)
    { actorsBase: new URL('http://localhost/actors/'), actor: new URL('http://localhost/actors/defaultActor/'), url: new URL('http://localhost/actors/defaultActor'), expectUnresolvable: true },
    { actorsBase: new URL('http://localhost/actors/'), actor: new URL('http://localhost/actors/defaultActor/'), url: new URL('http://localhost/actors/defaultActor/wtf'), expectUnresolvable: true },
    { actorsBase: new URL('http://localhost/actors/'), actor: new URL('http://localhost/actors/defaultActor/'), url: new URL('http://localhost/actors/defaultActor/outbox/') },
  ]
  for (const { actorsBase, actor, url, expectUnresolvable=false } of cases) {
    const resolve = createMultiActorUrlResolver(actorsBase)
    t.is(resolve(url)?.toString(), expectUnresolvable ? undefined : actor.toString(), `resolves '${url.toString()}' to actor url at '${actor.toString()}'`)
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
