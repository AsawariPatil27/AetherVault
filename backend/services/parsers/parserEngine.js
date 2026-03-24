import { getSignedFileUrl } from "../../utils/s3SignedUrl.js";
import { parsePdf } from "./pdfParser.js";
import { parseImage } from "./imageParser.js";
import { parseAudio } from "./audioParser.js";
import { parseVideo } from "./videoParser.js";

export const parseFile = async (fileKey, fileType) => {

  const signedUrl = await getSignedFileUrl(fileKey);

  if (fileType === "pdf") {
    return await parsePdf(signedUrl);
  }

  if (fileType === "image") {
    return await parseImage(signedUrl);
  }

  if (fileType === "audio") {
    return await parseAudio(signedUrl);
  }

  if (fileType === "video") {
    return await parseVideo(signedUrl);
  }

  return "";
};