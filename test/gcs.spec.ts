import { expect } from 'chai';
import { stub, restore, createStubInstance, SinonStubbedInstance } from 'sinon';
import GCSBucket from '../src/gcs';
import { Bucket as StorageBucket, File as StorageFile, Storage } from '@google-cloud/storage';

describe('GCSBucket', () => {
  let gcsBucket: SinonStubbedInstance<StorageBucket>;
  let bucket: GCSBucket;
  let bucketSub: GCSBucket;

  beforeEach(() => {
    gcsBucket = createStubInstance(StorageBucket);
    const storage = new Storage();
    stub(storage, 'bucket').returns(gcsBucket);

    bucket = new GCSBucket(storage as any, 'bucketName');
    bucketSub = new GCSBucket(storage as any, 'bucketName/sub');
  });

  afterEach(() => {
    restore();
  });

  describe('list', () => {
    beforeEach(() => {
      gcsBucket.getFiles.resolves([
        [
          { name: 'file1.txt' },
          { name: 'file2.txt' },
        ]
      ]);
    });

    it('should list files in a folder', async () => {
      const files = await bucket.list('folder');

      expect(files).to.deep.equal(['file1.txt', 'file2.txt']);

      expect(gcsBucket.getFiles.calledOnce).to.be.true;
      expect(gcsBucket.getFiles.firstCall.args[0]).to.deep.equal({ prefix: 'folder/' });
    });

    it('should list all files in the bucket if no folder is provided', async () => {
      const files = await bucket.list();

      expect(files).to.deep.equal(['file1.txt', 'file2.txt']);

      expect(gcsBucket.getFiles.calledOnce).to.be.true;
      expect(gcsBucket.getFiles.firstCall.args[0]).to.deep.equal({});
    });

    describe('with prefix', () => {
      it('should list files in a sub folder', async () => {
        await bucketSub.list('folder');

        expect(gcsBucket.getFiles.calledOnce).to.be.true;
        expect(gcsBucket.getFiles.firstCall.args[0]).to.deep.equal({ prefix: 'sub/folder/' });
      });

      it('should list all files in the main folder if no folder is provided', async () => {
        await bucketSub.list();

        expect(gcsBucket.getFiles.calledOnce).to.be.true;
        expect(gcsBucket.getFiles.firstCall.args[0]).to.deep.equal({ prefix: 'sub/' });
      });
    });
  });

  describe('has', () => {
    let gcsFile: SinonStubbedInstance<StorageFile>;

    beforeEach(() => {
      gcsFile = createStubInstance(StorageFile);
      gcsBucket.file.returns(gcsFile);
    });

    it('should return true if the key exists', async () => {
      gcsFile.exists.resolves([true]);

      const exists = await bucket.has('file1.txt');
      expect(exists).to.be.true;

      expect(gcsBucket.file.calledOnce).to.be.true;
      expect(gcsBucket.file.firstCall.args[0]).to.deep.equal('file1.txt');

      expect(gcsFile.exists.calledOnce).to.be.true;
    });

    it('should return false if the key does not exist', async () => {
      gcsFile.exists.resolves([false]);

      const exists = await bucket.has('file1.txt');
      expect(exists).to.be.false;

      expect(gcsBucket.file.calledOnce).to.be.true;
      expect(gcsBucket.file.firstCall.args[0]).to.deep.equal('file1.txt');

      expect(gcsFile.exists.calledOnce).to.be.true;
    });

    describe('with prefix', () => {
      it('should return true if the key exists', async () => {
        gcsFile.exists.resolves([true]);

        await bucketSub.has('file1.txt');

        expect(gcsBucket.file.calledOnce).to.be.true;
        expect(gcsBucket.file.firstCall.args[0]).to.deep.equal('sub/file1.txt');
      });
    });
  });

  describe('get', () => {
    let gcsFile: SinonStubbedInstance<StorageFile>;

    beforeEach(() => {
      gcsFile = createStubInstance(StorageFile);
      gcsBucket.file.returns(gcsFile);

      gcsFile.download.resolves([Buffer.from('content 1')]);
    });

    it('should return the file content as a Buffer', async () => {
      const content = await bucket.get('file1.txt');

      expect(content).to.be.an.instanceOf(Buffer);
      expect(content.byteLength).to.equal(9);

      expect(gcsFile.download.calledOnce).to.be.true;
      expect(gcsBucket.file.calledOnce).to.be.true;
      expect(gcsBucket.file.firstCall.args[0]).to.be.equal('file1.txt');
    });

    it('should return the file content as a string with the specified encoding', async () => {
      const content = await bucket.get('file1.txt', 'utf-8');

      expect(content).to.equal('content 1');

      expect(gcsFile.download.calledOnce).to.be.true;
      expect(gcsBucket.file.calledOnce).to.be.true;
      expect(gcsBucket.file.firstCall.args[0]).to.be.equal('file1.txt');
    });

    describe('with prefix', () => {
      it('should return the file content', async () => {
        await bucketSub.get('file1.txt');

        expect(gcsBucket.file.calledOnce).to.be.true;
        expect(gcsBucket.file.firstCall.args[0]).to.be.equal('sub/file1.txt');
      });
    });
  });

  describe('set', () => {
    let gcsFile: SinonStubbedInstance<StorageFile>;

    beforeEach(() => {
      gcsFile = createStubInstance(StorageFile);
      gcsBucket.file.returns(gcsFile);

      gcsFile.save.resolves();
    });

    it('should put an object with a string value', async () => {
      await bucket.set('file1.txt', 'content 1');

      expect(gcsBucket.file.calledOnce).to.be.true;
      expect(gcsBucket.file.firstCall.args[0]).to.equal('file1.txt');

      expect(gcsFile.save.calledOnce).to.be.true;
      expect(gcsFile.save.firstCall.args[0]).to.equal('content 1');
    });

    it('should put an object with a binary value', async () => {
      await bucket.set('file1.txt', Uint8Array.from([1, 2, 3, 4]));

      expect(gcsBucket.file.calledOnce).to.be.true;
      expect(gcsBucket.file.firstCall.args[0]).to.equal('file1.txt');

      expect(gcsFile.save.calledOnce).to.be.true;
      expect(gcsFile.save.firstCall.args[0]).to.deep.equal(Uint8Array.from([1, 2, 3, 4]));
    });

    describe('with prefix', () => {
      it('should put an object with a string value', async () => {
        await bucketSub.set('file1.txt', 'content 1');

        expect(gcsBucket.file.calledOnce).to.be.true;
        expect(gcsBucket.file.firstCall.args[0]).to.equal('sub/file1.txt');
      });
    });
  });

  describe('delete', () => {
    let gcsFile: SinonStubbedInstance<StorageFile>;

    beforeEach(() => {
      gcsFile = createStubInstance(StorageFile);
      gcsBucket.file.returns(gcsFile);

      gcsFile.delete.resolves();
    });

    it('should delete an object with the specified key', async () => {
      await bucket.delete('file1.txt');

      expect(gcsBucket.file.calledOnce).to.be.true;
      expect(gcsBucket.file.firstCall.args[0]).to.be.equal('file1.txt');

      expect(gcsFile.delete.calledOnce).to.be.true;
    });

    describe('with prefix', () => {
      it('should delete an object with the specified key', async () => {
        await bucketSub.delete('file1.txt');

        expect(gcsBucket.file.calledOnce).to.be.true;
        expect(gcsBucket.file.firstCall.args[0]).to.be.equal('sub/file1.txt');
      });
    });
  });
});
