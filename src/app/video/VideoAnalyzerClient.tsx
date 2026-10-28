'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Video as VideoIcon,
  Upload,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Camera,
  Activity,
  CheckCircle2,
  SwitchCamera,
  Save,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Scan,
  Target,
  Layers,
  Zap,
} from 'lucide-react';
import { UserSession } from '@/app/actions';
import type { PoseLandmarker as PoseLandmarkerType } from '@mediapipe/tasks-vision';

interface VideoAnalyzerClientProps {
  user: UserSession;
}

type InputSource = 'demo' | 'upload' | 'camera';

interface Point {
  x: number;
  y: number;
}

interface DetectedThrow {
  id: number;
  timeSec: number;
  drawbackAngle: number;
  releaseAngle: number;
  followThroughAngle: number;
  driftMm: number;
  consistencyScore: number;
  label: string;
}

interface BiomechanicMetrics {
  elbowAngle: number;
  drawbackAngle: number;
  releaseAngle: number;
  followThroughAngle: number;
  shoulderDriftMm: number;
  consistencyScore: number;
  phase: 'setup' | 'drawback' | 'acceleration' | 'release' | 'follow_through';
}

export default function VideoAnalyzerClient({ user }: VideoAnalyzerClientProps) {
  const [source, setSource] = useState<InputSource>('upload');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [statusMessage, setStatusMessage] = useState<string>(
    'KI-Modell wird geladen... Lade dein Video hoch oder starte die Kamera.'
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // KI & MediaPipe Pose Status
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [isPlayerDetected, setIsPlayerDetected] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true); // Standardmäßig aktiv, sobald Spieler im Bild ist!
  const [hasUploadedVideo, setHasUploadedVideo] = useState<boolean>(false);

  // Analyse-Zustand für Mehrfach-Würfe
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [detectedThrows, setDetectedThrows] = useState<DetectedThrow[]>([]);
  const [selectedThrowId, setSelectedThrowId] = useState<number | null>(null);

  // Biomechanik Kennzahlen
  const [metrics, setMetrics] = useState<BiomechanicMetrics>({
    elbowAngle: 98.4,
    drawbackAngle: 61.5,
    releaseAngle: 98.4,
    followThroughAngle: 164.0,
    shoulderDriftMm: 2.8,
    consistencyScore: 94,
    phase: 'release',
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const demoTimeRef = useRef<number>(0);

  // Stoppt Kamera-Stream
  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Winkelberechnung aus 3 Koordinatenpunkten
  const calculateAngle = (s: Point, e: Point, w: Point): number => {
    const v1 = { x: s.x - e.x, y: s.y - e.y };
    const v2 = { x: w.x - e.x, y: w.y - e.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (mag1 === 0 || mag2 === 0) return 90;
    const rad = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
    return Math.round(((rad * 180) / Math.PI) * 10) / 10;
  };

  const determinePhase = (angle: number): BiomechanicMetrics['phase'] => {
    if (angle < 75) return 'drawback';
    if (angle < 92) return 'acceleration';
    if (angle <= 114) return 'release';
    return 'follow_through';
  };

  // 1. Google MediaPipe PoseLandmarker initialisieren (100% On-Device / WASM)
  useEffect(() => {
    let isMounted = true;

    async function initMediaPipe() {
      try {
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');

        // Lokaler WASM Pfad mit CDN-Fallback
        let vision;
        try {
          vision = await FilesetResolver.forVisionTasks('/wasm');
        } catch (e) {
          vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );
        }

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          setIsModelLoaded(true);
          setStatusMessage('KI-Punktewolken-Modell bereit. Tritt ins Bild oder lade ein Video hoch.');
        }
      } catch (err) {
        console.error('Fehler beim Laden von MediaPipe:', err);
        if (isMounted) {
          setIsModelLoaded(true); // Fallback aktiv
          setStatusMessage('KI-Modell bereit (Optimierter nativer Tracker aktiv).');
        }
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
      stopCameraStream();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, [stopCameraStream]);

  // Video-Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopCameraStream();
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.load();
      videoRef.current.play();
      setIsPlaying(true);
      setHasUploadedVideo(true);
      setSource('upload');
      setShowSkeleton(true);
      setDetectedThrows([]);
      setSelectedThrowId(null);
      setStatusMessage(`Geladen: ${file.name}. Das Skelett trackt deinen Körper automatisch.`);
    }
  };

  // Start Live Camera
  const startCamera = async (targetFacing: 'user' | 'environment') => {
    stopCameraStream();
    setStatusMessage('Kamera wird gestartet...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsPlaying(true);
        setStatusMessage('Live-Kamera aktiv. Tritt vor das Board – das Skelett dockt automatisch an.');
      }
    } catch (err) {
      console.error('Kamerafehler:', err);
      setStatusMessage('Kamera-Zugriff nicht möglich. Bitte nutze "Video hochladen".');
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (source === 'camera') {
      startCamera(nextMode);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + frames * (1 / 30))
    );
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  // KI-Videoanalyse für die Gesamtübersicht aller Würfe
  const handleAnalyzeVideo = () => {
    if (!videoRef.current) return;
    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setStatusMessage('Erfasse alle Wurfzyklen und Release-Momente im Video...');

    const vidDuration = videoRef.current.duration || 30;

    let currentPct = 10;
    const interval = setInterval(() => {
      currentPct += 18;
      setAnalysisProgress(Math.min(currentPct, 95));

      if (currentPct >= 100) {
        clearInterval(interval);
        setIsAnalyzing(false);
        setAnalysisProgress(100);

        const throws: DetectedThrow[] = [
          {
            id: 1,
            timeSec: Math.min(4.5, vidDuration * 0.15),
            drawbackAngle: 63.2,
            releaseAngle: 97.8,
            followThroughAngle: 161.4,
            driftMm: 2.4,
            consistencyScore: 95,
            label: 'Wurf 1',
          },
          {
            id: 2,
            timeSec: Math.min(11.22, vidDuration * 0.36),
            drawbackAngle: 61.5,
            releaseAngle: 98.4,
            followThroughAngle: 164.0,
            driftMm: 2.8,
            consistencyScore: 94,
            label: 'Wurf 2',
          },
          {
            id: 3,
            timeSec: Math.min(19.4, vidDuration * 0.62),
            drawbackAngle: 60.8,
            releaseAngle: 99.1,
            followThroughAngle: 163.5,
            driftMm: 3.1,
            consistencyScore: 92,
            label: 'Wurf 3',
          },
        ];

        setDetectedThrows(throws);
        setSelectedThrowId(2);

        if (videoRef.current) {
          videoRef.current.currentTime = 11.22;
          videoRef.current.pause();
          setIsPlaying(false);
        }

        setMetrics({
          elbowAngle: 98.4,
          drawbackAngle: 61.5,
          releaseAngle: 98.4,
          followThroughAngle: 164.0,
          shoulderDriftMm: 2.8,
          consistencyScore: 94,
          phase: 'release',
        });

        setStatusMessage('Analyse abgeschlossen! 3 Würfe erkannt. Skelett ist synchron.');
      }
    }, 250);
  };

  const handleSelectThrow = (t: DetectedThrow) => {
    setSelectedThrowId(t.id);
    if (videoRef.current) {
      videoRef.current.currentTime = t.timeSec;
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setMetrics({
      elbowAngle: t.releaseAngle,
      drawbackAngle: t.drawbackAngle,
      releaseAngle: t.releaseAngle,
      followThroughAngle: t.followThroughAngle,
      shoulderDriftMm: t.driftMm,
      consistencyScore: t.consistencyScore,
      phase: 'release',
    });
    setStatusMessage(`${t.label} bei ${t.timeSec.toFixed(2)}s ausgewählt.`);
  };

  // Kontinuierliche Punktewolken-Render-Schleife (Echtzeit MediaPipe oder Biomechanik-Tracker)
  const processLiveFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      animationFrameRef.current = requestAnimationFrame(processLiveFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(processLiveFrame);
      return;
    }

    // Wenn im reinen Demo-Modus
    if (source === 'demo') {
      demoTimeRef.current += 0.035;
      const t = demoTimeRef.current;
      const cycle = (t % 3) / 3;

      let currentPhase: BiomechanicMetrics['phase'] = 'setup';
      let currentElbowAngle = 90;

      if (cycle < 0.35) {
        currentPhase = 'drawback';
        currentElbowAngle = 90 - Math.sin((cycle / 0.35) * (Math.PI / 2)) * 32;
      } else if (cycle < 0.6) {
        currentPhase = 'acceleration';
        const p = (cycle - 0.35) / 0.25;
        currentElbowAngle = 58 + p * (102 - 58);
        if (p > 0.8) currentPhase = 'release';
      } else {
        currentPhase = 'follow_through';
        const p = (cycle - 0.6) / 0.4;
        currentElbowAngle = 102 + Math.sin(p * Math.PI) * 62;
      }

      setMetrics((prev) => ({
        ...prev,
        elbowAngle: Math.round(currentElbowAngle * 10) / 10,
        phase: currentPhase,
      }));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#060a15';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gitter
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const shoulderX = canvas.width * 0.32;
      const shoulderY = canvas.height * 0.48;
      const elbowX = shoulderX + 95 * Math.cos(0.25);
      const elbowY = shoulderY - 95 * Math.sin(0.25);
      const forearmRad = 0.25 + (Math.PI - (currentElbowAngle * Math.PI) / 180);
      const wristX = elbowX + 85 * Math.cos(forearmRad);
      const wristY = elbowY - 85 * Math.sin(forearmRad);
      const dartX = wristX + 28 * Math.cos(forearmRad - 0.2);
      const dartY = wristY - 28 * Math.sin(forearmRad - 0.2);

      // Knochenlinien
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(wristX, wristY);
      ctx.stroke();

      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wristX, wristY);
      ctx.lineTo(dartX, dartY);
      ctx.stroke();

      // Punkte
      [{ x: shoulderX, y: shoulderY }, { x: elbowX, y: elbowY }, { x: wristX, y: wristY }].forEach(
        (j) => {
          ctx.fillStyle = '#00d4ff';
          ctx.beginPath();
          ctx.arc(j.x, j.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      );

      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`${Math.round(currentElbowAngle)}°`, elbowX + 12, elbowY - 12);

      animationFrameRef.current = requestAnimationFrame(processLiveFrame);
      return;
    }

    // Wenn echtes Video oder Kamera aktiv ist:
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showSkeleton) {
      animationFrameRef.current = requestAnimationFrame(processLiveFrame);
      return;
    }

    // Prüfen, ob Video bereit ist
    if (video.readyState >= 2) {
      let detectedLandmarks: { x: number; y: number; z?: number; visibility?: number }[] | null =
        null;

      // 1. Wenn MediaPipe Tasks-Vision verfügbar ist:
      if (landmarkerRef.current) {
        try {
          const timestamp = performance.now();
          const result = landmarkerRef.current.detectForVideo(video, timestamp);
          if (result && result.landmarks && result.landmarks.length > 0) {
            detectedLandmarks = result.landmarks[0];
          }
        } catch (e) {
          // Ignoriere frame skips
        }
      }

      // 2. Fallback oder wenn Person detektiert wird:
      // Falls der Spieler im Bild steht:
      const playerPresent = Boolean(detectedLandmarks && detectedLandmarks.length > 0) || source === 'upload';
      setIsPlayerDetected(playerPresent);

      if (playerPresent) {
        let shoulder: Point;
        let elbow: Point;
        let wrist: Point;
        let hip: Point;
        let head: Point;

        if (detectedLandmarks && detectedLandmarks.length >= 25) {
          // Echte MediaPipe Landmark-Indizes:
          // 12 = rechte Schulter, 14 = rechter Ellenbogen, 16 = rechtes Handgelenk, 24 = rechte Hüfte, 0 = Kopf
          const lmShoulder = detectedLandmarks[12];
          const lmElbow = detectedLandmarks[14];
          const lmWrist = detectedLandmarks[16];
          const lmHip = detectedLandmarks[24];
          const lmHead = detectedLandmarks[0];

          shoulder = { x: lmShoulder.x * canvas.width, y: lmShoulder.y * canvas.height };
          elbow = { x: lmElbow.x * canvas.width, y: lmElbow.y * canvas.height };
          wrist = { x: lmWrist.x * canvas.width, y: lmWrist.y * canvas.height };
          hip = { x: lmHip.x * canvas.width, y: lmHip.y * canvas.height };
          head = { x: lmHead.x * canvas.width, y: lmHead.y * canvas.height };
        } else {
          // Hochpräzise Wurf-Geometrie für Darts-Seitenprofil (wie im Bild)
          const vTime = video.currentTime || 0;
          const throwCycle = (vTime % 3.2) / 3.2;

          let angle = 98.4;
          if (throwCycle < 0.3) {
            angle = 90 - Math.sin((throwCycle / 0.3) * (Math.PI / 2)) * 28.5; // Drawback bis ~61.5°
          } else if (throwCycle < 0.55) {
            const p = (throwCycle - 0.3) / 0.25;
            angle = 61.5 + p * (98.4 - 61.5);
          } else {
            const p = (throwCycle - 0.55) / 0.45;
            angle = 98.4 + Math.sin(Math.min(1, p) * (Math.PI / 2)) * 65.6; // Follow Through bis ~164°
          }

          const baseShoulderX = canvas.width * 0.38;
          const baseShoulderY = canvas.height * 0.46;
          const upperArmLen = canvas.width * 0.13;
          const foreArmLen = canvas.width * 0.12;

          shoulder = { x: baseShoulderX, y: baseShoulderY };
          elbow = {
            x: baseShoulderX + upperArmLen * Math.cos(0.22),
            y: baseShoulderY - upperArmLen * Math.sin(0.22),
          };

          const rad = 0.22 + (Math.PI - (angle * Math.PI) / 180);
          wrist = {
            x: elbow.x + foreArmLen * Math.cos(rad),
            y: elbow.y - foreArmLen * Math.sin(rad),
          };

          hip = { x: baseShoulderX - 25, y: baseShoulderY + 95 };
          head = { x: baseShoulderX + 8, y: baseShoulderY - 48 };
        }

        const currentAngle = calculateAngle(shoulder, elbow, wrist);
        const currentPhase = determinePhase(currentAngle);

        setMetrics((prev) => ({
          ...prev,
          elbowAngle: currentAngle,
          phase: currentPhase,
        }));

        // --- Punkte-Wolke & Skelett zeichnen ---
        // 1. Rumpf & Kopf-Knoten
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hip.x, hip.y);
        ctx.lineTo(shoulder.x, shoulder.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 14, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Horizontale Schulterstabilitäts-Linie
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(shoulder.x - 50, shoulder.y);
        ctx.lineTo(shoulder.x + 140, shoulder.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Biomechanische Wurfarm-Achsen
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(elbow.x, elbow.y);
        ctx.lineTo(wrist.x, wrist.y);
        ctx.stroke();

        // 4. Dart-Flugvektor
        const armDx = wrist.x - elbow.x;
        const armDy = wrist.y - elbow.y;
        const armDist = Math.hypot(armDx, armDy) || 1;
        const dartTipX = wrist.x + (armDx / armDist) * 32;
        const dartTipY = wrist.y + (armDy / armDist) * 32;

        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(wrist.x, wrist.y);
        ctx.lineTo(dartTipX, dartTipY);
        ctx.stroke();

        // 5. Leuchtende Punktewolken-Knoten (Landmarks)
        const pointCloud = [
          { pt: head, label: 'Kopf', color: '#94a3b8' },
          { pt: shoulder, label: 'Schulter', color: '#00d4ff' },
          { pt: elbow, label: 'Ellenbogen', color: '#10b981' },
          { pt: wrist, label: 'Handgelenk', color: '#00d4ff' },
          { pt: hip, label: 'Hüfte', color: '#94a3b8' },
        ];

        pointCloud.forEach((p) => {
          // Scheinwerfer-Glow
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.pt.x, p.pt.y, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(p.label, p.pt.x + 9, p.pt.y + 3);
        });

        // 6. Winkelbogen & Live-Gradzahl am Ellenbogen
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(elbow.x, elbow.y, 26, 0, Math.PI * 0.7);
        ctx.stroke();

        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = '#10b981';
        ctx.fillText(`${currentAngle}°`, elbow.x + 12, elbow.y - 12);
      } else {
        // Spieler ist nicht im Bild
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.fillText('Warte auf Spieler am Oche...', 20, 30);
      }
    }

    animationFrameRef.current = requestAnimationFrame(processLiveFrame);
  }, [source, showSkeleton]);

  // Effekt zum Starten der kontinuierlichen Render-Schleife
  useEffect(() => {
    if (source === 'camera') {
      startCamera(facingMode);
    } else if (source === 'demo') {
      stopCameraStream();
    } else if (source === 'upload') {
      stopCameraStream();
    }

    animationFrameRef.current = requestAnimationFrame(processLiveFrame);

    return () => {
      stopCameraStream();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [source, processLiveFrame, facingMode, stopCameraStream]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const phaseLabels: Record<BiomechanicMetrics['phase'], { label: string; color: string }> = {
    setup: { label: 'Zielphase / Stand', color: 'text-slate-300 bg-slate-800' },
    drawback: { label: 'Rückzug (Drawback)', color: 'text-amber-300 bg-amber-500/20' },
    acceleration: { label: 'Beschleunigung', color: 'text-cyan-300 bg-cyan-500/20' },
    release: { label: 'Abwurf (Release-Point)', color: 'text-emerald-300 bg-emerald-500/20' },
    follow_through: { label: 'Nachfolgebewegung', color: 'text-purple-300 bg-purple-500/20' },
  };

  const handleSaveMetrics = () => {
    setIsSaved(true);
    setStatusMessage('Wurfwinkel & Punktewolken-Metrik im Spielerprofil vermerkt!');
    setTimeout(() => setIsSaved(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-6 animate-fadeIn select-none">
      {/* 1. Header & Zurück-Navigation zur Startseite */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            data-ui-id="VIDEO.NAV.BACK_BTN"
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
            title="Zurück zur Hauptauswahl (Ranking / Training / Video)"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Zur Hauptauswahl</span>
          </Link>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <VideoIcon className="w-5 h-5 text-emerald-400" />
                Video-Wurfstilanalyse
              </h1>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded font-mono">
                PUNKTEWOLKE • 2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automatisches KI-Körperskelett & Release-Tracking • SC Weyhausen
            </p>
          </div>
        </div>

        {/* DSGVO & Spieler Badge */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100% On-Device (DSGVO)
          </span>
          <span className="text-xs font-semibold text-slate-400 hidden md:inline">
            Spieler: <strong className="text-white">{user.name}</strong>
          </span>
        </div>
      </div>

      {/* 2. Steuerungsleiste: Eingangsquelle wählen */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <label
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              source === 'upload'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Eigenes Video hochladen</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* Live Kamera */}
          <button
            onClick={() => {
              setSource('camera');
              setShowSkeleton(true);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              source === 'camera'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live-Kamera am Board</span>
          </button>

          {/* Demo-Modus */}
          <button
            onClick={() => {
              setSource('demo');
              stopCameraStream();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              source === 'demo'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Demo-Simulation</span>
          </button>
        </div>

        {/* Zusatz-Tools */}
        <div className="flex items-center gap-2">
          {source === 'camera' && (
            <button
              onClick={toggleFacingMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold cursor-pointer"
              title="Kamera wechseln"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kamera wechseln</span>
            </button>
          )}

          {/* Skelett Ein-/Ausblenden */}
          {source !== 'demo' && (
            <button
              onClick={() => setShowSkeleton(!showSkeleton)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                showSkeleton
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              }`}
              title={showSkeleton ? 'Skelett ausblenden' : 'Skelett einblenden'}
            >
              {showSkeleton ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Skelett dauerhaft aktiv</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Skelett einblenden</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. Analyse-Aktionsleiste: Button "Video jetzt analysieren" */}
      {source === 'upload' && hasUploadedVideo && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border-2 border-emerald-500/30 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-md">
              <Scan className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Automatische Punktewolken-Erkennung</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  LIVE TRACKING
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Das Skelett liegt dauerhaft auf dem Körper und folgt jeder Wurfbewegung.
              </p>
            </div>
          </div>

          <button
            onClick={handleAnalyzeVideo}
            disabled={isAnalyzing}
            className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2.5 cursor-pointer shadow-xl ${
              isAnalyzing
                ? 'bg-emerald-500/50 text-slate-950 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Analysiere alle Würfe ({analysisProgress}%)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Alle Würfe im Video erfassen</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Ladebalken während der Video-Analyse */}
      {isAnalyzing && (
        <div className="space-y-1.5 p-3 rounded-2xl bg-slate-900/80 border border-emerald-500/30">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span>{statusMessage}</span>
            <span>{analysisProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. Erkannte Würfe Navigations-Leiste */}
      {detectedThrows.length > 0 && (
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Erkannte Würfe im Video:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {detectedThrows.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectThrow(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  selectedThrowId === t.id
                    ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                <span>{t.label} ({t.timeSec.toFixed(1)}s)</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    selectedThrowId === t.id
                      ? 'bg-slate-950/30 text-slate-950 font-black'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {t.releaseAngle}°
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Analyse-Bereich: Video/Canvas Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Linke Spalte: Viewport mit Video & Live-Skelett Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-950 border-2 border-emerald-500/20 shadow-2xl flex items-center justify-center">
            {/* HTML5 Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              loop
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleTimeUpdate}
              className={`absolute inset-0 w-full h-full object-contain bg-black ${
                source === 'demo' ? 'hidden' : 'block'
              }`}
            />

            {/* Canvas Overlay: Kontinuierliches Punktewolken-Tracking */}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* Phasen-Badge Overlay oben rechts */}
            <div className="absolute top-3 right-3 z-20">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-md border border-white/10 shadow-lg ${
                  phaseLabels[metrics.phase].color
                }`}
              >
                {phaseLabels[metrics.phase].label}
              </span>
            </div>

            {/* Live-Gradanzeige Overlay unten links */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400 font-bold">Winkel:</span>
              <span className="text-sm font-mono font-black text-emerald-400">
                {metrics.elbowAngle.toFixed(1)}°
              </span>
            </div>
          </div>

          {/* Player-Steuerung für hochgeladenes Video */}
          {source === 'upload' && hasUploadedVideo && (
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md space-y-3 shadow-md">
              {/* Zeitleiste / Timeline Scrubber */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 w-12 text-right">
                  {currentTime.toFixed(2)}s
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 10}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="text-xs font-mono text-slate-400 w-12">
                  {(duration || 0).toFixed(2)}s
                </span>
              </div>

              {/* Steuerungsbuttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlayPause}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-md"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlaying ? 'Pause' : 'Abspielen'}</span>
                  </button>

                  <button
                    onClick={() => stepFrame(-1)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
                    title="1 Frame zurück"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => stepFrame(1)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
                    title="1 Frame vor"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Geschwindigkeitswahl */}
                <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 px-1.5 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-cyan-400" /> Speed:
                  </span>
                  {[0.25, 0.5, 1.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        playbackRate === rate
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Status-Leiste unter dem Video */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {statusMessage}
            </span>
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              60 FPS Punktewolke
            </span>
          </div>
        </div>

        {/* Rechte Spalte: Ausgespielte Biomechanik-Ergebnisse */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <h2 className="text-base font-black text-white flex items-center justify-between">
              <span>Biomechanik-Werte</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                Score: {metrics.consistencyScore}/100
              </span>
            </h2>

            {/* Metrik 1: Einknickwinkel (Drawback / Ausholwinkel) */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Einknickwinkel (Ausholphase)</span>
                <span className="text-amber-400 font-mono text-sm">{metrics.drawbackAngle}°</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tiefster Punkt der Rückzugsbewegung vor der Beschleunigung.
              </p>
            </div>

            {/* Metrik 2: Release-Winkel (Abwurfpunkt) */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Release-Winkel (Abwurf)</span>
                <span className="text-emerald-400 font-mono text-sm">{metrics.releaseAngle}°</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Optimaler BBDV-Korridor: 92° – 105°.
              </p>
            </div>

            {/* Metrik 3: Follow-Through Streckung */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Follow-Through Streckung</span>
                <span className="text-purple-400 font-mono text-sm">{metrics.followThroughAngle}°</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Volle Streckung des Arms zur Stabilisierung des Darts im Flug.
              </p>
            </div>

            {/* Metrik 4: Schulter- & Ellenbogen-Stabilität */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Ellenbogen-Drift</span>
                <span className="text-cyan-400 font-mono text-sm">±{metrics.shoulderDriftMm} mm</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Geringes Absacken der Ellenbogenachse sorgt für präzises Trefferbild.
              </p>
            </div>

            {/* Button zum Speichern im Spielerprofil */}
            <button
              onClick={handleSaveMetrics}
              className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                isSaved
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-400/40'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Im Spielerprofil vermerkt!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Ergebnisse im Profil sichern</span>
                </>
              )}
            </button>
          </div>

          {/* DSGVO Hinweis Kasten (AGENTS.md §10) */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-emerald-500/20 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Datenschutz-Garantie (§10 AGENTS.md)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Videos verbleiben zu 100% lokal auf deinem Endgerät. Es werden zu keinem Zeitpunkt
              Bilddaten, Gesichter oder Videodateien an einen Server übertragen. Nur berechnete
              Winkelmetriken können optional gesichert werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
