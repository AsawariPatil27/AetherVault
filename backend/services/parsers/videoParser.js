import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import axios from "axios";
import fs from "fs";
import { parseAudio } from "./audioParser.js";

ffmpeg.setFfmpegPath(ffmpegPath);

export const parseVideo = async (fileUrl) => {
  let videoPath = "";
  let audioPath = "";

  try {
    const ext = fileUrl.split(".").pop().split("?")[0] || "mp4";

    videoPath = `temp_video_${Date.now()}.${ext}`;
    audioPath = `temp_audio_${Date.now()}.wav`;

    // Download video
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer"
    });

    fs.writeFileSync(videoPath, response.data);

    // Extract audio (VERY IMPORTANT for Whisper)
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(audioPath)
        .noVideo()
        .audioFrequency(16000) // required for Whisper
        .audioChannels(1)      // mono audio
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // 🔥 Reuse audio parser
    const result = await parseAudio(audioPath);

    return result;

  } catch (error) {
    console.error("Video parsing error:", error);
    return "";

  } finally {
    if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
};