import type express from 'express';
import {type Serialization} from './ap-serializer';

export const expressSerializationResponder = <DefaultMediaType extends string>(defaultMediaType: DefaultMediaType) => <T>(
	request: express.Request,
	response: express.Response,
	serialize: (mediaType: string | DefaultMediaType) => Serialization<string | DefaultMediaType>,
) => {
	const {content, mediaType} = serialize(request.get('accept') ?? defaultMediaType);
	response
		.status(200)
		.set({'content-type': mediaType})
		.send(content)
		.end();
};
