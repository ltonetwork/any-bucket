import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Bucket } from './types';

export default class AzureBucket implements Bucket {
  private readonly container: ContainerClient;

  constructor(client: BlobServiceClient, containerName: string) {
    this.container = client.getContainerClient(containerName);
  }

  async list(folder?: string): Promise<string[]> {
    const prefix = folder ? `${folder}/` : '';
    const iter = this.container.listBlobsByHierarchy('/', { prefix });

    const files: string[] = [];
    for await (const blob of iter) {
      files.push(blob.name);
    }

    return files;
  }

  async has(key: string): Promise<boolean> {
    const blobClient = this.container.getBlobClient(key);

    return await blobClient.getProperties().then(
      () => true,
      (error) => (error.statusCode === 404 ? false : Promise.reject(error)),
    );
  }

  async get(key: string, encoding?: null): Promise<Uint8Array>;
  async get(key: string, encoding: BufferEncoding): Promise<string>;
  async get(key: string, encoding?: null | BufferEncoding): Promise<Uint8Array | string> {
    const blobClient = this.container.getBlobClient(key);

    const downloadResponse = await blobClient.download();
    const body = await downloadResponse.blobBody;

    return encoding ? await body.text() : new Uint8Array(await body.arrayBuffer());
  }

  async set(key: string, content: string | Uint8Array): Promise<void> {
    const blobClient = this.container.getBlockBlobClient(key);

    if (typeof content === 'string') {
      await blobClient.upload(content, content.length);
    } else {
      await blobClient.uploadData(content);
    }
  }

  async delete(key: string): Promise<void> {
    const blobClient = this.container.getBlobClient(key);
    await blobClient.delete();
  }
}
