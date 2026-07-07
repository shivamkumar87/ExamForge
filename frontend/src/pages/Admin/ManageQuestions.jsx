import { useEffect, useState,useRef } from "react";
import toast from "react-hot-toast";
import axios from 'axios';
import { useParams, useNavigate } from "react-router-dom";
import {
  getExamByIdApi,
  addQuestionApi,
  updateQuestionApi,
  deleteQuestionApi,
  finalizeExamApi,
  deleteExamApi,
  extractQuestionApi,
} from "../../api/adminApi";
import ConfirmModal from "../../components/ConfirmModal";

export default function ManageQuestions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    questionText: "",
    modelAnswer: "",
    marks: "",
  });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [codeInfo, setCodeInfo] = useState(null);
  const [copied, setCopied] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    questionText: "",
    modelAnswer: "",
    marks: "",
  });
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeletingExam, setIsDeletingExam] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false); 
  const fileInputRef = useRef(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [scannedQuestions, setScannedQuestions] = useState([]);


  // ── Handle Entire Exam Deletion ────────────────────────────────
  const handleDeleteExam = async () => {
    setIsDeleteModalOpen(false);
    // We removed window.confirm because the Modal handles the confirmation now!
    setIsDeletingExam(true);

    try {
      await deleteExamApi(id);
      toast.success("Exam deleted successfully"); // Add a nice success toast
      navigate("/admin");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to delete exam";
      toast.error(errorMessage); // Replaced alert with toast

      setIsDeletingExam(false);
    }
  };

  const fetchExam = async () => {
    try {
      const res = await getExamByIdApi(id);
      setExam(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExam();
  }, [id]);

  const handleAddQuestion = async () => {
    if (!form.questionText || !form.modelAnswer || !form.marks)
      return setError("All fields are required");
    setAdding(true);
    setError("");
    try {
      await addQuestionApi(id, form);
      setForm({ questionText: "", modelAnswer: "", marks: "" });
      fetchExam();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add question");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return; 

    // 1. Turn on the spinner inside the popup
    setIsDeletingQuestion(true); 

    try {
      await deleteQuestionApi(questionToDelete);
      toast.success('Question deleted successfully');
      fetchExam(); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete question');
    } finally {
      // 2. Turn off the spinner and close the modal no matter what happens
      setIsDeletingQuestion(false); 
      setQuestionToDelete(null); 
    }
  };


  const startEdit = (q) => {
    setEditingId(q.id);
    setEditForm({
      questionText: q.questionText,
      modelAnswer: q.modelAnswer,
      marks: q.marks,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ questionText: "", modelAnswer: "", marks: "" });
  };

  const handleSaveEdit = async (qId) => {
    if (!editForm.questionText || !editForm.modelAnswer || !editForm.marks)
      return;
    setSaving(true);
    try {
      await updateQuestionApi(qId, editForm);
      setEditingId(null);
      fetchExam();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update question");
    } finally {
      setSaving(false);
    }
  };

const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsExtracting(true);
    toast.loading("AI is scanning your document...", { id: 'ai-scan' });

    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await extractQuestionApi(formData);
      const extracted = response.data.extractedQuestions;

      if (!Array.isArray(extracted) || extracted.length === 0) {
        toast.error("No questions found in document.", { id: 'ai-scan' });
        return;
      }

      if (extracted.length === 1) {
        // Single question — auto-fill the form
        setForm(prev => ({
          ...prev,
          questionText: extracted[0].question || "",
          modelAnswer: extracted[0].modelAnswer || "",
        }));
        toast.success("Question extracted! Fill in the marks and add it.", { id: 'ai-scan' });

      } else {
        // Multiple questions — bulk add them
        toast.loading(`Adding ${extracted.length} questions...`, { id: 'ai-scan' });
        const validQuestions = extracted.filter(q => q.question?.trim());

        if (validQuestions.length > 0) {
          
          // 1. Grab the real marks directly from the exam object
          const totalMarks = Number(exam.totalMarks); 
          
          // 2. Safety Check: If the total marks are 0, missing, or NaN, stop the upload!
          if (!totalMarks || totalMarks <= 0) {
            toast.error("Error: Please ensure the exam has a total marks value set.", { id: 'ai-scan' });
            setIsExtracting(false);
            return;
          }

          // 3. The Math: Divide evenly and limit to 2 decimal places to prevent DB errors
          const marksPerQuestion = Number((totalMarks / validQuestions.length).toFixed(2));

          // 4. Save to database concurrently
          await Promise.all(
            validQuestions.map(q => 
              addQuestionApi(id, {
                questionText: q.question.trim(),
                modelAnswer: q.modelAnswer?.trim() || "",
                marks: marksPerQuestion, // 👈 Beautifully divided marks applied here!
              })
            )
          );

          fetchExam();
          toast.success(`${validQuestions.length} questions added successfully!`, { id: 'ai-scan' });
        }
      }

    } catch (err) {
      console.error("Extraction error:", err);
      const msg = err.response?.data?.message || "Failed to read document.";
      toast.error(msg, { id: 'ai-scan' });
    } finally {
      setIsExtracting(false);
      e.target.value = null;
    }
  };
  const handleFinalize = async () => {
    // 1. Guardrail: Don't finalize an empty exam!
    if (!exam?.questions?.length) {
      toast.error("You must add at least one question before finalizing!");
      setIsFinalizeModalOpen(false); // Close the modal
      return; // Stop the function here
    }

    // 2. Close modal and start loading
    setIsFinalizeModalOpen(false);
    setIsGenerating(true);

    try {
      const res = await finalizeExamApi(id);
      setCodeInfo(res.data);

      setExam((prev) => ({ ...prev, status: "active" }));
      fetchExam();

      toast.success("Exam finalized! Join code generated.");
    } catch (err) {
      // 3. This will now work perfectly if the backend throws an error!
      toast.error(err.response?.data?.message || "Failed to finalize");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  if (!exam)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Exam not found
      </div>
    );

  const isDraft = exam.status === "draft";
  const activeCode = exam.examCodes?.find((c) => c.isActive);
  const shareableLink = `${window.location.origin}/join?code=${codeInfo?.code || activeCode?.code}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        {/* Left Side: Back arrow and Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-blue-900">{exam.title}</h1>
            <p className="text-sm text-gray-500">
              {exam.subject} • {exam.durationMinutes} mins • {exam.totalMarks}{" "}
              marks
            </p>
          </div>
        </div>

        {/* Right Side Actions: Delete, Finalize, or View Results */}
        <div className="flex items-center gap-3">

          {/* ── AI MAGIC SCAN BUTTON START ── */}
          {/* 1. The hidden file input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />

          {/* 2. The visible button */}
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={isExtracting}
            className="flex items-center gap-2 bg-purple-100 text-purple-700 border border-purple-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-200 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isExtracting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-purple-700" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Scanning...
              </>
            ) : (
              "Upload question & answer image"
            )}
          </button>
          {/* ── AI MAGIC SCAN BUTTON END ── */}

          {/* Delete Button (Always Visible) */}
          <button
            onClick={() => setIsDeleteModalOpen(true)} //  Changed to open modal
            disabled={isDeletingExam}
            className="border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            {isDeletingExam ? "Deleting..." : "Delete Exam"}
          </button>

          {/* Finalize Button (Visible only if Draft) */}
          {isDraft && (
            <button
              onClick={() => setIsFinalizeModalOpen(true)} //  Changed to open modal
              disabled={isGenerating}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                  Generating Code...
                </span>
              ) : (
                "Finalize & Generate Code"
              )}
            </button>
          )}

          {/* View Results Button (Visible only if Active/Finalized) */}
          {!isDraft && (
            <button
              onClick={() => navigate(`/admin/exam/${exam.id}/results`)}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
            >
              View Results
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Code info */}
        {(codeInfo || activeCode) && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-bold text-green-800 mb-3">
              Exam Code Generated!
            </h2>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-mono font-bold text-green-700">
                {codeInfo?.code || activeCode?.code}
              </span>
              <button
                onClick={() =>
                  handleCopy(codeInfo?.code || activeCode?.code, "code")
                }
                className="text-sm border border-green-300 text-green-700 px-3 py-1 rounded-lg hover:bg-green-100 transition"
              >
                {copied === "code" ? "✓ Copied!" : "Copy Code"}
              </button>
            </div>
            <p className="text-sm text-green-600 mb-3">
              Expires:{" "}
              {new Date(
                codeInfo?.expiresAt || activeCode?.expiresAt,
              ).toLocaleString()}
            </p>
            <div className="flex items-center gap-3">
              <input
                readOnly
                value={shareableLink}
                className="flex-1 border border-green-200 rounded-lg p-2 text-sm bg-white text-gray-600"
              />
              <button
                onClick={() => handleCopy(shareableLink, "link")}
                className="text-sm border border-green-300 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 transition"
              >
                {copied === "link" ? "✓ Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        )}

        {/* Questions */}
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Questions ({exam.questions.length})
        </h2>

        {exam.questions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 mb-6">
            No questions yet — add your first question below
          </div>
        ) : (
          <div className="grid gap-4 mb-6">
            {exam.questions.map((q, i) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-gray-200 p-5"
              >
                {editingId === q.id ? (
                  // ── Inline Edit Form ──────────────────────────────
                  <div>
                    <p className="text-sm font-semibold text-blue-700 mb-3">
                      Editing Q{i + 1}
                    </p>
                    <textarea
                      className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      placeholder="Question text"
                      rows={3}
                      value={editForm.questionText}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          questionText: e.target.value,
                        })
                      }
                    />
                    <textarea
                      className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      placeholder="Model answer"
                      rows={3}
                      value={editForm.modelAnswer}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          modelAnswer: e.target.value,
                        })
                      }
                    />
                    <input
                      className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Marks"
                      type="number"
                      value={editForm.marks}
                      onChange={(e) =>
                        setEditForm({ ...editForm, marks: e.target.value })
                      }
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSaveEdit(q.id)}
                        disabled={saving}
                        className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // ── Question Display ──────────────────────────────
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-700 mb-1">
                        Q{i + 1} — {q.marks} marks
                      </p>
                      <p className="text-gray-800 mb-2">{q.questionText}</p>
                      <p className="text-sm text-gray-400">
                        <span className="font-semibold">Model Answer:</span>{" "}
                        {q.modelAnswer}
                      </p>
                    </div>
                    {isDraft && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEdit(q)}
                          className="text-blue-500 hover:text-blue-700 text-sm font-semibold border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setQuestionToDelete(q.id)} // 👈 Now it just opens the modal!
                          className="text-red-400 hover:text-red-600 text-sm font-semibold border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add question form */}
        {isDraft && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Add Question
            </h3>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            <textarea
              className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Question text"
              rows={3}
              value={form.questionText}
              onChange={(e) =>
                setForm({ ...form, questionText: e.target.value })
              }
            />
            <textarea
              className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Model answer (used by AI for scoring)"
              rows={3}
              value={form.modelAnswer}
              onChange={(e) =>
                setForm({ ...form, modelAnswer: e.target.value })
              }
            />
            <input
              className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Marks for this question"
              type="number"
              value={form.marks}
              onChange={(e) => setForm({ ...form, marks: e.target.value })}
            />
            <button
              onClick={handleAddQuestion}
              disabled={adding}
              className="w-full bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50"
            >
              {adding ? "Adding..." : "+ Add Question"}
            </button>
          </div>
        )}
      </div>
      {/* ── Put this at the very bottom of your component ── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete this Exam?"
        message="Are you absolutely sure you want to delete this entire exam? All student submissions and grades will be permanently lost. This action cannot be undone."
        confirmText="Yes, Delete Exam"
        isDestructive={true} // Makes the confirm button red
        onCancel={() => setIsDeleteModalOpen(false)} // Closes without doing anything
        onConfirm={handleDeleteExam} // Actually fires the API call
      />

      {/* ──  right below existing Delete ConfirmModal ── */}
      <ConfirmModal
        isOpen={isFinalizeModalOpen}
        title="Finalize Exam?"
        message="Are you sure you want to finalize this exam? Once finalized, a join code will be generated and you will NOT be able to edit or add questions."
        confirmText="Yes, Finalize Exam"
        isDestructive={false} // 👈 Keeps the button Blue instead of Red!
        onCancel={() => setIsFinalizeModalOpen(false)}
        onConfirm={handleFinalize}
      />

      {/* ── Individual Question Delete Modal ── */}
      <ConfirmModal
        isOpen={questionToDelete !== null} 
        title="Delete Question?"
        message="Are you sure you want to delete this question? This cannot be undone."
        confirmText="Delete Question"
        isDestructive={true} 
        isLoading={isDeletingQuestion} // 👈 Pass the state here!
        onCancel={() => setQuestionToDelete(null)} 
        onConfirm={handleDeleteQuestion} 
      />
      
    </div>
  );
}
