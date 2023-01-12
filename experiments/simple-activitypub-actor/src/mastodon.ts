import {as2ContextUri, type Actor} from './actor.js';

export type MastodonActorRequirements = {
	preferredUsername: string;
};

export function createPersonActor(options: {
	id: URL;
	preferredUsername?: string;
	inbox: URL;
	outbox: URL;
}): Actor<'Person'> & MastodonActorRequirements {
	const personEntity: Actor<'Person'> & MastodonActorRequirements = {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'@context': [
			as2ContextUri,
			'https://w3id.org/security/v1',
		],
		type: 'Person' as const,
		id: options.id,
		url: options.id,
		preferredUsername: options.preferredUsername ?? 'default',
		name: 'Anonymous',
		inbox: options.inbox,
		outbox: options.outbox,
	};
	return personEntity;
}
