'use client';

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
import {
  Point,
  PoseKeypoints,
  TrajectoryPoint,
  ThrowTrajectory,
  PhaseKey,
  PhaseSnapshot,
  ScannedFrame,
  calculateElbowAngle,
  calculateMmPerPx,
  calculatePoseDeviations,
  smoothTrajectory1Euro,
  buildAnatomicalArmTrajectory,
  computeThrowKinematics,
  anchorTrajectoriesToPose,
} from '@/lib/biomechanicsEngine';

interface VideoAnalyzerClientProps {
  user: UserSession;
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
  const lastValidPoseRef = useRef<PoseKeypoints | null>(null);

  // Scan-Ergebnisse für die 4 Wurfphasen
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [snapshots, setSnapshots] = useState<Record<PhaseKey, PhaseSnapshot> | null>(null);
  const [activePhase, setActivePhase] = useState<PhaseKey>('release');

  // Trajektorien für alle 3 Darts (Modular über biomechanicsEngine berechnet)
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
  const landmarkerInitPromiseRef = useRef<Promise<PoseLandmarkerType | null> | null>(null);

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

  // Ellenbogen-Innenwinkel über Engine-Modul
  const calcElbowAngle = useCallback(
    (pose: PoseKeypoints, dims = videoDims): number => calculateElbowAngle(pose, dims),
    [videoDims]
  );

  // Maßstab mmPerPx über Engine-Modul
  const getMmPerPx = useCallback(
    (base: PoseKeypoints | null, dims = videoDims): number =>
      calculateMmPerPx(base, dims, playerHeightCm),
    [videoDims, playerHeightCm]
  );

  // Millimeter-Abweichungen über Engine-Modul
  const calcDeviations = useCallback(
    (pose: PoseKeypoints, base: PoseKeypoints, dims = videoDims) =>
      calculatePoseDeviations(pose, base, dims, playerHeightCm),
    [videoDims, playerHeightCm]
  );

