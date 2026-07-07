import * as faceapi from "face-api.js";
import { useEffect, useRef, useState } from "react";

const useFaceDetection = ({
  videoRef,
  enabled,
  onFaceAbsent,
  onMultipleFaces,
  onSuspiciousAudio,
  onFaceWarning,
}) => {
  const [faceDetected, setFaceDetected] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const intervalRef = useRef(null);
  const absentSecondsRef = useRef(0); // cumulative seconds face not seen
  const enabledRef = useRef(enabled);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioIntervalRef = useRef(null);
  const multipleFaceCountRef = useRef(0);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // ── Load Models ──────────────────────────────────────────────────
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = window.location.origin + "/models";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Model load failed:", err);
        setModelsLoaded(true);
      }
    };
    loadModels();
  }, []);

  // ── Audio Detection ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const startAudioDetection = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: false, // Stops the browser from boosting silence
            echoCancellation: true,
            noiseSuppression: true, 
          },
          video: false,
        });
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let cumulativeNoiseSeconds = 0;

        // Human voice frequency range: 85Hz - 3000Hz
        // At 44100Hz sample rate with fftSize 256, each bin = 44100/256 ≈ 172Hz
        // So voice bins are roughly index 1 to 17
        const sampleRate = audioContext.sampleRate;
        const binSize = sampleRate / analyser.fftSize;
        const voiceLowBin = Math.floor(300 / binSize); // Ignores low-end room hum
        const voiceHighBin = Math.ceil(3000 / binSize);

        audioIntervalRef.current = setInterval(() => {
          if (!enabledRef.current) return;
          analyser.getByteFrequencyData(dataArray);

          // Only look at voice frequency bins
          const voiceBins = dataArray.slice(voiceLowBin, voiceHighBin);
          const voiceAvg =
            voiceBins.reduce((a, b) => a + b, 0) / voiceBins.length;

          // Also check that non-voice frequencies are relatively quiet
          // This helps distinguish voice from broadband noise like fans
          const allAvg =
            dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const voiceRatio = voiceAvg / (allAvg + 1);

          // Voice detected if:
          // 1. Voice frequencies are loud enough (> 35)
          // 2. Voice frequencies are dominant over all frequencies (ratio > 1.3)
          const isVoice = voiceAvg > 85 && voiceRatio > 2.0;

          if (isVoice) {
            cumulativeNoiseSeconds += 5;
            onSuspiciousAudio?.(
              `Please maintain silence! (${cumulativeNoiseSeconds}s of voice detected)`,
            );

            if (cumulativeNoiseSeconds >= 20) {
              cumulativeNoiseSeconds = 0;
              onSuspiciousAudio?.("violation");
            }
          } else {
            cumulativeNoiseSeconds = 0;
          }
        }, 5000);
      } catch (err) {
        console.log("Audio detection not available:", err.message);
      }
    };

    startAudioDetection();

    return () => {
      clearInterval(audioIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [enabled]);

  // ── Face Detection ───────────────────────────────────────────────
  useEffect(() => {
    if (!modelsLoaded) return;

    const runDetection = async () => {
      if (!enabledRef.current) return;
      if (!videoRef.current) return;
      if (videoRef.current.readyState < 2) return;

      try {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.4,
          }),
        );

        const count = detections.length;
        setFaceCount(count);

        // ── Multiple faces ───────────────────────────────────────
        if (count > 1) {
          multipleFaceCountRef.current += 1;
          if (multipleFaceCountRef.current >= 2) {
            multipleFaceCountRef.current = 0;
            onMultipleFaces?.();
          }
          setFaceDetected(true);
          return;
        } else {
          multipleFaceCountRef.current = 0;
        }

        // ── Single face with confidence check ────────────────────
        if (count === 1) {
          const confidence = detections[0].score;
          if (confidence >= 0.6) {
            // ✅ Good face detected — do NOT reset cumulative counter
            setFaceDetected(true);
            return;
          }
          // Low confidence = treat as no face
        }

        // ── No face or low confidence ────────────────────────────
        setFaceDetected(false);
        absentSecondsRef.current += 5; // add 5 seconds to cumulative

        // Warn immediately on first miss
        onFaceWarning?.(
          `Face not visible! Please look at the camera. (${absentSecondsRef.current}s accumulated)`,
        );

        // Violation after cumulative 20 seconds
        if (absentSecondsRef.current >= 20) {
          absentSecondsRef.current = 0; // reset after violation
          onFaceAbsent?.();
        }
      } catch (err) {
        console.error("Detection error:", err);
      }
    };

    runDetection();
    intervalRef.current = setInterval(runDetection, 5000);

    return () => clearInterval(intervalRef.current);
  }, [modelsLoaded]);

  return { faceDetected, modelsLoaded, faceCount };
};

export default useFaceDetection;
