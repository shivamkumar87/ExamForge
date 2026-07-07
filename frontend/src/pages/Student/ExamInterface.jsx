import useFaceDetection from "../../hooks/useFaceDetection";
import Whiteboard from "../../components/Whiteboard";
import ViolationOverlay from "../../components/ViolationOverlay";
import Timer from "../../components/Timer";
import WebcamPreview from "../../components/WebcamPreview";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getExamApi,
  submitExamApi,
  startExamSessionApi,
  autoSaveApi,
  logViolationApi,
} from "../../api/studentApi";

export default function ExamInterface() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam, code } = location.state || {};

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [submissionId, setSubmissionId] = useState(null);
  const [isBlurred, setIsBlurred] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardSide, setWhiteboardSide] = useState("right");
  const [showSubmitModal, setShowSubmitModal] = useState(false);


  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const violationRef = useRef(0);
  const submittedRef = useRef(false);
  const submitExamRef = useRef(null);
  const warningTimerRef = useRef(null);
  const submissionIdRef = useRef(null);
  const autoSubmitTriggeredRef = useRef(false);
  const answersRef = useRef({});


  // ── Face Detection ───────────────────────────────────────────────
  const { faceDetected, modelsLoaded, faceCount } = useFaceDetection({
    videoRef,
    enabled: !loading && !submitting,
    onFaceWarning: (msg) => {
      // Show warning immediately but don't count as violation
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setWarningMessage(msg);
      setShowWarning(true);
      warningTimerRef.current = setTimeout(() => setShowWarning(false), 4000);
    },
    onFaceAbsent: () => {
      triggerViolationRef.current(
        "face_absent",
        "Face absent too long! Violation recorded.",
      );
    },
    onMultipleFaces: () => {
      triggerViolationRef.current(
        "multiple_faces",
        "Multiple faces detected! Only the student should be visible.",
      );
    },
    onSuspiciousAudio: (msg) => {
      if (msg === "violation") {
        triggerViolationRef.current(
          "suspicious_audio",
          "Excessive noise detected! Logged as a violation.",
        );
      } else {
        // Just show warning — no violation count increment
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        setWarningMessage("🔇 " + msg);
        setShowWarning(true);
        warningTimerRef.current = setTimeout(() => setShowWarning(false), 4000);
      }
    },
  });

  const hasFetchedRef = useRef(false); // <-- Add this lock

  useEffect(() => {
    if (!exam || !code) {
      navigate("/student");
      return;
    }
    
    // Only fetch if we haven't already!
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchExam();
    }
  }, []);

  const fetchExam = async () => {
    try {
      const res = await startExamSessionApi(code);
      const { exam: examData, submission } = res.data;

      setQuestions(examData.questions);
      setSubmissionId(submission.id);

      const serverStartTime =
        submission.startedAt || submission.createdAt || new Date();
      const startTime = new Date(serverStartTime).getTime();
      const durationMs = (examData.durationMinutes || 0) * 60 * 1000;
      const endTime = startTime + durationMs;
      const now = Date.now();
      const remainingSeconds = Math.floor((endTime - now) / 1000);

      if (remainingSeconds <= 0) {
        setTimeLeft(0);
        submitExam("time_up");
        return;
      }

      setTimeLeft(remainingSeconds);

      const saved = localStorage.getItem(`examforge_draft_${code}`);
      if (saved) setAnswers(JSON.parse(saved));

      setLoading(false);
    } catch (err) {
      console.error(err);
      navigate("/student");
    }
  };

  const submitExam = useCallback(
    async (reason = "manual") => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      clearInterval(timerRef.current);
      clearInterval(autoSaveRef.current);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      try {
        await submitExamApi({
          examCode: code,
          answers,
          violationCount: violationRef.current,
          submitReason: reason,
        });
        localStorage.removeItem(`examforge_draft_${code}`);
        window.location.href = "/student/submitted";
      } catch (err) {
        console.error("Submit failed:", err);
        setSubmitting(false);
        submittedRef.current = false;
      }
    },
    [answers, code],
  );

  useEffect(() => {
    submitExamRef.current = submitExam;
  }, [submitExam]);

  const triggerViolationRef = useRef(null);
  triggerViolationRef.current = (type, message) => {
    if (submittedRef.current) return;
    violationRef.current += 1;
    setViolationCount(violationRef.current);

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setWarningMessage(message);
    setShowWarning(true);
    warningTimerRef.current = setTimeout(() => setShowWarning(false), 4000);

    if (submissionIdRef.current) {
      logViolationApi({
        submissionId: submissionIdRef.current,
        type,
        timestamp: new Date(),
      }).catch(() => {});
    }

    // Only trigger the auto-submit if it hasn't already been triggered!
    if (violationRef.current >= 3 && !autoSubmitTriggeredRef.current) {
      autoSubmitTriggeredRef.current = true; // Lock the door immediately
      
      setWarningMessage("3 violations reached! Auto-submitting your exam.");
      setTimeout(() => submitExamRef.current?.("auto_violations"), 1500);
    }
  };

  useEffect(() => {
    submissionIdRef.current = submissionId;
  }, [submissionId]);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (!submittedRef.current) {
          triggerViolationRef.current(
            "camera_blocked",
            "Camera was blocked! Auto-submitting.",
          );
          setTimeout(() => submitExamRef.current?.("camera_blocked"), 1500);
        }
      });
    } catch (err) {
      setWarningMessage("Camera access denied! Auto-submitting your exam.");
      setShowWarning(true);
      setTimeout(() => submitExamRef.current?.("camera_denied"), 2000);
    }
  }, []);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }, []);

  useEffect(() => {
    if (!loading) {
      enterFullscreen();
      startWebcam();
    }
  }, [loading]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (submittedRef.current) return;
      if (!document.fullscreenElement) {
        triggerViolationRef.current(
          "fullscreen_exit",
          "You exited fullscreen! Return to fullscreen immediately.",
        );
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    let devToolsOpen = false;
    let lastTriggerTime = 0;

    const checkDevTools = () => {
      if (submittedRef.current) return;
      const threshold = 160;
      const isOpen =
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold;

      if (isOpen && !devToolsOpen) {
        const now = Date.now();
        if (now - lastTriggerTime < 1000) return;
        lastTriggerTime = now;
        devToolsOpen = true;
        triggerViolationRef.current(
          "devtools_open",
          "DevTools detected! This has been logged.",
        );
      } else if (!isOpen && devToolsOpen) {
        devToolsOpen = false;
      }
    };

    window.addEventListener("resize", checkDevTools);
    return () => window.removeEventListener("resize", checkDevTools);
  }, []);

  useEffect(() => {
    if (loading) return;
    const handleScreenshot = (e) => {
      if (
        e.key === "PrintScreen" ||
        (e.metaKey && e.shiftKey && ["3", "4", "5", "6"].includes(e.key))
      ) {
        e.preventDefault();
        navigator.clipboard.writeText("").catch(() => {});
        setIsBlurred(true);
        setTimeout(() => setIsBlurred(false), 3000);
        triggerViolationRef.current(
          "screenshot_attempt",
          "Screenshot attempt detected! Screen blurred.",
        );
      }
    };
    document.addEventListener("keydown", handleScreenshot);
    return () => document.removeEventListener("keydown", handleScreenshot);
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const handleVisibility = () => {
      if (document.hidden && !submittedRef.current) {
        triggerViolationRef.current(
          "tab_switch",
          "Tab switch detected! This has been logged.",
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const handleCopy = (e) => e.preventDefault();
    const handlePaste = (e) => e.preventDefault();
    const handleCut = (e) => e.preventDefault();
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "a"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitExamRef.current?.("time_up");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading]);

  // 1. Keep the ref perfectly in sync with the state
useEffect(() => {
  answersRef.current = answers;
}, [answers]);

// 2. INSTANT LocalStorage Save (Protects against immediate refreshes)
useEffect(() => {
  if (loading) return;
  localStorage.setItem(`examforge_draft_${code}`, JSON.stringify(answers));
}, [answers, code, loading]);

// 3. BACKGROUND API Save (Runs every 10s)
useEffect(() => {
  if (loading) return;
  
  autoSaveRef.current = setInterval(() => {
    if (submissionIdRef.current) {
      autoSaveApi({ 
        submissionId: submissionIdRef.current, 
        answers: answersRef.current 
      }).catch(() => {});
    }
  }, 10000); // changed from 30000 to 10000

  return () => clearInterval(autoSaveRef.current);
}, [loading]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [loading]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      if (!submittedRef.current) {
        window.history.pushState(null, "", window.location.href);
        triggerViolationRef.current(
          "back_navigation",
          "Browser navigation disabled! Use the submit button to finish.",
        );
      }
    };

    const handleBeforeUnload = (e) => {
      if (!submittedRef.current) {
        e.preventDefault();
        e.returnValue =
          "Are you sure you want to leave? Your exam is in progress!";
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [loading]);

  const handleManualSubmit = () => {
    // Prevent opening modal if already submitting
    if (submitting) return; 
    setShowSubmitModal(true);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-2">Loading exam...</p>
          {!modelsLoaded && (
            <p className="text-gray-300 text-sm">
              Setting up proctoring system...
            </p>
          )}
        </div>
      </div>
    );

  return (
    <div
      className={`min-h-screen bg-gray-50 select-none transition-all duration-300 ${isBlurred ? "blur-xl" : ""}`}
    >
      {/* Violation Warning Overlay */}
      {showWarning && (
        <ViolationOverlay message={warningMessage} count={violationCount} />
      )}
      {/* Custom Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Submit Exam?
            </h2>
            <p className="text-center text-gray-500 mb-8">
              Are you sure you want to submit? You will not be able to change your answers after this.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  submitExam("manual");
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}  
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-40">
        <div>
          <h1 className="text-lg font-bold text-blue-900">{exam?.title}</h1>
          <p className="text-xs text-gray-500">
            {exam?.subject} • {questions.length} questions
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Webcam preview with face detection indicator */}
          <WebcamPreview
            videoRef={videoRef}
            faceDetected={faceDetected}
            faceCount={faceCount}
          />

          {/* Timer */}
          <Timer timeLeft={timeLeft} />

          {violationCount > 0 && (
            <div className="text-sm font-semibold text-red-500">
              ⚠️ {violationCount}/3 violations
            </div>
          )}

          <button
            onClick={() => setShowWhiteboard((s) => !s)}
            className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
          >
            {showWhiteboard ? "📋 Hide Board" : "📋 Whiteboard"}
          </button>

          <button
            onClick={handleManualSubmit}
            disabled={submitting}
            className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="pt-24 pb-24 min-h-screen w-full flex transition-all duration-300">
        <div
          className={`transition-all duration-300 px-6 flex justify-center ${
            showWhiteboard ? "w-1/2" : "w-full"
          } ${showWhiteboard && whiteboardSide === "left" ? "ml-auto" : ""}`}
        >
          <div className="w-full max-w-3xl">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 mb-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
                    Q{i + 1}
                  </span>
                  <span className="text-sm text-gray-500">{q.marks} marks</span>
                </div>
                <p className="text-gray-800 font-medium mb-4 select-none">
                  {q.questionText}
                </p>
                <textarea
                  className="w-full border border-gray-200 rounded-xl p-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={6}
                  placeholder="Type your answer here..."
                  value={answers[q.id] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {!modelsLoaded && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
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
          Loading face detection...
        </div>
      )}

      {/* Whiteboard */}
      <div
        className={`transition-all duration-300 ${
          showWhiteboard
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <Whiteboard
          side={whiteboardSide}
          onClose={() => setShowWhiteboard(false)}
          onSideChange={(s) => setWhiteboardSide(s)}
        />
      </div>
    </div>
  );
}
