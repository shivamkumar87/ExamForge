import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getResultsApi,
  overrideScoreApi,
  exportResultsApi,
} from "../../api/adminApi";
import axiosInstance from "../../api/axiosInstance";

export default function ResultsDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [overrideValues, setOverrideValues] = useState({});
  const [savedAnswers, setSavedAnswers] = useState({});
  const [examInfo, setExamInfo] = useState({ title: "", subject: "" });
  const [exporting, setExporting] = useState(false);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await getResultsApi(id);
        const { exam, submissions } = res.data; // ✅ destructure correctly
        setSubmissions(submissions);
        setExamInfo({
          title: exam?.title || "Exam",
          subject: exam?.subject || "",
        });

        // Initialize override values
        const initial = {};
        const saved = {};
        submissions.forEach((sub) => {
          sub.answers.forEach((a) => {
            if (a.adminOverrideScore != null) {
              initial[a.id] = a.adminOverrideScore;
              saved[a.id] = a.adminOverrideScore;
            }
          });
        });
        setOverrideValues(initial);
        setSavedAnswers(saved);
      } catch (err) {
        setError("Failed to load results.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [id]);

  useEffect(() => {
    const hasPending = submissions.some((sub) =>
      sub.answers.some((a) => a.aiScore === null),
    );
    if (!hasPending) return;

    const interval = setInterval(() => {
      getResultsApi(id)
        .then((res) => {
          const { exam, submissions } = res.data;
          setSubmissions(submissions);
          setExamInfo({
            title: exam?.title || "Exam",
            subject: exam?.subject || "",
          });
        })
        .catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [submissions]);

  const getTotalScore = (answers) =>
    answers.reduce((sum, a) => {
      const override = savedAnswers[a.id];
      return sum + (override != null ? override : (a.aiScore ?? 0));
    }, 0);

  const toggleExpand = (subId) =>
    setExpanded((prev) => ({ ...prev, [subId]: !prev[subId] }));

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axiosInstance.get(`/api/admin/exams/${id}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = `${examInfo.title}-${examInfo.subject}-Results.csv`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_\-\.]/g, "");
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to export results");
    } finally {
      setExporting(false);
    }
  };

  const handleOverride = async (answerId, score) => {
    if (score === "" || score == null) return;

    // 1. Turn the loader ON for this specific button
    setSavingId(answerId);

    try {
      await overrideScoreApi(answerId, score);

      // Update local state instantly — no refresh needed
      setSavedAnswers((prev) => ({ ...prev, [answerId]: parseFloat(score) }));
      setSubmissions((prev) =>
        prev.map((sub) => ({
          ...sub,
          answers: sub.answers.map((a) =>
            a.id === answerId
              ? { ...a, adminOverrideScore: parseFloat(score) }
              : a,
          ),
        })),
      );
    } catch (err) {
      toast.error("Failed to save override score");
    } finally {
      // 2. Turn the loader OFF when finished
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-blue-900">
              Results Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              {submissions.length} submission
              {submissions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition disabled:opacity-50 flex items-center gap-2"
        >
          {exporting ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-blue-700"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Exporting...
            </>
          ) : (
            "Export CSV"
          )}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {loading ? (
          <p className="text-gray-400">Loading results...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-lg">No submissions yet</p>
            <p className="text-gray-300 text-sm mt-2">
              Students who complete the exam will appear here
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
              >
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">
                      {sub.student.name}
                    </p>
                    <p className="text-sm text-gray-500">{sub.student.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted: {new Date(sub.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-700">
                        {getTotalScore(sub.answers).toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-400">total score</p>
                    </div>
                    {sub.violationCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold">
                        {sub.violationCount} violation
                        {sub.violationCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    <button
                      onClick={() => toggleExpand(sub.id)}
                      className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                    >
                      {expanded[sub.id] ? "Hide Answers ▲" : "View Answers ▼"}
                    </button>
                  </div>
                </div>

                {expanded[sub.id] && (
                  <div className="border-t border-gray-100 bg-gray-50 p-6 grid gap-4">
                    {sub.answers.map((answer, i) => (
                      <div
                        key={answer.id}
                        className="bg-white rounded-xl border border-gray-200 p-4"
                      >
                        <p className="text-sm font-semibold text-blue-700 mb-1">
                          Q{i + 1} — {answer.question.marks} marks
                        </p>
                        <p className="text-sm text-gray-500 mb-2">
                          {answer.question.questionText}
                        </p>
                        <p className="text-sm text-gray-800 mb-3">
                          <span className="font-semibold">
                            Student Answer:{" "}
                          </span>
                          {answer.studentAnswer || (
                            <span className="text-gray-400 italic">
                              No answer provided
                            </span>
                          )}
                        </p>

                        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-3">
                          <span className="font-semibold">Model Answer: </span>
                          {answer.question.modelAnswer}
                        </p>

                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-sm text-gray-500">
                            AI Score:{" "}
                            {answer.aiScore != null ? (
                              <span className="font-semibold text-blue-600">
                                {answer.aiScore.toFixed(1)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                                <svg
                                  className="animate-spin h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                  />
                                </svg>
                                Calculating...
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              Override:
                            </span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={answer.question.marks}
                              value={overrideValues[answer.id] ?? ""}
                              placeholder="—"
                              className="w-16 border rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                              onChange={(e) =>
                                setOverrideValues((prev) => ({
                                  ...prev,
                                  [answer.id]: e.target.value,
                                }))
                              }
                            />
                            <button
                              onClick={() =>
                                handleOverride(
                                  answer.id,
                                  overrideValues[answer.id],
                                )
                              }
                              disabled={savingId === answer.id}
                              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[70px]"
                            >
                              {savingId === answer.id ? (
                                <span className="flex items-center gap-1.5">
                                  <svg
                                    className="animate-spin h-3.5 w-3.5 text-white"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                      fill="none"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8v8z"
                                    />
                                  </svg>
                                  Saving...
                                </span>
                              ) : (
                                "Save"
                              )}
                            </button>
                            {savedAnswers[answer.id] != null && (
                              <span className="text-xs text-green-600 font-semibold">
                                ✓ Saved: {savedAnswers[answer.id]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
