
/**
 * A URL Path.
 * Represented as a list of '/'-separated path segments
 */
export type IUrlPath = [...string[]]

export function urlPathFromPathname(pathname: `/${string}`): IUrlPath {
  if (pathname === '/') return []
  return pathname.slice(1).split('/')
}

export function pathFromUrl (url: URL): IUrlPath {
  return urlPathFromPathname(url.pathname as `/${string}`)
}

export function appendPath(path: IUrlPath, appendedPath: IUrlPath): IUrlPath {
  const lastSegment = path[path.length - 1]
  const lastSegmentWithoutSlash = (lastSegment?.endsWith('/')) ? lastSegment.slice(0, -1) : lastSegment
  if ( ! lastSegmentWithoutSlash) {
    return appendedPath
  }
  return [...path.slice(0, -1), lastSegmentWithoutSlash, ...appendedPath]
}

export function hasPathPrefix(prefix: IUrlPath, fullPath: IUrlPath) {
  for (let i=0; i < prefix.length; i++) {
    if (prefix[i] !== fullPath[i]) return false
  }
  return true;
}

export function pathsEqual(path1: IUrlPath, path2: IUrlPath): boolean {
  if (path1.length !== path2.length) return false
  for (let i=0; i < path1.length; i++) {
    if (path1[i] !== path2[i]) return false
  }
  return true;
}

export function removePrefix(prefix: IUrlPath, fullPath: IUrlPath): IUrlPath {
  if ( ! hasPathPrefix(prefix, fullPath)) throw new Error(`Cannot remove prefix ${prefix} from ${fullPath}`)
  const sansPrefix = fullPath.slice(0, prefix.length + 1);
  return sansPrefix
}
