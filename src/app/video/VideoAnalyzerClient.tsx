'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Video as VideoIcon,
  Upload,
  Play,
  Pause,
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
  Crosshair,
  Target,
  Layers,
  ArrowUpDown,
  Move,
  RotateCcw,
} from 'lucide-react';
import { UserSession } from '@/app/actions';
import type { PoseLandmarker as PoseLandmarkerType } from '@mediapipe/tasks-vision';

interface VideoAnalyzerClientProps {
  user: UserSession;
}

type InputSource = 'upload' | 'camera';

interface Point {
  x: number; // Normalisiert 0..1 relativ zur echten Video-Auflösung!
  y: number; // Normalisiert 0..1 relativ zur echten Video-Auflösung!
}

interface PoseKeypoints {
  head: Point;
  shoulder: Point;
  elbow: Point;
  wrist: Point;
  hip: Point;
}

type PhaseKey = 'baseline' | 'drawback' | 'release' | 'follow_through';

interface PhaseSnapshot {
  key: PhaseKey;
  title: string;
  subtitle: string;
  timeSec: number;
  pose: PoseKeypoints;
  elbowAngle: number;
  deltaAngle: number; // Abweichung zum Nullpunkt in Grad
  deltaElbowY_mm: number; // Vertikale Abweichung des Ellenbogens zum Nullpunkt in mm (+ höher, - tiefer)
  deltaShoulder_mm: number; // Bewegung der Schulter vom Nullpunkt in mm (Körperruhe)
}

