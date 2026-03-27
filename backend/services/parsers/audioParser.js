import axios from "axios";
import fs from "fs";
import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const PYTHON_PATH = "C:/Users/hp/anaconda3/envs/whisper_env/python.exe";

export const parseAudio = async (fileUrl) => {
  const inputPath = `temp_input_${Date.now()}`;
  const outputPath = `temp_audio_${Date.now()}.wav`;

  try {
    // ✅ Download from S3 signed URL
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });

    fs.writeFileSync(inputPath, response.data);

    // ✅ Convert → WAV
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .audioFrequency(16000)
        .audioChannels(1)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // ✅ Whisper transcription
    const result = await new Promise((resolve, reject) => {
      exec(
        `"${PYTHON_PATH}" whisper.py "${outputPath}"`,
        (error, stdout, stderr) => {
          if (error) {
            console.error("Whisper Error:", stderr);
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout.trim());
          }
        }
      );
    });

    return result;

  } catch (error) {
    console.error("Audio parsing error:", error);
    return "";

  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
};