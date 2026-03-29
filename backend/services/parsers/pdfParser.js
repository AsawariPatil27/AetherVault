import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const parsePdf = async (fileUrl) => {
  try {
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

      // ✅ Extract clean strings
      const strings = content.items
        .map(item => item.str)
        .filter(str => str && str.trim().length > 0);

      // ✅ Join with proper spacing
      const pageText = strings.join(" ");

      // ✅ Add spacing between pages (no noisy labels)
      text += pageText + "\n\n";
    }

    // ✅ Final cleanup
    return text
      .replace(/\s+/g, " ")   // normalize spaces
      .replace(/\n\s+/g, "\n")
      .trim();

  } catch (error) {
    console.error("PDF parsing error:", error);
    return "";
  }
};