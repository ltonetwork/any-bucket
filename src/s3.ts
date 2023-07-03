import { S3 } from '@aws-sdk/client-s3';
import { Bucket } from './types';

export default class S3Bucket implements Bucket {
  constructor(private readonly s3: S3, private readonly bucketName: string) {}

  async list(folder?: string): Promise<string[]> {
    const prefix = folder ? `${folder}/` : '';

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
      Key: key,
    };

    return await this.s3.headObject(params).then(
      () => true,
      (error) => {
        if (error.code !== 'NotFound') throw error;
        return false;
      },
    );
  }

  async get(key: string, encoding?: null): Promise<Uint8Array>
  async get(key: string, encoding: BufferEncoding): Promise<string>
  async get(key: string, encoding?: null | BufferEncoding): Promise<Uint8Array | string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    const data = await this.s3.getObject(params);
    const content = data.Body;

    return encoding
      ? await content.transformToString(encoding)
      : await content.transformToByteArray();
  }

  async set(key: string, value: string | Uint8Array): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: value,
    };

    await this.s3.putObject(params);
  }

  async delete(key: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    await this.s3.deleteObject(params);
  }
}