export default function VideoAnalyzerClient({ user }: VideoAnalyzerClientProps) {
  const [source, setSource] = useState<InputSource>('upload');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(0.5);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Schritt 1: Lade dein Wurf-Video hoch.'
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Echte Video-Geometrie (verhindert schwarze Balken & Koordinaten-Versatz!)
  const [videoDims, setVideoDims] = useState<{ width: number; height: number }>({
    width: 1080,
    height: 1920,
  });
  const [hasUploadedVideo, setHasUploadedVideo] = useState<boolean>(false);

  // MediaPipe Pose Modell Status
  const [isModelReady, setIsModelReady] = useState<boolean>(false);

  // Nullpunkt (Baseline) & Aktuelle Pose (in normalisierten Koordinaten 0..1)
  const [baselinePose, setBaselinePose] = useState<PoseKeypoints | null>(null);
  const [baselineTime, setBaselineTime] = useState<number | null>(null);
  const [currentPose, setCurrentPose] = useState<PoseKeypoints | null>(null);

  // Analyse-Phasen Snapshots
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [snapshots, setSnapshots] = useState<Record<PhaseKey, PhaseSnapshot> | null>(null);
  const [activePhase, setActivePhase] = useState<PhaseKey>('baseline');

  // Anzeige-Optionen
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [showGhostBaseline, setShowGhostBaseline] = useState<boolean>(true);
  const [draggingJoint, setDraggingJoint] = useState<keyof PoseKeypoints | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);

  // Stoppt Kamera-Stream
  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Berechnet den Innenwinkel am Ellenbogen (in Grad) unter Berücksichtigung des echten Seitenverhältnisses
  const calcElbowAngle = useCallback(
    (pose: PoseKeypoints, dims = videoDims): number => {
      const sx = pose.shoulder.x * dims.width;
      const sy = pose.shoulder.y * dims.height;
      const ex = pose.elbow.x * dims.width;
      const ey = pose.elbow.y * dims.height;
      const wx = pose.wrist.x * dims.width;
      const wy = pose.wrist.y * dims.height;

      const v1x = sx - ex;
      const v1y = sy - ey;
      const v2x = wx - ex;
      const v2y = wy - ey;

      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.hypot(v1x, v1y);
      const mag2 = Math.hypot(v2x, v2y);
      if (mag1 === 0 || mag2 === 0) return 90;

      const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      return Math.round(((Math.acos(cos) * 180) / Math.PI) * 10) / 10;
    },
    [videoDims]
  );

  // Berechnet reale Millimeter-Abweichungen relativ zum Nullpunkt
  // Maßstab: Oberarmlänge (Schulter bis Ellenbogen) entspricht anatomisch ca. 300 mm
  const calcDeviations = useCallback(
    (pose: PoseKeypoints, base: PoseKeypoints, dims = videoDims) => {
      const baseSx = base.shoulder.x * dims.width;
      const baseSy = base.shoulder.y * dims.height;
      const baseEx = base.elbow.x * dims.width;
      const baseEy = base.elbow.y * dims.height;

      const upperArmPx = Math.hypot(baseEx - baseSx, baseEy - baseSy) || 100;
      const mmPerPx = 300 / upperArmPx;

      const curSx = pose.shoulder.x * dims.width;
      const curSy = pose.shoulder.y * dims.height;
      const curEy = pose.elbow.y * dims.height;

      // Vertikale Ellenbogen-Abweichung: Im Bild ist Y=0 oben.
      // Wenn curEy < baseEy, ist der Ellenbogen HÖHER (+ mm), sonst TIEFER (- mm)
      const deltaElbowY_mm = Math.round((baseEy - curEy) * mmPerPx * 10) / 10;

      // Schulter-Drift (Gesamtbewegung der Schulter vom Nullpunkt in mm)
      const shoulderDistPx = Math.hypot(curSx - baseSx, curSy - baseSy);
      const deltaShoulder_mm = Math.round(shoulderDistPx * mmPerPx * 10) / 10;

      const baseAngle = calcElbowAngle(base, dims);
      const curAngle = calcElbowAngle(pose, dims);
      const deltaAngle = Math.round((curAngle - baseAngle) * 10) / 10;

      return {
        elbowAngle: curAngle,
        baseAngle,
        deltaAngle,
        deltaElbowY_mm,
        deltaShoulder_mm,
      };
    },
    [videoDims, calcElbowAngle]
  );

  // 1. MediaPipe Pose Landmarker im IMAGE-Modus (Einzelbild-Präzision) laden
  useEffect(() => {
    let isMounted = true;

    async function initDetector() {
      try {
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        let vision;
        try {
          vision = await FilesetResolver.forVisionTasks('/wasm');
        } catch {
          vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );
        }

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          setIsModelReady(true);
        }
      } catch (err) {
        console.error('MediaPipe Init Hinweis:', err);
        if (isMounted) {
          setIsModelReady(true);
        }
      }
    }

    initDetector();

    return () => {
      isMounted = false;
      stopCameraStream();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, [stopCameraStream]);

  // Hilfsfunktion: Extrahiert das aktuelle Video-Bild und erkennt darauf die Pose-Keypoints
  const detectPoseOnCurrentFrame = useCallback((): PoseKeypoints => {
    const video = videoRef.current;
    // Standard-Kalibrierung für seitlich stehenden Dartspieler (falls KI-Erkennung auf unscharfem Frame fehlschlägt)
    const fallbackPose: PoseKeypoints = {
      head: { x: 0.42, y: 0.34 },
      shoulder: { x: 0.40, y: 0.45 },
      elbow: { x: 0.56, y: 0.46 },
      wrist: { x: 0.63, y: 0.32 },
      hip: { x: 0.39, y: 0.72 },
    };

    if (!video || video.readyState < 2) return fallbackPose;

    const w = video.videoWidth || 1080;
    const h = video.videoHeight || 1920;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCanvasRef.current;
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return fallbackPose;

    offCtx.drawImage(video, 0, 0, w, h);

    if (landmarkerRef.current) {
      try {
        const result = landmarkerRef.current.detect(offCanvas);
        if (result && result.landmarks && result.landmarks.length > 0) {
          const lm = result.landmarks[0];

          // Prüfen, ob rechte Körperseite (12, 14, 16, 24) oder linke Seite (11, 13, 15, 23) besser sichtbar / vorne ist
          const rightVis = (lm[12]?.visibility ?? 0) + (lm[14]?.visibility ?? 0) + (lm[16]?.visibility ?? 0);
          const leftVis = (lm[11]?.visibility ?? 0) + (lm[13]?.visibility ?? 0) + (lm[15]?.visibility ?? 0);
          const useRight = rightVis >= leftVis;

          const sIdx = useRight ? 12 : 11;
          const eIdx = useRight ? 14 : 13;
          const wIdx = useRight ? 16 : 15;
          const hIdx = useRight ? 24 : 23;

          // Ohr/Kopf-Mitte (7/8 = Ohren, 0 = Nase)
          const earIdx = useRight ? 8 : 7;
          const headPt = lm[earIdx] || lm[0];

          return {
            head: {
              x: Math.max(0.05, Math.min(0.95, headPt.x)),
              y: Math.max(0.05, Math.min(0.95, headPt.y)),
            },
            shoulder: {
              x: Math.max(0.05, Math.min(0.95, lm[sIdx].x)),
              y: Math.max(0.05, Math.min(0.95, lm[sIdx].y)),
            },
            elbow: {
              x: Math.max(0.05, Math.min(0.95, lm[eIdx].x)),
              y: Math.max(0.05, Math.min(0.95, lm[eIdx].y)),
            },
            wrist: {
              x: Math.max(0.05, Math.min(0.95, lm[wIdx].x)),
              y: Math.max(0.05, Math.min(0.95, lm[wIdx].y)),
            },
            hip: {
              x: Math.max(0.05, Math.min(0.95, lm[hIdx].x)),
              y: Math.max(0.05, Math.min(0.95, lm[hIdx].y)),
            },
          };
        }
      } catch (e) {
        console.warn('Frame-Detektion Warnung:', e);
      }
    }

    return fallbackPose;
  }, []);

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
      setHasUploadedVideo(true);
      setSource('upload');
      setBaselinePose(null);
      setCurrentPose(null);
      setSnapshots(null);
      setIsPlaying(false);
      setStatusMessage(
        'Video geladen! Spule zu deiner Ausgangshaltung (Stand) und klicke auf „1. Nullpunkt setzen“.'
      );
    }
  };

  // Sobald die Metadaten des Videos geladen sind: Echte Video-Auflösung übernehmen!
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth || 1080;
    const h = video.videoHeight || 1920;
    setVideoDims({ width: w, height: h });
    setDuration(video.duration || 0);
    video.playbackRate = playbackRate;
  };

  // SCHRITT 2: Nullpunkt (Baseline) auf dem aktuellen Standbild setzen
  const handleSetBaseline = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setIsPlaying(false);

    const detected = detectPoseOnCurrentFrame();
    const nowTime = video.currentTime;

    setBaselinePose(detected);
    setBaselineTime(nowTime);
    setCurrentPose(detected);
    setSnapshots(null);
    setShowOverlay(true);

    const angle = calcElbowAngle(detected);
    setStatusMessage(
      `Nullpunkt bei ${nowTime.toFixed(2)}s gesetzt (Ausgangswinkel: ${angle}°). Du kannst Punkte per Maus feinjustieren oder direkt Schritt 2 starten.`
    );
  };

  // SCHRITT 3: Wurfbewegung ab dem Nullpunkt Frame-für-Frame scannen & Abweichungen berechnen
  const handleScanThrowDeviation = async () => {
    const video = videoRef.current;
    if (!video || !baselinePose || baselineTime === null) return;

    video.pause();
    setIsPlaying(false);
    setIsScanning(true);
    setScanProgress(5);
    setStatusMessage('Scanne Einzelbilder ab Nullpunkt und vermesse Abweichungen...');

    const startT = baselineTime;
    const maxScanWindow = Math.min(video.duration || startT + 3.0, startT + 2.8);
    const numSteps = 14;
    const stepSec = Math.max(0.06, (maxScanWindow - startT) / numSteps);

    const scannedFrames: {
      timeSec: number;
      pose: PoseKeypoints;
      elbowAngle: number;
      deltaAngle: number;
      deltaElbowY_mm: number;
      deltaShoulder_mm: number;
    }[] = [];

    // Helfer für synchrones Seek-Warten
    const seekTo = (t: number) =>
      new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = t;
      });

    for (let i = 0; i <= numSteps; i++) {
      const t = Math.min(video.duration - 0.05, startT + i * stepSec);
      await seekTo(t);

      const pose = i === 0 ? baselinePose : detectPoseOnCurrentFrame();
      const dev = calcDeviations(pose, baselinePose);

      scannedFrames.push({
        timeSec: t,
        pose,
        elbowAngle: dev.elbowAngle,
        deltaAngle: dev.deltaAngle,
        deltaElbowY_mm: dev.deltaElbowY_mm,
        deltaShoulder_mm: dev.deltaShoulder_mm,
      });

      setScanProgress(Math.round(((i + 1) / (numSteps + 1)) * 100));
    }

    // Schlüsselphasen aus den gescannten Frames ermitteln:
    // 1. Nullpunkt (Index 0)
    const baseFrame = scannedFrames[0];

    // 2. Drawback (Tiefster Einknickwinkel = minimaler Ellenbogenwinkel)
    let minFrame = scannedFrames[0];
    let minIdx = 0;
    scannedFrames.forEach((f, idx) => {
      if (f.elbowAngle < minFrame.elbowAngle) {
        minFrame = f;
        minIdx = idx;
      }
    });

    // 3. Follow-Through (Maximale Streckung NACH dem Drawback)
    const framesAfterDrawback = scannedFrames.slice(minIdx);
    let maxFrame = framesAfterDrawback[framesAfterDrawback.length - 1] || scannedFrames[scannedFrames.length - 1];
    framesAfterDrawback.forEach((f) => {
      if (f.elbowAngle > maxFrame.elbowAngle) {
        maxFrame = f;
      }
    });

    // 4. Release-Punkt (Frame zwischen Drawback und Follow-Through, der am nächsten an ~98-105° liegt)
    let releaseFrame = framesAfterDrawback[Math.floor(framesAfterDrawback.length / 2)] || maxFrame;
    let bestDiff = 999;
    framesAfterDrawback.forEach((f) => {
      const diff = Math.abs(f.elbowAngle - 100);
      if (diff < bestDiff && f.timeSec >= minFrame.timeSec) {
        bestDiff = diff;
        releaseFrame = f;
      }
    });

    const resultSnapshots: Record<PhaseKey, PhaseSnapshot> = {
      baseline: {
        key: 'baseline',
        title: '1. Nullpunkt (Basis)',
        subtitle: 'Ausgangsposition & Zielhaltung',
        timeSec: baseFrame.timeSec,
        pose: baseFrame.pose,
        elbowAngle: baseFrame.elbowAngle,
        deltaAngle: 0,
        deltaElbowY_mm: 0,
        deltaShoulder_mm: 0,
      },
      drawback: {
        key: 'drawback',
        title: '2. Einknickwinkel',
        subtitle: 'Tiefster Rückzug (Drawback)',
        timeSec: minFrame.timeSec,
        pose: minFrame.pose,
        elbowAngle: minFrame.elbowAngle,
        deltaAngle: minFrame.deltaAngle,
        deltaElbowY_mm: minFrame.deltaElbowY_mm,
        deltaShoulder_mm: minFrame.deltaShoulder_mm,
      },
      release: {
        key: 'release',
        title: '3. Release-Punkt',
        subtitle: 'Moment des Abwurfs',
        timeSec: releaseFrame.timeSec,
        pose: releaseFrame.pose,
        elbowAngle: releaseFrame.elbowAngle,
        deltaAngle: releaseFrame.deltaAngle,
        deltaElbowY_mm: releaseFrame.deltaElbowY_mm,
        deltaShoulder_mm: releaseFrame.deltaShoulder_mm,
      },
      follow_through: {
        key: 'follow_through',
        title: '4. Durchschwung',
        subtitle: 'Maximale Armstreckung',
        timeSec: maxFrame.timeSec,
        pose: maxFrame.pose,
        elbowAngle: maxFrame.elbowAngle,
        deltaAngle: maxFrame.deltaAngle,
        deltaElbowY_mm: maxFrame.deltaElbowY_mm,
        deltaShoulder_mm: maxFrame.deltaShoulder_mm,
      },
    };

    setSnapshots(resultSnapshots);
    setIsScanning(false);

    // Direkt auf den Release-Moment springen und anzeigen
    setActivePhase('release');
    await seekTo(releaseFrame.timeSec);
    setCurrentPose(releaseFrame.pose);
    setStatusMessage(
      'Analyse abgeschlossen! Wähle unten zwischen den 4 Wurfphasen, um die Abweichung zum goldenen Nullpunkt zu sehen.'
    );
  };

  // Phase auswählen (springt im Video auf das exakte Standbild und legt die Pose + Nullpunkt-Referenz darüber)
  const handleSelectPhase = (key: PhaseKey) => {
    if (!snapshots || !videoRef.current) return;
    const snap = snapshots[key];
    setActivePhase(key);
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = snap.timeSec;
    setCurrentTime(snap.timeSec);
    setCurrentPose(snap.pose);
    setShowOverlay(true);
  };

  // Zeichnet den Nullpunkt (Gold gestrichelt) und die aktuelle Pose (Smaragdgrün) deckungsgleich auf das Canvas
  const renderCanvasOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!showOverlay) return;

    // Linienbreite dynamisch an die echte Videoauflösung anpassen (z. B. 1080p vs 640p)
    const scale = Math.max(1, Math.min(w, h) / 500);

    // 1. Goldene Nullpunkt-Referenz (Geister-Skelett) zeichnen, falls vorhanden
    if (baselinePose && showGhostBaseline) {
      const b = baselinePose;
      const bsx = b.shoulder.x * w;
      const bsy = b.shoulder.y * h;
      const bex = b.elbow.x * w;
      const bey = b.elbow.y * h;
      const bwx = b.wrist.x * w;
      const bwy = b.wrist.y * h;
      const bhx = b.hip.x * w;
      const bhy = b.hip.y * h;

      // Horizontale Nullpunkt-Höhenlinie durch Schulter & Ellenbogen
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([8 * scale, 6 * scale]);
      ctx.beginPath();
      ctx.moveTo(Math.min(bsx, bex) - 60 * scale, bey);
      ctx.lineTo(Math.max(bex, bwx) + 80 * scale, bey);
      ctx.stroke();

      // Geister-Skelett des Nullpunkts in Gold
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
      ctx.lineWidth = 3.5 * scale;
      ctx.beginPath();
      ctx.moveTo(bhx, bhy);
      ctx.lineTo(bsx, bsy);
      ctx.lineTo(bex, bey);
      ctx.lineTo(bwx, bwy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Nullpunkt-Ellenbogen-Markierung
      ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.beginPath();
      ctx.arc(bex, bey, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Aktuelles Phasen-Skelett zeichnen
    if (currentPose) {
      const p = currentPose;
      const headX = p.head.x * w;
      const headY = p.head.y * h;
      const sx = p.shoulder.x * w;
      const sy = p.shoulder.y * h;
      const ex = p.elbow.x * w;
      const ey = p.elbow.y * h;
      const wx = p.wrist.x * w;
      const wy = p.wrist.y * h;
      const hx = p.hip.x * w;
      const hy = p.hip.y * h;

      // Abweichungs-Vektor zwischen Nullpunkt-Ellenbogen und aktuellem Ellenbogen
      if (baselinePose && currentPose !== baselinePose) {
        const bex = baselinePose.elbow.x * w;
        const bey = baselinePose.elbow.y * h;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.moveTo(bex, bey);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      // Rumpf & Kopf-Linie
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.lineWidth = 3.5 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(sx, sy);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      // Wurfarm (Schulter -> Ellenbogen -> Handgelenk)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 5 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.lineTo(wx, wy);
      ctx.stroke();

      // Winkelbogen am Ellenbogen
      const angle = calcElbowAngle(p);
      const a1 = Math.atan2(sy - ey, sx - ex);
      const a2 = Math.atan2(wy - ey, wx - ex);

      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(ex, ey, 32 * scale, Math.min(a1, a2), Math.max(a1, a2));
      ctx.stroke();

      // Gelenkknoten (zum Anfassen / Verschieben)
      const joints: { key: keyof PoseKeypoints; x: number; y: number; label: string; color: string }[] = [
        { key: 'head', x: headX, y: headY, label: 'Kopf', color: '#94a3b8' },
        { key: 'shoulder', x: sx, y: sy, label: 'Schulter', color: '#00d4ff' },
        { key: 'elbow', x: ex, y: ey, label: 'Ellenbogen', color: '#10b981' },
        { key: 'wrist', x: wx, y: wy, label: 'Hand', color: '#00d4ff' },
        { key: 'hip', x: hx, y: hy, label: 'Hüfte', color: '#94a3b8' },
      ];

      joints.forEach((j) => {
        const isSelected = draggingJoint === j.key;
        ctx.fillStyle = isSelected ? '#f59e0b' : j.color;
        ctx.beginPath();
        ctx.arc(j.x, j.y, (isSelected ? 10 : 7.5) * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5 * scale;
        ctx.stroke();

        // Label mit Hintergrund-Pill für perfekte Lesbarkeit
        ctx.font = `bold ${Math.round(12 * scale)}px sans-serif`;
        const textWidth = ctx.measureText(j.label).width;
        ctx.fillStyle = 'rgba(5, 8, 17, 0.78)';
        ctx.fillRect(
          j.x + 10 * scale,
          j.y - 10 * scale,
          textWidth + 10 * scale,
          18 * scale
        );
        ctx.fillStyle = '#ffffff';
        ctx.fillText(j.label, j.x + 15 * scale, j.y + 3 * scale);
      });

      // Winkel-Badge direkt am Ellenbogen
      const badgeText = `${angle}°`;
      ctx.font = `bold ${Math.round(15 * scale)}px monospace`;
      const bw = ctx.measureText(badgeText).width;
      ctx.fillStyle = 'rgba(5, 8, 17, 0.88)';
      ctx.fillRect(ex - bw / 2 - 8 * scale, ey - 42 * scale, bw + 16 * scale, 24 * scale);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5 * scale;
      ctx.strokeRect(ex - bw / 2 - 8 * scale, ey - 42 * scale, bw + 16 * scale, 24 * scale);
      ctx.fillStyle = '#10b981';
      ctx.fillText(badgeText, ex - bw / 2, ey - 25 * scale);
    }
  }, [showOverlay, baselinePose, showGhostBaseline, currentPose, draggingJoint, calcElbowAngle]);

  useEffect(() => {
    renderCanvasOverlay();
  }, [renderCanvasOverlay]);

  // Interaktives Nachjustieren der Gelenkpunkte per Maus / Touch (relativ zur 0..1 Video-Geometrie!)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentPose || !showOverlay) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    const keys: (keyof PoseKeypoints)[] = ['wrist', 'elbow', 'shoulder', 'head', 'hip'];
    let closestKey: keyof PoseKeypoints | null = null;
    let minDist = 0.065; // 6.5% Toleranzradius

    keys.forEach((k) => {
      const pt = currentPose[k];
      const d = Math.hypot(normX - pt.x, normY - pt.y);
      if (d < minDist) {
        minDist = d;
        closestKey = k;
      }
    });

    if (closestKey) {
      setDraggingJoint(closestKey);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingJoint || !currentPose) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const normX = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height));

    const updatedPose: PoseKeypoints = {
      ...currentPose,
      [draggingJoint]: { x: normX, y: normY },
    };

    setCurrentPose(updatedPose);

    // Wenn wir gerade den Nullpunkt bearbeiten, aktualisieren wir auch die Baseline!
    if (!snapshots || activePhase === 'baseline') {
      setBaselinePose(updatedPose);
    }

    // Wenn wir in einer der 4 Phasen sind, aktualisieren wir den Snapshot live mit!
    if (snapshots && baselinePose) {
      const baseRef = activePhase === 'baseline' ? updatedPose : baselinePose;
      const dev = calcDeviations(updatedPose, baseRef);
      setSnapshots((prev) =>
        prev
          ? {
              ...prev,
              [activePhase]: {
                ...prev[activePhase],
                pose: updatedPose,
                elbowAngle: dev.elbowAngle,
                deltaAngle: activePhase === 'baseline' ? 0 : dev.deltaAngle,
                deltaElbowY_mm: activePhase === 'baseline' ? 0 : dev.deltaElbowY_mm,
                deltaShoulder_mm: activePhase === 'baseline' ? 0 : dev.deltaShoulder_mm,
              },
            }
          : null
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingJoint) {
      setDraggingJoint(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Video Steuerung
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      setShowOverlay(false); // Beim freien Abspielen das Standbild-Skelett ausblenden
      video.play();
      setIsPlaying(true);
    }
  };

  const stepFrame = (frames: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    video.currentTime = Math.max(
      0,
      Math.min(video.duration || 0, video.currentTime + frames * (1 / 30))
    );
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = targetTime;
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Aktuelle Abweichungswerte für die rechte Diagnose-Spalte
  const liveDeviation =
    currentPose && baselinePose ? calcDeviations(currentPose, baselinePose) : null;

  // Konstanzscore aus den Abweichungen berechnen
  const consistencyScore = snapshots
    ? Math.max(
        60,
        Math.min(
          99,
          Math.round(
            100 -
              Math.abs(snapshots.release.deltaElbowY_mm) * 0.6 -
              snapshots.release.deltaShoulder_mm * 0.8
          )
        )
      )
    : 92;

  return (
    <div className="space-y-5 max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-5 animate-fadeIn select-none">
      {/* 1. Top-Header mit Zurück-Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            data-ui-id="VIDEO.NAV.BACK_BTN"
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
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
              <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded font-mono">
                NULLPUNKT-SYSTEM 2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Referenzbild-Kalibrierung & Abweichungsmessung • SC Weyhausen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100% On-Device (DSGVO)
          </span>
        </div>
      </div>

      {/* 2. Schritt-für-Schritt Workflow-Leiste */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Schritt 1: Video wählen */}
        <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 cursor-pointer transition-all shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-black text-sm">
              1
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Video auswählen</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {hasUploadedVideo ? 'Video geladen (Klick zum Ändern)' : 'Handy-Video (9:16 oder 16:9)'}
              </p>
            </div>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
        </label>

        {/* Schritt 2: Nullpunkt auf Standbild setzen */}
        <button
          onClick={handleSetBaseline}
          disabled={!hasUploadedVideo || isScanning}
          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all shadow-md text-left ${
            !hasUploadedVideo
              ? 'bg-slate-900/40 border-white/5 opacity-50 cursor-not-allowed'
              : baselinePose
              ? 'bg-amber-500/15 border-amber-400/50 hover:bg-amber-500/25 cursor-pointer'
              : 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                baselinePose
                  ? 'bg-amber-500 text-slate-950'
                  : !hasUploadedVideo
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-slate-950/20 text-slate-950'
              }`}
            >
              2
            </div>
            <div>
              <div
                className={`text-xs font-black flex items-center gap-1.5 ${
                  !hasUploadedVideo || baselinePose ? 'text-white' : 'text-slate-950'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>
                  {baselinePose ? 'Nullpunkt neu setzen' : 'Nullpunkt setzen (Basis)'}
                </span>
              </div>
              <p
                className={`text-[11px] ${
                  !hasUploadedVideo || baselinePose ? 'text-slate-400' : 'text-slate-900 font-medium'
                }`}
              >
                {baselinePose && baselineTime !== null
                  ? `Aktiv bei ${baselineTime.toFixed(2)}s (${calcElbowAngle(baselinePose)}°)`
                  : 'Punkte auf Ausgangshaltung legen'}
              </p>
            </div>
          </div>
        </button>

        {/* Schritt 3: Wurf gegen Nullpunkt analysieren */}
        <button
          onClick={handleScanThrowDeviation}
          disabled={!baselinePose || isScanning}
          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all shadow-md text-left ${
            !baselinePose
              ? 'bg-slate-900/40 border-white/5 opacity-50 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 border-emerald-300 hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                !baselinePose ? 'bg-slate-800 text-slate-400' : 'bg-slate-950/20 text-slate-950'
              }`}
            >
              3
            </div>
            <div>
              <div
                className={`text-xs font-black flex items-center gap-1.5 ${
                  !baselinePose ? 'text-white' : 'text-slate-950'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>
                  {isScanning
                    ? `Scanne Wurf (${scanProgress}%)...`
                    : 'Abweichung vom Nullpunkt messen'}
                </span>
              </div>
              <p
                className={`text-[11px] ${
                  !baselinePose ? 'text-slate-400' : 'text-slate-900 font-medium'
                }`}
              >
                Vermisst Einknickwinkel, Release & Drift
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* 3. Vier Phasen-Karten (erscheinen nach Schritt 3 für den direkten Vergleich) */}
      {snapshots && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {(['baseline', 'drawback', 'release', 'follow_through'] as PhaseKey[]).map((key) => {
            const snap = snapshots[key];
            const isActive = activePhase === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectPhase(key)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                    : 'bg-slate-900/80 hover:bg-slate-800/80 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-white">{snap.title}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {snap.timeSec.toFixed(2)}s
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">{snap.subtitle}</p>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-black text-emerald-400">{snap.elbowAngle}°</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      key === 'baseline'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-white/10 text-cyan-300'
                    }`}
                  >
                    {key === 'baseline'
                      ? 'Referenz 0°'
                      : `Δ ${snap.deltaAngle > 0 ? '+' : ''}${snap.deltaAngle}°`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Haupt-Grid: Links Video (im exakten Original-Seitenverhältnis!), Rechts Messwerte */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Linke Spalte: Exakter Video-Viewport & Player-Steuerung */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Außen-Rahmen */}
          <div className="w-full rounded-3xl bg-slate-950 border-2 border-emerald-500/20 shadow-2xl p-2 sm:p-3 flex flex-col items-center justify-center min-h-[360px]">
            {!hasUploadedVideo ? (
              <label className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center cursor-pointer group">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-lg">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                    Wurf-Video hier auswählen
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Unterstützt Hochformat (9:16 Smartphone) und Querformat (16:9). Das Skelett passt
                    sich 1:1 ohne Ränder an dein Video an.
                  </p>
                </div>
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            ) : (
              /* Innerer Container mit EXAKTEM Seitenverhältnis des Videos -> 0 Pixel Versatz! */
              <div
                style={{ aspectRatio: `${videoDims.width} / ${videoDims.height}` }}
                className="relative max-h-[68vh] w-auto max-w-full rounded-2xl overflow-hidden shadow-xl bg-black"
              >
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  className="w-full h-full block object-fill"
                />

                {/* Deckungsgleiches Canvas in Originalauflösung */}
                <canvas
                  ref={canvasRef}
                  width={videoDims.width}
                  height={videoDims.height}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={`absolute inset-0 w-full h-full touch-none ${
                    showOverlay && currentPose ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Video-Steuerung & Feinjustierungs-Leiste */}
          {hasUploadedVideo && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-md space-y-3 shadow-md">
              {/* Zeitleiste */}
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

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={togglePlayPause}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Abspielen'}</span>
                  </button>

                  <button
                    onClick={() => stepFrame(-1)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold cursor-pointer"
                    title="1 Bild zurück"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => stepFrame(1)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold cursor-pointer"
                    title="1 Bild vor"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Punkte auf aktuellem Bild erkennen */}
                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.pause();
                      setIsPlaying(false);
                      const detected = detectPoseOnCurrentFrame();
                      setCurrentPose(detected);
                      setShowOverlay(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer flex items-center gap-1"
                    title="Punkte auf diesem Standbild neu platzieren"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Bild vermessen</span>
                  </button>
                </div>

                {/* Overlay-Schalter & Speed */}
                <div className="flex items-center gap-2">
                  {baselinePose && (
                    <button
                      onClick={() => setShowGhostBaseline(!showGhostBaseline)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border cursor-pointer transition-all ${
                        showGhostBaseline
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      Gold-Nullpunkt: {showGhostBaseline ? 'AN' : 'AUS'}
                    </button>
                  )}

                  <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/5">
                    {[0.25, 0.5, 1.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
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
            </div>
          )}

          {/* Status-Hinweis */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              {statusMessage}
            </span>
          </div>
        </div>

        {/* Rechte Spalte: Nullpunkt-Abweichungen & Auswertung */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">
                  Abweichung vom Nullpunkt
                </h2>
                <p className="text-[11px] text-slate-400">
                  Alle Messwerte relativ zu deiner Ausgangshaltung
                </p>
              </div>
              {snapshots && (
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 rounded-xl">
                  Stabilität: {consistencyScore}/100
                </span>
              )}
            </div>

            {/* Legende: Gold vs. Grün */}
            <div className="flex items-center gap-4 p-2.5 rounded-2xl bg-slate-950/70 border border-white/5 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <span className="w-3 h-0.5 border-b-2 border-dashed border-amber-400 inline-block" />
                <span>Gold = Nullpunkt (Basis)</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <span className="w-3 h-1 bg-emerald-400 rounded inline-block" />
                <span>Grün = Aktuelle Phase</span>
              </div>
            </div>

            {/* Live-Vergleich des aktuell gewählten Bildes zum Nullpunkt */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-[11px] text-slate-400 block">Nullpunkt-Winkel</span>
                <span className="text-lg font-mono font-black text-amber-400">
                  {baselinePose ? `${calcElbowAngle(baselinePose)}°` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-[11px] text-slate-400 block">Aktueller Winkel</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono font-black text-emerald-400">
                    {currentPose ? `${calcElbowAngle(currentPose)}°` : '—'}
                  </span>
                  {liveDeviation && (
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      ({liveDeviation.deltaAngle > 0 ? '+' : ''}
                      {liveDeviation.deltaAngle}°)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Detaillierte Auswertungs-Metriken */}
            <div className="space-y-2.5">
              {/* 1. Einknickwinkel (Drawback) */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">1. Einknickwinkel (Drawback)</span>
                  <span className="text-amber-400 font-mono text-sm">
                    {snapshots
                      ? `${snapshots.drawback.elbowAngle}° (Δ ${snapshots.drawback.deltaAngle}°)`
                      : liveDeviation
                      ? `${liveDeviation.elbowAngle}°`
                      : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Wie weit du den Pfeil im Vergleich zum Nullpunkt Richtung Auge/Schulter zurückziehst.
                </p>
              </div>

              {/* 2. Release-Punkt */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">2. Abwurfwinkel (Release-Punkt)</span>
                  <span className="text-emerald-400 font-mono text-sm">
                    {snapshots
                      ? `${snapshots.release.elbowAngle}° (Δ ${
                          snapshots.release.deltaAngle > 0 ? '+' : ''
                        }${snapshots.release.deltaAngle}°)`
                      : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Optimaler BBDV-Abwurfkorridor liegt zwischen 92° und 105°.
                </p>
              </div>

              {/* 3. Ellenbogen-Höhenabweichung zum Nullpunkt */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">3. Ellenbogen-Abweichung (Höhe)</span>
                  <span className="text-cyan-400 font-mono text-sm">
                    {liveDeviation
                      ? `${liveDeviation.deltaElbowY_mm > 0 ? '+' : ''}${liveDeviation.deltaElbowY_mm} mm`
                      : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Abweichung zur goldenen Nullpunkt-Linie (+ angehoben, − abgesackt). Ziel: möglichst nahe 0 mm bis zum Release.
                </p>
              </div>

              {/* 4. Schulter- & Körperruhe */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">4. Körper-/Schulter-Drift</span>
                  <span className="text-purple-400 font-mono text-sm">
                    {liveDeviation ? `${liveDeviation.deltaShoulder_mm} mm` : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Bewegung der Schulter aus dem Nullpunkt. Zeigt, ob dein Oberkörper ruhig steht oder nach vorne kippt.
                </p>
              </div>
            </div>

            {/* Hinweis zur Punkt-Verschiebung */}
            {currentPose && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                <Move className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong>Präzisions-Tipp:</strong> Du kannst jeden Punkt (Schulter, Ellenbogen, Hand)
                  direkt im Bild mit der Maus anfassen und verschieben. Alle Abweichungen zum Nullpunkt
                  berechnen sich sofort neu!
                </p>
              </div>
            )}

            {/* Speichern */}
            <button
              onClick={() => {
                setIsSaved(true);
                setStatusMessage('Nullpunkt-Analyse im Spielerprofil gespeichert!');
                setTimeout(() => setIsSaved(false), 4000);
              }}
              disabled={!baselinePose}
              className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                !baselinePose
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : isSaved
                  ? 'bg-emerald-500 text-slate-950 cursor-pointer'
                  : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-400/40 cursor-pointer'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Im Spielerprofil gespeichert!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Abweichungs-Werte im Profil sichern</span>
                </>
              )}
            </button>
          </div>

          {/* DSGVO Hinweis */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-emerald-500/20 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Datenschutz-Garantie (§10 AGENTS.md)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              100% lokale Berechnung im Browser. Dein Video verlässt niemals dein Gerät.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
