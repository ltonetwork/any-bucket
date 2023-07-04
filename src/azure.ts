import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Bucket } from './types';

export default class AzureBucket implements Bucket {
  private readonly container: ContainerClient;
  private readonly prefix: string;

  constructor(client: BlobServiceClient, container: string) {
    const [containerName, prefix] = container.split('/', 2);

    this.container = client.getContainerClient(containerName);
    this.prefix = prefix ? prefix.replace(/\/$/, '') + '/' : '';
  }

  private path(key: string): string {
    return this.prefix + key;
  }

  async list(folder?: string): Promise<string[]> {
    const prefix = this.path(folder ? `${folder}/` : '');
    const iter = this.container.listBlobsByHierarchy('/', { prefix });

    const files: string[] = [];
    for await (const blob of iter) {
      files.push(blob.name);
    }

    return files;
  }

  async has(key: string): Promise<boolean> {
    const blobClient = this.container.getBlobClient(this.path(key));

    return await blobClient.getProperties().then(
      () => true,
      (error) => (error.statusCode === 404 ? false : Promise.reject(error)),
    );
  }

  async get(key: string, encoding?: null): Promise<Buffer>;
  async get(key: string, encoding: BufferEncoding): Promise<string>;
  async get(key: string, encoding?: null | BufferEncoding): Promise<Buffer | string> {
    const blobClient = this.container.getBlobClient(this.path(key));

    const downloadResponse = await blobClient.download();
    const body = await downloadResponse.blobBody;

    return encoding ? await body.text() : Buffer.from(await body.arrayBuffer());
  }

  async put(key: string, content: string | Uint8Array): Promise<void> {
    const blobClient = this.container.getBlockBlobClient(this.path(key));

    if (typeof content === 'string') {
      await blobClient.upload(content, content.length);
    } else {
      await blobClient.uploadData(content);
    }
  }

  async delete(key: string): Promise<void> {
    const blobClient = this.container.getBlobClient(this.path(key));
    await blobClient.delete();
  }
}
