import { parseImage } from "./services/parsers/imageParser.js";

const test = async () => {
  const url = "https://i.sstatic.net/WoIY8.jpg";

  const result = await parseImage(url);

  console.log("RESULT:\n", result);
};

test();