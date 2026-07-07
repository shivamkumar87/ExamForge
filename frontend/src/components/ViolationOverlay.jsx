export default function ViolationOverlay({ message, count }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-6 py-4 text-center font-semibold shadow-lg animate-pulse">
      ⚠️ {message} — Violations: {count}/3
    </div>
  );
}   