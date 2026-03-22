import { parseVideo } from "./services/parsers/videoParser.js";

const testVideo = async () => {
  const start = Date.now();

  const url = "https://samplelib.com/lib/preview/mp4/sample-5s.mp4";

  console.log("🎥 Testing Video Parser...\n");

  const result = await parseVideo(url);

  const end = Date.now();

  console.log("=== VIDEO RESULT ===\n");
  console.log(result || "No transcription");

  console.log("\n⏱️ Time Taken:", ((end - start) / 1000).toFixed(2), "seconds");
};

testVideo();