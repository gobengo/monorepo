import express from 'express';
import pinoHttp from 'pino-http';
import pinoHttpPrint from 'pino-http-print';
import {fileURLToPath} from 'node:url';
import {addressUrl} from './src/http.js';
import {ActorServer, type ActorServerConfig, type ActorServerRepository} from './src/actor-server.js';
import {createPersonActor} from './src/mastodon.js';
import {JsonActivityPubSerializer} from './src/ap-serializer.js';
import * as as2 from './src/activitystreams2.js';
import debuglog from './src/debuglog.js';
import {type Actor} from './src/actor.js';
const debug = debuglog(import.meta.url);

class Repository implements ActorServerRepository<Actor<string>, unknown, unknown> {
	constructor(protected options: {
		randomizeOutbox?: boolean;
	}) {}

	get actor() {
		return {
			get(options: {
				id: URL;
				inbox: URL;
				outbox: URL;
			}) {
				return {
					...createPersonActor(options),
					icon: {
						type: 'Image',
						url: 'https://i.pravatar.cc/300',
					},
					attachment: [
						{
							type: 'PropertyValue',
							name: 'GitHub',
							value: '<a href="https://github.com/gobengo" rel="me">github.com/gobengo</a>',
						},
					],
				};
			},
		};
	}

	get inbox() {
		return {
			forActor(actorId: URL, actor: Actor<string>) {
				debug('inbox for actor', {actor, actorId: actorId.toString()});
				return {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'OrderedCollection',
					totalItems: 0,
					id: actor.outbox.toString(),
					actor: actorId.toString(),
					current: new URL('?page=current', actor.outbox),
					first: new URL('?page=first', actor.outbox),
					orderedItems: [],
				};
			},
		};
	}

	get outbox() {
		return {
			forActor: (actorId: URL, actor: Actor<string>) => {
				debug('outbox for actor', {actor, actorId: actorId.toString()});
				const {randomizeOutbox} = this.options;
				const totalItems = randomizeOutbox ? 10 : 0;
				return {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'@context': 'https://www.w3.org/ns/activitystreams',
					type: 'OrderedCollection',
					totalItems,
					id: actor.outbox.toString(),
					actor: actorId.toString(),
					current: new URL('?page=current', actor.outbox),
					first: new URL('?page=first', actor.outbox),
					orderedItems: [
						...randomizeOutbox
							? Array.from(
								{length: totalItems},
								(e, i) => as2.RandomActivity.public({
									id: new URL(`./activities/${i}`, actor.outbox).toString(),
								}),
							)
							: [],
					],
				};
			},
		};
	}
}

class Config implements ActorServerConfig<Actor<string>, unknown, unknown> {
	serializer = new JsonActivityPubSerializer();
	constructor(protected options: {
		randomizeOutbox?: boolean;
	}) {}

	get repository() {
		return new Repository(this.options);
	}
}

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
				new Config({
					randomizeOutbox: Boolean(readEnv('OUTBOX_RANDOM', false)),
				}),
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
