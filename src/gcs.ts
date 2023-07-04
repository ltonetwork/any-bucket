import { Storage, Bucket as StorageBucket } from '@google-cloud/storage';
import { Bucket } from './types';

export default class GCSBucket implements Bucket {
  private readonly bucket: StorageBucket;

  constructor(storage: Storage, bucketName: string) {
    this.bucket = storage.bucket(bucketName);
  }

  async list(folder?: string): Promise<string[]> {
    const options = folder ? { prefix: `${folder}/` } : {};

    const [files] = await this.bucket.getFiles(options);
    return files.map((file) => file.name);
  }

  async has(key: string): Promise<boolean> {
    const [exists] = await this.bucket.file(key).exists();
    return exists;
  }

  async get(key: string, encoding?: null): Promise<Buffer>;
  async get(key: string, encoding: BufferEncoding): Promise<string>;
  async get(key: string, encoding?: null | BufferEncoding): Promise<Buffer | string> {
    const file = this.bucket.file(key);

    const [data] = await file.download();
    return encoding ? data.toString(encoding) : data;
  }

  async set(key: string, content: string | Uint8Array): Promise<void> {
    const file = this.bucket.file(key);
    await file.save(typeof content === 'string' ? content : Buffer.from(content));
  }

  async delete(key: string): Promise<void> {
    const file = this.bucket.file(key);
    await file.delete();
  }
}
