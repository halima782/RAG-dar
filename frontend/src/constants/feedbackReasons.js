export const NEGATIVE_FEEDBACK_REASONS = [
  { id: "incorrect", label: "Incorrect or misleading" },
  { id: "incomplete", label: "Incomplete answer" },
  { id: "irrelevant", label: "Not relevant to my question" },
  { id: "citations", label: "Poor citations or sources" },
  { id: "other", label: "Other" },
];

export function getReasonLabel(reasonId) {
  return NEGATIVE_FEEDBACK_REASONS.find((reason) => reason.id === reasonId)?.label ?? reasonId;
}
