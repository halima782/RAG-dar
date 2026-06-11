import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchFeedbackDashboard } from "../api/feedback";
import { getReasonLabel, NEGATIVE_FEEDBACK_REASONS } from "../constants/feedbackReasons";

function StatCard({ label, value, subtext, accent }) {
  const accents = {
    indigo: "from-indigo-500/10 to-indigo-500/5 border-indigo-200/60 text-indigo-700",
    green: "from-emerald-500/10 to-emerald-500/5 border-emerald-200/60 text-emerald-700",
    red: "from-red-500/10 to-red-500/5 border-red-200/60 text-red-700",
    slate: "from-slate-500/10 to-slate-500/5 border-slate-200/60 text-slate-700",
  };

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-4 sm:p-5 shadow-sm ${accents[accent]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight">{value}</p>
      {subtext && <p className="text-xs mt-1 opacity-70">{subtext}</p>}
    </div>
  );
}

function RatingBadge({ rating }) {
  const isGood = rating === "good";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        isGood
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {isGood ? "👍 Positive" : "👎 Negative"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function FeedbackDashboard({ onBackToChat }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFeedbackDashboard();
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load feedback.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    if (filter === "all") return data.entries;
    return data.entries.filter((entry) => entry.rating === filter);
  }, [data, filter]);

  const reasonBars = useMemo(() => {
    const breakdown = data?.reasonBreakdown ?? {};
    const max = Math.max(...Object.values(breakdown), 1);

    return NEGATIVE_FEEDBACK_REASONS.map((reason) => ({
      id: reason.id,
      label: reason.label,
      count: breakdown[reason.id] ?? 0,
      width: `${((breakdown[reason.id] ?? 0) / max) * 100}%`,
    })).filter((item) => item.count > 0);
  }, [data]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 chat-surface lg:rounded-tl-3xl">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 shrink-0 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-slate-800 tracking-tight">
            Feedback Dashboard
          </h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            User ratings and negative feedback reasons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={isLoading}
            className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-white border border-slate-200/80 hover:border-indigo-200 hover:text-indigo-600 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onBackToChat}
            className="px-3 py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-sm transition-all"
          >
            Back to Chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-16 animate-shimmer">Loading feedback...</p>
        ) : error ? (
          <div className="max-w-md mx-auto text-center py-16">
            <p className="text-red-600 font-medium mb-2">Could not load dashboard</p>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={loadDashboard}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="Total feedback"
                value={data.stats.total}
                accent="slate"
              />
              <StatCard
                label="Positive"
                value={data.stats.good}
                subtext={`${data.stats.satisfactionRate}% satisfaction`}
                accent="green"
              />
              <StatCard
                label="Negative"
                value={data.stats.bad}
                accent="red"
              />
              <StatCard
                label="Satisfaction"
                value={`${data.stats.satisfactionRate}%`}
                subtext="Thumbs up share"
                accent="indigo"
              />
            </div>

            {reasonBars.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">
                  Negative feedback reasons
                </h3>
                <div className="space-y-3">
                  {reasonBars.map((item) => (
                    <div key={item.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-semibold text-slate-800">{item.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full transition-all"
                          style={{ width: item.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">All feedback</h3>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                  {[
                    { id: "all", label: "All" },
                    { id: "good", label: "Positive" },
                    { id: "bad", label: "Negative" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFilter(option.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        filter === option.id
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">
                  {data.stats.total === 0
                    ? "No feedback submitted yet. Ratings appear here when users thumbs-up or thumbs-down AI responses."
                    : "No feedback matches this filter."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredEntries.map((entry) => (
                    <li key={entry.id} className="px-4 sm:px-5 py-4 hover:bg-slate-50/80 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <RatingBadge rating={entry.rating} />
                          {entry.rating === "bad" && entry.reason && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {getReasonLabel(entry.reason)}
                            </span>
                          )}
                          {entry.versionIndex > 0 && (
                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              Version {entry.versionIndex + 1}
                            </span>
                          )}
                        </div>
                        <time className="text-[11px] text-slate-400 shrink-0">
                          {formatDate(entry.updatedAt || entry.createdAt)}
                        </time>
                      </div>

                      <p className="text-sm font-medium text-slate-800 mb-1">
                        {entry.conversationTitle}
                      </p>

                      {entry.messageSnippet ? (
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 bg-slate-50 border border-slate-100 rounded-lg p-3">
                          "{entry.messageSnippet}"
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Message no longer available</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
