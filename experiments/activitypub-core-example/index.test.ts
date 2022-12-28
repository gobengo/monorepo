import test from "ava";
import { addressHttpURL } from "./index.js";
import { ActivityPubActorFinder, createActorUrlResolver, createMultiActorUrlResolver } from "./src/actor-finder.js";
import { IActorRepository, MultiActorRepository, SingleActorRepository } from "./src/actor-repository.js";
import { Actor, createMockActor } from "./src/actor.js";
import { composeTestedUrlResolver, createPathSegmentUrlSpace, createTestedUrlResolver, IUrlResolver, matchers, UrlSpace, withoutTrailingSlash } from "./src/url.js";

test('addressHttpURL', async (t) => {
  t.is(addressHttpURL({
    address: '::',
    port: 3000,
  }).toString(), 'http://localhost:3000/')
})

test('SingleActorRepository can get by id', async (t) => {
  const actorUrl = new URL('http://localhost/actor')
  const actor1 = createMockActor()
  const actors = new SingleActorRepository(actorUrl, actor1)
  const found = await actors.getById(actorUrl)
  t.is(found?.uuid, actor1.uuid, 'found actor by id')
})

test('MultiActorRepository can get by path segment and id', async t => {
  const actor1 = createMockActor();
  const actor2 = createMockActor();
  const byPathSegmentMap = new Map([
    ['actor1', actor1],
    ['actor2', actor2],
  ])
  const actors = new MultiActorRepository({
    actorsUrl: new URL('http://localhost/actors/'),
    byPathSegment: byPathSegmentMap,
  })
  t.is(await actors.getByPathSegment('actor1'), actor1)
  t.is(await actors.getByPathSegment('actor2'), actor2)
  t.is(await actors.getByPathSegment('notreal'), null)
})

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

test('ActivityPubActorFinder with MultiActorRepository can get actor by url', async t => {
  const actor1 = createMockActor();
  const actor2 = createMockActor();
  const actorsUrl = new URL('http://localhost/foo/actors/')
  const actors = new MultiActorRepository({
    actorsUrl,
    byPathSegment: new Map([
      ['actor1', actor1],
      ['actor2', actor2],
    ])
  })
  const finder = ActivityPubActorFinder.fromMultiActorRepository(actors)
  const cases = [
    { url: new URL('actor1/', actorsUrl), actor: actor1 },
    { url: new URL('actor2/', actorsUrl), actor: actor2 },
    { url: new URL('actor3/', actorsUrl), actor: null },
    // will fail because no trailing slash
    { url: new URL('actor1', actorsUrl), actor: null },
    { url: new URL('actor1/outbox/', actorsUrl), actor: actor1 },
    { url: new URL('actor2/outbox/', actorsUrl), actor: actor2 },
    // will fail because no trailing slash
    { url: new URL('actor1/outbox', actorsUrl), actor: null },
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
