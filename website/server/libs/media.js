import nconf from 'nconf';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client () {
  const endpoint = nconf.get('S3_ENDPOINT');
  const region = nconf.get('S3_REGION') || 'us-east-1';
  const accessKeyId = nconf.get('S3_ACCESS_KEY_ID');
  const secretAccessKey = nconf.get('S3_SECRET_ACCESS_KEY');
  const forcePathStyle = nconf.get('S3_FORCE_PATH_STYLE') === 'true';

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getMediaConfig () {
  const bucket = nconf.get('S3_BUCKET');
  const prefix = nconf.get('S3_TASKS_PREFIX') || 'task-images/';
  const publicBaseUrl = nconf.get('S3_PUBLIC_BASE_URL');
  const maxSizeBytes = Number(nconf.get('S3_TASKS_MAX_SIZE_BYTES') || 5 * 1024 * 1024);
  const allowList = (nconf.get('S3_TASKS_ALLOWED_MIME') || 'image/png,image/jpeg,image/webp,image/gif')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return {
    bucket,
    prefix,
    publicBaseUrl,
    maxSizeBytes,
    allowList,
  };
}

export function getMediaPublicUrl (key) {
  const { publicBaseUrl } = getMediaConfig();
  if (!publicBaseUrl) return null;
  const trimmed = publicBaseUrl.endsWith('/') ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
  return `${trimmed}/${key}`;
}

export async function listMediaObjects () {
  const client = getS3Client();
  if (!client) return { objects: [] };
  const { bucket, prefix } = getMediaConfig();
  if (!bucket) return { objects: [] };

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });
  const result = await client.send(command);
  const objects = (result.Contents || []).map(obj => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified,
  }));
  return { objects };
}

export async function createUploadUrl ({ key, contentType }) {
  const client = getS3Client();
  if (!client) return null;
  const { bucket } = getMediaConfig();
  if (!bucket) return null;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
  return url;
}
