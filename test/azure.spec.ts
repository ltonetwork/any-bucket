import { expect } from 'chai';
import { stub, restore, createStubInstance, SinonStub, SinonStubbedInstance } from 'sinon';
import { ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import AzureBucket from '../src/azure';

describe('AzureBucket', () => {
  let container: SinonStubbedInstance<ContainerClient>;
  let bucket: AzureBucket;
  let bucketSub: AzureBucket;

  beforeEach(() => {
    container = createStubInstance(ContainerClient);
    const blobServiceClient = {
      getContainerClient: stub().returns(container),
    };
    bucket = new AzureBucket(blobServiceClient as any, 'containerName');
    bucketSub = new AzureBucket(blobServiceClient as any, 'containerName/sub');
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

    describe('with prefix', () => {
      it('should list files in a sub folder', async () => {
        await bucketSub.list('folder');

        expect(container.listBlobsByHierarchy.calledOnce).to.be.true;
        expect(container.listBlobsByHierarchy.firstCall.args[0]).to.equal('/');
        expect(container.listBlobsByHierarchy.firstCall.args[1]).to.deep.equal({ prefix: 'sub/folder/' });
      });

      it('should list all files in the main folder if no folder is provided', async () => {
        await bucketSub.list();

        expect(container.listBlobsByHierarchy.calledOnce).to.be.true;
        expect(container.listBlobsByHierarchy.firstCall.args[0]).to.equal('/');
        expect(container.listBlobsByHierarchy.firstCall.args[1]).to.deep.equal({ prefix: 'sub/' });
      });
    });
  });

  describe('has', () => {
    it('should return true if the key exists', async () => {
      const blobClient = createStubInstance(BlockBlobClient);
      blobClient.getProperties.resolves({} as any);
      container.getBlobClient.returns(blobClient);

      const exists = await bucket.has('file1.txt');
      expect(exists).to.be.true;

      expect(blobClient.getProperties.calledOnce).to.be.true;

      expect(container.getBlobClient.calledOnce).to.be.true;
      expect(container.getBlobClient.firstCall.args[0]).to.equal('file1.txt');
    });

    it('should return false if the key does not exist', async () => {
      const blobClient = createStubInstance(BlockBlobClient);
      blobClient.getProperties.rejects({ statusCode: 404 });
      container.getBlobClient.returns(blobClient);

      const exists = await bucket.has('nonexistent.txt');
      expect(exists).to.be.false;

      expect(blobClient.getProperties.calledOnce).to.be.true;

      expect(container.getBlobClient.calledOnce).to.be.true;
      expect(container.getBlobClient.firstCall.args[0]).to.equal('nonexistent.txt');
    });

    describe('with prefix', () => {
      it('should return true if the key exists', async () => {
        const blobClient = createStubInstance(BlockBlobClient);
        blobClient.getProperties.resolves({} as any);
        container.getBlobClient.returns(blobClient);

        await bucketSub.has('file1.txt');

        expect(container.getBlobClient.calledOnce).to.be.true;
        expect(container.getBlobClient.firstCall.args[0]).to.equal('sub/file1.txt');
      });
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

      expect(content).to.be.an.instanceOf(Buffer);
      expect(content.byteLength).to.equal(8);

      expect(downloadStub.calledOnce).to.be.true;

      expect(container.getBlobClient.calledOnce).to.be.true;
      expect(container.getBlobClient.firstCall.args[0]).to.equal('file1.txt');
    });

    it('should return the file content as a string with the specified encoding', async () => {
      const content = await bucket.get('file1.txt', 'utf-8');

      expect(content).to.be.a('string');
      expect(content).to.equal('content 1');

      expect(downloadStub.calledOnce).to.be.true;

      expect(container.getBlobClient.calledOnce).to.be.true;
      expect(container.getBlobClient.firstCall.args[0]).to.equal('file1.txt');
    });

    describe('with prefix', () => {
      it('should return the file content as a Buffer', async () => {
        await bucketSub.get('file1.txt');

        expect(container.getBlobClient.calledOnce).to.be.true;
        expect(container.getBlobClient.firstCall.args[0]).to.equal('sub/file1.txt');
      });
    });
  });

  describe('set', () => {
    let blockBlobClient: SinonStubbedInstance<BlockBlobClient>;

    beforeEach(() => {
      blockBlobClient = createStubInstance(BlockBlobClient) as any;
      container.getBlockBlobClient.returns(blockBlobClient);
    });

    it('should put an object with the specified key and binary value', async () => {
      blockBlobClient.uploadData.resolves();

      await bucket.set('file1.txt', Uint8Array.from([1, 2, 3]));

      expect(container.getBlockBlobClient.calledOnce).to.be.true;
      expect(container.getBlockBlobClient.firstCall.args[0]).to.equal('file1.txt');

      expect(blockBlobClient.uploadData.calledOnce).to.be.true;
      expect(blockBlobClient.uploadData.firstCall.args[0]).to.deep.equal(Uint8Array.from([1, 2, 3]));
    });

    it('should put an object with the specified key and string value', async () => {
      blockBlobClient.upload.resolves();

      await bucket.set('file1.txt', 'content 1');

      expect(container.getBlockBlobClient.calledOnce).to.be.true;
      expect(container.getBlockBlobClient.firstCall.args[0]).to.equal('file1.txt');

      expect(blockBlobClient.upload.calledOnce).to.be.true;
      expect(blockBlobClient.upload.firstCall.args[0]).to.equal('content 1');
      expect(blockBlobClient.upload.firstCall.args[1]).to.equal(9); // Length of 'content 1'
    });

    describe('with prefix', () => {
      it('should put an object with the specified key and value', async () => {
        await bucketSub.set('file1.txt', 'content 1');

        expect(container.getBlockBlobClient.calledOnce).to.be.true;
        expect(container.getBlockBlobClient.firstCall.args[0]).to.equal('sub/file1.txt');
      });
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

    describe('with prefix', () => {
      it('should return the file content as a Buffer', async () => {
        await bucketSub.delete('file1.txt');

        expect(container.getBlobClient.calledOnce).to.be.true;
        expect(container.getBlobClient.firstCall.args[0]).to.be.equal('sub/file1.txt');
      });
    });
  });
});
