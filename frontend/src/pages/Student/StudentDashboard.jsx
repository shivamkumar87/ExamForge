import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { validateCodeApi, getMySubmissionsApi } from "../../api/studentApi";
import useAuthStore from "../../store/authStore";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation(); // Now correctly imported
  const { user, logout } = useAuthStore();

  const [code, setCode] = useState(location.state?.code || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    // Auto-join if code came from shareable link
    if (location.state?.code) {
      handleJoin(location.state.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
  const hasPending = submissions.some(sub =>
    sub.answers.some(a => a.aiScore === null)
  );
  if (!hasPending) return;

  const interval = setInterval(() => {
    fetchSubmissions();
  }, 10000);

  return () => clearInterval(interval);
}, [submissions]);

  const fetchSubmissions = async () => {
    try {
      const res = await getMySubmissionsApi();
      setSubmissions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleJoin = async (overrideCode) => {
    // If an overrideCode is provided (via share link), use it. Otherwise use state code.
    const examCode = typeof overrideCode === "string" ? overrideCode : code;

    if (!examCode || !examCode.trim())
      return setError("Please enter an exam code");

    setLoading(true);
    setError("");

    try {
      const res = await validateCodeApi(examCode.trim().toUpperCase());
      navigate("/student/checklist", {
        state: { exam: res.data, code: examCode.trim().toUpperCase() },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired exam code");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleLogoutWithLoader = async () => {
    setIsLoggingOut(true);
    
    // Add the 500ms delay for a smooth UI transition
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    handleLogout(); 
  };
  
  const statusColor = (status) => {
    if (status === "complete") return "bg-green-100 text-green-700";
    if (status === "flagged") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">ExamForge</h1>
          <p className="text-sm text-gray-500">
            Welcome, {user?.name || "Student"}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Join Exam Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center mb-8">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Join an Exam
          </h2>
          <p className="text-gray-500 mb-6">
            Enter the exam code provided by your instructor
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <input
            className="w-full border rounded-lg p-3 mb-4 text-center text-xl tracking-widest font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="EF-XXXXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            maxLength={11}
          />

          <button
            onClick={() => handleJoin()}
            disabled={loading}
            className="w-full bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50"
          >
            {loading ? "Validating..." : "Join Exam →"}
          </button>
        </div>

        {/* Past Exams Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            My Past Exams
          </h2>
          {loadingSubmissions ? (
            <p className="text-gray-400">Loading...</p>
          ) : submissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
              No exams taken yet
            </div>
          ) : (
            <div className="grid gap-4">
              {submissions.map((sub) => {
                const hasPendingScores = sub.answers.some(
                  (a) => a.aiScore === null,
                );
                const total = sub.answers.reduce(
                  (sum, a) => sum + (a.adminOverrideScore ?? a.aiScore ?? 0),
                  0,
                );
                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-2xl border border-gray-200 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-gray-800">
                            {sub.exam.title}
                          </h3>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor(sub.status)}`}
                          >
                            {sub.status.toUpperCase()}
                          </span>
                          {sub.violationCount > 0 && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                              ⚠️ {sub.violationCount} violations
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {sub.exam.subject}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Submitted:{" "}
                          {new Date(sub.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {hasPendingScores ? (
                          <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
                            <svg
                              className="animate-spin h-4 w-4"
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
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-blue-900">
                            {total.toFixed(1)}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          / {sub.exam.totalMarks} marks
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleLogoutWithLoader}
        disabled={isLoggingOut}
        className="fixed bottom-6 left-6 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
      >
        {isLoggingOut && (
          <svg className="animate-spin h-4 w-4 text-red-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
}
