import express from "express";
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import { fileURLToPath } from "node:url";
import { ActorServer } from "./actor-server.js";
import { addressUrl } from "./http.js";
import { createMockActor } from "./actor.js";
import { createMockOutbox } from "./outbox.js";

import { debuglog } from "util"

const debug = debuglog('activitypub-core-example')

if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    await main()
  }
}

async function main() {
  console.log('starting...')
  const publicBaseUrl = new URL(readEnv('PUBLIC_BASE_URL'))
  const note1 = {
    type: "Note",
    content: 'foobar',
  }
  const app = ActorServer.create({
    app: express()
      .use(pinoHttp(
        pinoHttpPrint.httpPrintFactory()()
      ))
      .get('/notes/:id', (req, res) => {
        res.status(200).json(note1).end()
      })
      ,
    publicBaseUrl,
    getActor: async (ref) => {
      const actorUrl = (ref as any).url as URL
      debug('getActor', {
        ...ref,
        url: actorUrl.toString(),
      })
      return createMockActor({
        outbox: createMockOutbox({
          orderedItems: [
            {
              ...note1,
              url: new URL('/notes/1', actorUrl),
            },
          ]
        })
      });
    },
  });
  const listener = app.listen(process.env.PORT ?? 0, () => {
    console.log('listening...', addressUrl(listener?.address()).toString())
  });
}

function readEnv(key: string, env=process.env): string {
  const value = env[key]
  if (value === undefined) {
    throw new Error(`missing environment variable: ${key}`)
  }
  return value
}
