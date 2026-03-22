export interface Repository<T> {
  get(): T;
  save(data: T): void;
}

export function createLocalStorageRepository<T>(key: string, fallback: T): Repository<T> {
  return {
    get() {
      if (typeof window === 'undefined') return fallback;
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        return fallback;
      }
    },
    save(data) {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, JSON.stringify(data));
    },
  };
}
