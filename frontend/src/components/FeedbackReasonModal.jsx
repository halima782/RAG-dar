import { useState } from "react";
import { NEGATIVE_FEEDBACK_REASONS } from "../constants/feedbackReasons";

export default function FeedbackReasonModal({ isOpen, onConfirm, onCancel }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedReason) {
      setError("Please select a reason before submitting.");
      return;
    }

    onConfirm(selectedReason);
    setSelectedReason("");
    setError("");
  };

  const handleCancel = () => {
    setSelectedReason("");
    setError("");
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-reason-title"
    >
      <div className="absolute inset-0 bg-gray-900/30" onClick={handleCancel} />

      <div className="relative w-full max-w-md max-h-[min(90dvh,640px)] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-red-400 to-orange-400" />

        <div className="p-4 sm:p-5 overflow-y-auto min-h-0 flex-1">
          <h2 id="feedback-reason-title" className="text-base font-semibold text-gray-900">
            What went wrong?
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Select a reason for your feedback. This is required for negative ratings.
          </p>

          <div className="mt-4 space-y-2">
            {NEGATIVE_FEEDBACK_REASONS.map((reason) => (
              <label
                key={reason.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedReason === reason.id
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="feedback-reason"
                  value={reason.id}
                  checked={selectedReason === reason.id}
                  onChange={() => {
                    setSelectedReason(reason.id);
                    setError("");
                  }}
                  className="text-red-500 focus:ring-red-400"
                />
                <span className="text-sm text-gray-800">{reason.label}</span>
              </label>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-4 sm:px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            Submit feedback
          </button>
        </div>
      </div>
    </div>
  );
}
