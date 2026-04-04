import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PYTHON_PATH =
  process.platform === "win32"
    ? "C:/Users/hp/anaconda3/envs/whisper_env/python.exe"
    : "python3";

const scriptPath = path.join(__dirname, "..", "..", "embedding.py");

export const embedChunks = async (chunks) => {
  if (!chunks || !Array.isArray(chunks) || chunks.length === 0) return [];

  const pythonPath =
    process.env.EMBEDDING_PYTHON_PATH || DEFAULT_PYTHON_PATH;

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonPath, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        console.error("❌ Embedding stderr:", stderr);
        return reject(new Error(`embedding.py exited with code ${code}`));
      }

      try {
        const trimmed = stdout.trim();
        const embeddings = JSON.parse(trimmed);

        if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
          return reject(
            new Error("Embedding count mismatch with chunks")
          );
        }

        resolve(embeddings);
      } catch (parseError) {
        console.error("❌ Embedding stdout (parse failed):", stdout.slice(0, 500));
        reject(parseError);
      }
    });

    proc.stdin.write(JSON.stringify(chunks), "utf8");
    proc.stdin.end();
  });
};
