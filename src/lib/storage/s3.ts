import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | undefined;

function getConfig() {
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  const bucket = process.env.OBJECT_STORAGE_BUCKET;
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error("El almacenamiento de evidencias no está configurado.");
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function getClient() {
  if (client) return client;
  const config = getConfig();
  client = new S3Client({ endpoint: config.endpoint, region: process.env.OBJECT_STORAGE_REGION ?? "us-east-1", forcePathStyle: true, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  return client;
}

export async function putEvidenceObject(key: string, body: Uint8Array, contentType: string, checksum: string) {
  const { bucket } = getConfig();
  await getClient().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, Metadata: { sha256: checksum } }));
}

export async function deleteEvidenceObject(key: string) {
  const { bucket } = getConfig();
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function createEvidenceDownloadUrl(key: string) {
  const { bucket } = getConfig();
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 5 * 60 });
}
