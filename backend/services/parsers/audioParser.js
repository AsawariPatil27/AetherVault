import axios from "axios";
import fs from "fs";
import { exec } from "child_process";

// 🔥 IMPORTANT: update this to YOUR system path
const PYTHON_PATH = "C:/Users/hp/anaconda3/envs/whisper_env/python.exe";

export const parseAudio = async (fileUrl) => {
  let tempFile = "";

  try {
    const ext = fileUrl.split(".").pop().split("?")[0] || "wav";
    tempFile = `temp_audio_${Date.now()}.${ext}`;

    // Download file (works for S3 / public URLs)
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer"
    });

    fs.writeFileSync(tempFile, response.data);

    // 🔥 Call Whisper via Python env
    const result = await new Promise((resolve, reject) => {
      exec(
        `"${PYTHON_PATH}" whisper.py "${tempFile}"`,
        (error, stdout, stderr) => {
          if (error) {
            console.error("Whisper Error:", stderr);
            reject(error);
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
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
};