import { parseAudio } from "./services/parsers/audioParser.js";

const testAudio = async () => {
  const start = Date.now();

  const url = "https://www.voiptroubleshooter.com/open_speech/american/OSR_us_000_0012_8k.wav";

  console.log("🎧 Testing Audio Parser...\n");

  const result = await parseAudio(url);

  const end = Date.now();

  console.log("=== AUDIO RESULT ===\n");
  console.log(result || "No transcription");

  console.log("\n⏱️ Time Taken:", ((end - start) / 1000).toFixed(2), "seconds");
};

testAudio();