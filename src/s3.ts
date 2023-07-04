import { S3 } from '@aws-sdk/client-s3';
import { Bucket } from './types';

export default class S3Bucket implements Bucket {
  private readonly bucketName: string;
  private readonly prefix: string;

  constructor(private readonly s3: S3, bucket: string) {
    const [bucketName, prefix] = bucket.split('/', 2);

    this.bucketName = bucketName;
    this.prefix = prefix ? prefix.replace(/\/$/, '') + '/' : '';
  }

  private path(key: string): string {
    return this.prefix + key;
  }

  async list(folder?: string): Promise<string[]> {
    const prefix = this.path(folder ? `${folder}/` : '');

    const params = {
      Bucket: this.bucketName,
      Prefix: prefix,
      Delimiter: '/',
    };

    const data = await this.s3.listObjectsV2(params);
    return [
      ...(data.Contents?.map((item) => item.Key) || []),
      ...(data.CommonPrefixes?.map((item) => item.Prefix.replace(/\/$/, '')) || []),
    ];
  }

  async has(key: string): Promise<boolean> {
    const params = {
      Bucket: this.bucketName,
      Key: this.path(key),
    };

    return await this.s3.headObject(params).then(
      () => true,
      (error) => {
        if (error.code !== 'NotFound') throw error;
        return false;
      },
    );
  }

  async get(key: string, encoding?: null): Promise<Buffer>;
  async get(key: string, encoding: BufferEncoding): Promise<string>;
  async get(key: string, encoding?: null | BufferEncoding): Promise<Buffer | string> {
    const params = {
      Bucket: this.bucketName,
      Key: this.path(key),
    };

    const data = await this.s3.getObject(params);
    const content = data.Body;

    return encoding ? await content.transformToString(encoding) : Buffer.from(await content.transformToByteArray());
  }

  async put(key: string, content: string | Uint8Array): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: this.path(key),
      Body: content,
    };

    await this.s3.putObject(params);
  }

  async delete(key: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: this.path(key),
    };

    await this.s3.deleteObject(params);
  }
}
