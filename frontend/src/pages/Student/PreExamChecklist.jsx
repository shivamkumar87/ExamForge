import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function PreExamChecklist() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam, code } = location.state || {};

  const [webcamOk, setWebcamOk] = useState(false);
  const [webcamError, setWebcamError] = useState("");
  const [multiMonitor, setMultiMonitor] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [fullscreenOk, setFullscreenOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!exam || !code) navigate("/student");
  }, []);

  useEffect(() => {
    if (window.screen.isExtended) setMultiMonitor(true);
  }, []);

  const requestWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      setWebcamOk(true);
      setWebcamError("");
    } catch (err) {
      setWebcamError("Camera or microphone access denied. Please allow access and try again.");
      setWebcamOk(false);
    }
  };

  useEffect(() => {
    if (webcamOk && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [webcamOk]);

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenOk(true);
    } catch (err) {
      toast.error("Fullscreen failed. Please close DevTools or any blocking extension and try again.");
    }
  };

  // Listen for fullscreen exit — uncheck if they exit
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) setFullscreenOk(false);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const canStart = webcamOk && !multiMonitor && rulesAccepted && fullscreenOk;

  const handleStart = () => {
    if (!document.fullscreenElement) {
      toast.error("Please enable fullscreen before starting.");
      return;
    }
    navigate("/student/exam", { state: { exam, code } });
  };

  const CheckIcon = () => (
    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );

  const XIcon = () => (
    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const PendingIcon = () => (
    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 3" />
    </svg>
  );

  const rules = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      rule: "Fullscreen Required",
      detail: "Exiting fullscreen counts as a violation",
      penalty: "violation",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      rule: "No Tab Switching",
      detail: "Switching tabs or minimizing window is logged",
      penalty: "violation",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
        </svg>
      ),
      rule: "Face Must Be Visible",
      detail: "20 cumulative seconds of face absence = 1 violation",
      penalty: "violation",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
        </svg>
      ),
      rule: "No Other People",
      detail: "Multiple faces in camera will be flagged immediately",
      penalty: "violation",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-7a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      rule: "Maintain Silence",
      detail: "Sustained speaking for 15 seconds = 1 violation",
      penalty: "violation",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      rule: "No Copy / Paste",
      detail: "Copy, paste, cut and right-click are disabled",
      penalty: "blocked",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" strokeWidth={2} />
        </svg>
      ),
      rule: "No Screenshots",
      detail: "Screenshot attempts are detected and screen is blurred",
      penalty: "violation",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      rule: "Single Monitor Only",
      detail: "Multiple monitors are not allowed",
      penalty: "blocked",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <h1 className="text-xl font-bold text-blue-900">ExamForge</h1>
        <p className="text-sm text-gray-500">Pre-Exam Setup</p>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{exam?.title}</h2>
          <p className="text-gray-500 mb-8">
            {exam?.subject} • {exam?.durationMinutes} mins • {exam?.totalMarks} marks • {exam?.questionCount} questions
          </p>

          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Required Checks</h3>

          {/* ── Check 1: Camera & Microphone ── */}
          <div className={`rounded-xl border p-5 mb-3 transition-colors ${webcamOk ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {webcamOk ? <CheckIcon /> : <PendingIcon />}
                <div>
                  <p className="font-semibold text-gray-800">Camera & Microphone</p>
                  <p className="text-sm text-gray-500">
                    {webcamOk ? "Camera and microphone access granted" : "Required for proctoring — grant access to continue"}
                  </p>
                </div>
              </div>
              {!webcamOk && (
                <button
                  onClick={requestWebcam}
                  className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition flex-shrink-0"
                >
                  Grant Access
                </button>
              )}
            </div>
            {webcamError && <p className="text-red-500 text-sm mt-2">{webcamError}</p>}
            {webcamOk && (
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-48 h-36 rounded-lg object-cover border border-green-200 mt-3"
              />
            )}
          </div>

          {/* ── Check 2: Single Monitor ── */}
          <div className={`rounded-xl border p-5 mb-3 ${multiMonitor ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
            <div className="flex items-center gap-3">
              {multiMonitor ? <XIcon /> : <CheckIcon />}
              <div>
                <p className="font-semibold text-gray-800">Single Monitor</p>
                <p className="text-sm text-gray-500">
                  {multiMonitor
                    ? "Multiple monitors detected — disconnect extra monitors and refresh the page"
                    : "Single monitor confirmed"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Check 3: Fullscreen ── */}
          <div className={`rounded-xl border p-5 mb-3 transition-colors ${fullscreenOk ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {fullscreenOk ? <CheckIcon /> : <PendingIcon />}
                <div>
                  <p className="font-semibold text-gray-800">Fullscreen Mode</p>
                  <p className="text-sm text-gray-500">
                    {fullscreenOk
                      ? "Fullscreen enabled — do not exit during the exam"
                      : "Enable fullscreen before starting — exiting during exam is a violation"}
                  </p>
                </div>
              </div>
              {!fullscreenOk && (
                <button
                  onClick={requestFullscreen}
                  className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition flex-shrink-0"
                >
                  Enable Fullscreen
                </button>
              )}
            </div>
          </div>


          {/* ── Rules Table ── */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 mb-6">
            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Exam Rules & Violation Policy
            </h3>
            <div className="grid gap-2">
              {rules.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-blue-100">
                  <div className="text-blue-600 mt-0.5 flex-shrink-0">{item.icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{item.rule}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                    item.penalty === "violation"
                      ? "bg-red-100 text-red-600"
                      : "bg-orange-100 text-orange-600"
                  }`}>
                    {item.penalty === "violation" ? "Violation" : "Blocked"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-bold text-red-700">Auto-Submit Warning</p>
              </div>
              <p className="text-xs text-red-600">
                After <strong>6 violations</strong> of any type, your exam will be automatically submitted and flagged for review.
              </p>
            </div>
          </div>

          {/* ── Check 4: Rules ── */}
          <div className={`rounded-xl border p-5 mb-6 transition-colors ${rulesAccepted ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
            <div className="flex items-start gap-3">
              {rulesAccepted ? <CheckIcon /> : <PendingIcon />}
              <div className="flex-1">
                <label htmlFor="rules" className="font-semibold text-gray-800 cursor-pointer">
                  Exam Rules Agreement
                </label>
                <p className="text-sm text-gray-500 mt-1 mb-3">
                  I have read all exam rules and understand that violations will be logged. After 6 violations my exam will be automatically submitted and flagged.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="rules"
                    checked={rulesAccepted}
                    onChange={(e) => setRulesAccepted(e.target.checked)}
                    className="w-4 h-4 accent-blue-700"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    I agree to all exam rules and policies
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Start Button ── */}
          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="w-full bg-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Starting Exam...
              </span>
            ) : canStart ? (
              "Start Exam →"
            ) : (
              "Complete all checks above to start"
            )}
          </button>

          {/* Progress indicator */}
          {!canStart && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-400">
              <span className={webcamOk ? "text-green-500 font-semibold" : ""}>Camera</span>
              <span>·</span>
              <span className={!multiMonitor ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>Monitor</span>
              <span>·</span>
              <span className={fullscreenOk ? "text-green-500 font-semibold" : ""}>Fullscreen</span>
              <span>·</span>
              <span className={rulesAccepted ? "text-green-500 font-semibold" : ""}>Rules</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}