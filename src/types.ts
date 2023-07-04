export interface Bucket {
  list(folder?: string): Promise<string[]>;

  has(key: string): Promise<boolean>;

  get(key: string, encoding?: null): Promise<Buffer>;
  get(key: string, encoding: BufferEncoding): Promise<string>;

  put(key: string, content: string | Uint8Array): Promise<void>;

  delete(key: string): Promise<void>;
}
