const SAFE_MESSAGES = new Set([
  "Could not read this document.",
  "Could not read this document. Check that it is valid and not password protected.",
  "Could not extract text",
  "No file uploaded",
  "Please upload a TXT, PDF, DOCX, or PPTX file.",
  "Files in .doc or .ppt format are not supported. Please upload as .docx or .pptx instead.",
  "Text must be a non-empty string.",
  "Count must be an integer of 5, 10, or 15.",
  "Text exceeds the 32,000-character limit.",
  "Text exceeds the 2,000-word limit.",
  "The AI service is busy.",
  "The AI service is busy. Please wait a moment and try again.",
  "AI generation timed out. Please try again with fewer items.",
  "The AI returned an incomplete or invalid response. Try again with fewer items.",
  "The AI service could not complete generation. Please try again.",
  "Study generation is temporarily disabled.",
]);

function retryDelay(headers) {
  const value = headers?.get?.("Retry-After") ?? headers?.["retry-after"] ?? headers?.["Retry-After"];
  if (typeof value !== "string" || !value.trim()) return "";
  const seconds = /^\d+$/.test(value.trim())
    ? Number(value)
    : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const [amount, unit] = seconds >= 3600
    ? [Math.ceil(seconds / 3600), "hour"]
    : seconds >= 60
      ? [Math.ceil(seconds / 60), "minute"]
      : [seconds, "second"];
  return `Try again in about ${amount} ${unit}${amount === 1 ? "" : "s"}.`;
}

export function studyError(error, operation) {
  const response = error?.response;
  const uploading = operation === "upload";
  if (!response) return "Could not reach SmartCards. Check your connection and try again.";

  const { status, data, headers } = response;
  const safeMessage = SAFE_MESSAGES.has(data?.error) ? data.error : "";
  if (status === 429) {
    const wait = retryDelay(headers);
    const applicationLimit = Boolean(wait) || data?.error === "SmartCards request limit reached. Try again later.";
    if (applicationLimit) return `SmartCards request limit reached. ${wait || "Wait a little before trying again."}`;
    return safeMessage || "The study service is busy. Wait a little before trying again.";
  }
  if (status === 413) {
    return uploading
      ? "File too large. Upload a file of 4 MB or less."
      : safeMessage || "The study text is too large. Try uploading a shorter document.";
  }
  if (status === 400 || status === 415) {
    return safeMessage || (uploading ? "This file could not be uploaded. Check the format and try again."
      : "This study request could not be processed. Check your document and try again.");
  }
  if (status === 504) {
    return safeMessage || (uploading ? "The upload timed out. Try again with a smaller file."
      : "Study generation timed out. Try again with fewer items.");
  }
  return safeMessage || (uploading ? "Upload is temporarily unavailable. Try again shortly."
    : "Study generation is temporarily unavailable. Try again shortly.");
}
