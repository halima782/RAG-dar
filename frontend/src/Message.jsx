import { useState } from "react";

import MarkdownWithCitations from "./components/MarkdownWithCitations";

import SourceViewerModal from "./components/SourceViewerModal";

import SourcesPanel from "./components/SourcesPanel";

import ThinkingDots from "./components/ThinkingDots";

import ResponseVersionPicker from "./components/ResponseVersionPicker";

import FeedbackReasonModal from "./components/FeedbackReasonModal";

import { useSourceViewer } from "./hooks/useSourceViewer";

import { normalizeVersions } from "./utils/messageVersions";

import { getReasonLabel } from "./constants/feedbackReasons";



function CopyIcon({ className = "w-4 h-4" }) {

  return (

    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

      <path

        strokeLinecap="round"

        strokeLinejoin="round"

        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"

      />

    </svg>

  );

}



function CheckIcon({ className = "w-4 h-4" }) {

  return (

    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />

    </svg>

  );

}



function EditIcon() {

  return (

    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

      <path

        strokeLinecap="round"

        strokeLinejoin="round"

        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"

      />

    </svg>

  );

}



function ThumbsUpIcon({ filled }) {

  return (

    <svg

      className="w-4 h-4"

      fill={filled ? "currentColor" : "none"}

      viewBox="0 0 24 24"

      stroke="currentColor"

      strokeWidth={2}

    >

      <path

        strokeLinecap="round"

        strokeLinejoin="round"

        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"

      />

    </svg>

  );

}



function RegenerateIcon() {

  return (

    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

      <path

        strokeLinecap="round"

        strokeLinejoin="round"

        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"

      />

    </svg>

  );

}



function ThumbsDownIcon({ filled }) {

  return (

    <svg

      className="w-4 h-4"

      fill={filled ? "currentColor" : "none"}

      viewBox="0 0 24 24"

      stroke="currentColor"

      strokeWidth={2}

    >

      <path

        strokeLinecap="round"

        strokeLinejoin="round"

        d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"

      />

    </svg>

  );

}



function ActionButton({ onClick, title, ariaLabel, active, activeClass, disabled, children }) {

  return (

    <button

      type="button"

      onClick={onClick}

      disabled={disabled}

      className={`p-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${

        active

          ? activeClass

          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"

      }`}

      title={title}

      aria-label={ariaLabel}

    >

      {children}

    </button>

  );

}



