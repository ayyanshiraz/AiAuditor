import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";

/**
 * Attachment storage is architected as metadata + reference, never raw
 * binaries in Postgres: the `attachments` table stores a fileName/fileType/
 * fileSize/storageKey/storageProvider row, and the actual bytes live in
 * whichever provider is configured (STORAGE_PROVIDER env var). This keeps
 * the DB small and lets a deployment point at S3 (or any S3-compatible
 * object store) in production without changing any application code —
 * only this file's `local` vs `s3` branch is provider-specific.
 */

const LOCAL_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

export interface StoredFile {
  storageKey: string;
  storageProvider: "local" | "s3";
}

export async function saveFile(
  companyId: string,
  fileName: string,
  buffer: Buffer
): Promise<StoredFile> {
  const provider = (process.env.STORAGE_PROVIDER ?? "local") as "local" | "s3";
  const key = `${companyId}/${randomUUID()}-${sanitizeFileName(fileName)}`;

  if (provider === "s3") {
    await putToS3(key, buffer);
    return { storageKey: key, storageProvider: "s3" };
  }

  const fullPath = path.join(LOCAL_UPLOAD_ROOT, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return { storageKey: key, storageProvider: "local" };
}

export async function readFile(storageKey: string, storageProvider: string): Promise<Buffer> {
  if (storageProvider === "s3") {
    return getFromS3(storageKey);
  }
  const fullPath = path.join(LOCAL_UPLOAD_ROOT, storageKey);
  return fs.readFile(fullPath);
}

/** Returns a URL the browser can fetch the file from (a signed URL for S3, an app route for local). */
export async function getFileUrl(storageKey: string, storageProvider: string): Promise<string> {
  if (storageProvider === "s3") {
    return getS3SignedUrl(storageKey);
  }
  return `/api/attachments/download?key=${encodeURIComponent(storageKey)}`;
}

export async function deleteFile(storageKey: string, storageProvider: string): Promise<void> {
  if (storageProvider === "s3") {
    await deleteFromS3(storageKey);
    return;
  }
  const fullPath = path.join(LOCAL_UPLOAD_ROOT, storageKey);
  await fs.rm(fullPath, { force: true });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120);
}

/* ------------------------------------------------------------------ */
/*  S3-compatible provider (lazy-loaded — only touched when            */
/*  STORAGE_PROVIDER=s3, so a local-only deployment never needs the    */
/*  AWS SDK to be configured).                                          */
/* ------------------------------------------------------------------ */

async function s3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: process.env.STORAGE_S3_REGION,
    credentials:
      process.env.STORAGE_S3_ACCESS_KEY_ID && process.env.STORAGE_S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

async function putToS3(key: string, body: Buffer) {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await s3Client();
  await client.send(
    new PutObjectCommand({ Bucket: process.env.STORAGE_S3_BUCKET, Key: key, Body: body })
  );
}

async function getFromS3(key: string): Promise<Buffer> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await s3Client();
  const res = await client.send(
    new GetObjectCommand({ Bucket: process.env.STORAGE_S3_BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function getS3SignedUrl(key: string): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await s3Client();
  const command = new GetObjectCommand({ Bucket: process.env.STORAGE_S3_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: 900 });
}

async function deleteFromS3(key: string) {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await s3Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: process.env.STORAGE_S3_BUCKET, Key: key })
  );
}
