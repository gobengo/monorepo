import express from "express";
import assert from "node:assert";
import { activityPub as createActivityPubExpress } from 'activitypub-core-server-express';
import type { DbAdapter, AuthAdapter, StorageAdapter } from 'activitypub-core-types';
import { DeliveryAdapter } from 'activitypub-core-delivery';
import { FtpStorageAdapter } from 'activitypub-core-storage-ftp';
import { AP, Plugin } from 'activitypub-core-types';
import { ensureTrailingSlash } from "./url.js";

export class ActorServer {
  static create(options: {
    app?: express.Express,
    publicBaseUrl?: URL,
  }={}) {
    const { app = express() } = options;
    const activityPubMountPath = '/.activitypub/'
    app
    .use(/^\/$/, redirectActivityPubGet(activityPubMountPath))
    .use(function (req, res, next) {
      const serverBaseUrl = options.publicBaseUrl || new URL(`${req.protocol}://${req.get('host')}`)
      const activityPubBaseUrl = new URL(activityPubMountPath, serverBaseUrl)
      const handleWithActivityPubCore = createActivityPubCoreHandler({
        publicBaseUrl: activityPubBaseUrl,
      })
      const handleWithExpress = express()
        .use(activityPubMountPath, handleWithActivityPubCore)
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
    })
    app.get('/', (req, res) => {
      res.writeHead(200)
      res.send(`
        <!doctype html>
        activitypub-core-example
      `)
    })
    return app;
  }
}

export function createActivityPubCoreHandler(options: {
  publicBaseUrl: URL,
}): express.Handler {
  const {
    publicBaseUrl,
  } = options;
  return function handleWithActivityPubCore(req, res, next) {
    console.log('in handleWithActivityPubCore', {
      originalUrl: req.originalUrl
    });
    (async () => {
      const requestHost = req.get('host')
      assert.ok(requestHost, 'req.headers.host must be truthy')
      const dbAdapter = await createDbAdapter({
        baseUrl: new URL(`${req.protocol}://${requestHost}${req.originalUrl}`),
        host: requestHost,
        publicBaseUrl,
      })
      const handleActivityPub = createActivityPubExpress({
        plugins: [],
        adapters: {
          auth: createAuthAdapter(),
          db: dbAdapter,
          delivery: new DeliveryAdapter({
            adapters: {
              db: dbAdapter,
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
      handleActivityPub(req, res, next);
    })().catch(next)
  }
}


async function createDbAdapter(
  options: DatabaseAdapterCreationOptions
): Promise<DbAdapter> {
  return {
    ...createMockDbAdapter(options),
  } as DbAdapter
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
    console.log('in mock adater', {
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
    console.log('findEntityById', id.toString())
    return createPersonActor(createActorOptions(id.pathname))
  }
  const findOne: DbAdapter['findOne'] = async function (args: unknown) {
    console.log('findOne', arguments)
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
    console.log('in redirectActivityPubGet', {
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
      _console.debug('createUser', arguments)
    },
    getUserIdByToken() {
      _console.debug('getUserIdByToken', arguments)
      return 'mock-userId'
    },
    authenticatePassword() {
      _console.debug('authenticatePassword', arguments)
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
  console.log('renderActivityPubExpressPage', arguments)
  return `
    <!doctype html>
    renderActivityPubExpressPage
  `
}

async function renderActivityPubExpressEntity(options: {
  entity: AP.Entity,
  actor?: AP.Actor,
}) {
  console.log('renderActivityPubExpressPage', arguments)
  return `
    <!doctype html>
    <pre>${JSON.stringify(options.entity, null, 2)}</pre>
  `
}
