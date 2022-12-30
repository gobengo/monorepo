import express from "express";
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import { fileURLToPath } from "node:url";
import { ActorServer } from "./actor-server.js";
import { addressUrl } from "./http.js";
import { createMockActor } from "./actor.js";

if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    await main()
  }
}



async function main() {
  console.log('starting...')
  const app = ActorServer.create({
    app: express()
      .use(pinoHttp(
        pinoHttpPrint.httpPrintFactory()()
      )),
    publicBaseUrl: new URL(readEnv('PUBLIC_BASE_URL')),
    getActorById: async (id) => {
      return createMockActor();
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
