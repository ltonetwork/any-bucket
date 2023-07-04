import { expect } from 'chai';
import { spy, SinonStub, SinonStubbedInstance, createStubInstance } from 'sinon';
import { S3 } from '@aws-sdk/client-s3';
import S3Bucket from '../src/s3';

describe('S3Bucket', () => {
  let s3Client: SinonStubbedInstance<S3>;
  let bucket: S3Bucket;
  let bucketSub: S3Bucket;

  beforeEach(() => {
    s3Client = createStubInstance(S3);
    bucket = new S3Bucket(s3Client, 'bucketName');
    bucketSub = new S3Bucket(s3Client, 'bucketName/sub');
  });

  describe('list', () => {
    let listObjectsV2Stub: SinonStub;

    beforeEach(() => {
      listObjectsV2Stub = s3Client.listObjectsV2.resolves({
        Contents: [
          { Key: 'file1.txt' },
          { Key: 'file2.txt' },
        ],
        CommonPrefixes: [
          { Prefix: 'folder/' },
        ],
      });
    });

    afterEach(() => {
      listObjectsV2Stub.restore();
    });

    it('should list files in a folder', async () => {
      const files = await bucket.list('folder');

      expect(files).to.deep.equal(['file1.txt', 'file2.txt', 'folder']);

      expect(listObjectsV2Stub.calledOnce).to.be.true;
      expect(listObjectsV2Stub.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Delimiter: '/',
        Prefix: 'folder/',
      });
    });

    it('should list all files in the bucket if no folder is provided', async () => {
      const files = await bucket.list();

      expect(files).to.deep.equal(['file1.txt', 'file2.txt', 'folder']);

      expect(listObjectsV2Stub.calledOnce).to.be.true;
      expect(listObjectsV2Stub.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Delimiter: '/',
        Prefix: '',
      });
    });

    describe('with prefix', () => {
      it('should list files in a sub folder', async () => {
        await bucketSub.list('folder');

        expect(listObjectsV2Stub.calledOnce).to.be.true;
        expect(listObjectsV2Stub.firstCall.args[0]).to.deep.equal({
          Bucket: 'bucketName',
          Delimiter: '/',
          Prefix: 'sub/folder/',
        });
      });

      it('should list all files in the main folder if no folder is provided', async () => {
        await bucketSub.list();

        expect(listObjectsV2Stub.calledOnce).to.be.true;
        expect(listObjectsV2Stub.firstCall.args[0]).to.deep.equal({
          Bucket: 'bucketName',
          Delimiter: '/',
          Prefix: 'sub/',
        });
      });
    });
  });

  describe('has', () => {
    it('should return true if the key exists', async () => {
      s3Client.headObject.resolves();

      const exists = await bucket.has('file1.txt');
      expect(exists).to.be.true;

      expect(s3Client.headObject.calledOnce).to.be.true;
      expect(s3Client.headObject.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Key: 'file1.txt',
      });
    });

    it('should return false if the key does not exist', async () => {
      s3Client.headObject.rejects({ code: 'NotFound' });

      const exists = await bucket.has('nonexistent.txt');
      expect(exists).to.be.false;

      expect(s3Client.headObject.calledOnce).to.be.true;
      expect(s3Client.headObject.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Key: 'nonexistent.txt',
      });
    });

    describe('with prefix', () => {
      it('should return true if the key exists', async () => {
        s3Client.headObject.resolves();

        await bucketSub.has('file1.txt');

        expect(s3Client.headObject.calledOnce).to.be.true;
        expect(s3Client.headObject.firstCall.args[0]).to.deep.equal({
          Bucket: 'bucketName',
          Key: 'sub/file1.txt',
        });
      });
    });
  });

  describe('get', () => {
    // noinspection JSUnusedLocalSymbols
    const body = {
      transformToString: (encoding: BufferEncoding) => 'content 1',
      transformToByteArray: () => Buffer.from('content 1'),
    };

    beforeEach(() => {
      s3Client.getObject.resolves({ Body: body });
    });

    it('should return the file content as a Buffer', async () => {
      const transformToByteArray = spy(body, 'transformToByteArray');

      const content = await bucket.get('file1.txt');

      expect(s3Client.getObject.calledOnce).to.be.true;
      expect(s3Client.getObject.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Key: 'file1.txt',
      });

      expect(content).to.be.an.instanceOf(Buffer);
      expect(content.toString()).to.equal('content 1');

      expect(transformToByteArray.calledOnce).to.be.true;
    });

    it('should return the file content as a string with the specified encoding', async () => {
      const transformToString = spy(body, 'transformToString');

      const content = await bucket.get('file1.txt', 'utf-8');

      expect(s3Client.getObject.calledOnce).to.be.true;
      expect(s3Client.getObject.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Key: 'file1.txt',
      });

      expect(content).to.be.a('string');
      expect(content).to.equal('content 1');

      expect(transformToString.calledOnce).to.be.true;
      expect(transformToString.firstCall.args[0]).to.equal('utf-8');
    });

    describe('with prefix', () => {
      it('should return the file content as a Buffer', async () => {
        await bucketSub.get('file1.txt');

        expect(s3Client.getObject.calledOnce).to.be.true;
        expect(s3Client.getObject.firstCall.args[0]).to.deep.equal({
          Bucket: 'bucketName',
          Key: 'sub/file1.txt',
        });
      });
    });
  });

  describe('set', () => {
    beforeEach(() => {
      s3Client.putObject.resolves();
    });

    it('should put an object with the specified key and value', async () => {
      await bucket.set('file1.txt', 'content 1');

      expect(s3Client.putObject.calledOnce).to.be.true;
      expect(s3Client.putObject.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Key: 'file1.txt',
        Body: 'content 1',
      });
    });

    describe('with prefix', () => {
      it('should put an object with the specified key and value', async () => {
        await bucketSub.set('file1.txt', 'content 1');

        expect(s3Client.putObject.calledOnce).to.be.true;
        expect(s3Client.putObject.firstCall.args[0]).to.deep.equal({
          Bucket: 'bucketName',
          Key: 'sub/file1.txt',
          Body: 'content 1',
        });
      });
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      s3Client.deleteObject.resolves();
    });

    it('should delete an object with the specified key', async () => {
      await bucket.delete('file1.txt');

      expect(s3Client.deleteObject.calledOnce).to.be.true;
      expect(s3Client.deleteObject.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Key: 'file1.txt',
      });
    });

    describe('with prefix', () => {
      it('should delete an object with the specified key', async () => {
        await bucketSub.delete('file1.txt');

        expect(s3Client.deleteObject.calledOnce).to.be.true;
        expect(s3Client.deleteObject.firstCall.args[0]).to.deep.equal({
          Bucket: 'bucketName',
          Key: 'sub/file1.txt',
        });
      });
    });
  });
});
