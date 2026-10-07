import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const LINK_EXPIRES_SECONDS = 5 * 60;

let client: S3Client | null = null;

function s3(): S3Client {
  client ??= new S3Client({
    region: process.env.AWS_REGION,
    // Presigned browser uploads can fail if the SDK adds automatic checksums,
    // so only use them when S3 requires it
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return client;
}

function bucket(): string {
  const name = process.env.S3_BUCKET;
  if (!name) {
    throw new Error('S3_BUCKET is not set');
  }
  return name;
}

// A link the browser can use to upload one specific file
export function createUploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn: LINK_EXPIRES_SECONDS }
  );
}

// A link that downloads one specific file under its original name
export function createDownloadUrl(key: string, fileName: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    }),
    { expiresIn: LINK_EXPIRES_SECONDS }
  );
}

// Size and type of a file in S3, or null if it doesn't exist
export async function getFileInfo(
  key: string
): Promise<{ size: number; contentType: string | undefined } | null> {
  try {
    const head = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType };
  } catch (err: any) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

// Deletes every file in one user's folder. Returns how many files were deleted.
export async function deleteUserFolder(userId: number): Promise<number> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Refusing to delete: invalid user id');
  }
  const prefix = `users/${userId}/`;

  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const page = await s3().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const keys = (page.Contents ?? [])
      .map(object => object.Key)
      .filter((key): key is string => !!key);

    if (keys.length > 0) {
      const result = await s3().send(
        new DeleteObjectsCommand({
          Bucket: bucket(),
          Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true },
        })
      );
      if (result.Errors && result.Errors.length > 0) {
        throw new Error(`Failed to delete ${result.Errors.length} file(s) in ${prefix}`);
      }
      deleted += keys.length;
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
}

export async function deleteFile(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}