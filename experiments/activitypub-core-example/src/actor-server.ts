import express from "express";
import assert from "node:assert";
import { activityPub as createActivityPubExpress } from 'activitypub-core-server-express';
import type { DbAdapter, AuthAdapter, StorageAdapter } from 'activitypub-core-types';
import { DeliveryAdapter } from 'activitypub-core-delivery';
import { FtpStorageAdapter } from 'activitypub-core-storage-ftp';
import { AP, Plugin } from 'activitypub-core-types';
import { ensureTrailingSlash } from "./url.js";
import { IActivityPubUrlResolver } from "./ap-url-resolver.js";
import { DatabaseAdapter } from "./apc-db-adapter.js";
import { debuglog } from 'node:util';
import type { IMinimalApcDatabaseAdapter } from "./apc-db-adapter"
import { UrlPathTraverser } from "./url.js"
import { IActivityPubTraversers } from "./ap-url-parser.js";
import { Actor } from "./actor.js";
import { createActivityPubCoreServerExpressUrlParser, UrlPathActorRef } from "./apcse-url-parser.js";
import { IUrlPath, pathFromUrl } from "./url-path.js";
import { createActorResourceRefResolver, IActivityPubResourceResolver } from "./ap-resolver.js";

const debug = debuglog('actor-server');

export class ActorServer {
  static create(options: {
    app?: express.Express,
    publicBaseUrl?: URL,
    getActor: (ref: { path: IUrlPath }) => Promise<Actor<URLSearchParams>|null>
  }) {
    const {
      app = express(),
    } = options;
    const urls: IActivityPubTraversers = {
      outbox: UrlPathTraverser.create('outbox')
    }
    app
    .use(function (req, res, next) {
      const baseUrl = options.publicBaseUrl || new URL(`${req.protocol}://${req.get('host')}${req.baseUrl}`);
      try {
        const parseUrlToActivityPubResourceRef = createActivityPubCoreServerExpressUrlParser({
          extractActorRef: (url: URL) => {
            // @todo consider supporting more than just []
            const path: IUrlPath = [] // pathFromUrl(url).slice(0,1)
            const actorRef = {
              type: "Actor",
              // only first segment
              path,
              url: baseUrl,
            } as const
            debug('parseUrlToActivityPubResourceRef', {
              url: url.toString(),
              req: {
                baseUrl: req.baseUrl,
                url: req.url,
              },
              actorRef,
            })
            return actorRef
          }
        })
        async function resolve(url: URL) {
          debug('resolve start', {
            url: url.toString(),
          })
          const parsed = parseUrlToActivityPubResourceRef(url)
          debug('resolve parsed', {
            url: url.toString(),
            parsed,
          })
          if ( ! parsed) {
            return null;
          }
          const parsedType = parsed.type;
          const actorRef = (() => {
            const parsedType = parsed.type;
            switch (parsedType) {
              case "Outbox":
              case "OutboxPage":
                return parsed.actor;
              case "Actor":
                return parsed
            }
            const _: never = parsedType
          })();
          const actor = await options.getActor(actorRef);
          if ( ! actor) {
            return null;
          }
          const resolveResource: IActivityPubResourceResolver<UrlPathActorRef, URLSearchParams> = createActorResourceRefResolver(actor);
          const resolved = (() => {
            switch (parsedType) {
              case 'Actor':
                return resolveResource(parsed);
              case 'Outbox':
                return resolveResource(parsed);
              case 'OutboxPage':
                return resolveResource(parsed);
            }
            const _: never = parsedType
            throw new Error(`unexpected parsedType ${parsedType}`)
          })();
          debug('resolve resolved', resolved)
          return resolved;
        }
        const dbAdapter = DatabaseAdapter.create({
          resolve,
          urls,
          getExternalUrl: (url) => {
            debug('getExternalUrl', url.toString())
            const baseUrl = options.publicBaseUrl || new URL(`${req.protocol}://${req.get('host')}${req.baseUrl}`)
            const externalUrl = new URL(baseUrl + withoutLeadingSlash(req.url))
            debug('built externalUrl', {
              baseUrl: baseUrl.toString(),
              externalUrl: externalUrl.toString(),
            })
            return externalUrl
          }
        });
        const serverBaseUrl = options.publicBaseUrl || new URL(`${req.protocol}://${req.get('host')}`)
        const activityPubBaseUrl = serverBaseUrl
        const handleWithActivityPubCore = createActivityPubCoreHandler({
          publicBaseUrl: activityPubBaseUrl,
          dbAdapter,
        })
        const handleWithExpress = express()
          .use(handleWithActivityPubCore)
          .use(function (req, res, next) {
            const prefixes = ['/.well-known/webfinger'];
            for (const _ of prefixes) {
              if (req.url.startsWith(_)) {
                return handleWithActivityPubCore(req, res, next)
              }
              next();
            }
          });
        handleWithExpress(req, res, next)
      } catch (error) {
        next(error)
      }
    })
    // app.get('/', (req, res) => {
    //   res.writeHead(200)
    //   res.send(`
    //     <!doctype html>
    //     activitypub-core-example
    //   `)
    // })
    return app;
  }
}

