// @ts-ignore
import * as fs from 'node:fs/promises';
import { expect } from 'chai';
import * as mock from 'mock-fs';
import LocalBucket from '../src/local';

describe('LocalBucket', () => {
  beforeEach(() => {
    // Set up the mock filesystem
    mock({
      '/base/path': {
        'file1.txt': 'content 1',
        'file2.txt': 'content 2',
        folder: {
          'file3.txt': 'content 3',
        },
      },
    });
  });

  afterEach(() => {
    // Restore the original filesystem
    mock.restore();
  });

  describe('list', () => {
    it('should list files in a folder', async () => {
      const bucket = new LocalBucket('/base/path');
      const files = await bucket.list('folder');

      expect(files).to.deep.equal(['file3.txt']);
    });

    it('should list all files in the base path if no folder is provided', async () => {
      const bucket = new LocalBucket('/base/path');
      const files = await bucket.list();

      expect(files).to.deep.equal(['file1.txt', 'file2.txt', 'folder']);
    });
  });

  describe('has', () => {
    it('should return true if the key exists', async () => {
      const bucket = new LocalBucket('/base/path');
      const exists = await bucket.has('file1.txt');

      expect(exists).to.be.true;
    });

    it('should return false if the key does not exist', async () => {
      const bucket = new LocalBucket('/base/path');
      const exists = await bucket.has('nonexistent.txt');

      expect(exists).to.be.false;
    });
  });

  describe('get', () => {
    it('should return the file content as a Buffer', async () => {
      const bucket = new LocalBucket('/base/path');
      const content = await bucket.get('file1.txt');

      expect(content).to.be.an.instanceOf(Uint8Array);
      expect(content.toString()).to.equal('content 1');
    });

    it('should return the file content as a string with the specified encoding', async () => {
      const bucket = new LocalBucket('/base/path');
      const content = await bucket.get('file1.txt', 'utf-8');

      expect(content).to.be.a('string');
      expect(content).to.equal('content 1');
    });
  });

  describe('set', () => {
    it('should create a new file with the given content', async () => {
      const bucket = new LocalBucket('/base/path');
      const key = 'new-file.txt';
      const value = 'new file content';

      await bucket.set(key, value);
      const content = await fs.readFile(`/base/path/${key}`, 'utf-8');

      expect(content).to.equal(value);
    });

    it('should create nested directories if necessary', async () => {
      const bucket = new LocalBucket('/base/path');
      const key = 'nested/folder/file.txt';
      const value = 'nested file content';

      await bucket.set(key, value);
      const content = await fs.readFile(`/base/path/${key}`, 'utf-8');

      expect(content).to.equal(value);
    });

    it('should throw an error if the key is empty', async () => {
      const bucket = new LocalBucket('/base/path');

      try {
        await bucket.set('', 'value');
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('key is empty');
      }
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      const bucket = new LocalBucket('/base/path');
      const key = 'file1.txt';

      await bucket.delete(key);
      const exists = await fs.access(`/base/path/${key}`).then(() => true, () => false);

      expect(exists).to.be.false;
    });

    it('should throw an error if the key is empty', async () => {
      const bucket = new LocalBucket('/base/path');

      try {
        await bucket.delete('');
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('key is empty');
      }
    });
  });
});
