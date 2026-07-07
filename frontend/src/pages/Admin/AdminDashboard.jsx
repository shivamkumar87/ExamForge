import { useEffect, useState } from "react";
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import { getMyExamsApi, deleteExamApi } from "../../api/adminApi";
import useAuthStore from "../../store/authStore";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);

  const fetchExams = async () => {
    try {
      const res = await getMyExamsApi();
      setExams(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Nuke any stuck student invite codes the moment an Admin loads this page
    localStorage.removeItem('examforge-redirect-code'); 
    
    fetchExams();
  }, []);

  // 1. This just opens the modal when they click the trash can
  const handleDeleteClick = (id) => {
    setExamToDelete(id);
  };

  // 2. This runs when they click "Yes, Delete" inside the new modal
  const confirmDelete = async () => {
    if (!examToDelete) return;
    
    const id = examToDelete;
    setExamToDelete(null); // Instantly close the modal
    
    setDeletingId(id);
    toast.loading("Deleting exam...", { id: 'delete-toast' });

    try {
      await deleteExamApi(id);
      setExams(exams.filter((e) => e.id !== id));
      toast.success("Exam deleted successfully!", { id: 'delete-toast' });
    } catch (err) {
      console.error("Delete error:", err);
      const msg = err.response?.data?.message || "Failed to delete exam.";
      toast.error(msg, { id: 'delete-toast' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleLogoutWithLoader = async () => {
    setIsLoggingOut(true);
    
    // Add a tiny 500ms delay so the user actually sees the spinner
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    handleLogout(); 
  };

  const statusColor = (status) => {
    if (status === "draft") return "bg-yellow-100 text-yellow-700";
    if (status === "active") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">ExamForge</h1>
          <p className="text-sm text-gray-500">
            Welcome, {user?.name || "Admin"}
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/create")}
          className="bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-800 transition"
        >
          + New Exam
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">My Exams</h2>

        {loading ? (
          <p className="text-gray-400">Loading exams...</p>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-lg mb-4">No exams yet</p>
            <button
              onClick={() => navigate("/admin/create")}
              className="bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-800 transition"
            >
              Create your first exam
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-gray-800">
                      {exam.title}
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor(exam.status)}`}
                    >
                      {exam.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {exam.subject} • {exam.durationMinutes} mins •{" "}
                    {exam.totalMarks} marks
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {exam.questions.length} question
                    {exam.questions.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* View Details — always visible */}
                  <button
                    onClick={() => navigate(`/admin/exam/${exam.id}`)}
                    className="border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition"
                  >
                    View Details
                  </button>

                  {/* View Results — only for active exams */}
                  {exam.status === "active" && (
                    <button
                      onClick={() => navigate(`/admin/exam/${exam.id}/results`)}
                      className="border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-50 transition"
                    >
                      View Results
                    </button>
                  )}

                  {/* Delete — always visible */}
                  <button
                    onClick={() => handleDeleteClick(exam.id)}
                    disabled={deletingId === exam.id}
                    className="border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {deletingId === exam.id ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-red-500"
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
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* --- MODERN CONFIRMATION MODAL --- */}
      {examToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Exam?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this exam? This action cannot be undone and all questions will be lost.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setExamToDelete(null)}
                className="px-4 py-2 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
