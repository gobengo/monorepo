import {type RequestListener} from 'node:http';
import express from 'express';
import {type Actor} from './actor';
import * as ap from './activitypub.js';

import {debuglog} from 'node:util';
const debug = debuglog(import.meta.url);

export class ActorServer {
	constructor(
		protected getActor: (options: {
			id: URL;
			inbox: URL;
			outbox: URL;
		}) => Actor<string>,
	) {}

	get listener(): RequestListener {
		return express()
			.get('/', (req, res) => {
				const url = createRequestUrl(req);
				res.status(200);
				res.set({
					'Content-Type': ap.mediaType,
				});
				const actor = this.getActor({
					id: url,
					inbox: new URL('inbox', url),
					outbox: new URL('outbox', url),
				});
				res.send(JSON.stringify(actor, null, 2));
				res.end();
			});
	}
}

function createRequestUrl(req: express.Request): URL {
	const url = new URL(req.originalUrl, `${req.protocol}://${req.headers.host ?? ''}`);
	return url;
}
