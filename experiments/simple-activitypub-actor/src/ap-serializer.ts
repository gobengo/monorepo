import * as ap from './activitypub.js';
import * as as2 from './activitystreams2.js';
import debuglog from './debuglog.js';
const debug = debuglog(import.meta.url);

export type Serialization<MediaType> = {
	mediaType: MediaType;
	content: string;
};

export type Serializer<T, MediaType> = (value: T, contentType: MediaType) => Serialization<Exclude<MediaType, undefined>>;

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type ActorServerSerializer<Actor, Inbox, Outbox, MediaType=string | typeof ap.mediaType> = {
	actor: Serializer<Actor, MediaType>;
	inbox: Serializer<Inbox, MediaType>;
	outbox: Serializer<Outbox, MediaType>;
};

/**
 * Serializes js objects to activitystreams2 json
 */
export class JsonActivityPubSerializer<Actor, Inbox, Outbox>
implements ActorServerSerializer<Actor, Inbox, Outbox> {
	constructor(
		protected defaultMediaType = ap.mediaType,
	) {}

	actor(actor: Actor, mediaType: string) {
		debug('serializaing actor', {mediaType});
		return {
			mediaType: this.defaultMediaType,
			content: JSON.stringify(actor),
		};
	}

	inbox(inbox: Inbox, mediaType: string) {
		debug('serializaing inbox', {mediaType});
		return {
			mediaType: this.defaultMediaType,
			content: JSON.stringify(inbox),
		};
	}

	outbox(outbox: Outbox, mediaType: string) {
		debug('serializaing outbox', {mediaType});
		return {
			mediaType: this.defaultMediaType,
			content: JSON.stringify(outbox),
		};
	}
}
