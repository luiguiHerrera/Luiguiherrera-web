export function createDevelopmentSourceCache<T>(options: {
  load: (key: string) => Promise<T>;
  readPrevious: (key: string) => Promise<T>;
  isSourceError: (error: unknown) => boolean;
  now?: () => number;
}): (key: string) => Promise<T>;
