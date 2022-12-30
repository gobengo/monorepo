import { CannotTraverseError, EdgeTraverser, UrlPathTraverser } from "./url.js";

export interface ActivityPubUrlParseResult {
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

/**
 * Parses URLs to determine the relation between the URL and the actor it belongs to (if any)
 */
export class ActivityPubUrlParser {
  static fromPathSegmentUrlConfig(
    isActor: (url: URL) => boolean,
    urlConfig: PathSegmentUrlConfig,
  ): ActivityPubUrlParser {
    return new ActivityPubUrlParser(
      isActor,
      UrlPathTraverser.create(urlConfig.outbox)
    )
  }
  protected constructor(
    private isActor: (url: URL) => boolean,
    private outboxUrlTraverser: EdgeTraverser<URL>
  ) {}
  parse(url: URL): ActivityPubUrlParseResult|null {
    if (this.isActor(url)) {
      return {
        relation: 'self',
        actor: url,
      }
    }
    try {
      return {
        relation: 'outbox',
        actor: this.outboxUrlTraverser.invert(url)
      }
    } catch (error) {
      if ( ! (error instanceof CannotTraverseError)) {
        throw error;
      }
    }
    return null;
  }
}
