import { getReasonLabel } from "../constants/feedbackReasons";
import { normalizeVersions } from "./messageVersions";

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
      !message.isWelcome &&
      !message.isThinking &&
      !message.isStreaming &&
      (message.role === "user" || message.role === "ai")
  );
}

function getAiVersionBlocks(message) {
  const { versions } = normalizeVersions({
    versions: message.versions,
    activeVersionIndex: message.activeVersionIndex,
    text: message.text,
    citations: message.citations,
  });

  return versions.map((version, index) => ({
    index,
    total: versions.length,
    content: version.content ?? message.text ?? "",
    citations: version.citations ?? message.citations ?? [],
    feedback:
      (message.feedback ?? []).find((entry) => entry.versionIndex === index) ?? null,
  }));
}

function countAiVersions(messages) {
  return getExportableMessages(messages).reduce((total, message) => {
    if (message.role !== "ai") return total;
    return total + getAiVersionBlocks(message).length;
  }, 0);
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

  const aiVersionCount = countAiVersions(messages);

  writeLines(
    [
      `Exported: ${exportedAt.toLocaleString()}`,
      `Messages: ${exportable.length}`,
      aiVersionCount > 0 ? `AI response versions included: ${aiVersionCount}` : null,
    ].filter(Boolean),
    { fontSize: 9, color: [107, 114, 128] }
  );
  y += 4;

  const addDivider = (light = false) => {
    y += light ? 2 : 3;
    ensureSpace(6);
    doc.setDrawColor(light ? 241 : 229, light ? 245 : 231, light ? 249 : 235);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += light ? 5 : 6;
  };

  const renderAiVersion = (block) => {
    const label =
      block.total > 1
        ? `AI Assistant — Version ${block.index + 1} of ${block.total}`
        : "AI Assistant";

    writeLines([label], {
      fontSize: 10,
      fontStyle: "bold",
      color: [17, 24, 39],
    });

    writeLines([stripMarkdown(block.content)], { fontSize: 10 });

    if (block.citations?.length) {
      y += 1;
      writeLines(buildCitationBlock(block.citations), {
        fontSize: 8,
        color: [75, 85, 99],
      });
    }

    const feedbackLine = buildFeedbackLine(block.feedback);
    if (feedbackLine) {
      y += 1;
      writeLines([feedbackLine], { fontSize: 8, color: [107, 114, 128] });
    }
  };

  exportable.forEach((message, index) => {
    ensureSpace(LINE_HEIGHT * 4);

    if (message.role === "user") {
      writeLines(["You"], {
        fontSize: 10,
        fontStyle: "bold",
        color: [37, 99, 235],
      });
      writeLines([stripMarkdown(message.text)], { fontSize: 10 });
    } else {
      const versionBlocks = getAiVersionBlocks(message);

      versionBlocks.forEach((block, versionIndex) => {
        renderAiVersion(block);

        if (versionIndex < versionBlocks.length - 1) {
          addDivider(true);
        }
      });
    }

    if (index < exportable.length - 1) {
      addDivider(false);
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
