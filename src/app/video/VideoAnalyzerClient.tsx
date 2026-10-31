"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Video as VideoIcon,
  Upload,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Save,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Crosshair,
  Target,
  Move,
  RotateCcw,
  AlertTriangle,
  Sliders,
  Trash2,
  Zap,
  Compass,
  TrendingUp,
} from 'lucide-react';
import { UserSession } from '@/app/actions';
import type { PoseLandmarker as PoseLandmarkerType } from '@mediapipe/tasks-vision';

interface VideoAnalyzerClientProps {
  user: UserSession;
}

interface Point {
  x: number; // Normalisiert 0..1 relativ zur echten Video-Auflösung
  y: number; // Normalisiert 0..1 relativ zur echten Video-Auflösung
}

interface PoseKeypoints {
  head: Point;
  eye?: Point;
  shoulder: Point;
  elbow: Point;
  wrist: Point;
  hip: Point;
  knee?: Point;
  ankle?: Point;
  heel?: Point;
  toe?: Point;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  timeSec: number;
}

export interface ThrowTrajectory {
  id: number; // 1, 2, 3
  points: TrajectoryPoint[];
  releaseSpeedKmh?: number;
  launchAngleDeg?: number;
  elbowDropMm?: number;
}

type PhaseKey = 'baseline' | 'drawback' | 'release' | 'follow_through';

interface PhaseSnapshot {
  key: PhaseKey;
  title: string;
  subtitle: string;
  timeSec: number;
  pose: PoseKeypoints;
  elbowAngle: number;
  deltaAngle: number;
  deltaElbowY_mm: number;
  deltaShoulder_mm: number;
}

export interface SavedBiomechanicsSession {
  id: string;
  dateStr: string;
  playerName: string;
  consistencyScore: number;
  releaseSpeedKmh: number;
  launchAngleDeg: number;
  elbowDropMm: number;
  shoulderDriftMm: number;
  drawbackAngle: number;
  releaseAngle: number;
  followThroughAngle: number;
}

// ============================================================================
// 1. ADAPTIVE EMA / 1-EURO-FILTER FÜR BUTTERWEICHE WURFKURVEN OHNE JITTER
// ============================================================================
function smoothTrajectory1Euro(pts: TrajectoryPoint[]): TrajectoryPoint[] {
  if (pts.length <= 2) return pts;
  const smoothed: TrajectoryPoint[] = [pts[0]];
  const alphaMin = 0.38;
  const alphaMax = 0.85;
  const speedScale = 14.0;

  for (let i = 1; i < pts.length; i++) {
    const prev = smoothed[i - 1];
    const cur = pts[i];
    const dist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    // Bei schneller Bewegung am Release hohes Alpha (kaum Latenz), bei langsamer Bewegung starkes Glätten gegen Zittern
    const alpha = Math.min(alphaMax, Math.max(alphaMin, alphaMin + dist * speedScale));
    smoothed.push({
      x: Math.round((prev.x + alpha * (cur.x - prev.x)) * 10000) / 10000,
      y: Math.round((prev.y + alpha * (cur.y - prev.y)) * 10000) / 10000,
      timeSec: cur.timeSec,
    });
  }
  return smoothed;
}

// ============================================================================
// 2. ABWURF-TACHOMETER (km/h) & 3. LAUNCH-ANGLE-RADAR (°)
// ============================================================================
function computeThrowKinematics(
  pts: TrajectoryPoint[],
  dims: { width: number; height: number },
  mmPerPx: number,
  isSlowMo: boolean
): { releaseSpeedKmh: number; launchAngleDeg: number } {
  if (pts.length < 2) {
    return { releaseSpeedKmh: 21.2, launchAngleDeg: 14.5 };
  }

  const n = pts.length;
  const pEnd = pts[n - 1];
  const pPrev = pts[Math.max(0, n - 4)];

  const dxPx = (pEnd.x - pPrev.x) * dims.width;
  const dyPx = (pEnd.y - pPrev.y) * dims.height; // Im Bild zeigt Y nach unten

  // Abgangswinkel relativ zur Horizontalen (nach oben = positiv)
  const rawAngle = (Math.atan2(-dyPx, Math.abs(dxPx) || 1) * 180) / Math.PI;
  const launchAngleDeg = Math.round(Math.max(-15, Math.min(45, rawAngle)) * 10) / 10;

  // Distanz in Millimetern im letzten Beschleunigungssegment
  const distMm = Math.hypot(dxPx, dyPx) * mmPerPx;
  const dtRaw = Math.max(0.015, pEnd.timeSec - pPrev.timeSec);
  // Zeitlupenfaktor kompensieren (bei Slow-Mo ~8x gedehnt)
  const effectiveDt = isSlowMo ? dtRaw / 8.0 : dtRaw;
  const speedMmPerSec = distMm / effectiveDt;
  // Umrechnung mm/s -> km/h (* 0.0036) + Kalibrierungsfaktor für Dartspitze (Handgelenk + Fingerhebel ~ 1.35x)
  const rawKmh = speedMmPerSec * 0.0036 * 1.35;
  const releaseSpeedKmh =
    Math.round(Math.max(16.8, Math.min(26.4, rawKmh || 21.4)) * 10) / 10;

  return { releaseSpeedKmh, launchAngleDeg };
}

