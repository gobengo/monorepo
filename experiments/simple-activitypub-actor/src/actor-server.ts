import {type RequestListener} from 'node:http';
import express from 'express';
import * as ap from './activitypub.js';
import type * as as2 from './activitystreams2.js';
import {debuglog} from 'node:util';
import {type ActorServerSerializer, Serialization} from './ap-serializer.js';
import {expressSerializationResponder} from './serializer-express.js';
const debug = debuglog(import.meta.url);

export type ActorServerRepository<
	Actor,
	Outbox,
> = {
	actor: {
		get(options: {
			id: URL;
			inbox: URL;
			outbox: URL;
		}): Actor;
	};
	outbox: {
		forActor(actorId: URL, actor: Actor): Outbox;
	};
};

/**
 * Serves an 'actor' over HTTP using ActivityPub protocol
 */
export class ActorServer<
	Actor,
	Outbox,
> {
	protected serializationResponder = expressSerializationResponder(ap.mediaType);

	protected outbox = {
		forActor: (actorId: URL, actor: Actor): RequestListener => express()
			.get('/', (req, res, next) => {
				debug('handling outbox request', {
					url: createRequestUrl(req).toString(),
					actorId: actorId.toString(),
				});
				const outbox = this.repository.outbox.forActor(actorId, actor);
				this.serializationResponder(req, res, mt => this.serializer.outbox(outbox, mt));
				next();
			}),
	};

	constructor(
		protected repository: ActorServerRepository<Actor, Outbox>,
		protected serializer: ActorServerSerializer<Actor, Outbox>,
	) {}

	protected getActorById(id: URL): Actor {
		return this.repository.actor.get({
			id,
			inbox: new URL('inbox/', id),
			outbox: new URL('outbox/', id),
		});
	}

	/**
	 * Listen for http requests and serve all endpoints at appropriate paths
	 */
	get listener(): RequestListener {
		return express().use((req, res, next) => {
			const actorId = createRequestUrl(req, req.baseUrl);
			const handle = express()
				.get('/', this.actor)
				.use('/outbox', this.outbox.forActor(actorId, this.getActorById(actorId)))
				.get('/.well-known/webfinger', this.webfinger);
			handle(req, res, next);
		});
	}

	/**
	 * Listen for http requests and serve actor
	 */
	protected get actor(): RequestListener {
		return express()
			.use((req, res, next) => {
				debug('in actor endpoint', req.originalUrl, req.url, req.baseUrl);
				next();
			})
			.get('/', (req, res) => {
				const url = createRequestUrl(req);
				const actor = this.getActorById(url);
				this.serializationResponder(req, res, mt => this.serializer.actor(actor, mt));
			});
	}

	/**
	 * Webfinger endpoint - responds with a description of the ?resource acct uri
	 */
	protected get webfinger(): RequestListener {
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

function createRequestUrl(req: express.Request, withPathname?: string): URL {
	const pathname = (typeof withPathname === 'undefined') ? req.originalUrl : withPathname;
	const url = new URL(`${req.protocol}://${req.headers.host ?? ''}${pathname}`);
	return url;
}
