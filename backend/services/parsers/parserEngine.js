import {parsePDF} from "./pdfParser.js";
import {parseImage} from "./imageParser.js";
import {parseAudio} from "./audioParser.js";
import {parseVideo} from "./videoParser.js";

export const parseFile = async(fileUrl, fileType) =>
{
    if(fileType === "pdf")
    {
        return await parsePDF(fileUrl);
    }

    if(fileType === "image")
    {
        return await parseImage(fileUrl);
    }

    if(fileType === "audio")
    {
        return await parseAudio(fileUrl);
    }

    if(fileType === "video")
    {
        return await parseVideo(fileUrl);
    }

    return "";
};
