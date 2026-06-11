import { getReasonLabel } from "../constants/feedbackReasons";

const MARGIN = 16;
const LINE_HEIGHT = 5.5;

function sanitizeFilename(title) {
  return (title || "conversation")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "conversation";
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(\d+)\]/g, "[$1]")
    .trim();
}

function buildCitationBlock(citations) {
  if (!citations?.length) return [];

  const lines = ["Sources:"];
  citations.forEach((cite) => {
    const page = cite.page ? `, p. ${cite.page}` : "";
    const snippet = cite.snippet || cite.text || "";
    lines.push(`  [${cite.id}] ${cite.source || cite.title || "Document"}${page}`);
    if (snippet) {
      lines.push(`      ${snippet.slice(0, 200)}${snippet.length > 200 ? "..." : ""}`);
    }
  });
  return lines;
}

function buildFeedbackLine(feedback) {
  if (!feedback) return null;
  if (feedback.rating === "good") return "Feedback: Thumbs up";
  if (feedback.rating === "bad") {
    const reason = feedback.reason ? getReasonLabel(feedback.reason) : "Unspecified";
    return `Feedback: Thumbs down — ${reason}`;
  }
  return null;
}

export function getExportableMessages(messages) {
  return messages.filter(
    (message) =>
      message.text?.trim() &&
      !message.isThinking &&
      !message.isStreaming &&
      (message.role === "user" || message.role === "ai")
  );
}

export async function exportConversationPdf({ title, messages, exportedAt = new Date() }) {
  const exportable = getExportableMessages(messages);
  if (exportable.length === 0) {
    throw new Error("No messages to export.");
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const writeLines = (lines, { fontSize = 10, fontStyle = "normal", color = [55, 65, 81] } = {}) => {
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);

    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, contentWidth);
      ensureSpace(wrapped.length * LINE_HEIGHT);
      doc.text(wrapped, MARGIN, y);
      y += wrapped.length * LINE_HEIGHT;
    });
  };

  writeLines([title || "Chat Conversation"], {
    fontSize: 16,
    fontStyle: "bold",
    color: [17, 24, 39],
  });
  y += 2;

  writeLines(
    [
      `Exported: ${exportedAt.toLocaleString()}`,
      `Messages: ${exportable.length}`,
    ],
    { fontSize: 9, color: [107, 114, 128] }
  );
  y += 4;

  exportable.forEach((message, index) => {
    ensureSpace(LINE_HEIGHT * 4);

    const isUser = message.role === "user";
    const label = isUser ? "You" : "AI Assistant";
    const versionNote =
      !isUser && message.versions?.length > 1
        ? ` (version ${(message.activeVersionIndex ?? 0) + 1} of ${message.versions.length})`
        : "";

    writeLines([`${label}${versionNote}`], {
      fontSize: 10,
      fontStyle: "bold",
      color: isUser ? [37, 99, 235] : [17, 24, 39],
    });

    writeLines([stripMarkdown(message.text)], { fontSize: 10 });

    if (!isUser && message.citations?.length) {
      y += 1;
      writeLines(buildCitationBlock(message.citations), {
        fontSize: 8,
        color: [75, 85, 99],
      });
    }

    const feedbackLine = !isUser ? buildFeedbackLine(message.activeFeedback) : null;
    if (feedbackLine) {
      y += 1;
      writeLines([feedbackLine], { fontSize: 8, color: [107, 114, 128] });
    }

    if (index < exportable.length - 1) {
      y += 3;
      doc.setDrawColor(229, 231, 235);
      ensureSpace(4);
      doc.line(MARGIN, y, pageWidth - MARGIN, y);
      y += 5;
    }
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - MARGIN, pageHeight - 8, {
      align: "right",
    });
  }

  const filename = `${sanitizeFilename(title)}-${exportedAt.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
