/* eslint-disable @typescript-eslint/naming-convention */
export const mediaType = 'application/activity+json' as const;

export const RandomActivity = {
	public({id}: {
		id?: string;
	} = {}) {
		return {
			'@context': [
				'https://www.w3.org/ns/activitystreams',
			],
			id,
			type: 'Announce',
			// Actor: 'https://mastodon.social/users/bengo',
			// published: '2022-12-29T06:11:05Z',
			to: [
				'https://www.w3.org/ns/activitystreams#Public',
			],
			cc: [
				'https://mastodon.social/users/bengo/followers',
			],
			object: 'https://mastodon.social/users/bengo/statuses/109640078281100277',
		};
	},
};
