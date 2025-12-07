export function withOrigin(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  if (typeof window === 'undefined') {
    return pathOrUrl;
  }
  return `${window.location.origin}${pathOrUrl}`;
}
