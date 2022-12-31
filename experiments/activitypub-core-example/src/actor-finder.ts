import type {
  IActorRepository,
  MultiActorRepository,
  SingleActorRepository,
} from "./actor-repository.js";
import { Actor } from "./actor.js";
import { composeTestedUrlResolver, createPathSegmentUrlSpace, IUrlResolver, matchers } from "./url.js";

/**
 * Given a URL, return a URL that should be used to fetch the resource's relevant ActivityPub actor.
 * Usually this is a purely syntactical transformation.
 */
type IActorUrlResolver = (url: URL) => URL|null

export class ActivityPubActorFinder {
  static fromSingleActorRepository(repo: SingleActorRepository): ActivityPubActorFinder {
    return new ActivityPubActorFinder({
      actors: repo,
      urlToActorId: createActorUrlResolver(repo.actorId),
    })
  }
  static fromMultiActorRepository(repo: MultiActorRepository): ActivityPubActorFinder {
    return new ActivityPubActorFinder({
      actors: repo,
      urlToActorId: createMultiActorUrlResolver(repo.actorsUrl),
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

export function createActorUrlResolver(actorUrl: URL): IUrlResolver {
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

export function createMultiActorUrlResolver(actorsBaseUrl: URL): IUrlResolver {
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
    const actorResolution = createActorUrlResolver(actorUrl)(url)
    return actorResolution;
  }
}
