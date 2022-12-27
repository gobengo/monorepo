export function ensureTrailingSlash(url: URL): URL {
  if (url.pathname.endsWith('/')) return url;
  return new URL(`${url.toString()}/`)
}

export function withoutTrailingSlash(url: URL): URL {
  const urlOut = new URL(url);
  urlOut.pathname = urlOut.pathname.replace(/\/$/, '');
  return urlOut
}
