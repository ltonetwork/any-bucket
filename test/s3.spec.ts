import { expect } from 'chai';
import { spy, stub, SinonStub } from 'sinon';
import { S3 } from '@aws-sdk/client-s3';
import S3Bucket from '../src/s3';

describe('S3Bucket', () => {
  let s3Client;
  let bucket;

  beforeEach(() => {
    s3Client = new S3({});
    bucket = new S3Bucket(s3Client, 'bucketName');
  });

  describe('list', () => {
    let listObjectsV2Stub: SinonStub;

    beforeEach(() => {
      listObjectsV2Stub = stub(s3Client, 'listObjectsV2').resolves({
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
  });

  describe('has', () => {
    let headObjectStub: SinonStub;

    beforeEach(() => {
      headObjectStub = stub(s3Client, 'headObject');
    });

    afterEach(() => {
      headObjectStub.restore();
    });

    it('should return true if the key exists', async () => {
      headObjectStub.resolves();

      const exists = await bucket.has('file1.txt');

      expect(headObjectStub.calledOnce).to.be.true;
      expect(exists).to.be.true;
    });

    it('should return false if the key does not exist', async () => {
      headObjectStub.returns(Promise.reject({ code: 'NotFound' }));

      const exists = await bucket.has('nonexistent.txt');

      expect(headObjectStub.calledOnce).to.be.true;
      expect(exists).to.be.false;
    });
  });

  describe('get', () => {
    let getObjectStub: SinonStub;
    const body = {
      transformToString: (encoding: BufferEncoding) => 'content 1',
      transformToByteArray: () => Buffer.from('content 1'),
    };

    beforeEach(() => {
      getObjectStub = stub(s3Client, 'getObject');
      getObjectStub.resolves({ Body: body });
    });

    afterEach(() => {
      getObjectStub.restore();
    });

    it('should return the file content as a Buffer', async () => {
      const transformToByteArray = spy(body, 'transformToByteArray');

      const content = await bucket.get('file1.txt');

      expect(getObjectStub.calledOnce).to.be.true;
      expect(content).to.be.an.instanceOf(Buffer);
      expect(content.toString()).to.equal('content 1');

      expect(transformToByteArray.calledOnce).to.be.true;
    });

    it('should return the file content as a string with the specified encoding', async () => {
      const transformToString = spy(body, 'transformToString');

      const content = await bucket.get('file1.txt', 'utf-8');

      expect(getObjectStub.calledOnce).to.be.true;
      expect(content).to.be.a('string');
      expect(content).to.equal('content 1');

      expect(transformToString.calledOnce).to.be.true;
      expect(transformToString.firstCall.args[0]).to.equal('utf-8');
    });
  });

  describe('set', () => {
    let putObjectStub: SinonStub;

    beforeEach(() => {
      putObjectStub = stub(s3Client, 'putObject').resolves();
    });

    afterEach(() => {
      putObjectStub.restore();
    });

    it('should put an object with the specified key and value', async () => {
      await bucket.set('file1.txt', 'content 1');

      expect(putObjectStub.calledOnce).to.be.true;
      expect(putObjectStub.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Key: 'file1.txt',
        Body: 'content 1',
      });
    });
  });

  describe('delete', () => {
    let deleteObjectStub: SinonStub;

    beforeEach(() => {
      deleteObjectStub = stub(s3Client, 'deleteObject').resolves();
    });

    afterEach(() => {
      deleteObjectStub.restore();
    });

    it('should delete an object with the specified key', async () => {
      await bucket.delete('file1.txt');

      expect(deleteObjectStub.calledOnce).to.be.true;
      expect(deleteObjectStub.firstCall.args[0]).to.deep.equal({
        Bucket: 'bucketName',
        Key: 'file1.txt',
      });
    });
  });
});
