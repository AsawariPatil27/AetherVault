import dotenv from "dotenv";
dotenv.config();
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
console.log("BUCKET:", process.env.AWS_BUCKET_NAME);

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (req, file, cb) => {
      const fileName = Date.now() + "-" + file.originalname;
      cb(null, fileName);
    }
  }),

  fileFilter: (req, file, cb) => {

    const mime = file.mimetype;

    if (
      mime === "application/pdf" ||
      mime.startsWith("image/") ||
      mime.startsWith("audio/") ||
      mime.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  }
});