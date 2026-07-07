export default function WebcamPreview({ videoRef, faceDetected, faceCount }) {
  const dotColor = faceCount > 1
    ? 'bg-orange-400 animate-pulse'  // multiple faces
    : faceDetected === null
    ? 'bg-gray-400'                   // loading
    : faceDetected
    ? 'bg-green-400'                  // face detected
    : 'bg-red-500 animate-pulse';     // no face

  const label = faceCount > 1 ? '⚠️' : 'LIVE';

  return (
    <div className="relative w-20 h-16 rounded-lg overflow-hidden border-2 border-blue-200 flex-shrink-0">
      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full h-full object-cover"
      />
      <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white ${dotColor}`} />
      <div className="absolute top-1 left-1 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white text-[8px] font-bold">{label}</span>
      </div>
    </div>
  );
}