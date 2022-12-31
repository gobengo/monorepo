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

	/**
	 * Listen for http requests and serve all endpoints at appropriate paths
	 */
	get listener(): RequestListener {
		return express()
			.get('/', this.actor)
			.get('/.well-known/webfinger', this.webfinger);
	}

	/**
	 * Listen for http requests and serve actor
	 */
	protected get actor(): RequestListener {
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

	/**
	 * Webfinger endpoint - responds with a description of the ?resource acct uri
	 */
	protected get webfinger(): RequestListener {
		debug('accessing .webfinger');
		return express().use((req, res, next) => {
			const {resource} = req.query;
			debug('in webfinger', {
				resource,
				req: {
					originalUrl: req.originalUrl,
					baseUrl: req.baseUrl,
					url: req.url,
				},
			});
			if (!isAcctUri(resource)) {
				return res.status(400).end('invalid resource: must be an acct uri');
			}

			const jrd = createJsonResourceDescriptorForActor(resource, new URL('/', createRequestUrl(req, req.baseUrl)));
			res
				.status(200)
				.set({
					'content-type': 'application/jrd+json',
				})
				.json(jrd)
				.end();
		});
	}
}

type AcctUri = `acct:${string}@${string}`;

function isAcctUri(uri: unknown): uri is AcctUri {
	if (typeof uri !== 'string') {
		return false;
	}

	const pattern = /acct:([^@]+)@(.+)$/;
	return pattern.test(uri);
}

function createJsonResourceDescriptorForActor(
	subject: AcctUri,
	activityPubActorUrl: URL,
) {
	return {
		subject,
		aliases: [
			activityPubActorUrl,
		],
		links: [
			{
				rel: 'http://webfinger.net/rel/profile-page',
				type: 'text/html',
				href: activityPubActorUrl,
			},
			{
				rel: 'self',
				type: 'application/activity+json',
				href: activityPubActorUrl,
			},
			// {
			// 	rel: 'http://ostatus.org/schema/1.0/subscribe',
			// 	template: 'https://mastodon.social/authorize_interaction?uri={uri}',
			// },
		],
	};
}

function createRequestUrl(req: express.Request, pathname?: string): URL {
	const url = new URL(req.originalUrl, `${req.protocol}://${req.headers.host ?? ''}${pathname ?? req.originalUrl}`);
	return url;
}
