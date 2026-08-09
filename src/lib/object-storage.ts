import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getServerEnv } from "@/lib/env";

let client: S3Client | undefined;

function configuration() {
  const env = getServerEnv();
  if (!env.OBJECT_STORAGE_ENABLED || !env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error("Object storage is not configured.");
  }
  client ??= new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  return { client, bucket: env.S3_BUCKET };
}

export async function putProfileObject(input: { key: string; body: Uint8Array; contentType: string; checksum: string }) {
  const { client, bucket } = configuration();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    CacheControl: "public, max-age=31536000, immutable",
    Metadata: { sha256: input.checksum },
  }));
}

export async function getProfileObject(key: string) {
  const { client, bucket } = configuration();
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteProfileObject(key: string) {
  const { client, bucket } = configuration();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
