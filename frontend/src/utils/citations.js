const SOURCES_FOOTER_PATTERN = /\n\n\*\*Sources:\*\*[\s\S]*$/;

export function stripSourcesFooter(text) {
  if (!text) return "";
  return text.replace(SOURCES_FOOTER_PATTERN, "").trim();
}

export function parseContentSegments(text) {
  const regex = /\[(\d+)\]/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: "citation",
      id: parseInt(match[1], 10),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}
