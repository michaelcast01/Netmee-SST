import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { deleteLocalPrivateObject, getLocalPrivateObject, putLocalPrivateObject } from "@/lib/storage/local-private-storage";
import { objectStorageKey } from "@/lib/storage/object-key";

let client: S3Client | undefined;
const testObjects = new Map<string, { body: Uint8Array; contentType: string }>();

export class PrivateStorageConfigurationError extends Error {
  constructor() {
    super("El almacenamiento privado no está configurado en este ambiente.");
    this.name = "PrivateStorageConfigurationError";
  }
}

function hasObjectStorageConfig() {
  return Boolean(
    process.env.OBJECT_STORAGE_ENDPOINT &&
      process.env.OBJECT_STORAGE_BUCKET &&
      process.env.OBJECT_STORAGE_ACCESS_KEY &&
      process.env.OBJECT_STORAGE_SECRET_KEY,
  );
}

function usesLocalStorage() {
  if (process.env.LOCAL_PRIVATE_STORAGE === "true") return true;
  return process.env.NODE_ENV !== "production" && !hasObjectStorageConfig();
}

function getConfig() {
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  const bucket = process.env.OBJECT_STORAGE_BUCKET;
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new PrivateStorageConfigurationError();
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function getClient() {
  if (client) return client;
  const config = getConfig();
  client = new S3Client({ endpoint: config.endpoint, region: process.env.OBJECT_STORAGE_REGION ?? "us-east-1", forcePathStyle: true, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  return client;
}

export async function putPrivateObject(key: string, body: Uint8Array, contentType: string, checksum: string) {
  if (process.env.E2E_STORAGE_MEMORY === "true") { testObjects.set(key, { body, contentType }); return; }
  if (usesLocalStorage()) { await putLocalPrivateObject(key, body); return; }
  const { bucket } = getConfig();
  await getClient().send(new PutObjectCommand({ Bucket: bucket, Key: objectStorageKey(key), Body: body, ContentType: contentType, Metadata: { sha256: checksum } }));
}

export async function deletePrivateObject(key: string) {
  if (process.env.E2E_STORAGE_MEMORY === "true") { testObjects.delete(key); return; }
  if (usesLocalStorage()) { await deleteLocalPrivateObject(key); return; }
  const { bucket } = getConfig();
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectStorageKey(key) }));
}

export async function createPrivateDownloadUrl(key: string) {
  const { bucket } = getConfig();
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: objectStorageKey(key) }), { expiresIn: 5 * 60 });
}

export function getInMemoryPrivateObject(key: string) {
  return process.env.E2E_STORAGE_MEMORY === "true" ? testObjects.get(key) ?? null : null;
}

export async function getDirectPrivateObject(key: string) {
  const inMemoryObject = getInMemoryPrivateObject(key);
  if (inMemoryObject) return inMemoryObject;
  if (!usesLocalStorage()) return null;
  const body = await getLocalPrivateObject(key);
  return body ? { body, contentType: "application/octet-stream" } : null;
}

export const putEvidenceObject = putPrivateObject;
export const deleteEvidenceObject = deletePrivateObject;
export const createEvidenceDownloadUrl = createPrivateDownloadUrl;
