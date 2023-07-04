import * as fs from 'node:fs/promises';
import { dirname } from 'node:path';
import { Bucket } from './types';

export default class LocalBucket implements Bucket {
  constructor(private readonly basePath: string) {}

  private path(key: string): string {
    return key ? `${this.basePath}/${key}` : this.basePath;
  }

  async list(folder?: string): Promise<string[]> {
    return await fs.readdir(this.path(folder));
  }

  async has(key: string): Promise<boolean> {
    return await fs.access(this.path(key), fs.constants.F_OK).then(
      () => true,
      () => false,
    );
  }

  async get(key: string, encoding?: null): Promise<Buffer>;
  async get(key: string, encoding: BufferEncoding): Promise<string>;
  async get(key: string, encoding?: null | BufferEncoding): Promise<Buffer | string> {
    return fs.readFile(this.path(key), encoding);
  }

  async set(key: string, content: string | Uint8Array): Promise<void> {
    if (key === '') throw new Error('key is empty');
    const path = this.path(key);

    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, content);
  }

  async delete(key: string): Promise<void> {
    if (key === '') throw new Error('key is empty');
    await fs.unlink(this.path(key));
  }
}
