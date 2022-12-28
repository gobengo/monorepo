export function ensureTrailingSlash(url: URL): URL {
  if (url.pathname.endsWith('/')) return url;
  return new URL(`${url.toString()}/`)
}

export function withoutTrailingSlash(url: URL): URL {
  const urlOut = new URL(url);
  urlOut.pathname = urlOut.pathname.replace(/\/$/, '');
  return urlOut
}

export function composeTestedUrlResolver(testResolveConfigs: Array<ITestedUrlResolverOptions>): IUrlResolver {
  return (url) => {
    for (const config of testResolveConfigs) {
      const singleResolve = createTestedUrlResolver(config)
      const resolution = singleResolve(url)
      if (resolution) {
        return resolution;
      }
    }
    return null;
  }
}


/**
 * a space of URLs
 */
export interface UrlSpace {
  /** whether the UrlSpace includes the URL */
  includes(url: URL): boolean,
  toString(): string,
}

interface PathSegmentTester {
  test(segment: string): boolean,
  toString(): string,
}

type PathSegmentMatcher =
| undefined
| PathSegmentTester

export const matchers = {
  exact: (expectedValue: string) => ({
    test: (value: string) => value === expectedValue,
    toString() { return `exact(${expectedValue})` },
  }),
}

/**
 * UrlSpace containing all the URLs that are a single path segment under a common baseUrl.
 * e.g. if baseUrl is 'http://localhost/foo', then 'http://localhost/foo/bar' is contained, but not 'http://localhost/foo/bar/baz'
 * @param baseUrl 
 */
export function createPathSegmentUrlSpace(baseUrl: URL, segmentExpectations: Array<PathSegmentMatcher>, trailingSlash=false): UrlSpace {
  if ( ! baseUrl.pathname.endsWith('/')) {
    throw new Error('baseUrl must end with a slash')
  }
  function includes(url: URL): boolean {
    const urlString = url.toString();
    const baseUrlString = baseUrl.toString();
    if ((segmentExpectations.length === 0) && (urlString === baseUrlString)) {
      // when there no segmentExpectations, the url must equal the baseUrl
      return true;
    }
    if ( ! urlString.startsWith(baseUrlString)) {
      // url is not under baseUrl
      return false;
    }
    const urlSuffix = url.toString().slice(baseUrl.toString().length)
    // if trailingSlash is expected, then splitting on '/' will have a final segment of ''
    const slashSplitSegmentExpectations = trailingSlash ? [...segmentExpectations, matchers.exact('')] : segmentExpectations
    const segments = urlSuffix.split('/')
    if (segments.length !== slashSplitSegmentExpectations.length) {
      return false;
    }
    for (const [i, expectation] of slashSplitSegmentExpectations.entries()) {
      if (expectation && ! expectation.test(segments[i])) {
        return false;
      }
    }
    return true;
  }
  function toString() {
    const segmentsString = `[${new Array(segmentExpectations.length + 1).fill('').join(',')}]`
    return `PathSegmentUrlSpace(${baseUrl}${segmentsString}${trailingSlash ? '/' : ''})`
  }
  return { includes, toString }
}

export type IUrlResolver = (url: URL) => URL|null

interface ITestedUrlResolverOptions {
  test: (url: URL) => boolean,
  resolve: IUrlResolver  
}

export function createTestedUrlResolver(options: ITestedUrlResolverOptions): IUrlResolver {
  return (url: URL) => {
    if (options.test(url)) {
      return options.resolve(url);
    }
    return null;
  };
}