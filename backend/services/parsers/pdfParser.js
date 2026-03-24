import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"; 

export const parsePdf = async (fileUrl) => {
  const response = await axios.get(fileUrl, {
    responseType: "arraybuffer",
  });

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(response.data),
  });

  const pdf = await loadingTask.promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const strings = content.items.map(item => item.str);
    text += strings.join(" ") + "\n";
  }

  return text;
};