export default function Timer({ timeLeft }) {
  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;

  const formatted = h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '00')}`;

  const isWarning = timeLeft < 300;
  const isCritical = timeLeft < 60;

  return (
    <div className={`text-2xl font-bold font-mono transition-colors ${
      isCritical ? 'text-red-600 animate-pulse' :
      isWarning ? 'text-orange-500' :
      'text-blue-900'
    }`}>
      {formatted}
    </div>
  );
}