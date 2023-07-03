export interface Bucket {
  list(folder?: string): Promise<string[]>;

  has(key: string): Promise<boolean>;

  get(key: string, encoding?: null): Promise<Uint8Array>;
  get(key: string, encoding: BufferEncoding): Promise<string>;

  set(key: string, value: string | Uint8Array): Promise<void>;

  delete(key: string): Promise<void>;
}
