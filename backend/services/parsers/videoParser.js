import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";

ffmpeg.setFfmpegPath(ffmpegPath);

const PYTHON_PATH = "C:/Users/hp/anaconda3/envs/whisper_env/python.exe";

export const parseVideo = async (fileUrl) => {
  let videoPath = `temp_video_${Date.now()}.mp4`;
  let audioPath = `temp_audio_${Date.now()}.wav`;

  try {
    // ✅ Download video
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });

    fs.writeFileSync(videoPath, response.data);

    // ✅ Extract audio
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(audioPath)
        .noVideo()
        .audioFrequency(16000)
        .audioChannels(1)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // ✅ Whisper transcription
    const result = await new Promise((resolve, reject) => {
      exec(
        `"${PYTHON_PATH}" whisper.py "${audioPath}"`,
        (error, stdout, stderr) => {
          if (error) {
            console.error("Whisper Error:", stderr);
            return reject(new Error(stderr || error.message));
          }
          resolve(stdout);
        }
      );
    });

    // ✅ CLEAN OUTPUT
    const cleaned = result
      ?.replace(/\[.*?\]/g, "")
      ?.replace(/\s+/g, " ")
      ?.trim();

    return cleaned || "";

  } catch (error) {
    console.error("Video parsing error:", error);
    return "";

  } finally {
    if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
};