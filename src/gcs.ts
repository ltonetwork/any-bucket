import { Storage, Bucket as StorageBucket } from '@google-cloud/storage';
import { Bucket } from './types';

export default class GCSBucket implements Bucket {
  private readonly bucket: StorageBucket;
  private readonly prefix: string;

  constructor(storage: Storage, bucket: string) {
    const [bucketName, prefix] = bucket.split('/', 2);

    this.bucket = storage.bucket(bucketName);
    this.prefix = prefix ? prefix.replace(/\/$/, '') + '/' : '';
  }

  private path(key: string): string {
    return this.prefix + key;
  }

  async list(folder?: string): Promise<string[]> {
    const prefix = this.path(folder ? `${folder}/` : '');
    const options = prefix ? { prefix } : {};

    const [files] = await this.bucket.getFiles(options);
    return files.map((file) => file.name);
  }

  async has(key: string): Promise<boolean> {
    const [exists] = await this.bucket.file(this.path(key)).exists();
    return exists;
  }

  async get(key: string, encoding?: null): Promise<Buffer>;
  async get(key: string, encoding: BufferEncoding): Promise<string>;
  async get(key: string, encoding?: null | BufferEncoding): Promise<Buffer | string> {
    const file = this.bucket.file(this.path(key));

    const [data] = await file.download();
    return encoding ? data.toString(encoding) : data;
  }

  async put(key: string, content: string | Uint8Array): Promise<void> {
    const file = this.bucket.file(this.path(key));
    await file.save(typeof content === 'string' ? content : Buffer.from(content));
  }

  async delete(key: string): Promise<void> {
    const file = this.bucket.file(this.path(key));
    await file.delete();
  }
}
