# Any Bucket

This library provides implementations for interacting with cloud storage services such as Amazon S3, Azure Blob Storage,
Google Cloud Storage, and local file system storage. It abstracts away the specific details of each provider and
provides a unified interface for common storage operations.

## Installation

To install the library, you can use npm or yarn:

```shell
npm install any-bucket
```

or

```shell
yarn add any-bucket
```

## Usage

All providers implement the `Bucket` interface, which provides the following methods:

```typescript
import { BufferEncodingOption } from 'fs';

interface Bucket {
  /**
   * List all files in the bucket.
   */
  list(folder?: string): Promise<string[]>;

  /**
   * Check if a file exists in the bucket.
   *
   * @param key The path to the file.
   */
  has(key: string): Promise<boolean>;

  /**
   * Get the contents of a file.
   * If no encoding is specified, the file contents will be returned as a buffer.
   *
   * @param key The path to the file.
   * @param encoding The encoding to use ('utf8', etc).
   */
  get(key: string, encoding?: BufferEncodingOption): Promise<Buffer | string>;

  /**
   * Set the contents of a file.
   *
   * @param key The path to the file.
   * @param content The contents of the file.
   */
  put(key: string, content: Uint8Array | string): Promise<void>;

  /**
   * Delete a file.
   *
   * @param key The path to the file.
   */
  delete(key: string): Promise<void>;
}
```

### Local Storage

The `LocalBucket` class provides an implementation for local file system storage. It can be used as follows:

```javascript
import LocalBucket from 'any-bucket/local';

const localBucket = new LocalBucket('/path/to/base/folder');

// Example usage
const files = await localBucket.list();
console.log(files);

const hasFile = await localBucket.has('file.txt');
console.log(hasFile);

const fileContent = await localBucket.get('file.txt');
console.log(fileContent);

await localBucket.put('file.txt', 'Hello, World!');

await localBucket.delete('file.txt');
```

### Amazon S3

```shell
npm install @aws-sdk/client-s3
```

The `S3Bucket` class provides an implementation for [Amazon S3 storage](https://aws.amazon.com/s3/). It requires the AWS
SDK to be installed and configured. Here's an example of how to use it:

```javascript
import { S3 } from '@aws-sdk/client-s3';
import S3Bucket from 'any-bucket/s3';

const s3Client = new S3({ /* configure AWS SDK options */ });
const s3Bucket = new S3Bucket(s3Client, 'my-bucket');

// Example usage
const files = await s3Bucket.list();
console.log(files);

const hasFile = await s3Bucket.has('file.txt');
console.log(hasFile);

const fileContent = await s3Bucket.get('file.txt');
console.log(fileContent);

await s3Bucket.put('file.txt', 'Hello, S3!');

await s3Bucket.delete('file.txt');
```

Instead of a bucket name you can pass a bucket name and a path to the constructor. This will prepend the path
name to all file paths. For example:

```javascript
const s3Bucket = new S3Bucket(s3Client, 'my-bucket/my-folder');
```

### Azure Blob Storage

```shell
npm install @azure/storage-blob
```

The `AzureBucket` class provides an implementation for
[Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs). It requires the `@azure/storage-blob`
package to be installed and authenticated. Here's an example of how to use it:

```javascript
import { BlobServiceClient } from '@azure/storage-blob';
import AzureBucket from 'any-bucket/azure';

const connectionString = '<your-connection-string>';
const azureClient = BlobServiceClient.fromConnectionString(connectionString);
const azureBucket = new AzureBucket(azureClient, 'my-container');

// Example usage
const files = await azureBucket.list();
console.log(files);

const hasFile = await azureBucket.has('file.txt');
console.log(hasFile);

const fileContent = await azureBucket.get('file.txt');
console.log(fileContent);

await azureBucket.put('file.txt', 'Hello, Azure!');

await azureBucket.delete('file.txt');
```

Instead of a bucket name you can pass a bucket name and a path to the constructor. This will prepend the path
name to all file paths. For example:

```javascript
const azureBucket = new AzureBucket(azureClient, 'my-container/my-folder');
```

### Google Cloud Storage

```shell
npm install @google-cloud/storage
```

The `GCSBucket` class provides an implementation for [Google Cloud Storage](https://cloud.google.com/storage). It
requires the `@google-cloud/storage` package to be installed and authenticated. Here's an example of how to use it:

```javascript
import { Storage } from '@google-cloud/storage';
import GCSBucket from 'any-bucket/gcs';

const storage = new Storage({ /* configure authentication options */ });
const gcsBucket = new GCSBucket(storage, 'my-bucket');

// Example usage
const files = await gcsBucket.list();
console.log(files);

const hasFile = await gcsBucket.has('file.txt');
console.log(hasFile);

const fileContent = await gcsBucket.get('file.txt');
console.log(fileContent);

await gcsBucket.put('file.txt', 'Hello, GCS!');

await gcsBucket.delete('file.txt');
```

Instead of a bucket name you can pass a bucket name and a path to the constructor. This will prepend the path
name to all file paths. For example:

```javascript
const gcsBucket = new GCSBucket(storage, 'my-bucket/my-folder');
```

## Contributing

Contributions are welcome! If you encounter any issues or have suggestions for improvements, please create an issue or
submit a pull request on the [GitHub repository](https://github.com/ltonetwork/any-bucket).

## License

This library is licensed under the [MIT License](LICENSE).
