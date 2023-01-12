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
export type ActorServerSerializer<Actor, Outbox, MediaType=string | typeof ap.mediaType> = {
	actor: Serializer<Actor, MediaType>;
	outbox: Serializer<Outbox, MediaType>;
};

/**
 * Serializes js objects to activitystreams2 json
 */
export class JsonActivityPubSerializer<Actor, Outbox>
implements ActorServerSerializer<Actor, Outbox> {
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

	outbox(outbox: Outbox, mediaType: string) {
		debug('serializaing outbox', {mediaType});
		return {
			mediaType: this.defaultMediaType,
			content: JSON.stringify(outbox),
		};
	}
}
