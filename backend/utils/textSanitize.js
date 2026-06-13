/**
 * PDF.js / JS strings may contain lone surrogates; Python tokenizers reject them.
 */
export function stripLoneSurrogates(str) {
  if (typeof str !== "string" || !str) return "";

  let out = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          out += str[i] + str[i + 1];
          i++;
          continue;
        }
      }
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) continue;

    out += str[i];
  }

  return out;
}
