import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

export const getSignedFileUrl = async(key)=>
{
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key:key,
    });

    const url = await getSignedUrl(s3, command,{
        expiresIn: 3600,
    });

    return url;
};