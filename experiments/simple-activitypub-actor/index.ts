import express from 'express';
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import {fileURLToPath} from 'node:url';
import {addressUrl} from './src/http.js';
import {ActorServer} from './src/actor-server.js';
import {createPersonActor} from './src/mastodon.js';
import {JsonActivityPubSerializer} from './src/ap-serializer.js';
import {debuglog} from 'node:util';
const debug = debuglog(import.meta.url);

async function main() {
	console.log('starting...');
	const app = express()
		.set('trust proxy', Boolean(readEnv('TRUST_PROXY')))
		.use(pinoHttp(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			pinoHttpPrint.httpPrintFactory()(),
		))
		.use(
			new ActorServer(
				{
					actor: {
						get: createPersonActor,
					},
					outbox: {
						forActor(actorId, actor) {
							return {
								type: 'OrderedCollection',
								orderedItems: [],
							};
						},
					},
				},
				new JsonActivityPubSerializer(),
			).listener,
		);
	const listener = app.listen(process.env.PORT ?? 0, () => {
		console.log('listening...', addressUrl(listener?.address()).toString());
	});
}

/**
 * Read an environment variable value
 * @param key - env variable name
 * @param required - whether the variable is required
 * @param env - environment to read from, defualts to process.env
 */
function readEnv(key: string, required: true, env?: Record<string, string | undefined>): string;
function readEnv(key: string, required?: false, env?: Record<string, string | undefined>): string | undefined;
function readEnv(key: string, required = false, env: Record<string, string | undefined> = process.env) {
	const value = env[key];
	if (required && (value === undefined)) {
		throw new Error(`missing environment variable: ${key}`);
	}

	return value;
}

/**
 * If this file is the main script, run main()
 */
if (import.meta.url.startsWith('file:')) {
	const modulePath = fileURLToPath(import.meta.url);
	if (process.argv[1] === modulePath) {
		await main();
	}
}