export default function Message({

  role,

  text,

  citations,

  versions,

  activeVersionIndex,

  feedbackList,

  messageId,

  isThinking,

  isStreaming,

  isError,

  isLoading,

  onEdit,

  onRegenerate,

  canRegenerate,

  onVersionChange,

  onFeedbackChange,

}) {

  const isUser = role === "user";

  const [copied, setCopied] = useState(false);

  const [reasonModalOpen, setReasonModalOpen] = useState(false);

  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const sourceViewer = useSourceViewer(citations ?? []);

  const { versions: versionList, activeVersionIndex: activeIndex } = normalizeVersions({

    versions,

    activeVersionIndex,

    text,

    citations,

  });

  const versionFeedback = (feedbackList ?? []).find(

    (entry) => entry.versionIndex === activeIndex

  );

  const canSubmitFeedback = Boolean(messageId) && !feedbackSubmitting && !isLoading;

  const showSources =

    !isUser && citations?.length > 0 && !isThinking && !isStreaming && !isError;



  const handleCopy = async () => {

    try {

      await navigator.clipboard.writeText(text);

      setCopied(true);

      setTimeout(() => setCopied(false), 2000);

    } catch {

      setCopied(false);

    }

  };



  const runFeedbackChange = async (payload) => {

    if (!onFeedbackChange) return;

    setFeedbackSubmitting(true);

    try {

      await onFeedbackChange(payload);

    } finally {

      setFeedbackSubmitting(false);

    }

  };



  const handleThumbsUp = () => {

    if (!canSubmitFeedback) return;



    if (versionFeedback?.rating === "good") {

      runFeedbackChange({ clear: true, versionIndex: activeIndex });

      return;

    }



    runFeedbackChange({ rating: "good", versionIndex: activeIndex });

  };



  const handleThumbsDown = () => {

    if (!canSubmitFeedback) return;



    if (versionFeedback?.rating === "bad") {

      runFeedbackChange({ clear: true, versionIndex: activeIndex });

      return;

    }



    setReasonModalOpen(true);

  };



  const handleReasonConfirm = (reason) => {

    setReasonModalOpen(false);

    runFeedbackChange({ rating: "bad", reason, versionIndex: activeIndex });

  };



  const showAiActions =

    !isUser && (text || isError) && !isThinking && !isStreaming;



  return (

    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2 px-0.5`}>

      <div className={`w-full max-w-[min(100%,42rem)] sm:max-w-[90%] md:max-w-[85%] lg:max-w-[75%] xl:max-w-[70%] ${isUser ? "group ml-auto" : ""}`}>

        <div

          className={`p-2.5 sm:p-3 rounded-lg ${

            isUser

              ? "bg-blue-500 text-white"

              : isError

                ? "bg-red-100 text-red-900 border border-red-200"

                : "bg-gray-200 text-black"

          }`}

        >

          {isUser ? (

            <p className="whitespace-pre-wrap">{text}</p>

          ) : isThinking && !text ? (

            <ThinkingDots />

          ) : (

            <MarkdownWithCitations

              text={text}

              citations={citations}

              citationMap={sourceViewer.citationMap}

              isStreaming={isStreaming}

              onCitationClick={sourceViewer.openSource}

            />

          )}

        </div>



        {showSources && (

          <SourcesPanel

            citations={citations}

            highlightId={sourceViewer.highlightId}

            isOpen={sourceViewer.sourcesOpen}

            onToggle={sourceViewer.toggleSources}

            onSourceClick={sourceViewer.openSource}

          />

        )}



        <SourceViewerModal

          citation={sourceViewer.viewingCitation}

          onClose={sourceViewer.closeModal}

        />



        <FeedbackReasonModal

          isOpen={reasonModalOpen}

          onConfirm={handleReasonConfirm}

          onCancel={() => setReasonModalOpen(false)}

        />



        {isUser && text && (

          <div className="flex items-center justify-end gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">

            <ActionButton

              onClick={handleCopy}

              title={copied ? "Copied!" : "Copy message"}

              ariaLabel="Copy message"

            >

              {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon />}

            </ActionButton>

            <ActionButton

              onClick={() => onEdit?.(text)}

              title="Edit and resend"

              ariaLabel="Edit message"

            >

              <EditIcon />

            </ActionButton>

          </div>

        )}



        {showAiActions && (

          <div className="mt-1.5 space-y-1.5">

            <div className="flex flex-wrap items-center gap-2">

              <ResponseVersionPicker

                versionCount={versionList.length}

                activeIndex={activeIndex}

                disabled={isLoading}

                onPrevious={() => onVersionChange?.(activeIndex - 1)}

                onNext={() => onVersionChange?.(activeIndex + 1)}

              />

            </div>



            <div className="flex items-center gap-1">

              <ActionButton

                onClick={handleCopy}

                title={copied ? "Copied!" : "Copy response"}

                ariaLabel="Copy response"

              >

                {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon />}

              </ActionButton>

              <ActionButton

                onClick={handleThumbsUp}

                title="Good answer"

                ariaLabel="Good answer"

                active={versionFeedback?.rating === "good"}

                activeClass="text-green-600 bg-green-50"

                disabled={!canSubmitFeedback}

              >

                <ThumbsUpIcon filled={versionFeedback?.rating === "good"} />

              </ActionButton>

              <ActionButton

                onClick={handleThumbsDown}

                title="Bad answer"

                ariaLabel="Bad answer"

                active={versionFeedback?.rating === "bad"}

                activeClass="text-red-500 bg-red-50"

                disabled={!canSubmitFeedback}

              >

                <ThumbsDownIcon filled={versionFeedback?.rating === "bad"} />

              </ActionButton>

            </div>



            {versionFeedback?.rating === "bad" && versionFeedback.reason && (

              <p className="text-[11px] text-gray-500 px-1">

                Feedback: {getReasonLabel(versionFeedback.reason)}

              </p>

            )}



            {canRegenerate && onRegenerate && (

              <button

                type="button"

                onClick={onRegenerate}

                disabled={isLoading}

                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"

              >

                <RegenerateIcon />

                Regenerate response

              </button>

            )}

          </div>

        )}

      </div>

    </div>

  );

}


