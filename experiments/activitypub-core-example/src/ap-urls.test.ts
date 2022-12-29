import test from "ava";
import { createMockActor } from "./actor.js";
import { composeTestedUrlResolver, ensureTrailingSlash, IUrlResolver, matchers } from "./url.js";

interface ActivityPubUrlParseResult {
  relation: 'self' | 'outbox'
  actor: URL
}

/**
 * Configuration for how various named path segments correspond to relationships
 * between resources at that path segment and the resource with URI one path segment up.
 * e.g. a resource 'http://localhost/' might have the 'outbox' relation to 'http://localhost/myOutbox'
 */
interface PathSegmentUrlConfig {
  outbox: string
}

class ActivityPubUrlParser {
  static fromPathSegmentUrlConfig(urlConfig: PathSegmentUrlConfig): ActivityPubUrlParser {
    return new ActivityPubUrlParser(
      composeTestedUrlResolver([
        {
          test: (url) => url.pathname === urlConfig.outbox,
          resolve: (url) => ({
            actor: url,
            relation: 'outbox',
          })
        }
      ])
    )
  }
  protected constructor(
    private resolver: IUrlResolver<ActivityPubUrlParseResult>
  ) {}
  parse(url: URL): ActivityPubUrlParseResult {
    const resolution = this.resolver(url);
    return resolution ?? {
      actor: url,
      relation: 'self',
    }
  }
}

test.skip('ActivityPubUrlParser parses object URLs', async t => {
  const urlConfig = {
    outbox: 'fooOutbox',
  }
  const baseUrl = new URL('http://localhost');
  const actorUrl = new URL('http://localhost/actor')
  const actor1 = createMockActor()
  const urlParser = ActivityPubUrlParser.fromPathSegmentUrlConfig(urlConfig)
  t.deepEqual(urlParser.parse(baseUrl), {
    actor: baseUrl,
    relation: 'self',
  })
  t.deepEqual(urlParser.parse(new URL(urlConfig.outbox, baseUrl)), {
    actor: baseUrl,
    relation: 'outbox',
  })
})

/**
 * Configuration for a function that will, given a node A, return another node that has the provided relation to A
 */
interface EdgeInverterConfig<Target=URL,Source=URL> {
  // what edge type will be inverted
  edge: string
  targetToSource(target: Target): Source
}

type EdgeInverter<Target=URL,Source=URL> = (target: Target) => Source
