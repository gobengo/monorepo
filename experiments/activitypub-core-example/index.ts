import express from "express";
import { activityPub as createActivityPubExpress } from 'activitypub-core-server-express';
import { AddressInfo } from "node:net";
import type { DbAdapter, AuthAdapter, StorageAdapter } from 'activitypub-core-types';
import { DeliveryAdapter } from 'activitypub-core-delivery';
import { FtpStorageAdapter } from 'activitypub-core-storage-ftp';
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import { AP, Plugin } from 'activitypub-core-types';
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { ensureTrailingSlash } from "./src/url.js";

if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    await main()
  }
}

async function main() {
  const publicBaseUrl = new URL(readEnv('PUBLIC_BASE_URL'))
  console.log('starting...')
  const app = express()
    .use(pinoHttp(
      pinoHttpPrint.httpPrintFactory()()
    ))
  const activityPubMountPath = '/.activitypub/'
  const handleWithActivityPubCore = createActivityPubCoreHandler({
    activityPubMountPath,
    publicBaseUrl,
  })
  app
  .use(/^\/$/, redirectActivityPubGet(activityPubMountPath))
  .use((function () {
    return express()
    .use(activityPubMountPath, handleWithActivityPubCore)
    .use(function (req, res, next) {
      const prefixes = ['/.well-known/webfinger'];
      for (const _ of prefixes) {
        if (req.url.startsWith(_)) {
          return handleWithActivityPubCore(req, res, next)
        }
        next();
      }
    })
  })())
  app.get('/', (req, res) => {
    res.writeHead(200)
    res.send(`
      <!doctype html>
      activitypub-core-example
    `)
  })
  const listener = app.listen(process.env.PORT ?? 0, () => {
    console.log('listening...', addressHttpURL(listener?.address()).toString())
  });

  

}

function createActivityPubCoreHandler(options: {
  activityPubMountPath: string
  publicBaseUrl: URL,
}): express.Handler {
  const {
    activityPubMountPath,
    publicBaseUrl,
  } = options;
  return function handleWithActivityPubCore(req, res, next) {
    (async () => {
      console.log(`in ${activityPubMountPath}`, {
        url: req.url,
        host: req.headers.host,
      })
      const requestHost = req.headers.host;
      assert.ok(requestHost, 'req.headers.host must be truthy')
      const dbAdapter = await createDbAdapter({
        baseUrl: new URL(`${req.protocol}://${requestHost}${activityPubMountPath}`),
        host: requestHost,
        activityPubMountPath,
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

/**
 * express.js middleware to redirece GET requests preferring activitypub requests to another URL
 * @param redirectTo - relative url to redirect to
 */
function redirectActivityPubGet(redirectTo: string): express.Handler {
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
  /** HTTP Path base that activitypub-core middleware is mounted at */
  activityPubMountPath: string
  /** external-facing hostname of request/server */
  host: string,
  /** external-facing base URL of request/server */
  publicBaseUrl: URL
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
    const publicActivityPubUrl = ensureTrailingSlash(new URL(`${withoutLeadingSlash(options.activityPubMountPath)}`, options.publicBaseUrl))
    const entityUrl = ensureTrailingSlash(new URL(withoutLeadingSlash(actorPath), publicActivityPubUrl))
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

function readEnv(key: string, env=process.env): string {
  const value = env[key]
  if (value === undefined) {
    throw new Error(`missing environment variable: ${key}`)
  }
  return value
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

/**
 * Given a node.js listener address, return a URL where it can be fetched over HTTP
 */
export function addressHttpURL(address: Pick<AddressInfo, 'address'|'port'>|string|null): URL {
  if ( ! address) {
    throw new Error('cannot format null address')
  }
  const hostString = (typeof address === 'string') ? address
    : (address.address === '::') ? 'localhost'
    : address.address;
  const url = new URL(`http://${hostString}`)
  if (typeof address === 'object') {
    url.port = address.port.toString()
  }
  return url;
}
