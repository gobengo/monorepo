import express from "express";
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import { fileURLToPath } from "node:url";
import { addressUrl } from "./src/http.js";

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
  app
  .use(/^\/$/, redirectActivityPubGet(activityPubMountPath))
  app.get('/', (req, res) => {
    res.writeHead(200)
    res.send(`
      <!doctype html>
      simple-activitypub-actor
    `)
  })
  const listener = app.listen(process.env.PORT ?? 0, () => {
    console.log('listening...', addressUrl(listener?.address()).toString())
  });
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

function ensureTrailingSlash(url: URL): URL {
  if (url.pathname.endsWith('/')) return url;
  return new URL(`${url.toString()}/`)
}
function withoutLeadingSlash(path: string): string {
  if (path.startsWith('/')) return path.slice(1);
  return path
}

function createPersonActor(options: {
  id: URL,
  preferredUsername: string,
  inbox: URL,
  outbox: URL,
}) {
  const personEntity = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1"
    ],
    id: options.id,
    url: options.id,
    preferredUsername: options.preferredUsername,
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
