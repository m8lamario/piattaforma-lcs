import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { r2S3Endpoint } from "@/shared/config/drivers";
import type { StorageAdapter } from "../types";

function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Promise.resolve(Buffer.alloc(0));
  if (Buffer.isBuffer(body)) return Promise.resolve(body);
  if (body instanceof Uint8Array) return Promise.resolve(Buffer.from(body));
  const stream = body as AsyncIterable<Uint8Array>;
  return (async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  })();
}

export function createR2StorageAdapter(): StorageAdapter {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 non configurato");
  }
  const client = new S3Client({
    region: "auto",
    endpoint: r2S3Endpoint(accountId),
    credentials: { accessKeyId, secretAccessKey },
  });

  return {
    async putPrivate(input) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.mimeType,
        }),
      );
      return { key: input.key };
    },
    async readPrivate(input) {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: input.key }));
        const body = await streamToBuffer(result.Body);
        return { body };
      } catch {
        return null;
      }
    },
    async getSignedReadUrl(input) {
      return { url: `https://storage.invalid/signed/${input.key}?ttl=${input.expiresInSeconds}` };
    },
    async delete(input) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: input.key })).catch(() => undefined);
    },
  };
}
