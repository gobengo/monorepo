import express from "express";
import * as url from 'node:url';
import { activityPub as createActivityPubExpress } from 'activitypub-core-server-express';
import { AddressInfo } from "node:net";
import type { DbAdapter, AuthAdapter, StorageAdapter } from 'activitypub-core-types';
import { DeliveryAdapter } from 'activitypub-core-delivery';
import { FtpStorageAdapter } from 'activitypub-core-storage-ftp';
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import { AP, Plugin } from 'activitypub-core-types';

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    await main()
  }
}

async function main() {
  console.log('starting...')
  const app = express()
    .use(pinoHttp(
      pinoHttpPrint.httpPrintFactory()()
    ))
  const dbAdapter = await createDbAdapter()
  app.use(createActivityPubExpress({
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
  }))
  // app.get('/', (req, res) => {
  //   res.writeHead(200)
  //   res.send(`
  //     <!doctype html>
  //     activitypub-core-example
  //   `)
  // })
  const listener = app.listen(process.env.PORT ?? 0, () => {
    console.log('listening...', addressHttpURL(listener?.address()).toString())
  });
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

async function createDbAdapter(_console=console, env=process.env): Promise<DbAdapter> {
  return {
    ...createMockDbAdapter(),
  } as DbAdapter
}

function createMockDbAdapter(): Pick<DbAdapter, 'findEntityById'|'findOne'|'getActorByUserId'> {
  const personEntity: AP.Entity = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1"
    ],
    id: new URL('https://3445-2605-a601-af8f-a700-d137-4ef4-e90b-5630.ngrok.io/'),
    url: new URL('https://3445-2605-a601-af8f-a700-d137-4ef4-e90b-5630.ngrok.io/'),
    type: 'Person' as const,
    name: 'Anonymous',
    inbox: {
      type: "OrderedCollection",
    },
    outbox: {
      type: "OrderedCollection",
      items: [
        new URL('https://mastodon.social/@bengo/109570348138202820')
      ]
    },
  };
  const findOne: DbAdapter['findOne'] = async (options: unknown) => {
    console.log('findOne', options)
    return personEntity
  }
  const getActorByUserId: DbAdapter['getActorByUserId'] = async (userId: string) => {
    return undefined
  }
  return {
    async findEntityById(id: URL): Promise<AP.Entity> {
      console.log('findEntityById', id.toString())
      return personEntity
    },
    findOne,
    getActorByUserId,
  };
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
function addressHttpURL(address: AddressInfo|string|null): URL {
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
