import { expect } from 'chai';
import { stub, restore, createStubInstance, SinonStub, SinonStubbedInstance } from 'sinon';
import { ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import AzureBucket from '../src/azure';

describe('AzureBucket', () => {
  let container: SinonStubbedInstance<ContainerClient>;
  let bucket: AzureBucket;

  beforeEach(() => {
    container = createStubInstance(ContainerClient);
    const blobServiceClient = {
      getContainerClient: stub().returns(container),
    };
    bucket = new AzureBucket(blobServiceClient as any, 'containerName');
  });

  afterEach(() => {
    restore();
  });

  describe('list', () => {
    beforeEach(() => {
      const blob1 = { name: 'file1.txt' };
      const blob2 = { name: 'file2.txt' };

      const iter = {
        async *[Symbol.asyncIterator]() {
          yield blob1;
          yield blob2;
        },
      };

      container.listBlobsByHierarchy.returns(iter as any);
    });

    it('should list files in a folder', async () => {
      const files = await bucket.list('folder');

      expect(files).to.deep.equal(['file1.txt', 'file2.txt']);

      expect(container.listBlobsByHierarchy.calledOnce).to.be.true;
      expect(container.listBlobsByHierarchy.firstCall.args[0]).to.equal('/');
      expect(container.listBlobsByHierarchy.firstCall.args[1]).to.deep.equal({ prefix: 'folder/' });
    });

    it('should list all files in the container if no folder is provided', async () => {
      const files = await bucket.list();

      expect(files).to.deep.equal(['file1.txt', 'file2.txt']);

      expect(container.listBlobsByHierarchy.calledOnce).to.be.true;
      expect(container.listBlobsByHierarchy.firstCall.args[0]).to.equal('/');
      expect(container.listBlobsByHierarchy.firstCall.args[1]).to.deep.equal({ prefix: '' });
    });
  });

  describe('has', () => {
    it('should return true if the key exists', async () => {
      const blobClient = createStubInstance(BlockBlobClient);
      blobClient.getProperties.resolves({} as any);
      container.getBlobClient.returns(blobClient);

      const exists = await bucket.has('file1.txt');

      expect(blobClient.getProperties.calledOnce).to.be.true;
      expect(exists).to.be.true;
    });

    it('should return false if the key does not exist', async () => {
      const blobClient = createStubInstance(BlockBlobClient);
      blobClient.getProperties.returns(Promise.reject({ statusCode: 404 }));
      container.getBlobClient.returns(blobClient);

      const exists = await bucket.has('nonexistent.txt');

      expect(blobClient.getProperties.calledOnce).to.be.true;
      expect(exists).to.be.false;
    });
  });

  describe('get', () => {
    let downloadStub: SinonStub;

    beforeEach(() => {
      const blobBody = Promise.resolve({
        text: () => 'content 1',
        arrayBuffer: () => new ArrayBuffer(8),
      });

      const blobDownloadResponse = { blobBody: blobBody } as any;
      downloadStub = stub().resolves(blobDownloadResponse);

      container.getBlobClient.returns({ download: downloadStub } as any);
    });

    it('should return the file content as a Buffer', async () => {
      const content = await bucket.get('file1.txt');

      expect(downloadStub.calledOnce).to.be.true;
      expect(content).to.be.an.instanceOf(Buffer);
      expect(content.byteLength).to.equal(8);
    });

    it('should return the file content as a string with the specified encoding', async () => {
      const content = await bucket.get('file1.txt', 'utf-8');

      expect(downloadStub.calledOnce).to.be.true;
      expect(content).to.be.a('string');
      expect(content).to.equal('content 1');
    });
  });

  describe('set', () => {
    let uploadStub: SinonStub;

    beforeEach(() => {
      const blockBlobClient = createStubInstance(BlockBlobClient) as any;
      uploadStub = blockBlobClient.upload.resolves();
      container.getBlockBlobClient.returns(blockBlobClient);
    });

    it('should put an object with the specified key and value', async () => {
      await bucket.set('file1.txt', 'content 1');

      expect(uploadStub.calledOnce).to.be.true;
      expect(uploadStub.firstCall.args[0]).to.equal('content 1');
      expect(uploadStub.firstCall.args[1]).to.equal(9); // Length of 'content 1'
    });
  });

  describe('delete', () => {
    let deleteStub: SinonStub;

    beforeEach(() => {
      const blobClient = createStubInstance(BlockBlobClient) as any;
      deleteStub = blobClient.delete.resolves();
      container.getBlobClient.returns(blobClient);
    });

    it('should delete an object with the specified key', async () => {
      await bucket.delete('file1.txt');

      expect(container.getBlobClient.calledOnce).to.be.true;
      expect(container.getBlobClient.firstCall.args[0]).to.be.equal('file1.txt');

      expect(deleteStub.calledOnce).to.be.true;
    });
  });
});
