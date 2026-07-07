import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { registerApi, loginApi } from "../../api/authApi";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectCode = location.state?.code || null;

  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const fn = isRegister ? registerApi : loginApi;
      const res = await fn(form);
      const { userId, role } = res.data;
      // Pass redirectCode to OTP page so it can redirect after verification
      navigate("/otp", { state: { userId, role, redirectCode } });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-2">
          ExamForge
        </h1>
        <p className="text-center text-gray-500 mb-6">
          {isRegister ? "Create an account" : "Sign in to continue"}
        </p>

        {redirectCode && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm font-semibold">
            🔗 You'll be redirected to exam{" "}
            <span className="font-mono">{redirectCode}</span> after login
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {isRegister && (
          <input
            className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        )}

        <input
          className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Email address"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : isRegister
              ? "Register & Get OTP"
              : "Login & Get OTP"}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-400">or</span>
          </div>
        </div>

        <a
          href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 py-3 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
        >
          <img
            src="https://www.google.com/favicon.ico"
            className="w-5 h-5"
            alt="Google"
          />
          Continue with Google
        </a>
        <div className="text-center mt-4 text-sm text-gray-500">
          {isRegister ? "Already have an account?" : "Don't have an account?"}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-blue-600 font-semibold ml-1 hover:underline"
          >
            {isRegister ? "Login" : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
