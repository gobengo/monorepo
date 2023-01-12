import test from 'node:test';
import assert from 'node:assert';

import {withHttpServer} from './http.js';
import {ActorServer} from './actor-server.js';
import {createPersonActor} from './mastodon.js';
import * as ap from './activitypub.js';

import {JsonActivityPubSerializer} from './ap-serializer.js';
import {hasOwnProperty} from './object.js';
import debuglog from './debuglog.js';
const debug = debuglog(import.meta.url);

type As2ActorInterface = {
	type: string | string[];
	outbox: string;
};

class Actor implements As2ActorInterface {
	static parse(input: unknown) {
		assert.ok(input, 'actor is truthy');
		assert.ok(typeof input === 'object', 'actor is an object');
		assert.ok(hasOwnProperty(input, 'type'), 'actor has type property');
		assert.ok(Array.isArray(input.type) || typeof input.type === 'string', 'actor.type is an array or string');
		assert.ok(hasOwnProperty(input, 'outbox'), 'actor has an outbox property');
		assert.ok(typeof input.outbox === 'string', 'actor.outbox is a string');
		return new Actor(
			input.type,
			new URL(input.outbox),
		);
	}

	outbox: string;

	constructor(
		public type: string[] | string,
		outbox: URL,
	) {
		this.outbox = outbox.toString();
	}
}

type As2OutboxInterface = {
	type: string | string[];
	orderedItems: any[];
};

class Outbox implements As2OutboxInterface {
	static parse(input: unknown): Outbox {
		assert.ok(input, 'outbox is truthy');
		assert.ok(typeof input === 'object', 'outbox is an object');
		assert.ok(hasOwnProperty(input, 'type'), 'outbox has type property');
		assert.ok(Array.isArray(input.type) || typeof input.type === 'string', 'outbox.type is an array or string');
		// OrderedItems
		assert.ok(hasOwnProperty(input, 'orderedItems'), 'outbox has orderedItems property');
		assert.ok(Array.isArray(input.orderedItems), 'orderedItems is an array');
		return new Outbox(
			input.type,
			input.orderedItems,
		);
	}

	constructor(
		public type: string[] | string,
		public orderedItems: unknown[],
	) {}
}

await test('serves on http', async t => {
	const exampleOutboxItems = Array.from({length: Math.round(Math.random() * 10)}, () => createRandomActivity());
	const server = new ActorServer({
		repository: {
			actor: {
				get: createPersonActor,
			},
			outbox: {
				forActor(actorId, actor) {
					return {
						type: 'OrderedCollection',
						orderedItems: [
							...exampleOutboxItems,
						],
					};
				},
			},
		},
		serializer: new JsonActivityPubSerializer(),
	});
	await withHttpServer(server.listener, async baseUrl => {
		const response = await fetch(baseUrl.toString());
		assert.strictEqual(response.status, 200);
		hasActivityPubContentType(response.headers.get('content-type') ?? '');
		const actorResponseObj = await response.json() as unknown;
		debug('actorResponseObj', actorResponseObj);

		const actor = Actor.parse(actorResponseObj);
		const outboxResponse = await fetch(actor.outbox);
		assert.equal(outboxResponse.status, 200, 'outbox response has status 200');
		const outboxResponseObject = await outboxResponse.json() as unknown;
		debug('outboxResponseObject', outboxResponseObject);

		const outbox = Outbox.parse(outboxResponseObject);
		assert.equal(outbox.type, 'OrderedCollection');

		assert.equal(outbox.orderedItems.length, exampleOutboxItems.length, 'outbox has items from exampleOutboxItems');
	});
});

await test('serves actor extra info from actor endpoint', async t => {
	const icon = {
		type: 'Image',
		url: 'https://i.pravatar.cc/300',
	};
	const server = new ActorServer({
		repository: {
			actor: {
				get(options) {
					return {
						...createPersonActor(options),
						icon,
					};
				},
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
		serializer: new JsonActivityPubSerializer(),
	});
	await withHttpServer(server.listener, async baseUrl => {
		const response = await fetch(baseUrl);
		assert.strictEqual(response.status, 200);
		const actor = await response.json() as unknown;
		assert.ok(actor && typeof actor === 'object', 'actor is an object');
		assert.ok('icon' in actor, 'actor has icon property');
		assert.deepStrictEqual(actor.icon, icon);
	});
});

function hasActivityPubContentType(contentTypeValue: string) {
	const contentTypeParts = new Set(contentTypeValue?.split(';').map(s => s.trim()) ?? []);
	assert.ok(contentTypeParts.has(ap.ldJsonMediaType), `content-type ${contentTypeValue} has ${ap.ldJsonMediaType}`);
	assert.ok(contentTypeParts.has(`profile="${ap.as2ProfileUri}"`), `content-type has profile="${ap.as2ProfileUri}"`);
}

function createRandomActivity() {
	return {
		type: 'Create',
		object: {
			type: 'Note',
			content: 'hello, world',
		},
	};
}
