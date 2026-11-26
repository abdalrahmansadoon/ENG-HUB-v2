/** واجهة واحدة للبيانات، لها تنفيذان: Firestore والوضع التجريبي المحلي. */
export const NOW = '__server_now__';

export interface QueryOptions {
  where?: [field: string, op: '==' | 'array-contains-any', value: unknown];
  orderBy?: [field: string, dir: 'asc' | 'desc'];
  limit?: number;
}
export type Data = Record<string, unknown>;
export type Doc = Data & { id: string };

export interface Store {
  watch(path: string, options: QueryOptions, next: (docs: Doc[]) => void, error: (e: Error) => void): () => void;
  watchDoc(path: string, next: (doc: Doc | null) => void, error: (e: Error) => void): () => void;
  list(path: string): Promise<Doc[]>;
  newId(): string;
  add(path: string, data: Data): Promise<string>;
  set(path: string, data: Data): Promise<void>;
  update(path: string, data: Data): Promise<void>;
  remove(path: string): Promise<void>;
  /** كتابة عدة مستندات دفعة واحدة: إما تنجح كلها أو لا شيء. */
  /** merge: يحافظ على الحقول غير المذكورة في المستند الموجود. */
  setMany(entries: [path: string, data: Data][], options?: { merge?: boolean }): Promise<void>;
}

export interface AuthUser { uid: string; email: string; name: string; photoURL: string; emailVerified: boolean }
export interface Auth {
  watch(next: (user: AuthUser | null) => void): () => void;
  google(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  verifyEmail(): Promise<void>;
  signOut(): Promise<void>;
}

export interface Backend { demo: boolean; store: Store; auth: Auth }
