import { Url } from "url";
import { debuglog } from "util"
import { ActivityPubOutbox, ActivityPubOutboxPage, ActivityPubServerResource } from "./ap-resolver.js";
import { appendPath, pathFromUrl, pathsEqual, IUrlPath, urlPathFromPathname } from "./url-path.js"

const debug = debuglog('apcse-url-parser')

export interface IActivityPubServerResourceParser<
  /** domain of things that can be resolved */
  Input,
  /** refers to a single actor */
  ActorRef
> {
  (input: Input): null | ActivityPubServerResource<ActorRef>;
}

export type UrlPathActorRef = {
  type: "Actor",
  path: IUrlPath
}

export function createActivityPubUrlParser<ActorRef>(options: {
  extractActorRef: (url: URL) => null | ActorRef
  isActorOutboxUrl: (actor: ActorRef, url: URL) => boolean
}): IActivityPubServerResourceParser<URL, ActorRef> {
  // type ActorRef = UrlPathActorRef
  return (url: URL): null | ActivityPubServerResource<ActorRef> => {
    debug('createActivityPubUrlParser start', {
      url: url.toString(),
    })
    const actor = options.extractActorRef(url);
    debug('createActivityPubUrlParser extracted actor', {
      actor,
    })
    if ( ! actor) {
      return null
    }
    debug('createActivityPubUrlParser about to isActorOutboxUrl', {
      // isActorOutboxUrl: options.isActorOutboxUrl(actor, url),
    })
    if (options.isActorOutboxUrl(actor, url)) {
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

/**
 * can parse URLs expected by activitypub-core-server-express to well-defined commands
 */
export const createActivityPubCoreServerExpressUrlParser = (options: {
  extractActorRef: (url: URL) => UrlPathActorRef | null
}): IActivityPubServerResourceParser<URL, UrlPathActorRef> => createActivityPubUrlParser({
  extractActorRef: (url: URL) => {
    debug(`extractActorRef ${url}`)
    return options.extractActorRef(url)
  },
  isActorOutboxUrl(actor, url) {
    debug('isActorOutboxUrl start', {
      actor,
      url: url.toString(),
    })
    try {
      pathsEqual(pathFromUrl(url), appendPath(actor.path, ['outbox']))
    } catch (error) {
      debug('error with pathsEqual', { error })
    } finally {
      debug('done with pathsEqual')

    }
    const isOutbox = pathsEqual(pathFromUrl(url), appendPath(actor.path, ['outbox']))
    debug('isActorOutboxUrl did path comparison', {
      isOutbox,
    })
    return isOutbox
  },
})
