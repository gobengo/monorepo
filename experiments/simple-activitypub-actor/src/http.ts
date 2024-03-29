import * as nodeHttp from 'http';
import type {AddressInfo} from 'net';

export async function withHttpServer(
	listener: nodeHttp.RequestListener,
	useServer: (baseUrl: URL) => Promise<void> | void,
) {
	const httpServer = nodeHttp.createServer(listener);
	await new Promise((resolve, _reject) => {
		httpServer.listen(0, () => {
			resolve(true);
		});
	});
	const baseUrl = addressUrl(httpServer.address());
	if (!baseUrl) {
		throw new Error('failed to determine baseUrl from httpServer');
	}

	try {
		await useServer(baseUrl);
	} finally {
		await new Promise((resolve, _reject) => {
			httpServer.close(resolve);
		});
	}
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function addressUrl(addressInfo: string | Pick<AddressInfo, 'address' | 'port'> | null): URL {
	if (!addressInfo) {
		throw new TypeError('addressInfo is unexpectedly null');
	}

	if (typeof addressInfo === 'string') {
		return new URL(addressInfo);
	}

	const {address, port} = addressInfo;
	const host = address === '::' ? 'localhost' : address;
	const urlString = `http://${host}:${port}`;
	return new URL(urlString);
}