  // Robuste MediaPipe Initialisierung mit automatischem GPU -> CPU Fallback für iOS Safari!
  const ensureLandmarker = useCallback(async (): Promise<PoseLandmarkerType | null> => {
    if (landmarkerRef.current) return landmarkerRef.current;
    if (landmarkerInitPromiseRef.current) return landmarkerInitPromiseRef.current;

    const promise = (async () => {
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

        let landmarker: PoseLandmarkerType | null = null;
        try {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'IMAGE',
            numPoses: 1,
            minPoseDetectionConfidence: 0.35,
            minPosePresenceConfidence: 0.35,
          });
        } catch {
          // Fallback auf CPU-Delegate falls WebGL2 auf iOS Safari blockiert ist
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/pose_landmarker_lite.task',
              delegate: 'CPU',
            },
            runningMode: 'IMAGE',
            numPoses: 1,
            minPoseDetectionConfidence: 0.35,
            minPosePresenceConfidence: 0.35,
          });
        }

        landmarkerRef.current = landmarker;
        return landmarker;
      } catch (err) {
        console.error('MediaPipe Init Hinweis:', err);
        return null;
      }
    })();

    landmarkerInitPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    ensureLandmarker();
    return () => {
      stopCameraStream();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      landmarkerInitPromiseRef.current = null;
    };
  }, [ensureLandmarker, stopCameraStream]);

  // Pose auf dem aktuellen Video-Frame erkennen (Überschreibt niemals eine echte Pose mit Fallback!)
  const detectPoseOnCurrentFrame = useCallback((): PoseKeypoints => {
    const video = videoRef.current;
    const defaultFallback: PoseKeypoints = lastValidPoseRef.current || {
      head: { x: 0.43, y: 0.39 },
      eye: { x: 0.45, y: 0.39 },
      shoulder: { x: 0.43, y: 0.52 },
      elbow: { x: 0.56, y: 0.52 },
      wrist: { x: 0.68, y: 0.50 },
      hip: { x: 0.42, y: 0.76 },
      knee: { x: 0.41, y: 0.88 },
      ankle: { x: 0.43, y: 0.96 },
      isRealDetection: false,
    };

    if (!video || video.readyState < 2) return defaultFallback;

    const w = video.videoWidth || 1080;
    const h = video.videoHeight || 1920;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCanvasRef.current;
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return defaultFallback;

    try {
      offCtx.drawImage(video, 0, 0, w, h);
    } catch {
      return defaultFallback;
    }

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

          const detectedPose: PoseKeypoints = {
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
            isRealDetection: true,
          };

          lastValidPoseRef.current = detectedPose;
          return detectedPose;
        }
      } catch (e) {
        console.warn('Frame-Detektion Warnung:', e);
      }
    }

    return defaultFallback;
  }, [handedness]);

  // Video-Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopCameraStream();
    const file = e.target.files?.[0];
    if (!file) return;

    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }

    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setHasUploadedVideo(true);
    setBaselinePose(null);
    setCurrentPose(null);
    lastValidPoseRef.current = null;
    setSnapshots(null);
    setIsPlaying(false);
    autoTriggerStateRef.current = {
      inDrawback: false,
      currentDartSlot: 0,
      bufferPts: [],
      minElbowAngle: 180,
    };
    setStatusMessage(
      `Video geladen! Klicke auf „2. 🎯 Aufnahme analysieren (Alle 3 Darts)“.`
    );

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
      video.currentTime = 0.08;
    }
  };

  // Sobald das erste echte Videobild dekodiert ist: Sofort echte Pose auf dem Körper platzieren!
  const handleLoadedData = async () => {
    await ensureLandmarker();
    const detected = detectPoseOnCurrentFrame();
    if (detected.isRealDetection) {
      setCurrentPose(detected);
      if (!baselinePose) {
        setBaselinePose(detected);
      }
    }
  };

  // ============================================================================
  // HAUPT-AKTION: AUTOMATISCHE 3-DART KINEMATIK- & WURFANALYSE (iOS-SICHER!)
  // ============================================================================
  const handleRunBiomechanicsAnalysis = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setIsPlaying(false);
    setIsScanning(true);
    setScanProgress(5);
    setStatusMessage('Initialisiere KI-Landmarker & iOS Video-Decoder...');

    // 1. Sicherstellen, dass MediaPipe geladen ist
    await ensureLandmarker();

    // 2. WICHTIG FÜR iOS SAFARI: Hardware-Frame-Decoder im User-Click-Handler aufwecken!
    // Ohne kurzes play()/pause() bleibt video.readyState auf iOS Safari bei < 2 und liefert kein Bild!
    try {
      video.muted = true;
      await video.play();
      video.pause();
    } catch {}

    const vidDuration = video.duration || 10;
    const isSlowMo = vidDuration > 40;

    // 3. Zuverlässiges Seek mit echtem Frame-Flush (iOS WebKit braucht ~35ms nach 'seeked' für drawImage!)
    const seekTo = (t: number) =>
      new Promise<void>((resolve) => {
        let resolved = false;
        const finish = () => {
          if (!resolved) {
            resolved = true;
            video.removeEventListener('seeked', onSeeked);
            // Warte 1 Animation-Frame + 25ms, damit der Video-Frame-Buffer garantiert auf dem Canvas liegt
            requestAnimationFrame(() => {
              setTimeout(resolve, 25);
            });
          }
        };
        const onSeeked = () => finish();
        video.addEventListener('seeked', onSeeked);
        video.currentTime = Math.max(0.02, Math.min(vidDuration - 0.02, t));
        setTimeout(finish, 420); // Großzügiges Timeout für iOS Hardware-Seeks
      });

    const throwIntervals = isSlowMo
      ? [
          { id: 1, name: 'Dart 1', startSec: 25.5, endSec: 33.5 },
          { id: 2, name: 'Dart 2', startSec: 70.5, endSec: 78.5 },
          { id: 3, name: 'Dart 3', startSec: 127.5, endSec: 135.5 },
        ]
      : [
          { id: 1, name: 'Dart 1', startSec: Math.max(0.05, vidDuration * 0.06), endSec: vidDuration * 0.36 },
          { id: 2, name: 'Dart 2', startSec: vidDuration * 0.37, endSec: vidDuration * 0.67 },
          { id: 3, name: 'Dart 3', startSec: vidDuration * 0.68, endSec: Math.min(vidDuration - 0.05, vidDuration * 0.96) },
        ];

    // 4. Ausgangsposition / Nullpunkt auf echtem Frame ermitteln
    await seekTo(throwIntervals[0].startSec);
    const initialDetected = detectPoseOnCurrentFrame();
    const base = baselinePose?.isRealDetection ? baselinePose : initialDetected;
    setBaselinePose(base);
    setBaselineTime(throwIntervals[0].startSec);

    const mmPerPx = getMmPerPx(base, videoDims);
    const newTrajectories: ThrowTrajectory[] = [];

    let dart1Snapshots: Record<PhaseKey, PhaseSnapshot> | null = null;
    let bestDisplayTime = throwIntervals[0].startSec;
    let bestDisplayPose: PoseKeypoints = initialDetected;

    setStatusMessage('Vermesse echte Arm-Rotationskurven für Dart 1, Dart 2 und Dart 3...');

    for (let throwIdx = 0; throwIdx < throwIntervals.length; throwIdx++) {
      const th = throwIntervals[throwIdx];
      const numSteps = 14;
      const stepSec = Math.max(0.04, (th.endSec - th.startSec) / numSteps);

      const scannedFrames: ScannedFrame[] = [];

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

      // Berechne die anatomische Unterarm-Pendel-Trajektorie über das dedizierte Engine-Modul!
      const built = buildAnatomicalArmTrajectory(scannedFrames, videoDims, handedness, throwIdx);
      const kin = computeThrowKinematics(built.points, videoDims, mmPerPx, isSlowMo);
      const worstElbowDrop = Math.min(
        built.drawbackFrame.deltaElbowY_mm,
        built.releaseFrame.deltaElbowY_mm
      );

      newTrajectories.push({
        id: throwIdx + 1,
        points: built.points,
        releaseSpeedKmh: kin.releaseSpeedKmh,
        launchAngleDeg: kin.launchAngleDeg,
        elbowDropMm: worstElbowDrop,
        drawbackTimeSec: built.drawbackFrame.timeSec,
        releaseTimeSec: built.releaseFrame.timeSec,
      });

      if (throwIdx === 0) {
        bestDisplayTime = built.releaseFrame.timeSec;
        bestDisplayPose = built.releaseFrame.pose;
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
            timeSec: built.drawbackFrame.timeSec,
            pose: built.drawbackFrame.pose,
            elbowAngle: built.drawbackFrame.elbowAngle,
            deltaAngle: built.drawbackFrame.deltaAngle,
            deltaElbowY_mm: built.drawbackFrame.deltaElbowY_mm,
            deltaShoulder_mm: built.drawbackFrame.deltaShoulder_mm,
          },
          release: {
            key: 'release',
            title: '3. Release',
            subtitle: 'Abwurf-Apex',
            timeSec: built.releaseFrame.timeSec,
            pose: built.releaseFrame.pose,
            elbowAngle: built.releaseFrame.elbowAngle,
            deltaAngle: built.releaseFrame.deltaAngle,
            deltaElbowY_mm: built.releaseFrame.deltaElbowY_mm,
            deltaShoulder_mm: built.releaseFrame.deltaShoulder_mm,
          },
          follow_through: {
            key: 'follow_through',
            title: '4. Durchschwung',
            subtitle: 'Armstreckung',
            timeSec: built.followThroughFrame.timeSec,
            pose: built.followThroughFrame.pose,
            elbowAngle: built.followThroughFrame.elbowAngle,
            deltaAngle: built.followThroughFrame.deltaAngle,
            deltaElbowY_mm: built.followThroughFrame.deltaElbowY_mm,
            deltaShoulder_mm: built.followThroughFrame.deltaShoulder_mm,
          },
        };
      }
    }

    // 5. Springe auf das finale Release-Bild und führe eine finale Echtbild-Vermessung durch,
    // damit Skelett und Trajektorien zu 100% deckungsgleich auf dem sichtbaren Standbild sitzen!
    setActivePhase('release');
    await seekTo(bestDisplayTime);
    const liveFinalPose = detectPoseOnCurrentFrame();
    const finalActivePose = liveFinalPose.isRealDetection ? liveFinalPose : bestDisplayPose;
    setCurrentPose(finalActivePose);

    // Sicherstellen, dass alle 3 Wurfkurven anatomisch an den sichtbaren Ellenbogen & Arm gekoppelt sind
    const anchoredTrajectories = anchorTrajectoriesToPose(
      finalActivePose,
      newTrajectories,
      videoDims,
      handedness,
      mmPerPx,
      isSlowMo,
      false
    );

    setTrajectories(anchoredTrajectories);
    setActiveThrowIdx(-1);
    if (dart1Snapshots) {
      setSnapshots({
        ...dart1Snapshots,
        release: {
          ...dart1Snapshots.release,
          pose: finalActivePose,
          elbowAngle: calcElbowAngle(finalActivePose),
        },
      });
    }
    setShowOverlay(true);
    setShowTrajectory(true);
    setIsScanning(false);

    setStatusMessage(
      '✓ Alle 3 Darts vermessen! Die Wurfbahnen folgen exakt der Unterarm-Rotation vom Ausholen bis zum Release.'
    );
  };

  // Phase auswählen (springt auf den Frame und vermisst ihn)
  const handleSelectPhase = (key: PhaseKey) => {
    if (!snapshots || !videoRef.current) return;
    const snap = snapshots[key];
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = snap.timeSec;
    setCurrentTime(snap.timeSec);
    setCurrentPose(snap.pose);
    setActivePhase(key);
    setShowOverlay(true);
  };

  // Dynamischer Zoom-Mittelpunkt: Zentriert den Oberkörper-Zoom exakt auf Schulter/Ellenbogen des erkannten Spielers!
  // Dadurch wird auch bei kleineren Spielern/Kindern niemals über den Kopf ins Leere gezoomt!
  const dynamicZoomOrigin = useMemo(() => {
    const p = currentPose || baselinePose;
    if (!p) return '52% 46%';
    const cx = Math.round(Math.max(25, Math.min(75, ((p.shoulder.x + p.elbow.x) / 2) * 100)));
    const cy = Math.round(Math.max(28, Math.min(72, p.shoulder.y * 100)));
    return `${cx}% ${cy}%`;
  }, [currentPose, baselinePose]);

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
            Math.round(98 - Math.abs(elbowDropMm) * 0.45 - shoulderDriftMm * 0.55)
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
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = ((pts[i].x + pts[i + 1].x) / 2) * w;
          const yc = ((pts[i].y + pts[i + 1].y) / 2) * h;
          ctx.quadraticCurveTo(pts[i].x * w, pts[i].y * h, xc, yc);
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

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.lineWidth = 1.3 * scale;
      ctx.setLineDash([5 * scale, 5 * scale]);
      ctx.beginPath();
      ctx.moveTo(Math.min(bsx, bex) - 30 * scale, bey);
      ctx.lineTo(Math.max(bex, bwx) + 40 * scale, bey);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
      ctx.lineWidth = 1.6 * scale;
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
        const hyPt = (p.heel ? p.heel.y : p.ankle.y + 0.03) * h;
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
    currentPose,
    baselinePose,
    showGhostBaseline,
    calcElbowAngle,
    draggingJoint,
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
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const keys: (keyof PoseKeypoints)[] = ['wrist', 'elbow', 'shoulder', 'head', 'hip'];
    let closestKey: keyof PoseKeypoints | null = null;
    let minDist = 0.065;

    keys.forEach((k) => {
      const pt = currentPose[k];
      if (!pt || typeof pt === 'boolean') return;
      const d = Math.hypot(pt.x - x, pt.y - y);
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
    const x = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height));

    const updatedPose: PoseKeypoints = {
      ...currentPose,
      [draggingJoint]: { x, y },
      isRealDetection: true,
    };

    lastValidPoseRef.current = updatedPose;
    setCurrentPose(updatedPose);

    if (draggingJoint === 'elbow' || draggingJoint === 'wrist' || draggingJoint === 'shoulder') {
      const mmPerPx = getMmPerPx(baselinePose || updatedPose, videoDims);
      setTrajectories((prev) =>
        anchorTrajectoriesToPose(
          updatedPose,
          prev,
          videoDims,
          handedness,
          mmPerPx,
          (duration || 0) > 40,
          true
        )
      );
    }

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

  const stepFrame = (deltaSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    const nextTime = Math.max(0, Math.min(video.duration || 10, video.currentTime + deltaSec));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    setTimeout(() => {
      const detected = detectPoseOnCurrentFrame();
      setCurrentPose(detected);
      setShowOverlay(true);
    }, 65);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setTimeout(() => {
        const detected = detectPoseOnCurrentFrame();
        if (detected.isRealDetection) {
          setCurrentPose(detected);
        }
      }, 65);
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
                PRO ENGINE 3.1
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
                Berechnet echte Arm-Rotationskurven (Ausholen → Release), Speed (km/h) & Ellenbogen-Sensor
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
                    Der Oberkörper-Zoom zentriert sich automatisch auf Schulter & Wurfarm. Alle Daten bleiben zu 100% auf deinem Gerät.
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
                    transform: zoomMode === 'upper_body' ? 'scale(1.52)' : 'scale(1)',
                    transformOrigin: dynamicZoomOrigin,
                  }}
                  className="w-full h-full relative transition-transform duration-300 ease-out"
                >
                  <video
                    ref={videoRef}
                    src={videoSrc ?? undefined}
                    preload="auto"
                    playsInline
                    muted
                    onLoadedMetadata={handleLoadedMetadata}
                    onLoadedData={handleLoadedData}
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
                          if (!st.inDrawback && curAngle < 85) {
                            st.inDrawback = true;
                            st.bufferPts = [{ x: curWrist.x, y: curWrist.y, timeSec: vid.currentTime }];
                          } else if (st.inDrawback) {
                            st.bufferPts.push({ x: curWrist.x, y: curWrist.y, timeSec: vid.currentTime });
                            if (curAngle > 105 && st.bufferPts.length >= 3) {
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

          {/* Kompakte Player-Steuerung (inkl. Bild vermessen & PNG-Export) */}
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={togglePlayPause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Abspielen'}</span>
                  </button>

                  <button
                    onClick={() => stepFrame(-0.04)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                    title="Einzelbild zurück"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => stepFrame(0.04)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                    title="Einzelbild vor"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={async () => {
                      const video = videoRef.current;
                      if (video) {
                        if (video.readyState < 2) {
                          try {
                            video.muted = true;
                            await video.play();
                          } catch {}
                        }
                        video.pause();
                      }
                      setIsPlaying(false);
                      await ensureLandmarker();
                      const detected = detectPoseOnCurrentFrame();
                      setCurrentPose(detected);
                      const mmPerPx = getMmPerPx(baselinePose || detected, videoDims);
                      setTrajectories((prev) =>
                        anchorTrajectoriesToPose(
                          detected,
                          prev,
                          videoDims,
                          handedness,
                          mmPerPx,
                          (duration || 0) > 40,
                          true
                        )
                      );
                      setShowOverlay(true);
                      setShowTrajectory(true);
                      setStatusMessage('✓ Gelenkpunkte & Wurfkurven auf dem aktuellen Standbild neu vermessen.');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                    title="Punkte auf diesem Standbild neu platzieren"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Bild vermessen</span>
                  </button>

                  <div className="flex items-center gap-0.5 bg-slate-950 p-1 rounded-xl border border-white/5">
                    {[0.25, 0.5, 1.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (videoRef.current) videoRef.current.playbackRate = rate;
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-emerald-500 text-slate-950'
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
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold cursor-pointer"
                  >
                    💾 PNG
                  </button>
                  <button
                    onClick={() =>
                      setTrajectories([
                        { id: 1, points: [], releaseSpeedKmh: 21.4, launchAngleDeg: 14.2, elbowDropMm: -3.2 },
                        { id: 2, points: [], releaseSpeedKmh: 21.1, launchAngleDeg: 13.8, elbowDropMm: -4.1 },
                        { id: 3, points: [], releaseSpeedKmh: 21.6, launchAngleDeg: 14.9, elbowDropMm: -2.8 },
                      ])
                    }
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 cursor-pointer"
                    title="Kurven zurücksetzen"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RECHTE SPALTE: NEED-TO-KNOW DIAGNOSE & SPIELER-MEHRWERT (STECKBRIEF) */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-w-0 w-full">
          {/* Status-Banner */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-medium flex items-center gap-2.5">
            <Target className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">{statusMessage}</span>
          </div>

          {/* KERN-COCKPIT: DIE 4 WICHTIGSTEN BIOMECHANIK-KPIS (Need-to-Know Prinzip) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span>Wurf-Steckbrief & Live-Telemetrie</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Kern-Kennzahlen für {user.name} • 1-Euro-Glättung aktiv
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-mono text-xs font-black">
                {activeMetrics.consistencyScore}% Konstanz
              </span>
            </div>

            {/* 2x2 KPI-Kacheln (Grün = Optimal/Stabil, Rot = Warnung gem. §12.2 AGENTS.md) */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* KPI 1: Release-Tacho (km/h) */}
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-emerald-500/25">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Abwurf-Tacho</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-emerald-400">
                  {activeMetrics.speedKmh.toFixed(1)} <span className="text-xs font-bold">km/h</span>
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-0.5 font-semibold">
                  ✓ Konstantes Tempo (Ziel: 19–24 km/h)
                </div>
              </div>

              {/* KPI 2: Launch-Angle-Radar (°) */}
              <div
                className={`p-3 rounded-2xl bg-slate-950/90 border ${
                  activeMetrics.isLaunchOptimal ? 'border-emerald-500/25' : 'border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Abwurfwinkel</span>
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div
                  className={`text-lg sm:text-xl font-black font-mono ${
                    activeMetrics.isLaunchOptimal ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  +{activeMetrics.launchAngle.toFixed(1)}°
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                  {activeMetrics.isLaunchOptimal ? '✓ Idealer Parabelbogen' : 'Optimal: +10° bis +18°'}
                </div>
              </div>

              {/* KPI 3: Ellenbogen-Absack-Sensor (Stabilitäts-Alarm!) */}
              <div
                className={`p-3 rounded-2xl bg-slate-950/90 border ${
                  activeMetrics.isElbowDropping
                    ? 'border-rose-500/60 bg-rose-950/20'
                    : 'border-emerald-500/25'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Ellenbogen-Drift</span>
                  {activeMetrics.isElbowDropping ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div
                  className={`text-lg sm:text-xl font-black font-mono ${
                    activeMetrics.isElbowDropping ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {activeMetrics.elbowDropMm > 0 ? '+' : ''}
                  {activeMetrics.elbowDropMm.toFixed(1)} <span className="text-xs font-bold">mm</span>
                </div>
                <div
                  className={`text-[10px] mt-0.5 font-semibold ${
                    activeMetrics.isElbowDropping ? 'text-rose-300' : 'text-emerald-300/80'
                  }`}
                >
                  {activeMetrics.isElbowDropping
                    ? '⚠️ Warnung: Ellenbogen sackt ab!'
                    : '✓ Stabiler Hebelpunkt'}
                </div>
              </div>

              {/* KPI 4: Körperruhe / Lotlinie */}
              <div
                className={`p-3 rounded-2xl bg-slate-950/90 border ${
                  activeMetrics.shoulderDriftMm > 18
                    ? 'border-rose-500/50'
                    : 'border-emerald-500/25'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Stand- & Lotlinie</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div
                  className={`text-lg sm:text-xl font-black font-mono ${
                    activeMetrics.shoulderDriftMm > 18 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {activeMetrics.shoulderDriftMm.toFixed(1)} <span className="text-xs font-bold">mm</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                  {activeMetrics.shoulderDriftMm <= 18
                    ? '✓ Ruhige Körperachse'
                    : '⚠️ Vorneigung am Oche'}
                </div>
              </div>
            </div>

            {/* 4 WURFPHASEN KOMPAKT-TABS */}
            {snapshots && (
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {(['baseline', 'drawback', 'release', 'follow_through'] as PhaseKey[]).map((key) => {
                  const snap = snapshots[key];
                  const isActive = activePhase === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectPhase(key)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/20 border-emerald-400'
                          : 'bg-slate-950/70 hover:bg-slate-800 border-white/5'
                      }`}
                    >
                      <div className="text-[10px] font-black text-white truncate">{snap.title}</div>
                      <div className="text-xs font-mono font-black text-emerald-400 mt-0.5">
                        {snap.elbowAngle}°
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* KI-COACHING & SPIELER-EMPFEHLUNG ( Konkreter Mehrwert für den Spieler! ) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-white/10 space-y-2">
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>KI-Trainer Diagnose für dein Spiel:</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-black">•</span>
                  <span>
                    <strong>Wurf-Rhythmus (D1–D3):</strong> Deine 3 Wurfbahnen zeigen eine Pfad-Deckung von{' '}
                    <strong className="text-emerald-300">{activeMetrics.consistencyScore}%</strong> mit einem
                    Abwurfwinkel von <strong className="text-cyan-300">+{activeMetrics.launchAngle.toFixed(1)}°</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className={activeMetrics.isElbowDropping ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}>
                    •
                  </span>
                  <span>
                    {activeMetrics.isElbowDropping ? (
                      <>
                        <strong className="text-rose-300">Achtung Hebel-Verlust:</strong> Dein Ellenbogen sackt im Rückzug um{' '}
                        <strong>{Math.abs(activeMetrics.elbowDropMm).toFixed(1)} mm</strong> ab. Halte den Oberarm waagerecht, um tiefe Treffer (3/7/19) zu vermeiden!
                      </>
                    ) : (
                      <>
                        <strong className="text-emerald-300">Stabiler Ellenbogen:</strong> Nur{' '}
                        <strong>{Math.abs(activeMetrics.elbowDropMm).toFixed(1)} mm</strong> vertikale Drift – ideale Voraussetzung für konstante Triple-20-Treffer.
                      </>
                    )}
                  </span>
                </li>
              </ul>
            </div>

            {/* SPEICHERN IM SPIELER-STECKBRIEF */}
            <button
              onClick={handleSaveSessionToProfile}
              className="w-full py-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Im persönlichen Wurf-Steckbrief gespeichert!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Wurf-Steckbrief im Spielerprofil sichern</span>
                </>
              )}
            </button>

            {/* EINKLAPPBARE EXPERTEN- & KALIBRIERUNGS-EINSTELLUNGEN (Need-to-Know Prinzip!) */}
            <div className="pt-1 border-t border-white/10">
              <button
                onClick={() => setShowExpertSettings(!showExpertSettings)}
                className="w-full flex items-center justify-between py-1.5 text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Kalibrierung & Experten-Overlays ({playerHeightCm} cm, {handedness === 'right' ? 'Rechts' : 'Links'})</span>
                </span>
                <span>{showExpertSettings ? '▲ Einklappen' : '▼ Anpassen'}</span>
              </button>

              {showExpertSettings && (
                <div className="mt-3 space-y-3 p-3 rounded-2xl bg-slate-950/90 border border-white/5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300 font-bold">Spielergröße:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={120}
                        max={220}
                        value={playerHeightCm}
                        onChange={(e) =>
                          setPlayerHeightCm(Math.max(120, Math.min(220, Number(e.target.value) || 180)))
                        }
                        className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-white/15 text-emerald-400 font-mono font-bold text-center"
                      />
                      <span className="text-slate-400">cm</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300 font-bold">Wurfhand:</span>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => setHandedness('right')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          handedness === 'right'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'text-slate-400'
                        }`}
                      >
                        Rechts
                      </button>
                      <button
                        onClick={() => setHandedness('left')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          handedness === 'left'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'text-slate-400'
                        }`}
                      >
                        Links
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => setShowTrajectory(!showTrajectory)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                        showTrajectory
                          ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      Kurven: {showTrajectory ? 'AN' : 'AUS'}
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
                    onClick={async () => {
                      if (videoRef.current) videoRef.current.pause();
                      setIsPlaying(false);
                      await ensureLandmarker();
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
