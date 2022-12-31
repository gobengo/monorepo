import test from 'node:test';
import assert from 'node:assert';

import {withHttpServer} from './http.js';
import {ActorServer} from './actor-server.js';
import {createPersonActor} from './mastodon.js';
import * as ap from './activitypub.js';

import {debuglog} from 'node:util';
const debug = debuglog(import.meta.url);

await test('serves on http', async t => {
	const server = new ActorServer(createPersonActor);
	await withHttpServer(server.listener, async baseUrl => {
		const response = await fetch(baseUrl.toString());
		assert.strictEqual(response.status, 200);
		hasActivityPubContentType(response.headers.get('content-type') ?? '');
		const responseObj = await response.json() as unknown;
		debug('responseObj', responseObj);
	});
});

function hasActivityPubContentType(contentTypeValue: string) {
	const contentTypeParts = new Set(contentTypeValue?.split(';').map(s => s.trim()) ?? []);
	assert.ok(contentTypeParts.has(ap.ldJsonMediaType), `content-type has ${ap.ldJsonMediaType}`);
	assert.ok(contentTypeParts.has(`profile="${ap.as2ProfileUri}"`), `content-type has profile="${ap.as2ProfileUri}"`);
}