export function createActivityPubCoreHandler(options: {
  publicBaseUrl: URL,
  dbAdapter: IMinimalApcDatabaseAdapter,
}): express.Handler {
  const {
    publicBaseUrl,
  } = options;
  const db = options.dbAdapter as unknown as DbAdapter;
  return function handleWithActivityPubCore(req, res, next) {
    debug('in handleWithActivityPubCore', {
      originalUrl: req.originalUrl
    });
    (async () => {
      const requestHost = req.get('host')
      assert.ok(requestHost, 'req.headers.host must be truthy')
      const handleActivityPub = createActivityPubExpress({
        plugins: [],
        adapters: {
          auth: createAuthAdapter(),
          db,
          delivery: new DeliveryAdapter({
            adapters: {
              db,
            },
          }),
          storage: new FtpStorageAdapter(
            JSON.parse(decodeURIComponent(process.env.AP_FTP_CONFIG ?? '{}')),
            '/uploads'
          )
        },
        pages: {
          directory: renderActivityPubExpressPage,
          entity: renderActivityPubExpressEntity,
          home: renderActivityPubExpressPage,
          login: renderActivityPubExpressPage,
        },
      });
      debug('about to handleActivityPub', `${req.url}`)
      handleActivityPub(req, res, next);
    })().then(next).catch(next)
  }
}

function withoutLeadingSlash(path: string): string {
  if (path.startsWith('/')) return path.slice(1);
  return path
}

function createMockDbAdapter(
  options: DatabaseAdapterCreationOptions
): Pick<DbAdapter, 'findEntityById'|'findOne'|'getActorByUserId'> {
  const createActorOptions = (actorPath: string): Parameters<typeof createPersonActor>[0] => {
    const publicActivityPubUrl = ensureTrailingSlash(options.publicBaseUrl)
    const entityUrl = ensureTrailingSlash(new URL(withoutLeadingSlash(actorPath), publicActivityPubUrl))
    debug('in mock adater', {
      actorPath,
      entityUrl: entityUrl.toString(),
      publicActivityPubUrl: publicActivityPubUrl.toString(),
    })
    return {
      id: options.publicBaseUrl,
      preferredUsername: 'default',
      inbox: new URL('inbox', entityUrl),
      outbox: new URL('outbox', entityUrl),
    }
  }
  const findEntityById: DbAdapter['findEntityById'] = async (id: URL) => {
    // if there is an options.activityPubMountPath
    // id will be like 'http://localhost:3000/entity/default' even if the actual request was different
    // because it won't know about activityPubMountPath
    debug('findEntityById', id.toString())
    return createPersonActor(createActorOptions(id.pathname))
  }
  const findOne: DbAdapter['findOne'] = async function (args: unknown) {
    debug('findOne', arguments)
    return createPersonActor(createActorOptions('/entity/default'))
  }
  const getActorByUserId: DbAdapter['getActorByUserId'] = async (userId: string) => {
    return undefined
  }
  return {
    findEntityById,
    findOne,
    getActorByUserId,
  };
}

function createPersonActor(options: {
  id: URL,
  preferredUsername: string,
  inbox: URL,
  outbox: URL,
}): AP.Person {
  const personEntity = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1"
    ],
    id: options.id,
    url: options.id,
    preferredUsername: options.preferredUsername,
    summary: "an actor",
    published: new Date,
    discoverable: true,
    type: 'Person' as const,
    name: 'Anonymous',
    inbox: options.inbox,
    outbox: options.outbox,
  };
  return personEntity
}


/**
 * express.js middleware to redirece GET requests preferring activitypub requests to another URL
 * @param redirectTo - relative url to redirect to
 */
export function redirectActivityPubGet(redirectTo: string): express.Handler {
  return function (req, res, next) {
    debug('in redirectActivityPubGet', {
      url: req.url,
      accept: req.headers.accept,
    })
    const acceptsActivityStreams = req.accepts('application/ld+json; profile="https://www.w3.org/ns/activitystreams"');
    if (acceptsActivityStreams) {
      return res.redirect(302, redirectTo);
    }
    next();
  }
}

function createAuthAdapter(_console=console): AuthAdapter {
  return {
    createUser() {
      debug('createUser', arguments)
    },
    getUserIdByToken() {
      debug('getUserIdByToken', arguments)
      return 'mock-userId'
    },
    authenticatePassword() {
      debug('authenticatePassword', arguments)
    }
  }
}

interface DatabaseAdapterCreationOptions {
  baseUrl: URL
  /** external-facing hostname of request/server */
  host: string,
  /** external-facing base URL of request/server */
  publicBaseUrl: URL
}


async function renderActivityPubExpressPage() {
  return `
    <!doctype html>
    renderActivityPubExpressPage
  `
}

async function renderActivityPubExpressEntity(options: {
  entity: AP.Entity,
  actor?: AP.Actor,
}) {
  return `
    <!doctype html>
    <pre>${JSON.stringify(options.entity, null, 2)}</pre>
  `
}