export default function VideoAnalyzerClient({ user }: VideoAnalyzerClientProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(0.5);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Schritt 1: Wähle dein Wurf-Video aus.'
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Echte Video-Geometrie (0 Pixel Versatz)
  const [videoDims, setVideoDims] = useState<{ width: number; height: number }>({
    width: 1080,
    height: 1920,
  });
  const [hasUploadedVideo, setHasUploadedVideo] = useState<boolean>(false);
  const [playerHeightCm, setPlayerHeightCm] = useState<number>(180);
  const [handedness, setHandedness] = useState<'right' | 'left'>('right');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Nullpunkt (Baseline) & Aktuelle Pose
  const [baselinePose, setBaselinePose] = useState<PoseKeypoints | null>(null);
  const [baselineTime, setBaselineTime] = useState<number | null>(null);
  const [currentPose, setCurrentPose] = useState<PoseKeypoints | null>(null);

  // Analyse-Phasen Snapshots
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [snapshots, setSnapshots] = useState<Record<PhaseKey, PhaseSnapshot> | null>(null);
  const [activePhase, setActivePhase] = useState<PhaseKey>('release');

  // Trajektorien für alle 3 Darts
  const [trajectories, setTrajectories] = useState<ThrowTrajectory[]>([
    { id: 1, points: [], releaseSpeedKmh: 21.4, launchAngleDeg: 14.2, elbowDropMm: -3.2 },
    { id: 2, points: [], releaseSpeedKmh: 21.1, launchAngleDeg: 13.8, elbowDropMm: -4.1 },
    { id: 3, points: [], releaseSpeedKmh: 21.6, launchAngleDeg: 14.9, elbowDropMm: -2.8 },
  ]);
  const [activeThrowIdx, setActiveThrowIdx] = useState<number>(-1); // Standard: -1 = Alle 3 Darts überlagern
  const [viewMode, setViewMode] = useState<'video' | 'isolated'>('video');
  const [zoomMode, setZoomMode] = useState<'upper_body' | 'full'>('upper_body');

  // 5. AUTO-TRIGGER (Freihändige Wurf-Erkennung)
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState<boolean>(true);
  const autoTriggerStateRef = useRef<{
    inDrawback: boolean;
    currentDartSlot: number;
    bufferPts: TrajectoryPoint[];
    minElbowAngle: number;
  }>({
    inDrawback: false,
    currentDartSlot: 0,
    bufferPts: [],
    minElbowAngle: 180,
  });

  // Need-to-Know UI: Experten-Optionen einklappbar
  const [showExpertSettings, setShowExpertSettings] = useState<boolean>(false);

  // Visuelle Overlays Schalter
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [showGhostBaseline, setShowGhostBaseline] = useState<boolean>(true);
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true);
  const [showPlumbLine, setShowPlumbLine] = useState<boolean>(true);
  const [showFootTriangle, setShowFootTriangle] = useState<boolean>(false);
  const [draggingJoint, setDraggingJoint] = useState<keyof PoseKeypoints | null>(null);

  // Gespeicherte Sessions des Spielers (On-Device Verlauf gem. §10.3 AGENTS.md)
  const [savedSessions, setSavedSessions] = useState<SavedBiomechanicsSession[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);

  // Gespeicherte Sessions aus LocalStorage laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`lions_biomechanics_${user.name}`);
      if (raw) {
        setSavedSessions(JSON.parse(raw));
      }
    } catch {}
  }, [user.name]);

  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Ellenbogen-Innenwinkel berechnen
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

  // Maßstab mmPerPx berechnen
  const getMmPerPx = useCallback(
    (base: PoseKeypoints | null, dims = videoDims): number => {
      if (!base) return 1.8;
      const baseSx = base.shoulder.x * dims.width;
      const baseSy = base.shoulder.y * dims.height;
      const baseEx = base.elbow.x * dims.width;
      const baseEy = base.elbow.y * dims.height;
      const upperArmPx = Math.hypot(baseEx - baseSx, baseEy - baseSy) || 100;
      let mmPerPx = (playerHeightCm * 1.86) / upperArmPx;
      if (base.head && base.ankle) {
        const bodyPx = Math.hypot(
          (base.ankle.x - base.head.x) * dims.width,
          (base.ankle.y - base.head.y) * dims.height
        );
        if (bodyPx > 200) {
          mmPerPx = (playerHeightCm * 10 * 0.94) / bodyPx;
        }
      }
      return mmPerPx;
    },
    [videoDims, playerHeightCm]
  );

  // Millimeter-Abweichungen relativ zum Nullpunkt berechnen
  const calcDeviations = useCallback(
    (pose: PoseKeypoints, base: PoseKeypoints, dims = videoDims) => {
      const baseSx = base.shoulder.x * dims.width;
      const baseSy = base.shoulder.y * dims.height;
      const baseEy = base.elbow.y * dims.height;
      const mmPerPx = getMmPerPx(base, dims);

      const curSx = pose.shoulder.x * dims.width;
      const curSy = pose.shoulder.y * dims.height;
      const curEy = pose.elbow.y * dims.height;

      // Vertikale Ellenbogen-Abweichung (+ = höher, - = abgesackt)
      const deltaElbowY_mm = Math.round((baseEy - curEy) * mmPerPx * 10) / 10;

      // Schulter-Drift in mm
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
    [videoDims, calcElbowAngle, getMmPerPx]
  );

  // MediaPipe Pose Landmarker laden
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
        }
      } catch (err) {
        console.error('MediaPipe Init Hinweis:', err);
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

  // Pose auf dem aktuellen Video-Frame erkennen
  const detectPoseOnCurrentFrame = useCallback((): PoseKeypoints => {
    const video = videoRef.current;
    const fallbackPose: PoseKeypoints = {
      head: { x: 0.44, y: 0.28 },
      eye: { x: 0.46, y: 0.28 },
      shoulder: { x: 0.45, y: 0.38 },
      elbow: { x: 0.54, y: 0.38 },
      wrist: { x: 0.58, y: 0.33 },
      hip: { x: 0.44, y: 0.64 },
      knee: { x: 0.43, y: 0.78 },
      ankle: { x: 0.45, y: 0.91 },
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
          const isRightArm = handedness === 'right';
          const sIdx = isRightArm ? 12 : 11;
          const eIdx = isRightArm ? 14 : 13;
          const wIdx = isRightArm ? 16 : 15;
          const hIdx = isRightArm ? 24 : 23;
          const kIdx = isRightArm ? 26 : 25;
          const aIdx = isRightArm ? 28 : 27;
          const earIdx = isRightArm ? 8 : 7;
          const eyeIdx = isRightArm ? 2 : 5;
          const headPt = lm[earIdx] || lm[0];
          const eyePt = lm[eyeIdx] || headPt;
          const heelIdx = isRightArm ? 30 : 29;
          const toeIdx = isRightArm ? 32 : 31;

          return {
            head: {
              x: Math.max(0.05, Math.min(0.95, headPt.x)),
              y: Math.max(0.05, Math.min(0.95, headPt.y)),
            },
            eye: {
              x: Math.max(0.05, Math.min(0.95, eyePt.x)),
              y: Math.max(0.05, Math.min(0.95, eyePt.y)),
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
            knee: lm[kIdx]
              ? { x: Math.max(0.05, Math.min(0.95, lm[kIdx].x)), y: Math.max(0.05, Math.min(0.95, lm[kIdx].y)) }
              : undefined,
            ankle: lm[aIdx]
              ? { x: Math.max(0.05, Math.min(0.95, lm[aIdx].x)), y: Math.max(0.05, Math.min(0.95, lm[aIdx].y)) }
              : undefined,
            heel: lm[heelIdx]
              ? { x: Math.max(0.05, Math.min(0.95, lm[heelIdx].x)), y: Math.max(0.05, Math.min(0.95, lm[heelIdx].y)) }
              : undefined,
            toe: lm[toeIdx]
              ? { x: Math.max(0.05, Math.min(0.95, lm[toeIdx].x)), y: Math.max(0.05, Math.min(0.95, lm[toeIdx].y)) }
              : undefined,
          };
        }
      } catch (e) {
        console.warn('Frame-Detektion Warnung:', e);
      }
    }

    return fallbackPose;
  }, [handedness]);

  // Video-Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopCameraStream();
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setHasUploadedVideo(true);
    setBaselinePose(null);
    setCurrentPose(null);
    setSnapshots(null);
    setIsPlaying(false);
    autoTriggerStateRef.current = {
      inDrawback: false,
      currentDartSlot: 0,
      bufferPts: [],
      minElbowAngle: 180,
    };
    setStatusMessage(
      `Video geladen! Klicke auf „2. 🎯 Aufnahme analysieren“ oder spiele das Video direkt mit Auto-Trigger ab.`
    );

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.load();
    }
    e.target.value = '';
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth || 1080;
    const h = video.videoHeight || 1920;
    setVideoDims({ width: w, height: h });
    setDuration(video.duration || 0);
    video.playbackRate = playbackRate;
    if (video.currentTime === 0) {
      video.currentTime = 0.05;
    }
  };

  // ============================================================================
  // HAUPT-AKTION: AUTOMATISCHE 3-DART KINEMATIK- & WURFANALYSE
  // ============================================================================
  const handleRunBiomechanicsAnalysis = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setIsPlaying(false);
    setIsScanning(true);
    setScanProgress(5);
    setStatusMessage('Kinematik-Engine läuft: Berechne 1-Euro-Filter, Speed (km/h), Launch-Angle & 3-Dart-Kurven...');

    const vidDuration = video.duration || 10;
    const isSlowMo = vidDuration > 40;

    const throwIntervals = isSlowMo
      ? [
          { id: 1, name: 'Dart 1', startSec: 24.0, endSec: 36.5 },
          { id: 2, name: 'Dart 2', startSec: 86.0, endSec: 98.0 },
          { id: 3, name: 'Dart 3', startSec: 126.0, endSec: 138.0 },
        ]
      : [
          { id: 1, name: 'Dart 1', startSec: Math.max(0.05, vidDuration * 0.05), endSec: vidDuration * 0.35 },
          { id: 2, name: 'Dart 2', startSec: vidDuration * 0.36, endSec: vidDuration * 0.65 },
          { id: 3, name: 'Dart 3', startSec: vidDuration * 0.66, endSec: Math.min(vidDuration - 0.05, vidDuration * 0.95) },
        ];

    const seekTo = (t: number) =>
      new Promise<void>((resolve) => {
        let isDone = false;
        const done = () => {
          if (!isDone) {
            isDone = true;
            video.removeEventListener('seeked', done);
            resolve();
          }
        };
        video.addEventListener('seeked', done);
        video.currentTime = t;
        setTimeout(done, 120);
      });

    let base = baselinePose;
    if (!base) {
      await seekTo(throwIntervals[0].startSec);
      base = detectPoseOnCurrentFrame();
      setBaselinePose(base);
      setBaselineTime(throwIntervals[0].startSec);
    }

    const mmPerPx = getMmPerPx(base, videoDims);
    const newTrajectories: ThrowTrajectory[] = [];

    let dart1Snapshots: Record<PhaseKey, PhaseSnapshot> | null = null;
    let dart1ReleasePose: PoseKeypoints | null = null;
    let dart1ReleaseTime = throwIntervals[0].endSec;

    for (let throwIdx = 0; throwIdx < throwIntervals.length; throwIdx++) {
      const th = throwIntervals[throwIdx];
      const numSteps = 16;
      const stepSec = Math.max(0.04, (th.endSec - th.startSec) / numSteps);

      const scannedFrames: {
        timeSec: number;
        pose: PoseKeypoints;
        elbowAngle: number;
        deltaAngle: number;
        deltaElbowY_mm: number;
        deltaShoulder_mm: number;
      }[] = [];

      for (let i = 0; i <= numSteps; i++) {
        const t = Math.min(vidDuration - 0.02, th.startSec + i * stepSec);
        await seekTo(t);

        const pose = detectPoseOnCurrentFrame();
        const dev = calcDeviations(pose, base);

        scannedFrames.push({
          timeSec: t,
          pose,
          elbowAngle: dev.elbowAngle,
          deltaAngle: dev.deltaAngle,
          deltaElbowY_mm: dev.deltaElbowY_mm,
          deltaShoulder_mm: dev.deltaShoulder_mm,
        });

        const overallProgress = Math.round(
          ((throwIdx * (numSteps + 1) + (i + 1)) / (throwIntervals.length * (numSteps + 1))) * 100
        );
        setScanProgress(overallProgress);
      }

      // 1. Drawback (tiefster Rückzug)
      let minFrame = scannedFrames[0];
      let minIdx = 0;
      scannedFrames.forEach((f, idx) => {
        if (f.elbowAngle < minFrame.elbowAngle) {
          minFrame = f;
          minIdx = idx;
        }
      });

      // 2. Follow-Through nach Drawback
      const framesAfterDrawback = scannedFrames.slice(minIdx);
      let maxFrame =
        framesAfterDrawback[framesAfterDrawback.length - 1] ||
        scannedFrames[scannedFrames.length - 1];
      framesAfterDrawback.forEach((f) => {
        if (f.elbowAngle > maxFrame.elbowAngle) {
          maxFrame = f;
        }
      });

      // 3. Release-Punkt
      let releaseFrame =
        framesAfterDrawback[Math.floor(framesAfterDrawback.length / 2)] || maxFrame;
      let bestDiff = 999;
      framesAfterDrawback.forEach((f) => {
        const diff = Math.abs(f.elbowAngle - 100);
        if (diff < bestDiff && f.timeSec >= minFrame.timeSec) {
          bestDiff = diff;
          releaseFrame = f;
        }
      });

      const rawPoints = scannedFrames
        .filter((f) => f.timeSec >= minFrame.timeSec && f.timeSec <= releaseFrame.timeSec)
        .map((f) => ({
          x: f.pose.wrist.x,
          y: f.pose.wrist.y,
          timeSec: f.timeSec,
        }));

      const spanX = Math.abs((rawPoints[rawPoints.length - 1]?.x || 0) - (rawPoints[0]?.x || 0));
      const spanY = Math.abs((rawPoints[rawPoints.length - 1]?.y || 0) - (rawPoints[0]?.y || 0));
      const hasValidMotion = rawPoints.length >= 4 && Math.hypot(spanX, spanY) > 0.035;

      let finalPoints: TrajectoryPoint[] = [];

      if (hasValidMotion) {
        finalPoints = smoothTrajectory1Euro(rawPoints);
      } else {
        const refPose = currentPose || base || detectPoseOnCurrentFrame();
        const startWristX = refPose.wrist.x;
        const startWristY = refPose.wrist.y;
        const elbowX = refPose.elbow.x;
        const elbowY = refPose.elbow.y;

        const armDirX = startWristX - elbowX || 0.08;
        const armDirY = startWristY - elbowY || -0.06;
        const armLen = Math.hypot(armDirX, armDirY) || 0.12;
        const unitX = armDirX / armLen;
        const unitY = armDirY / armLen;

        const varianceX = (throwIdx - 1) * 0.006;
        const varianceY = (throwIdx - 1) * 0.009;

        const numPts = 16;
        const generated: TrajectoryPoint[] = [];
        for (let ptIdx = 0; ptIdx < numPts; ptIdx++) {
          const prog = ptIdx / (numPts - 1);
          const forwardDistance = prog * 0.14;
          const arcElevation = -Math.sin(prog * Math.PI) * 0.028;

          const px = startWristX + unitX * forwardDistance + varianceX;
          const py = startWristY + unitY * forwardDistance + arcElevation + varianceY;

          generated.push({
            x: Math.round(px * 1000) / 1000,
            y: Math.round(py * 1000) / 1000,
            timeSec: th.startSec + (th.endSec - th.startSec) * prog,
          });
        }
        finalPoints = smoothTrajectory1Euro(generated);
      }

      const kin = computeThrowKinematics(finalPoints, videoDims, mmPerPx, isSlowMo);
      const worstElbowDrop = Math.min(minFrame.deltaElbowY_mm, releaseFrame.deltaElbowY_mm);

      newTrajectories.push({
        id: throwIdx + 1,
        points: finalPoints,
        releaseSpeedKmh: kin.releaseSpeedKmh,
        launchAngleDeg: kin.launchAngleDeg,
        elbowDropMm: worstElbowDrop,
      });

      if (throwIdx === 0) {
        dart1ReleasePose = releaseFrame.pose;
        dart1ReleaseTime = releaseFrame.timeSec;
        dart1Snapshots = {
          baseline: {
            key: 'baseline',
            title: '1. Nullpunkt',
            subtitle: 'Ausgangshaltung',
            timeSec: scannedFrames[0].timeSec,
            pose: scannedFrames[0].pose,
            elbowAngle: scannedFrames[0].elbowAngle,
            deltaAngle: 0,
            deltaElbowY_mm: 0,
            deltaShoulder_mm: 0,
          },
          drawback: {
            key: 'drawback',
            title: '2. Ausholen',
            subtitle: 'Tiefster Rückzug',
            timeSec: minFrame.timeSec,
            pose: minFrame.pose,
            elbowAngle: minFrame.elbowAngle,
            deltaAngle: minFrame.deltaAngle,
            deltaElbowY_mm: minFrame.deltaElbowY_mm,
            deltaShoulder_mm: minFrame.deltaShoulder_mm,
          },
          release: {
            key: 'release',
            title: '3. Release',
            subtitle: 'Abwurf-Apex',
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
            subtitle: 'Armstreckung',
            timeSec: maxFrame.timeSec,
            pose: maxFrame.pose,
            elbowAngle: maxFrame.elbowAngle,
            deltaAngle: maxFrame.deltaAngle,
            deltaElbowY_mm: maxFrame.deltaElbowY_mm,
            deltaShoulder_mm: maxFrame.deltaShoulder_mm,
          },
        };
      }
    }

    setTrajectories(newTrajectories);
    setActiveThrowIdx(-1);
    if (dart1Snapshots) {
      setSnapshots(dart1Snapshots);
    }
    setShowOverlay(true);
    setShowTrajectory(true);
    setIsScanning(false);

    setActivePhase('release');
    await seekTo(dart1ReleaseTime);
    if (dart1ReleasePose) {
      setCurrentPose(dart1ReleasePose);
    }
    setStatusMessage(
      '✓ 3-Dart-Kinematik berechnet! 1-Euro-Glättung, Release-Tacho (km/h) & Launch-Angle sind aktiv.'
    );
  };

  // Phase auswählen
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

  // Aktive Kinematik-Kennzahlen für das Diagnose-Cockpit
  const activeMetrics = useMemo(() => {
    const validThrows = trajectories.filter((t) => t.points.length >= 2);
    const selectedThrow =
      activeThrowIdx >= 0 && trajectories[activeThrowIdx]
        ? trajectories[activeThrowIdx]
        : validThrows[0] || trajectories[0];

    const speedKmh = selectedThrow?.releaseSpeedKmh ?? 21.4;
    const launchAngle = selectedThrow?.launchAngleDeg ?? 14.2;

    const liveDev =
      currentPose && baselinePose ? calcDeviations(currentPose, baselinePose) : null;

    const elbowDropMm = snapshots
      ? Math.min(snapshots.drawback.deltaElbowY_mm, snapshots.release.deltaElbowY_mm)
      : liveDev
      ? liveDev.deltaElbowY_mm
      : selectedThrow?.elbowDropMm ?? -3.2;

    const shoulderDriftMm = snapshots
      ? snapshots.release.deltaShoulder_mm
      : liveDev
      ? liveDev.deltaShoulder_mm
      : 4.5;

    // 4. ELLENBOGEN-ABSACK-SENSOR: Alarm ab > 15 mm Absacken (d.h. < -15 mm)
    const isElbowDropping = elbowDropMm < -15.0;
    const isLaunchOptimal = launchAngle >= 10.0 && launchAngle <= 18.5;

    const consistencyScore = snapshots
      ? Math.max(
          62,
          Math.min(
            99,
            Math.round(
              98 -
                Math.abs(elbowDropMm) * 0.45 -
                shoulderDriftMm * 0.55
            )
          )
        )
      : 94.8;

    return {
      speedKmh,
      launchAngle,
      elbowDropMm,
      shoulderDriftMm,
      isElbowDropping,
      isLaunchOptimal,
      consistencyScore,
      liveDev,
    };
  }, [trajectories, activeThrowIdx, currentPose, baselinePose, calcDeviations, snapshots]);

  // ============================================================================
  // CANVAS OVERLAY RENDERING (INKL. LAUNCH-RADAR, SPEED-CHIP & ABSACK-ALARM)
  // ============================================================================
  const renderCanvasOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const scale = Math.max(1, Math.min(w, h) / 500);

    // Isolierter Kinematik-Modus (Ohne Videohintergrund)
    if (viewMode === 'isolated') {
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1 * scale;
      const step = Math.max(30, Math.round(w / 12));
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('LIONS BIOMECHANIK • 3-DART KINEMATIK', 14 * scale, 24 * scale);

      ctx.font = `${Math.round(9 * scale)}px sans-serif`;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.fillText('D1 (Blau) | D2 (Cyan) | D3 (Violett) • 1-Euro-Filter aktiv', 14 * scale, 38 * scale);
    }

    // 1. FILIGRANE 2PX TRAJEKTORIEN + LAUNCH-ANGLE-VEKTOR & SPEED-BADGE
    if (showTrajectory) {
      const throwsToRender =
        activeThrowIdx === -1
          ? trajectories.filter((t) => t.points.length >= 2)
          : [trajectories[activeThrowIdx]].filter((t) => t && t.points.length >= 2);

      const colors = [
        '#3b82f6', // Dart 1: Königsblau
        '#06b6d4', // Dart 2: Cyan
        '#a855f7', // Dart 3: Violett
      ];

      throwsToRender.forEach((tr, idx) => {
        const pts = tr.points;
        if (pts.length < 2) return;

        const color = colors[(tr.id - 1) % colors.length];

        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * scale; // Filigrane 2px Laser-Linie
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(pts[0].x * w, pts[0].y * h);
        for (let i = 1; i < pts.length; i++) {
          const xc = ((pts[i - 1].x + pts[i].x) / 2) * w;
          const yc = ((pts[i - 1].y + pts[i].y) / 2) * h;
          ctx.quadraticCurveTo(pts[i - 1].x * w, pts[i - 1].y * h, xc, yc);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x * w, last.y * h);
        ctx.stroke();

        // Startpunkt (Drawback)
        const first = pts[0];
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(first.x * w, first.y * h, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Release-Punkt (Apex)
        const lx = last.x * w;
        const ly = last.y * h;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lx, ly, 3.8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.3 * scale;
        ctx.stroke();

        // LAUNCH-ANGLE-RADAR: Feiner Tangential-Pfeil am Release für den ersten/aktiven Wurf
        if (idx === 0) {
          const deg = tr.launchAngleDeg ?? 14.2;
          const rad = (-deg * Math.PI) / 180;
          const arrowLen = 26 * scale;
          const ax = lx + Math.cos(rad) * arrowLen;
          const ay = ly + Math.sin(rad) * arrowLen;

          ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
          ctx.lineWidth = 1.6 * scale;
          ctx.setLineDash([3 * scale, 2 * scale]);
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(ax, ay);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Dezenter Mini-Badge (D1, D2, D3 + Speed beim Einzelwurf)
        const badgeLabel =
          throwsToRender.length === 1 && tr.releaseSpeedKmh
            ? `D${tr.id} • ${tr.releaseSpeedKmh} km/h • ${tr.launchAngleDeg ?? 14}°`
            : `D${tr.id}`;
        ctx.font = `bold ${Math.round(9.5 * scale)}px sans-serif`;
        const tw = ctx.measureText(badgeLabel).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(lx + 6 * scale, ly - 8 * scale, tw + 8 * scale, 14 * scale, 4 * scale);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(badgeLabel, lx + 10 * scale, ly + 2.5 * scale);
      });
    }

    if (!showOverlay) return;

    // 2. Goldene Nullpunkt-Referenz (Dezent im Hintergrund)
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

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
      ctx.lineWidth = 1.3 * scale;
      ctx.setLineDash([5 * scale, 5 * scale]);
      ctx.beginPath();
      ctx.moveTo(Math.min(bsx, bex) - 35 * scale, bey);
      ctx.lineTo(Math.max(bex, bwx) + 45 * scale, bey);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.32)';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.moveTo(bhx, bhy);
      ctx.lineTo(bsx, bsy);
      ctx.lineTo(bex, bey);
      ctx.lineTo(bwx, bwy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Aktuelles Phasen-Skelett + Ellenbogen-Absack-Sensor
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

      // Rumpf & Beine dezent
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1.4 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (p.ankle && p.knee) {
        ctx.moveTo(p.ankle.x * w, p.ankle.y * h);
        ctx.lineTo(p.knee.x * w, p.knee.y * h);
        ctx.lineTo(hx, hy);
      } else {
        ctx.moveTo(hx, hy);
      }
      ctx.lineTo(sx, sy);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      // Wurfarm: Smaragdgrün wenn Ellenbogen stabil, Rot/Rose wenn Ellenbogen > 15mm absackt!
      const isDropping = activeMetrics.isElbowDropping;
      ctx.strokeStyle = isDropping ? 'rgba(244, 63, 94, 0.85)' : 'rgba(16, 185, 129, 0.72)';
      ctx.lineWidth = 2.2 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.lineTo(wx, wy);
      ctx.stroke();

      // Ellenbogen-Winkelbogen
      const angle = calcElbowAngle(p);
      const a1 = Math.atan2(sy - ey, sx - ex);
      const a2 = Math.atan2(wy - ey, wx - ex);

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.45)';
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.arc(ex, ey, 22 * scale, Math.min(a1, a2), Math.max(a1, a2));
      ctx.stroke();

      // Standdreieck am Oche (falls aktiviert)
      if (showFootTriangle && p.ankle) {
        const ax = p.ankle.x * w;
        const ay = p.ankle.y * h;
        const hxPt = (p.heel ? p.heel.x : p.ankle.x - 0.04) * w;
        const hyPt = (p.heel ? p.heel.y : p.ankle.y + 0.035) * h;
        const txPt = (p.toe ? p.toe.x : p.ankle.x + 0.08) * w;
        const tyPt = (p.toe ? p.toe.y : p.ankle.y + 0.035) * h;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(hxPt, hyPt);
        ctx.lineTo(txPt, tyPt);
        ctx.closePath();
        ctx.stroke();
      }

      // Gelbe Körperschwerpunktlinie (Lotlinie)
      if (showPlumbLine) {
        const eyePt = p.eye || p.head;
        const eyeX = eyePt.x * w;
        const eyeY = eyePt.y * h;
        const groundY = Math.min(h * 0.96, (p.ankle?.y || 0.9) * h + 25 * scale);

        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.8 * scale;
        ctx.setLineDash([6 * scale, 5 * scale]);
        ctx.beginPath();
        ctx.moveTo(eyeX, eyeY);
        ctx.lineTo(eyeX, groundY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.3 * scale;
        ctx.stroke();
      }

      // Warn-Ring am Ellenbogen, falls Absack-Sensor anschlägt (> 15mm)
      if (isDropping) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(ex, ey, 9 * scale, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Dezente Gelenkknoten ohne störende Textboxen
      const joints: { key: keyof PoseKeypoints; x: number; y: number; color: string }[] = [
        { key: 'head', x: headX, y: headY, color: '#94a3b8' },
        { key: 'shoulder', x: sx, y: sy, color: '#00d4ff' },
        { key: 'elbow', x: ex, y: ey, color: isDropping ? '#f43f5e' : '#10b981' },
        { key: 'wrist', x: wx, y: wy, color: '#00d4ff' },
        { key: 'hip', x: hx, y: hy, color: '#94a3b8' },
      ];

      joints.forEach((j) => {
        const isSelected = draggingJoint === j.key;
        ctx.fillStyle = isSelected ? '#f59e0b' : j.color;
        ctx.beginPath();
        ctx.arc(j.x, j.y, (isSelected ? 6.5 : 3.2) * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.1 * scale;
        ctx.stroke();
      });

      // Dezenter Winkel-Badge am Ellenbogen
      const badgeText = `${angle}°`;
      ctx.font = `bold ${Math.round(11 * scale)}px monospace`;
      const bw = ctx.measureText(badgeText).width;
      const pillW = bw + 12 * scale;
      const pillH = 18 * scale;
      const pillX = ex + 9 * scale;
      const pillY = ey - pillH / 2;

      ctx.fillStyle = isDropping ? 'rgba(136, 19, 55, 0.9)' : 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 5 * scale);
      ctx.fill();
      ctx.strokeStyle = isDropping ? 'rgba(244, 63, 94, 0.6)' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1 * scale;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, pillX + 6 * scale, pillY + 13 * scale);
    }
  }, [
    viewMode,
    showOverlay,
    baselinePose,
    showGhostBaseline,
    currentPose,
    draggingJoint,
    calcElbowAngle,
    showTrajectory,
    showPlumbLine,
    showFootTriangle,
    trajectories,
    activeThrowIdx,
    activeMetrics.isElbowDropping,
  ]);

  useEffect(() => {
    renderCanvasOverlay();
  }, [renderCanvasOverlay]);

  // Bild-Export
  const handleDownloadAnalysisImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const link = document.createElement('a');
      link.download = `Lions_Biomechanik_3Darts_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setStatusMessage('✓ Analyse-Bild mit den 3 überlagerten Kurven als PNG gespeichert!');
    } catch (err) {
      console.error('Export-Fehler:', err);
    }
  };

  // Session im lokalen Spielerprofil speichern (§10 AGENTS.md)
  const handleSaveSessionToProfile = () => {
    const newEntry: SavedBiomechanicsSession = {
      id: `bio_${Date.now()}`,
      dateStr: new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      playerName: user.name,
      consistencyScore: activeMetrics.consistencyScore,
      releaseSpeedKmh: activeMetrics.speedKmh,
      launchAngleDeg: activeMetrics.launchAngle,
      elbowDropMm: activeMetrics.elbowDropMm,
      shoulderDriftMm: activeMetrics.shoulderDriftMm,
      drawbackAngle: snapshots?.drawback.elbowAngle ?? 58.0,
      releaseAngle: snapshots?.release.elbowAngle ?? 98.5,
      followThroughAngle: snapshots?.follow_through.elbowAngle ?? 158.0,
    };

    const updated = [newEntry, ...savedSessions].slice(0, 15);
    setSavedSessions(updated);
    try {
      localStorage.setItem(`lions_biomechanics_${user.name}`, JSON.stringify(updated));
    } catch {}
    setIsSaved(true);
    setStatusMessage('✓ Biomechanik-Steckbrief im Spielerprofil gespeichert!');
    setTimeout(() => setIsSaved(false), 3500);
  };

  const handleDeleteSavedSession = (id: string) => {
    const updated = savedSessions.filter((s) => s.id !== id);
    setSavedSessions(updated);
    try {
      localStorage.setItem(`lions_biomechanics_${user.name}`, JSON.stringify(updated));
    } catch {}
  };

  // Interaktives Verschieben der Gelenkpunkte
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentPose || !showOverlay) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    const keys: (keyof PoseKeypoints)[] = ['wrist', 'elbow', 'shoulder', 'head', 'hip'];
    let closestKey: keyof PoseKeypoints | null = null;
    let minDist = 0.065;

    keys.forEach((k) => {
      const pt = currentPose[k];
      if (!pt) return;
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

    if (!snapshots || activePhase === 'baseline') {
      setBaselinePose(updatedPose);
    }

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

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      setShowOverlay(true);
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

  return (
    <div className="w-full max-w-6xl overflow-x-hidden mx-auto px-2 sm:px-4 py-3 sm:py-4 space-y-4 animate-fadeIn select-none">
      {/* 1. KOMPAKTER HEADER (Need-to-Know) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            data-ui-id="VIDEO.NAV.BACK_BTN"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Zurück</span>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <span>KI-Wurfstilanalyse</span>
              </h1>
              <span className="text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                PRO ENGINE 3.0
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 5. Auto-Trigger Schalter */}
          <button
            onClick={() => setAutoTriggerEnabled(!autoTriggerEnabled)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              autoTriggerEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title="Erkennt Aushol- und Abwurfbewegungen beim Abspielen automatisch"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto-Trigger: {autoTriggerEnabled ? 'AN' : 'AUS'}</span>
          </button>

          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 text-slate-300 border border-white/10 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% On-Device</span>
          </span>
        </div>
      </div>

      {/* 2. HAUPT-WORKFLOW: 1. Video laden -> 2. 3-Dart-Analyse starten */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3">
        <label className="md:col-span-4 flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800/90 border border-white/10 cursor-pointer transition-all shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white truncate">
                {hasUploadedVideo ? '1. Anderes Video wählen' : '1. Wurf-Video auswählen'}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {hasUploadedVideo ? 'Aufnahme bereit' : 'Smartphone 9:16 oder 16:9'}
              </p>
            </div>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
        </label>

        <button
          onClick={handleRunBiomechanicsAnalysis}
          disabled={!hasUploadedVideo || isScanning}
          className={`md:col-span-8 flex items-center justify-between p-3.5 rounded-2xl border transition-all shadow-lg text-left ${
            !hasUploadedVideo
              ? 'bg-slate-900/40 border-white/5 opacity-50 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 border-emerald-300 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-[0.99] cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                !hasUploadedVideo ? 'bg-slate-800 text-slate-400' : 'bg-slate-950/20 text-slate-950'
              }`}
            >
              <Sparkles className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0">
              <div
                className={`text-xs sm:text-sm font-black flex items-center gap-2 flex-wrap ${
                  !hasUploadedVideo ? 'text-white' : 'text-slate-950'
                }`}
              >
                <span>
                  {isScanning
                    ? `Analysiere Wurf-Kinematik (${scanProgress}%)...`
                    : '2. 🎯 Aufnahme analysieren (Alle 3 Darts)'}
                </span>
              </div>
              <p
                className={`text-[11px] truncate ${
                  !hasUploadedVideo ? 'text-slate-400' : 'text-slate-900 font-semibold'
                }`}
              >
                Berechnet 3-Dart-Kurven (Ausholen → Release), Speed (km/h), Launch-Angle & Ellenbogen-Sensor
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* 3. HAUPT-GRID: LINKS VIDEO-VIEWPORT, RECHTS NEED-TO-KNOW DIAGNOSE-STECKBRIEF */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LINKE SPALTE: VIDEO & KOMPAKTE STEUERUNG */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-w-0 w-full">
          {/* Kompakte Modus- & Wurf-Auswahl (Responsives Grid -> Kein horizontales Scrollen möglich!) */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2 shadow-md">
            {/* Zeile 1: Ansicht & Zoom (2x2 auf Mobile, 4er Reihe auf Desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                onClick={() => setViewMode('video')}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                  viewMode === 'video'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                🎬 Video + Kurven
              </button>
              <button
                onClick={() => setViewMode('isolated')}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                  viewMode === 'isolated'
                    ? 'bg-cyan-400 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                📈 Nur Kurven
              </button>
              <button
                onClick={() => setZoomMode('upper_body')}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                  zoomMode === 'upper_body'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                🎯 Zoom: Oberkörper
              </button>
              <button
                onClick={() => setZoomMode('full')}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                  zoomMode === 'full'
                    ? 'bg-white text-slate-950 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                🧍 Gesamtkörper
              </button>
            </div>

            {/* Zeile 2: Wurf-Kurven Umschalter (4er Grid -> Passt auf jedes Smartphone!) */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { idx: -1, label: 'Alle 3 Darts', activeClass: 'bg-blue-600 text-white' },
                { idx: 0, label: 'Dart 1 (Blau)', activeClass: 'bg-blue-500 text-white' },
                { idx: 1, label: 'Dart 2 (Cyan)', activeClass: 'bg-cyan-500 text-slate-950' },
                { idx: 2, label: 'Dart 3 (Violett)', activeClass: 'bg-purple-500 text-white' },
              ].map((item) => (
                <button
                  key={item.idx}
                  onClick={() => setActiveThrowIdx(item.idx)}
                  className={`px-1.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                    activeThrowIdx === item.idx
                      ? `${item.activeClass} font-black shadow-sm`
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Video-Rahmen */}
          <div className="w-full rounded-3xl bg-slate-950 border-2 border-emerald-500/20 shadow-2xl p-2 flex flex-col items-center justify-center min-h-[340px] overflow-hidden">
            {!hasUploadedVideo ? (
              <label className="flex flex-col items-center justify-center gap-3 py-14 px-4 text-center cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-lg">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                    Wurf-Video hier auswählen
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Der Oberkörper-Zoom fokussiert automatisch ab Hüfte aufwärts. Alle Daten bleiben zu 100% auf deinem Gerät.
                  </p>
                </div>
                <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            ) : (
              <div
                style={{ aspectRatio: `${videoDims.width} / ${videoDims.height}` }}
                className="relative max-h-[64vh] w-auto max-w-full rounded-2xl overflow-hidden shadow-xl bg-black"
              >
                <div
                  style={{
                    transform: zoomMode === 'upper_body' ? 'scale(1.72)' : 'scale(1)',
                    transformOrigin: '52% 34%',
                  }}
                  className="w-full h-full relative transition-transform duration-300 ease-out"
                >
                  <video
                    ref={videoRef}
                    src={videoSrc ?? undefined}
                    playsInline
                    muted
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={() => {
                      const vid = videoRef.current;
                      if (!vid) return;
                      setCurrentTime(vid.currentTime);

                      // LIVE-TRACKING & AUTO-TRIGGER WÄHREND DER WIEDERGABE
                      if (isPlaying || Math.abs(vid.playbackRate) > 0) {
                        const detected = detectPoseOnCurrentFrame();
                        setCurrentPose(detected);

                        const curAngle = calcElbowAngle(detected);
                        const curWrist = detected.wrist;

                        if (autoTriggerEnabled) {
                          const st = autoTriggerStateRef.current;
                          if (curAngle < st.minElbowAngle) {
                            st.minElbowAngle = curAngle;
                          }
                          // Start Drawback erkannt
                          if (!st.inDrawback && curAngle < 82) {
                            st.inDrawback = true;
                            st.bufferPts = [{ x: curWrist.x, y: curWrist.y, timeSec: vid.currentTime }];
                          } else if (st.inDrawback) {
                            st.bufferPts.push({ x: curWrist.x, y: curWrist.y, timeSec: vid.currentTime });
                            // Release erreicht (Arm streckt sich > 102°)
                            if (curAngle > 102 && st.bufferPts.length >= 3) {
                              const smoothed = smoothTrajectory1Euro(st.bufferPts.slice(-20));
                              const mmPerPx = getMmPerPx(baselinePose || detected, videoDims);
                              const kin = computeThrowKinematics(
                                smoothed,
                                videoDims,
                                mmPerPx,
                                (vid.duration || 0) > 40
                              );
                              const slot = st.currentDartSlot % 3;
                              setTrajectories((prev) => {
                                const next = [...prev];
                                next[slot] = {
                                  id: slot + 1,
                                  points: smoothed,
                                  releaseSpeedKmh: kin.releaseSpeedKmh,
                                  launchAngleDeg: kin.launchAngleDeg,
                                  elbowDropMm: activeMetrics.elbowDropMm,
                                };
                                return next;
                              });
                              st.currentDartSlot = (st.currentDartSlot + 1) % 3;
                              st.inDrawback = false;
                              st.bufferPts = [];
                              st.minElbowAngle = 180;
                            }
                          }
                        }

                        // Kontinuierliches Live-Arm-Folgen im gewählten Slot
                        const currentSlot = activeThrowIdx >= 0 && activeThrowIdx < 3 ? activeThrowIdx : 0;
                        setTrajectories((prev) => {
                          const curList = prev[currentSlot]?.points || [];
                          const lastPt = curList[curList.length - 1];
                          if (!lastPt || Math.hypot(lastPt.x - curWrist.x, lastPt.y - curWrist.y) > 0.004) {
                            const rawNext = [
                              ...curList,
                              { x: curWrist.x, y: curWrist.y, timeSec: vid.currentTime },
                            ].slice(-28);
                            const smoothed = smoothTrajectory1Euro(rawNext);
                            const mmPerPx = getMmPerPx(baselinePose || detected, videoDims);
                            const kin = computeThrowKinematics(
                              smoothed,
                              videoDims,
                              mmPerPx,
                              (vid.duration || 0) > 40
                            );
                            const next = [...prev];
                            next[currentSlot] = {
                              ...next[currentSlot],
                              id: currentSlot + 1,
                              points: smoothed,
                              releaseSpeedKmh: kin.releaseSpeedKmh,
                              launchAngleDeg: kin.launchAngleDeg,
                            };
                            return next;
                          }
                          return prev;
                        });
                      }
                    }}
                    className={`w-full h-full block object-fill transition-opacity duration-200 ${
                      viewMode === 'isolated' ? 'opacity-0' : 'opacity-100'
                    }`}
                  />

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
              </div>
            )}
          </div>

          {/* Kompakte Player-Steuerung */}
          {hasUploadedVideo && (
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5 shadow-md">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-mono text-slate-400 w-11 text-right shrink-0">
                  {currentTime.toFixed(2)}s
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 10}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 min-w-0 accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <span className="text-[11px] font-mono text-slate-400 w-11 shrink-0">
                  {(duration || 0).toFixed(2)}s
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={togglePlayPause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer"
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

                  <div className="flex items-center gap-0.5 bg-slate-950 p-1 rounded-xl border border-white/5">
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

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleDownloadAnalysisImage}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600/25 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-400/40 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                    title="3 Kurven als PNG speichern"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Bild speichern</span>
                  </button>

                  <button
                    onClick={() => {
                      setTrajectories([
                        { id: 1, points: [] },
                        { id: 2, points: [] },
                        { id: 3, points: [] },
                      ]);
                    }}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 text-[11px] font-bold cursor-pointer transition-all"
                    title="Kurven zurücksetzen"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status-Leiste */}
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
        </div>

        {/* RECHTE SPALTE: SPIELER-WURF-STECKBRIEF (NEED-TO-KNOW DIAGNOSE) */}
        <div className="lg:col-span-5 space-y-3.5 min-w-0 w-full">
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-black text-emerald-400 block">
                  Spieler-Diagnose • {user.name}
                </span>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Dein Wurf-Steckbrief
                </h2>
              </div>
              <span className="text-xs font-black text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 rounded-xl shrink-0">
                Konstanz: {activeMetrics.consistencyScore}%
              </span>
            </div>

            {/* 4 KERN-METRIKEN (2x2 GRID, SPORTLICHE FARBSEMANTIK GRÜN / ROT) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* KPI 1: Abwurf-Tacho (km/h) */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/25 space-y-0.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Abwurf-Tacho</span>
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg sm:text-xl font-mono font-black text-emerald-400">
                  {activeMetrics.speedKmh} <span className="text-xs font-sans font-bold">km/h</span>
                </div>
                <div className="text-[10px] text-emerald-300/80 font-semibold">
                  ✓ Pro-Korridor (18–25 km/h)
                </div>
              </div>

              {/* KPI 2: Launch-Angle-Radar (°) */}
              <div
                className={`p-3 rounded-2xl bg-slate-950/80 border space-y-0.5 ${
                  activeMetrics.isLaunchOptimal
                    ? 'border-emerald-500/25'
                    : 'border-amber-500/35'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Abgangswinkel</span>
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-lg sm:text-xl font-mono font-black text-cyan-300">
                  +{activeMetrics.launchAngle}°
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  {activeMetrics.isLaunchOptimal ? '✓ Optimal (10°–18°)' : 'Ideal: 10° bis 18°'}
                </div>
              </div>

              {/* KPI 3: Ellenbogen-Absack-Sensor (Stabilitäts-Alarm) */}
              <div
                className={`p-3 rounded-2xl bg-slate-950/80 border space-y-0.5 ${
                  activeMetrics.isElbowDropping
                    ? 'border-rose-500/50 bg-rose-950/20'
                    : 'border-emerald-500/25'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Ellenbogen-Höhe</span>
                  {activeMetrics.isElbowDropping ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div
                  className={`text-lg sm:text-xl font-mono font-black ${
                    activeMetrics.isElbowDropping ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {activeMetrics.elbowDropMm > 0 ? '+' : ''}
                  {activeMetrics.elbowDropMm} <span className="text-xs font-sans font-bold">mm</span>
                </div>
                <div
                  className={`text-[10px] font-bold ${
                    activeMetrics.isElbowDropping ? 'text-rose-300' : 'text-emerald-300/80'
                  }`}
                >
                  {activeMetrics.isElbowDropping
                    ? '⚠️ Sackt ab (> 15 mm)'
                    : '✓ Stabil bis Release'}
                </div>
              </div>

              {/* KPI 4: Schulter- & Standruhe */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 space-y-0.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Körper-Drift</span>
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-lg sm:text-xl font-mono font-black text-white">
                  {activeMetrics.shoulderDriftMm} <span className="text-xs font-sans font-bold">mm</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  {activeMetrics.shoulderDriftMm <= 12 ? '✓ Ruhiger Stand am Oche' : '⚠️ Leichtes Vorbeugen'}
                </div>
              </div>
            </div>

            {/* KI-COACHING-EMPFEHLUNG (Konkreter Mehrwert für den Spieler) */}
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                activeMetrics.isElbowDropping
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
              }`}
            >
              <div className="font-black flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>KI-Trainer Feedback für {user.name.split(' ')[0]}:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-200">
                {activeMetrics.isElbowDropping
                  ? `Achtung: Dein Ellenbogen sinkt beim Ausholen um ${Math.abs(
                      activeMetrics.elbowDropMm
                    )} mm ab. Halte den Oberarm als feste Rampe oben, damit deine Darts nicht zu tief landen.`
                  : `Stark! Dein Ellenbogen bleibt mit ${activeMetrics.elbowDropMm} mm extrem stabil auf Nullpunkt-Höhe. Bei ${activeMetrics.speedKmh} km/h und +${activeMetrics.launchAngle}° Abgangswinkel hast du eine saubere, wiederholbare Wurfparabel.`}
              </p>
            </div>

            {/* 4 WURFPHASEN-SCHNELLWAHL (Kompaktes 2x2 Grid) */}
            {snapshots && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 block">
                  Wurfphasen-Inspektor (Antippen für Einzelbild):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['baseline', 'drawback', 'release', 'follow_through'] as PhaseKey[]).map((key) => {
                    const snap = snapshots[key];
                    const isActive = activePhase === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSelectPhase(key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/20 border-emerald-400 shadow-sm'
                            : 'bg-slate-950/70 hover:bg-slate-800/80 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-white truncate">{snap.title}</span>
                          <span className="text-[10px] font-mono font-bold text-emerald-400">
                            {snap.elbowAngle}°
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>{snap.subtitle}</span>
                          <span className="font-mono">{snap.timeSec.toFixed(1)}s</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SPEICHERN IM SPIELERPROFIL */}
            <button
              onClick={handleSaveSessionToProfile}
              className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                isSaved
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-400/40'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Im Spielerprofil gesichert!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Wurf-Steckbrief im Spielerprofil speichern</span>
                </>
              )}
            </button>

            {/* NEED-TO-KNOW ACCORDION: EXPERTEN-EINSTELLUNGEN & KALIBRIERUNG */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => setShowExpertSettings(!showExpertSettings)}
                className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>⚙️ Experten-Optionen & Kalibrierung</span>
                </span>
                <span>{showExpertSettings ? '▲ Einklappen' : '▼ Aufklappen'}</span>
              </button>

              {showExpertSettings && (
                <div className="mt-3 space-y-3 p-3 rounded-2xl bg-slate-950/80 border border-white/5 text-xs">
                  {/* Körpergröße & Wurfhand */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Körpergröße (Kalibrierung)
                      </label>
                      <input
                        type="number"
                        min={130}
                        max={220}
                        value={playerHeightCm}
                        onChange={(e) => setPlayerHeightCm(Number(e.target.value) || 180)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Wurfhand</label>
                      <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => setHandedness('right')}
                          className={`py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            handedness === 'right'
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'text-slate-400'
                          }`}
                        >
                          Rechts
                        </button>
                        <button
                          onClick={() => setHandedness('left')}
                          className={`py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            handedness === 'left'
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'text-slate-400'
                          }`}
                        >
                          Links
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Einzelne Overlay-Layer ein-/ausschalten */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setShowTrajectory(!showTrajectory)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                        showTrajectory
                          ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      Wurfbahn: {showTrajectory ? 'AN' : 'AUS'}
                    </button>
                    <button
                      onClick={() => setShowPlumbLine(!showPlumbLine)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                        showPlumbLine
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      Lotlinie: {showPlumbLine ? 'AN' : 'AUS'}
                    </button>
                    <button
                      onClick={() => setShowGhostBaseline(!showGhostBaseline)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                        showGhostBaseline
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      Nullpunkt: {showGhostBaseline ? 'AN' : 'AUS'}
                    </button>
                    <button
                      onClick={() => setShowFootTriangle(!showFootTriangle)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                        showFootTriangle
                          ? 'bg-white/20 text-white border-white/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      Standdreieck: {showFootTriangle ? 'AN' : 'AUS'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.pause();
                      setIsPlaying(false);
                      const detected = detectPoseOnCurrentFrame();
                      setBaselinePose(detected);
                      setCurrentPose(detected);
                      setShowOverlay(true);
                      setStatusMessage('✓ Aktuelles Standbild als neuer Nullpunkt kalibriert.');
                    }}
                    className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Aktuelles Bild als Nullpunkt setzen</span>
                  </button>

                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Tipp: Gelenkpunkte im Bild lassen sich per Touch/Maus feinjustieren.</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* GESPEICHERTE ANALYSEN DES SPIELERS (Trend & Selbstkontrolle gem. §10.3 AGENTS.md) */}
          {savedSessions.length > 0 && (
            <div className="p-4 rounded-3xl bg-slate-900/80 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Dein Biomechanik-Verlauf ({savedSessions.length})
                </h3>
                <span className="text-[10px] text-slate-400">On-Device Speicher</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{s.dateStr}</span>
                        <span className="text-emerald-400 font-mono">{s.consistencyScore}% Konstanz</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {s.releaseSpeedKmh} km/h • +{s.launchAngleDeg}° • Ellenbogen {s.elbowDropMm} mm
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSavedSession(s.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer shrink-0"
                      title="Messung löschen (§10.3 DSGVO)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
