import { NOW, type Data, type Doc, type QueryOptions, type Store } from './store';

export interface Persistence { load(): Record<string, Data> | null; save(db: Record<string, Data>): void }

export function createLocalStore(seed: () => Record<string, Data>, persistence?: Persistence): Store {
  let db: Record<string, Data> = persistence?.load() ?? seed();
  const listeners = new Set<() => void>();

  const commit = () => { persistence?.save(db); listeners.forEach((l) => l()); };
  const stamp = (data: Data): Data =>
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === NOW ? Date.now() : v]));

  const children = (path: string): Doc[] => {
    const prefix = path + '/';
    return Object.entries(db)
      .filter(([k]) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
      .map(([k, v]) => ({ ...v, id: k.slice(prefix.length) }));
  };

  const run = (path: string, { where, orderBy, limit }: QueryOptions): Doc[] => {
    let docs = children(path);
    if (where) {
      const [field, op, value] = where;
      docs = docs.filter((d) => {
        if (op === '==') return d[field] === value;
        if (op === '>=') return (d[field] as string) >= (value as string);
        return Array.isArray(d[field]) && (d[field] as unknown[]).some((x) => (value as unknown[]).includes(x));
      });
    }
    if (orderBy) {
      const [field, dir] = orderBy;
      const sign = dir === 'asc' ? 1 : -1;
      docs.sort((a, b) => ((a[field] as number) > (b[field] as number) ? sign : (a[field] as number) < (b[field] as number) ? -sign : 0));
    }
    return limit ? docs.slice(0, limit) : docs;
  };

  const subscribe = (emit: () => void) => {
    listeners.add(emit);
    queueMicrotask(() => { if (listeners.has(emit)) emit(); });
    return () => { listeners.delete(emit); };
  };

  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  return {
    watch: (path, options, next) => subscribe(() => next(run(path, options))),
    watchDoc: (path, next) => subscribe(() => next(db[path] ? { ...db[path], id: path.split('/').pop()! } : null)),
    list: async (path) => children(path),
    newId,
    add: async (path, data) => { const id = newId(); db[`${path}/${id}`] = stamp(data); commit(); return id; },
    set: async (path, data) => { db[path] = stamp(data); commit(); },
    update: async (path, data) => {
      if (!db[path]) throw new Error('not-found');
      db[path] = { ...db[path], ...stamp(data) }; commit();
    },
    remove: async (path) => { delete db[path]; commit(); },
    setMany: async (entries, options) => {
      for (const [path, data] of entries) db[path] = { ...(options?.merge ? db[path] : {}), ...stamp(data) };
      commit();
    },
  };
}
