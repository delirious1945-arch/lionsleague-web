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
  Crosshair,
  Target,
  RotateCcw,
  Sliders,
  Trash2,
  Zap,
  Download,
  Printer,
  Mic,
  Volume2,
  Camera,
  X,
} from 'lucide-react';
import { UserSession } from '@/app/actions';
import {
  saveBiomechanicsSessionAction,
  getBiomechanicsHistoryAction,
  deleteBiomechanicsSessionAction,
} from './actions';
import type { PoseLandmarker as PoseLandmarkerType } from '@mediapipe/tasks-vision';
import {
  PoseKeypoints,
  TrajectoryPoint,
  ThrowTrajectory,
  PhaseKey,
  PhaseSnapshot,
  ScannedFrame,
  calculateElbowAngle,
  calculateMmPerPx,
  calculatePoseDeviations,
  buildHiddenBiomechanicalRig,
  buildAnatomicalArmTrajectory,
  computeThrowKinematics,
  anchorTrajectoriesToPose,
  TimelinePoseFrame,
  getInterpolatedPose,


  PoseLandmarkQuality,


  extractFiveCoreAngles,
  validateFiveCoreAngles,
  evaluatePoseQuality,
  calculateThreeDartDispersion,
  calculateMmPerPxWithReference,
  BBDV_STANDARDS,
  calculateThrowScanIntervals,
  CalibrationMethod,
  evaluateFramingAndPosition,
  createInitialLiveThrowCounter,
  updateLiveThrowCounter,
  FramingCheckResult,
  CaptureSessionMode,
  DEFAULT_CAPTURE_CONFIG,
  LiveThrowCounterState,
  evaluateThreeDartSelfComparison,
  GuidedAnalysisStep,
  computeBallisticFlightTrajectory,
  calculateVerticalReleaseHeightMm,
} from '@/lib/biomechanicsEngine';

interface VideoAnalyzerClientProps {
  user: UserSession;
}

export interface SavedBiomechanicsSession {
  id: string;
  dateStr: string;
  createdAt?: string;
  playerName: string;
  consistencyScore: number;
  releaseSpeedKmh: number;
  launchAngleDeg: number;
  elbowDropMm: number;
  shoulderDriftMm: number;
  drawbackAngle: number;
  releaseAngle: number;
  followThroughAngle: number;
  stanceAngle?: number;
  trunkLeanAngle?: number;
  landmarkConfidenceScore?: number;
  isHighConfidenceDetection?: boolean;
  releaseDispersionMm?: number;
  speedStdDevKmh?: number;
  launchAngleStdDevDeg?: number;
  dispersionRating?: 'EXZELLENT' | 'STABIL' | 'VERBESSERBAR';
  calibrationMethod?: string;
  videoMode?: string;
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
  const [calibrationMethod, setCalibrationMethod] = useState<CalibrationMethod>('anthropometric');
  const [boardRefPixels, setBoardRefPixels] = useState<number>(1380);
  const [ocheRefPixels, setOcheRefPixels] = useState<number>(160);
  const [videoMode, setVideoMode] = useState<'auto' | 'slowmo' | 'realtime'>('auto');
  const [slowMoFps, setSlowMoFps] = useState<120 | 240>(240);

  // Nullpunkt (Baseline) & Aktuelle Pose
  const [baselinePose, setBaselinePose] = useState<PoseKeypoints | null>(null);
  const baselineTimeRef = useRef<number | null>(null);
  const [currentPose, setCurrentPose] = useState<PoseKeypoints | null>(null);
  const currentPoseRef = useRef<PoseKeypoints | null>(null);
  const [landmarkQuality, setLandmarkQuality] = useState<PoseLandmarkQuality>({
    averageConfidence: 0.94,
    isHighConfidence: true,
    lowConfidenceLandmarks: [],
  });
  // Vorab berechnete Pose-Timeline für 100% entkoppelte, flüssige 60-FPS Wiedergabe (0ms KI-Latenz)

  const poseTimelineRef = useRef<TimelinePoseFrame[]>([]);
  const lastValidPoseRef = useRef<PoseKeypoints | null>(null);

  // Scan-Ergebnisse für die 4 Wurfphasen
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [snapshots, setSnapshots] = useState<Record<PhaseKey, PhaseSnapshot> | null>(null);
  const [activePhase, setActivePhase] = useState<PhaseKey>('release');
  // Wenn true, sind die Kurven der Analyse final eingefroren und werden durch Wiedergabe/Seek nicht mehr verändert!
  const [isAnalysisLocked, setIsAnalysisLocked] = useState<boolean>(false);

  // Trajektorien für alle 3 Darts (Modular über biomechanicsEngine berechnet)
  const [trajectories, setTrajectories] = useState<ThrowTrajectory[]>([
    { id: 1, points: [], releaseSpeedKmh: 21.4, launchAngleDeg: 14.2, elbowDropMm: -3.2 },
    { id: 2, points: [], releaseSpeedKmh: 21.1, launchAngleDeg: 13.8, elbowDropMm: -4.1 },
    { id: 3, points: [], releaseSpeedKmh: 21.6, launchAngleDeg: 14.9, elbowDropMm: -2.8 },
  ]);
  const [activeThrowIdx, setActiveThrowIdx] = useState<number>(-1); // Standard: -1 = Alle 3 Darts überlagern
  const [viewMode, setViewMode] = useState<'video' | 'isolated'>('video');
  const [zoomMode, setZoomMode] = useState<'upper_body' | 'full' | 'custom'>('upper_body');

  // Frei definierbarer Bildausschnitt (Custom Crop / Zoom auf Oberkörper & Wurfarm)
  const [customCrop, setCustomCrop] = useState<{
    zoom: number; // 1.2x bis 3.5x
    centerX: number; // 15% bis 85%
    centerY: number; // 15% bis 85%
  }>({
    zoom: 2.35,
    centerX: 54,
    centerY: 40,
  });
  const [showCropControls, setShowCropControls] = useState<boolean>(false);
  const cropDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origCX: number;
    origCY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origCX: 54,
    origCY: 40,
  });

  // 5-Schritt Durchklick-Analyse (Dart 1 vs. Dart 2 vs. Dart 3 Selbstvergleich ohne Normzwang)
  const [guidedStep, setGuidedStep] = useState<GuidedAnalysisStep>(1);

  // On-Device Export-Konfigurator (Speichern als Video oder Bild mit Wahl: Video+Kurven vs. Nur Kurven & Ausschnitt)
  const [showExportPanel, setShowExportPanel] = useState<boolean>(false);
  const [exportRenderMode, setExportRenderMode] = useState<'video' | 'isolated'>('video');
  const [exportCropMode, setExportCropMode] = useState<'active_crop' | 'full'>('active_crop');
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [exportVideoProgress, setExportVideoProgress] = useState<number>(0);

  // 5. AUTO-TRIGGER (Freihändige Wurf-Erkennung ab Hüfthöhe)
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState<boolean>(true);

  // 6. KI-SPRACHSTEUERUNG, LIVE-KAMERA ("POSITION I.O."), 5s-COUNTDOWN & AUTO-STOPP NACH 3 DARTS
  const [isLiveCameraActive, setIsLiveCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [voiceControlEnabled, setVoiceControlEnabled] = useState<boolean>(true);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [lastHeardCommand, setLastHeardCommand] = useState<string>('');
  const [framingCheck, setFramingCheck] = useState<FramingCheckResult | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [isLiveRecording, setIsLiveRecording] = useState<boolean>(false);
  const [liveRecordingElapsedSec, setLiveRecordingElapsedSec] = useState<number>(0);
  const [liveThrowCounter, setLiveThrowCounter] = useState<LiveThrowCounterState>(() =>
    createInitialLiveThrowCounter()
  );
  const [captureSessionMode, setCaptureSessionMode] =
    useState<CaptureSessionMode>('single_visit_3_darts');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef< unknown >(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimestampRef = useRef<number>(0);
  const liveThrowCounterRef = useRef<LiveThrowCounterState>(createInitialLiveThrowCounter());
  const positionIoStreakRef = useRef<number>(0);
  const hasAnnouncedPositionIoRef = useRef<boolean>(false);
  const lastVoiceFeedbackTimestampRef = useRef<number>(0);
  const autoAnalyzeAfterRecordRef = useRef<boolean>(false);
  const isLiveRecordingRef = useRef<boolean>(false);
  const isCountingDownRef = useRef<boolean>(false);
  const isCancelledRecordingRef = useRef<boolean>(false);
  const liveFullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const autoTriggerStateRef = useRef<{
    inDrawback: boolean;
    hasReachedDrawback: boolean;
    prevWristY: number;
    currentDartSlot: number;
    bufferPts: TrajectoryPoint[];
    minElbowAngle: number;
  }>({
    inDrawback: false,
    hasReachedDrawback: false,
    prevWristY: 0,
    currentDartSlot: 0,
    bufferPts: [],
    minElbowAngle: 180,
  });

  // Need-to-Know UI: Experten-Optionen & Start-Historie einklappbar
  const [showExpertSettings, setShowExpertSettings] = useState<boolean>(false);
  const [showStartHistory, setShowStartHistory] = useState<boolean>(false);

  // Visuelle Overlays Schalter
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [showGhostBaseline, setShowGhostBaseline] = useState<boolean>(true);
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true);
  const [showPlumbLine, setShowPlumbLine] = useState<boolean>(true);
  const [showFootTriangle, setShowFootTriangle] = useState<boolean>(false);
  const [showHiddenRigDebug, setShowHiddenRigDebug] = useState<boolean>(false);

  // Gespeicherte Sessions des Spielers (On-Device Verlauf gem. §10.3 AGENTS.md)
  const [savedSessions, setSavedSessions] = useState<SavedBiomechanicsSession[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);
  const landmarkerInitPromiseRef = useRef<Promise<PoseLandmarkerType | null> | null>(null);

  // Gespeicherte Sessions aus LocalStorage laden & mit Supabase synchronisieren
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(`lions_biomechanics_${user.name}`);
        if (raw && isMounted) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map((s: SavedBiomechanicsSession) => {
              if (!s.createdAt && s.id && s.id.startsWith('bio_')) {
                const ts = Number(s.id.slice(4));
                if (!isNaN(ts) && ts > 0) {
                  return { ...s, createdAt: new Date(ts).toISOString() };
                }
              }
              return s;
            });
            setSavedSessions(normalized);
          }
        }
      } catch {}
    }, 0);

    // Optionale Cloud-Historie aus Supabase laden (falls Tabelle migriert ist)
    getBiomechanicsHistoryAction(25)
      .then((remoteSessions) => {
        if (!isMounted || !remoteSessions || remoteSessions.length === 0) return;
        setSavedSessions((local) => {
          const map = new Map<string, SavedBiomechanicsSession>();
          // Remote sessions einfügen
          for (const s of remoteSessions as SavedBiomechanicsSession[]) {
            map.set(s.id, s);
          }
          // Lokale Sessions einfügen (ohne Duplikate)
          for (const s of local) {
            if (!map.has(s.id)) {
              map.set(s.id, s);
            }
          }
          return Array.from(map.values()).slice(0, 20);
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user.name]);

  // Akustische Signaltöne über Web Audio API (aus 3 Metern am Oche klar hörbar)
  const playCoachTone = useCallback(
    (type: 'position_io' | 'countdown_tick' | 'countdown_go' | 'dart_detected' | 'finish') => {
      if (typeof window === 'undefined' || !voiceControlEnabled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const playNote = (freq: number, startOffset: number, dur: number, gainVal: number = 0.22) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = type === 'countdown_go' ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
          gain.gain.setValueAtTime(gainVal, ctx.currentTime + startOffset);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + startOffset);
          osc.stop(ctx.currentTime + startOffset + dur);
        };

        if (type === 'position_io') {
          // Heller Zweiklang ("Ding-Dong") für Position i.O.
          playNote(587.33, 0, 0.16, 0.25);
          playNote(880.0, 0.16, 0.28, 0.28);
        } else if (type === 'countdown_tick') {
          // Klarer Sport-Countdown-Piepton (5 - 4 - 3 - 2 - 1)
          playNote(659.25, 0, 0.14, 0.26);
        } else if (type === 'countdown_go') {
          // Hoher Start-Ton ("LOS!")
          playNote(1046.5, 0, 0.42, 0.34);
        } else if (type === 'dart_detected') {
          // Kurzer Bestätigungs-Ping pro geworfenem Dart (1/3, 2/3, 3/3)
          playNote(783.99, 0, 0.12, 0.22);
        } else if (type === 'finish') {
          // Dreiklang bei erfolgreichem Auto-Stopp nach 3 Darts
          playNote(523.25, 0, 0.14, 0.25);
          playNote(659.25, 0.14, 0.14, 0.25);
          playNote(1046.5, 0.28, 0.32, 0.30);
        }
      } catch {}
    },
    [voiceControlEnabled]
  );

  // Deutsche Sprachausgabe (Text-to-Speech) für freihändiges Coaching am Oche
  const speakCoachMessage = useCallback(
    (text: string, priority: boolean = false) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (!voiceControlEnabled && !priority) return;
      try {
        if (priority) {
          window.speechSynthesis.cancel();
        } else if (window.speechSynthesis.speaking) {
          return;
        }
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'de-DE';
        utter.rate = 1.06;
        utter.pitch = 1.0;
        window.speechSynthesis.speak(utter);
        lastVoiceFeedbackTimestampRef.current = Date.now();
      } catch {}
    },
    [voiceControlEnabled]
  );

  const stopCameraStream = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    isCountingDownRef.current = false;
    setCountdownRemaining(null);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    isLiveRecordingRef.current = false;
    setIsLiveRecording(false);

    if (speechRecognitionRef.current) {
      try {
        (speechRecognitionRef.current as { onend: null; stop: () => void }).onend = null;
        (speechRecognitionRef.current as { stop: () => void }).stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    setIsListeningVoice(false);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    if (typeof document !== 'undefined' && document.fullscreenElement) {
      try {
        document.exitFullscreen().catch(() => {});
      } catch {}
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsLiveCameraActive(false);
  }, []);

  // Kompletter Abbruch des Vollbild-Kameramodus (verwirft laufende Aufnahme/Countdown und kehrt zur App zurück)
  const handleCancelLiveCamera = useCallback(() => {
    isCancelledRecordingRef.current = true;
    recordedChunksRef.current = [];
    autoAnalyzeAfterRecordRef.current = false;
    stopCameraStream();
    if (!videoSrc) {
      setHasUploadedVideo(false);
    }
    setStatusMessage('Kamera-Modus abgebrochen. Du bist wieder in der normalen App-Ansicht.');
  }, [stopCameraStream, videoSrc]);

  // Zurück zur aufgeräumten Need-to-Know Start-Ansicht (Stufe 1: Neues Video aufnehmen oder hochladen)
  const handleResetToStartScreen = useCallback(() => {
    isCancelledRecordingRef.current = true;
    recordedChunksRef.current = [];
    autoAnalyzeAfterRecordRef.current = false;
    stopCameraStream();
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(null);
    setHasUploadedVideo(false);
    setIsPlaying(false);
    setIsScanning(false);
    isScanningRef.current = false;
    setIsAnalysisLocked(false);
    setSnapshots(null);
    setBaselinePose(null);
    setCurrentPose(null);
    currentPoseRef.current = null;
    poseTimelineRef.current = [];
    setStatusMessage('Schritt 1: Wähle dein Wurf-Video aus oder starte die Vollbild-Kamera.');
  }, [stopCameraStream, videoSrc]);

  // Ellenbogen-Innenwinkel über Engine-Modul
  const calcElbowAngle = useCallback(
    (pose: PoseKeypoints, dims = videoDims): number => calculateElbowAngle(pose, dims),
    [videoDims]
  );

  // Maßstab mmPerPx über Engine-Modul
  const getMmPerPx = useCallback(
    (base: PoseKeypoints | null, dims = videoDims): number => {
      if (calibrationMethod === 'board_height') {
        const px = boardRefPixels > 50 ? boardRefPixels : Math.round(dims.height * 0.72);
        return calculateMmPerPxWithReference(base, dims, playerHeightCm, {
          method: 'board_height',
          referenceDistanceMm: BBDV_STANDARDS.BULLSEYE_HEIGHT_MM,
          referencePixelLength: px,
        });
      }
      if (calibrationMethod === 'oche_marker') {
        const px = ocheRefPixels > 20 ? ocheRefPixels : 160;
        return calculateMmPerPxWithReference(base, dims, playerHeightCm, {
          method: 'oche_marker',
          referenceDistanceMm: BBDV_STANDARDS.OCHE_WIDTH_MIN_MM,
          referencePixelLength: px,
        });
      }
      return calculateMmPerPx(base, dims, playerHeightCm);
    },
    [videoDims, playerHeightCm, calibrationMethod, boardRefPixels, ocheRefPixels]
  );

  // Millimeter-Abweichungen über Engine-Modul
  const calcDeviations = useCallback(
    (pose: PoseKeypoints, base: PoseKeypoints, dims = videoDims) =>
      calculatePoseDeviations(pose, base, dims, playerHeightCm, {
        method: calibrationMethod,
        referenceDistanceMm:
          calibrationMethod === 'board_height'
            ? BBDV_STANDARDS.BULLSEYE_HEIGHT_MM
            : calibrationMethod === 'oche_marker'
            ? BBDV_STANDARDS.OCHE_WIDTH_MIN_MM
            : undefined,
        referencePixelLength:
          calibrationMethod === 'board_height'
            ? boardRefPixels
            : calibrationMethod === 'oche_marker'
            ? ocheRefPixels
            : undefined,
      }),
    [videoDims, playerHeightCm, calibrationMethod, boardRefPixels, ocheRefPixels]
  );

  // Robuste MediaPipe Initialisierung mit High-Precision Full-Modell (33+7 Punkte) & GPU -> CPU Fallback!
  const referenceBoneLengthsRef = useRef<{ upperArmNorm: number; forearmNorm: number } | null>(null);

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
        const modelCandidates = [
          '/models/pose_landmarker_full.task',
          '/models/pose_landmarker_lite.task',
        ];

        for (const modelPath of modelCandidates) {
          try {
            landmarker = await PoseLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: modelPath,
                delegate: 'GPU',
              },
              runningMode: 'IMAGE',
              numPoses: 1,
              minPoseDetectionConfidence: 0.40,
              minPosePresenceConfidence: 0.40,
            });
            if (landmarker) break;
          } catch {
            try {
              landmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath: modelPath,
                  delegate: 'CPU',
                },
                runningMode: 'IMAGE',
                numPoses: 1,
                minPoseDetectionConfidence: 0.40,
                minPosePresenceConfidence: 0.40,
              });
              if (landmarker) break;
            } catch {}
          }
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

  // Pose über das unsichtbare 40-Punkte-Körpernetz (33 MediaPipe + 7 virtuelle Biomechanik-Knoten) berechnen
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
          const quality = evaluatePoseQuality(lm, handedness);
          setLandmarkQuality(quality);

          const detectedPose = buildHiddenBiomechanicalRig(
            lm,
            handedness,
            referenceBoneLengthsRef.current,
            { width: w, height: h }
          );

          // Referenz-Knochenlängen am ersten stabilen Frame verankern
          if (
            !referenceBoneLengthsRef.current &&
            detectedPose.hiddenRig &&
            detectedPose.isHighConfidence &&
            detectedPose.hiddenRig.forearmLengthNorm > 0.05
          ) {
            referenceBoneLengthsRef.current = {
              upperArmNorm: detectedPose.hiddenRig.upperArmLengthNorm,
              forearmNorm: detectedPose.hiddenRig.forearmLengthNorm,
            };
          }

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
    currentPoseRef.current = null;
    poseTimelineRef.current = [];
    lastValidPoseRef.current = null;
    referenceBoneLengthsRef.current = null;
    setSnapshots(null);
    setIsPlaying(false);
    setIsAnalysisLocked(false);
    setTrajectories([
      { id: 1, points: [], releaseSpeedKmh: 21.4, launchAngleDeg: 14.2, elbowDropMm: -3.2 },
      { id: 2, points: [], releaseSpeedKmh: 21.1, launchAngleDeg: 13.8, elbowDropMm: -4.1 },
      { id: 3, points: [], releaseSpeedKmh: 21.6, launchAngleDeg: 14.9, elbowDropMm: -2.8 },
    ]);
    autoTriggerStateRef.current = {
      inDrawback: false,
      hasReachedDrawback: false,
      prevWristY: 0,
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
    setBoardRefPixels(Math.round(h * 0.72));
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
    // Falls das Video gerade per Sprachsteuerung & 3-Dart-Auto-Stopp aufgenommen wurde:
    // Direkt im Anschluss vollautomatisch die 70-Punkte-Analyse starten!
    if (autoAnalyzeAfterRecordRef.current && !isLiveCameraActive) {
      autoAnalyzeAfterRecordRef.current = false;
      setTimeout(() => {
        handleRunBiomechanicsAnalysis();
      }, 280);
    }
  };

  // Stoppt die laufende Live-Aufnahme (automatisch nach 3 Darts oder per Sprachbefehl "Stopp")
  const handleStopLiveRecording = useCallback(
    (reason: 'auto_3_darts' | 'voice_stop' | 'manual_stop' = 'auto_3_darts') => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      isCountingDownRef.current = false;
      setCountdownRemaining(null);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        playCoachTone('finish');
        if (reason === 'auto_3_darts') {
          speakCoachMessage(
            'Drei Darts erkannt! Aufnahme beendet. Ich berechne jetzt deine Wurfanalyse.',
            true
          );
        } else {
          speakCoachMessage('Aufnahme gestoppt. Ich starte jetzt die Wurfanalyse.', true);
        }
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      isLiveRecordingRef.current = false;
      setIsLiveRecording(false);
    },
    [playCoachTone, speakCoachMessage]
  );

  // Startet die eigentliche Videoaufzeichnung nach Ablauf des 5-Sekunden-Countdowns
  const beginMediaRecordingNow = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.srcObject) return;
    const stream = video.srcObject as MediaStream;

    recordedChunksRef.current = [];
    const initialCounter = createInitialLiveThrowCounter();
    liveThrowCounterRef.current = initialCounter;
    setLiveThrowCounter(initialCounter);
    recordingStartTimestampRef.current = performance.now();
    setLiveRecordingElapsedSec(0);

    let mimeType = 'video/webm;codecs=vp9';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else {
        mimeType = '';
      }
    }

    try {
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        if (isCancelledRecordingRef.current) {
          recordedChunksRef.current = [];
          isCancelledRecordingRef.current = false;
          stopCameraStream();
          return;
        }
        const blobType = mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: blobType });
        stopCameraStream();

        if (blob.size > 0) {
          if (videoSrc) {
            URL.revokeObjectURL(videoSrc);
          }
          const url = URL.createObjectURL(blob);
          autoAnalyzeAfterRecordRef.current = true;
          setZoomMode('upper_body');
          setVideoSrc(url);
          setHasUploadedVideo(true);
          setStatusMessage(
            '✓ 3-Dart-Aufnahme abgeschlossen! Starte automatische 70-Punkte-Wurfanalyse...'
          );
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      isLiveRecordingRef.current = true;
      setIsLiveRecording(true);
      setStatusMessage(
        captureSessionMode === 'single_visit_3_darts'
          ? '🔴 AUFNAHME LÄUFT: Wirf jetzt deine 3 Darts (Auto-Stopp nach Dart 3 aktiv)!'
          : '🔴 LEG-AUFNAHME LÄUFT: Multi-Visit-Erkennung aktiv (Sage „Stopp“ zum Beenden).'
      );
    } catch (err) {
      console.error('MediaRecorder Fehler:', err);
      setStatusMessage('Hinweis: Videoaufnahme konnte auf diesem Gerät nicht gestartet werden.');
    }
  }, [captureSessionMode, stopCameraStream, videoSrc]);

  // Startet den 5-Sekunden-Countdown ("5 - 4 - 3 - 2 - 1 - Los!") per Sprachbefehl "Start" oder Button
  const triggerFiveSecondCountdown = useCallback(() => {
    if (isCountingDownRef.current || isLiveRecordingRef.current) return;
    isCountingDownRef.current = true;
    let remaining = DEFAULT_CAPTURE_CONFIG.countdownSeconds; // 5 Sekunden
    setCountdownRemaining(remaining);

    const germanNumbers: Record<number, string> = {
      5: 'Fünf',
      4: 'Vier',
      3: 'Drei',
      2: 'Zwei',
      1: 'Eins',
    };

    playCoachTone('countdown_tick');
    speakCoachMessage(germanNumbers[remaining] || String(remaining), true);
    setStatusMessage(`⏱️ Countdown läuft: Noch ${remaining} Sekunden bis Aufnahmestart...`);

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdownRemaining(remaining);
        playCoachTone('countdown_tick');
        speakCoachMessage(germanNumbers[remaining] || String(remaining), true);
        setStatusMessage(`⏱️ Countdown läuft: Noch ${remaining} Sekunden...`);
      } else {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        isCountingDownRef.current = false;
        setCountdownRemaining(0);
        playCoachTone('countdown_go');
        speakCoachMessage('Los! Wirf deine drei Darts.', true);
        beginMediaRecordingNow();
        setTimeout(() => {
          setCountdownRemaining(null);
        }, 900);
      }
    }, 1000);
  }, [beginMediaRecordingNow, playCoachTone, speakCoachMessage]);

  // Startet die kontinuierliche deutsche Spracherkennung (Web Speech API)
  const startVoiceCommandListener = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsListeningVoice(false);
      return;
    }

    if (speechRecognitionRef.current) {
      try {
        (speechRecognitionRef.current as { stop: () => void }).stop();
      } catch {}
    }

    try {
      const recognition = new SpeechRec() as {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      recognition.lang = 'de-DE';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript.toLowerCase().trim() + ' ';
        }
        const cleaned = transcript.trim();
        if (!cleaned) return;
        setLastHeardCommand(cleaned);

        // 0. Sprachbefehl: "Abbrechen" / "Schließen" / "Zurück" -> Komplett abbrechen & zurück zur App
        if (/(?:^|\s)(abbrechen|abbruch|schliessen|schließen|zurück|zurueck)(?:$|\s)/i.test(cleaned)) {
          handleCancelLiveCamera();
          return;
        }

        // 1. Sprachbefehl: "Start" / "Aufnahme" / "Los" -> 5-Sekunden-Countdown starten
        if (
          !isLiveRecordingRef.current &&
          !isCountingDownRef.current &&
          /(?:^|\s)(start|starten|aufnahme|los|bereit|countdown)(?:$|\s)/i.test(cleaned)
        ) {
          triggerFiveSecondCountdown();
          return;
        }

        // 2. Sprachbefehl: "Stopp" / "Fertig" / "Analyse" -> Aufnahme beenden & auswerten
        if (
          isLiveRecordingRef.current &&
          /(?:^|\s)(stopp|stop|fertig|ende|analyse|auswerten)(?:$|\s)/i.test(cleaned)
        ) {
          handleStopLiveRecording('voice_stop');
          return;
        }

        // 3. Sprachbefehl: "Position" / "Position i.O." / "Check" / "Stehe ich gut" -> Sofortige Ansage
        if (/(?:^|\s)(position|check|bild|stehe|gut|ok|okay)(?:$|\s)/i.test(cleaned)) {
          const currentPoseNow = currentPoseRef.current;
          const check = evaluateFramingAndPosition(currentPoseNow, handedness);
          setFramingCheck(check);
          if (check.isPositionIO) {
            playCoachTone('position_io');
          }
          speakCoachMessage(check.voicePrompt, true);
        }
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        // Automatisch weiterhören, solange die Live-Kamera aktiv ist
        if (speechRecognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      setIsListeningVoice(true);
    } catch {
      setIsListeningVoice(false);
    }
  }, [handedness, handleCancelLiveCamera, handleStopLiveRecording, playCoachTone, speakCoachMessage, triggerFiveSecondCountdown]);

  // Öffnet die Live-Kamera inkl. Positions-Prüfer ("Position i.O.") & Sprachsteuerung
  const handleStartLiveVoiceCoach = useCallback(
    async (preferredFacing: 'environment' | 'user' = cameraFacingMode) => {
      stopCameraStream();
      await ensureLandmarker();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: preferredFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60 },
          },
          audio: false,
        });

        isCancelledRecordingRef.current = false;
        setCameraFacingMode(preferredFacing);
        setIsLiveCameraActive(true);
        setHasUploadedVideo(true);
        setIsAnalysisLocked(false);
        setZoomMode('full'); // Volles Kamerabild für die Positionierung am Oche
        positionIoStreakRef.current = 0;
        hasAnnouncedPositionIoRef.current = false;
        const resetCounter = createInitialLiveThrowCounter();
        liveThrowCounterRef.current = resetCounter;
        setLiveThrowCounter(resetCounter);

        setTimeout(async () => {
          if (liveFullscreenContainerRef.current && liveFullscreenContainerRef.current.requestFullscreen) {
            try {
              await liveFullscreenContainerRef.current.requestFullscreen();
            } catch {}
          }
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            video.muted = true;
            try {
              await video.play();
            } catch {}
          }
        }, 60);

        if (voiceControlEnabled) {
          startVoiceCommandListener();
        }

        speakCoachMessage(
          'Kamera-Assistent aktiv. Stelle dich ans Oche. Ich melde mich automatisch mit Position in Ordnung, sobald du komplett im Blick bist.',
          true
        );
        setStatusMessage(
          '🎙️ Live-Kamera & Sprachsteuerung aktiv: Stelle dich ans Oche. Bei „Position i.O.“ einfach „Start“ rufen (5s Countdown + Auto-Stopp nach 3 Darts)!'
        );
      } catch (err) {
        console.error('Kamera-Zugriff nicht möglich:', err);
        setStatusMessage(
          '⚠️ Kamera konnte nicht geöffnet werden. Bitte Kamera-Berechtigung im Browser erlauben.'
        );
      }
    },
    [
      cameraFacingMode,
      ensureLandmarker,
      speakCoachMessage,
      startVoiceCommandListener,
      stopCameraStream,
      voiceControlEnabled,
    ]
  );

  // Echtzeit-Schleife während Live-Kamera: Prüft 4x/Sekunde "Position i.O." & zählt im Aufnahmemodus die 3 Darts!
  useEffect(() => {
    if (!isLiveCameraActive) return;

    const interval = setInterval(() => {
      const detected = detectPoseOnCurrentFrame();
      currentPoseRef.current = detected;
      setCurrentPose(detected);

      const check = evaluateFramingAndPosition(detected, handedness);
      setFramingCheck(check);

      // A) WÄHREND DER POSITIONIERUNG (Vor dem Countdown):
      if (!isLiveRecordingRef.current && !isCountingDownRef.current) {
        if (check.isPositionIO) {
          positionIoStreakRef.current += 1;
          // Sobald der Spieler ~1 Sekunde stabil perfekt im Bild steht -> Automatisch "Position i.O." melden!
          if (positionIoStreakRef.current >= 4 && !hasAnnouncedPositionIoRef.current) {
            hasAnnouncedPositionIoRef.current = true;
            playCoachTone('position_io');
            speakCoachMessage(
              'Position in Ordnung! Alle 70 Punkte im Blick. Sage Start für den 5-Sekunden-Countdown.',
              true
            );
          }
        } else {
          positionIoStreakRef.current = 0;
          if (check.status === 'missing') {
            hasAnnouncedPositionIoRef.current = false;
          }
          // Gezielte Sprach-Korrektur alle 6.5 Sekunden, falls der Spieler angeschnitten im Bild steht
          const now = Date.now();
          if (
            check.status === 'adjust' &&
            now - lastVoiceFeedbackTimestampRef.current > 6500
          ) {
            speakCoachMessage(check.voicePrompt, false);
          }
        }
      }

      // B) WÄHREND DER LAUFENDEN VIDEOAUFNAHME: Live-3-Dart-Zähler & Auto-Stopp!
      if (isLiveRecordingRef.current) {
        const elapsed = (performance.now() - recordingStartTimestampRef.current) / 1000;
        setLiveRecordingElapsedSec(Math.round(elapsed * 10) / 10);

        const { nextState, justDetectedDartNumber } = updateLiveThrowCounter(
          liveThrowCounterRef.current,
          detected,
          videoDims,
          elapsed,
          {
            ...DEFAULT_CAPTURE_CONFIG,
            mode: captureSessionMode,
          }
        );

        liveThrowCounterRef.current = nextState;
        setLiveThrowCounter(nextState);

        if (justDetectedDartNumber !== null) {
          playCoachTone('dart_detected');
          if (justDetectedDartNumber < 3 || captureSessionMode === 'full_leg_multi_visit') {
            speakCoachMessage(`Dart ${justDetectedDartNumber}`, true);
          }
        }

        // Automatischer Stopp nach 3 Darts (+ 1.2s Nachlauf für kompletten Follow-Through)
        // oder Sicherheits-Timeout nach 35s im 3-Dart-Modus
        if (
          nextState.shouldAutoStop ||
          (captureSessionMode === 'single_visit_3_darts' && elapsed >= 35.0)
        ) {
          handleStopLiveRecording('auto_3_darts');
        }
      }
    }, 240);

    return () => clearInterval(interval);
  }, [
    captureSessionMode,
    detectPoseOnCurrentFrame,
    handedness,
    handleStopLiveRecording,
    isLiveCameraActive,
    playCoachTone,
    speakCoachMessage,
    videoDims,
  ]);

  // ============================================================================
  // HAUPT-AKTION: AUTOMATISCHE 3-DART KINEMATIK- & WURFANALYSE (iOS-SICHER!)
  // ============================================================================
  const handleRunBiomechanicsAnalysis = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setIsPlaying(false);
    setIsScanning(true);
    isScanningRef.current = true;
    setScanProgress(5);
    setStatusMessage('Initialisiere KI-Landmarker & iOS Video-Decoder...');

    // Während der Analyse noch keine Kurven anzeigen
    setTrajectories([
      { id: 1, points: [], releaseSpeedKmh: 21.4, launchAngleDeg: 14.2, elbowDropMm: -3.2 },
      { id: 2, points: [], releaseSpeedKmh: 21.1, launchAngleDeg: 13.8, elbowDropMm: -4.1 },
      { id: 3, points: [], releaseSpeedKmh: 21.6, launchAngleDeg: 14.9, elbowDropMm: -2.8 },
    ]);

    // 1. Sicherstellen, dass MediaPipe geladen ist
    await ensureLandmarker();

    // 2. WICHTIG FÜR iOS SAFARI: Hardware-Frame-Decoder im User-Click-Handler aufwecken!
    try {
      video.muted = true;
      await video.play();
      video.pause();
    } catch {}

    const vidDuration = video.duration || 10;
    const isSlowMo =
      videoMode === 'slowmo'
        ? true
        : videoMode === 'realtime'
        ? false
        : vidDuration > 32;

    // 3. Zuverlässiges Seek mit echtem Frame-Flush
    const seekTo = (t: number) =>
      new Promise<void>((resolve) => {
        let resolved = false;
        const finish = () => {
          if (!resolved) {
            resolved = true;
            video.removeEventListener('seeked', onSeeked);
            requestAnimationFrame(() => {
              setTimeout(resolve, 18);
            });
          }
        };
        const onSeeked = () => finish();
        video.addEventListener('seeked', onSeeked);
        video.currentTime = Math.max(0.02, Math.min(vidDuration - 0.02, t));
        setTimeout(finish, 400);
      });

    const throwIntervals = calculateThrowScanIntervals(vidDuration, isSlowMo);

    // 4. Ausgangsposition / Nullpunkt am Übergabepunkt von Dart 1 ermitteln
    await seekTo(throwIntervals[0].startSec);
    const initialDetected = detectPoseOnCurrentFrame();
    const base = baselinePose?.isRealDetection ? baselinePose : initialDetected;
    setBaselinePose(base);
    baselineTimeRef.current = throwIntervals[0].startSec;

    const mmPerPx = getMmPerPx(base, videoDims);
    const newTrajectories: ThrowTrajectory[] = [];
    const masterTimeline: TimelinePoseFrame[] = [];

    // Nullpunkt am Videoanfang verankern
    await seekTo(0.1);
    const startVideoPose = detectPoseOnCurrentFrame();
    masterTimeline.push({
      timeSec: 0,
      pose: startVideoPose.isRealDetection ? startVideoPose : base,
    });

    // Einige Stützframes vor Dart 1 für flüssiges Skelett-Tracking vor dem ersten Wurf
    if (throwIntervals[0].startSec > 2.0) {
      const preSteps = 3;
      for (let s = 1; s <= preSteps; s++) {
        const tPre = (throwIntervals[0].startSec * s) / (preSteps + 1);
        await seekTo(tPre);
        const pPre = detectPoseOnCurrentFrame();
        masterTimeline.push({ timeSec: tPre, pose: pPre });
      }
    }

    let dart1Snapshots: Record<PhaseKey, PhaseSnapshot> | null = null;

    setStatusMessage(
      'Vermesse komplette Handgelenk-Kurven ab Hüfthöhe (Übergabepunkt) für Dart 1, Dart 2 und Dart 3...'
    );

    for (let throwIdx = 0; throwIdx < throwIntervals.length; throwIdx++) {
      const th = throwIntervals[throwIdx];
      const numSteps = isSlowMo ? 65 : 45;
      const stepSec = Math.max(0.03, (th.endSec - th.startSec) / numSteps);

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

        masterTimeline.push({
          timeSec: t,
          pose,
        });

        const overallProgress = Math.round(
          ((throwIdx * (numSteps + 1) + (i + 1)) / (throwIntervals.length * (numSteps + 1))) * 100
        );
        setScanProgress(overallProgress);
      }

      // Zwischen-Frames in der Pause bis zum nächsten Dart scannen (nur für flüssige Skelett-Rückführung zur Hüfte, OHNE Linien-Aufzeichnung!)
      if (throwIdx < throwIntervals.length - 1) {
        const nextStart = throwIntervals[throwIdx + 1].startSec;
        const gapDur = nextStart - th.endSec;
        if (gapDur > 1.0) {
          const gapSteps = 4;
          for (let g = 1; g <= gapSteps; g++) {
            const tGap = th.endSec + (gapDur * g) / (gapSteps + 1);
            await seekTo(tGap);
            const pGap = detectPoseOnCurrentFrame();
            masterTimeline.push({ timeSec: tGap, pose: pGap });
          }
        }
      }

      // Berechne die durchgehende, ungeglättete Handgelenks-Trajektorie vom Übergabepunkt (Hüfthöhe) bis Follow-Through!
      const built = buildAnatomicalArmTrajectory(scannedFrames, videoDims, handedness, throwIdx);
      const kin = computeThrowKinematics(
        built.points,
        videoDims,
        mmPerPx,
        isSlowMo,
        slowMoFps === 120 ? 4.0 : 8.0,
        built.releaseFrame.timeSec
      );
      const worstElbowDrop = Math.min(
        built.drawbackFrame.deltaElbowY_mm,
        built.releaseFrame.deltaElbowY_mm
      );

      const factor = isSlowMo ? (slowMoFps === 120 ? 4.0 : 8.0) : 1.0;
      const accelMs = Math.max(
        75,
        Math.min(
          340,
          Math.round(
            (Math.abs(built.releaseFrame.timeSec - built.drawbackFrame.timeSec) / factor) * 1000
          )
        )
      );

      newTrajectories.push({
        id: throwIdx + 1,
        points: built.points,
        releaseSpeedKmh: kin.releaseSpeedKmh,
        launchAngleDeg: kin.launchAngleDeg,
        elbowDropMm: worstElbowDrop,
        drawbackTimeSec: built.drawbackFrame.timeSec,
        releaseTimeSec: built.releaseFrame.timeSec,
        followThroughTimeSec: built.followThroughFrame.timeSec,
        drawbackElbowAngleDeg: built.drawbackFrame.elbowAngle,
        releaseElbowAngleDeg: built.releaseFrame.elbowAngle,
        followThroughElbowAngleDeg: built.followThroughFrame.elbowAngle,
        accelerationDurationMs: accelMs,
        drawbackPose: built.drawbackFrame.pose,
        releasePose: built.releaseFrame.pose,
        followThroughPose: built.followThroughFrame.pose,
        releasePoint: {
          x: built.releaseFrame.pose.wrist.x,
          y: built.releaseFrame.pose.wrist.y,
        },
        drawbackPoint: {
          x: built.drawbackFrame.pose.wrist.x,
          y: built.drawbackFrame.pose.wrist.y,
        },
        followThroughPoint: {
          x: built.followThroughFrame.pose.wrist.x,
          y: built.followThroughFrame.pose.wrist.y,
        },
      });

      if (throwIdx === 0) {
        dart1Snapshots = {
          baseline: {
            key: 'baseline',
            title: '1. Übergabepunkt',
            subtitle: 'Start ab Hüfthöhe',
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

    // 5. Nach Abschluss der Analyse direkt in Schritt 1 der 5-Schritt Durchklick-Analyse springen
    // und den Oberkörper-Ausschnitt automatisch auf den erkannten Spieler zentrieren!
    if (base) {
      const cx = Math.round(Math.max(18, Math.min(82, ((base.shoulder.x + base.elbow.x + base.wrist.x) / 3) * 100)));
      const cy = Math.round(Math.max(18, Math.min(82, ((base.head.y * 0.8 + base.shoulder.y + base.hip.y * 1.1) / 2.9) * 100)));
      setCustomCrop((prev) => ({ ...prev, centerX: cx, centerY: cy }));
    }

    const firstDrawbackSec = newTrajectories[0]?.drawbackTimeSec ?? 0.2;
    await seekTo(firstDrawbackSec);
    const initialPoseAtDrawback = newTrajectories[0]?.drawbackPose || detectPoseOnCurrentFrame();
    const readyPose = initialPoseAtDrawback.isRealDetection ? initialPoseAtDrawback : base;
    masterTimeline.push({
      timeSec: vidDuration,
      pose: masterTimeline[masterTimeline.length - 1]?.pose || readyPose,
    });
    masterTimeline.sort((a, b) => a.timeSec - b.timeSec);
    poseTimelineRef.current = masterTimeline;

    currentPoseRef.current = readyPose;
    setCurrentPose(readyPose);
    setCurrentTime(firstDrawbackSec);

    // Die 3 ermittelten Original-Wurfkurven hinterlegen
    setTrajectories(newTrajectories);
    setIsAnalysisLocked(true);
    setActiveThrowIdx(-1);
    setGuidedStep(1);
    setActivePhase('drawback');
    if (dart1Snapshots) {
      setSnapshots(dart1Snapshots);
    }
    setShowOverlay(true);
    setShowTrajectory(true);
    isScanningRef.current = false;
    setIsScanning(false);

    setStatusMessage(
      '✓ 3-Dart-Analyse bereit! Klicke dich rechts mit „Weiter ▶“ durch die 5 Vergleichs-Schritte (Dart 1 vs. Dart 2 vs. Dart 3) oder drücke „Abspielen“.'
    );
  };

  // 5-Schritt Durchklick-Analyse (Springt automatisch an die passende Stelle im Video & zeigt das Feedback)
  const handleSelectGuidedStep = useCallback(
    (step: GuidedAnalysisStep, targetDartIdx: number = 0) => {
      setGuidedStep(step);
      setShowOverlay(true);
      setShowTrajectory(true);

      const tr = trajectories[targetDartIdx] || trajectories[0];
      const video = videoRef.current;
      if (!video || !tr) return;

      video.pause();
      setIsPlaying(false);

      let targetSec = video.currentTime;
      let targetPose: PoseKeypoints | null = null;

      if (step === 1) {
        targetSec = tr.drawbackTimeSec ?? snapshots?.drawback?.timeSec ?? 0.5;
        targetPose = tr.drawbackPose || snapshots?.drawback?.pose || null;
        setActivePhase('drawback');
      } else if (step === 2) {
        targetSec = tr.releaseTimeSec ?? snapshots?.release?.timeSec ?? 1.0;
        targetPose = tr.releasePose || snapshots?.release?.pose || null;
        setActiveThrowIdx(-1);
        setActivePhase('release');
      } else if (step === 3) {
        targetSec = tr.releaseTimeSec ?? snapshots?.release?.timeSec ?? 1.0;
        targetPose = tr.releasePose || snapshots?.release?.pose || null;
        setActivePhase('release');
      } else if (step === 4) {
        targetSec = tr.followThroughTimeSec ?? snapshots?.follow_through?.timeSec ?? 1.2;
        targetPose = tr.followThroughPose || snapshots?.follow_through?.pose || null;
        setActivePhase('follow_through');
      } else {
        targetSec = tr.releaseTimeSec ?? snapshots?.release?.timeSec ?? 1.0;
        targetPose = tr.releasePose || snapshots?.release?.pose || null;
        setActiveThrowIdx(-1);
        setActivePhase('release');
      }

      video.currentTime = Math.max(0.05, targetSec);
      setCurrentTime(Math.max(0.05, targetSec));
      if (targetPose) {
        currentPoseRef.current = targetPose;
        setCurrentPose(targetPose);
      } else if (poseTimelineRef.current.length > 0) {
        const interp = getInterpolatedPose(poseTimelineRef.current, targetSec);
        if (interp) {
          currentPoseRef.current = interp;
          setCurrentPose(interp);
        }
      }
    },
    [snapshots, trajectories]
  );

  // Automatischer Oberkörper-Mittelpunkt + frei wählbarer Custom-Crop-Mittelpunkt
  const autoUpperBodyCenter = useMemo(() => {
    const p = baselinePose || snapshots?.baseline?.pose || currentPose;
    if (p) {
      const cxRaw = (p.shoulder.x + p.elbow.x + p.wrist.x) / 3;
      const cyRaw = (p.head.y * 0.8 + p.shoulder.y + p.hip.y * 1.1) / 2.9;
      const cx = Math.round(Math.max(15, Math.min(85, cxRaw * 100)));
      const cy = Math.round(Math.max(15, Math.min(85, cyRaw * 100)));
      return { cx, cy };
    }
    return { cx: 52, cy: 42 };
  }, [baselinePose, snapshots, currentPose]);

  const dynamicZoomOrigin = useMemo(() => {
    if (zoomMode === 'custom') {
      return `${customCrop.centerX}% ${customCrop.centerY}%`;
    }
    return `${autoUpperBodyCenter.cx}% ${autoUpperBodyCenter.cy}%`;
  }, [zoomMode, customCrop.centerX, customCrop.centerY, autoUpperBodyCenter]);

  const activeZoomScale = useMemo(() => {
    if (zoomMode === 'full') return 1.0;
    if (zoomMode === 'custom') return customCrop.zoom;
    return 2.15;
  }, [zoomMode, customCrop.zoom]);

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

    const isSlowMo = videoMode === 'slowmo' || (videoMode === 'auto' && duration > 40);
    const currentMmPerPx = getMmPerPx(baselinePose || currentPose, videoDims);
    const slowMoFactor = slowMoFps === 120 ? 4.0 : 8.0;
    const dispersion = calculateThreeDartDispersion(
      trajectories,
      videoDims,
      currentMmPerPx,
      isSlowMo,
      slowMoFactor
    );
    const selfComparison = evaluateThreeDartSelfComparison(
      trajectories,
      videoDims,
      currentMmPerPx,
      isSlowMo,
      slowMoFactor
    );

    const releaseHeightMm = (currentPose || baselinePose)
      ? calculateVerticalReleaseHeightMm((currentPose || baselinePose)!, videoDims, currentMmPerPx, playerHeightCm)
      : 1950;
    const ballisticTrajectory = computeBallisticFlightTrajectory(
      speedKmh,
      launchAngle,
      releaseHeightMm,
      BBDV_STANDARDS.HORIZONTAL_DISTANCE_MM,
      BBDV_STANDARDS.BULLSEYE_HEIGHT_MM
    );

    return {
      speedKmh,
      launchAngle,
      elbowDropMm,
      shoulderDriftMm,
      isElbowDropping,
      isLaunchOptimal,
      consistencyScore: selfComparison.repeatabilityScorePct || consistencyScore,
      dispersion,
      selfComparison,
      liveDev,
      releaseHeightMm,
      ballisticTrajectory,
      coreAngles: (currentPose || baselinePose)
        ? extractFiveCoreAngles(
            (currentPose || baselinePose)!,
            videoDims,
            snapshots?.drawback.elbowAngle,
            snapshots?.release.elbowAngle,
            snapshots?.follow_through.elbowAngle
          )
        : {
            stanceAngleDeg: 174.5,
            drawbackAngleDeg: 52.0,
            releaseAngleDeg: 116.0,
            followThroughAngleDeg: 164.0,
            trunkLeanAngleDeg: 11.2,
          },
      coreValidation: validateFiveCoreAngles(
        (currentPose || baselinePose)
          ? extractFiveCoreAngles(
              (currentPose || baselinePose)!,
              videoDims,
              snapshots?.drawback.elbowAngle,
              snapshots?.release.elbowAngle,
              snapshots?.follow_through.elbowAngle
            )
          : {
              stanceAngleDeg: 174.5,
              drawbackAngleDeg: 52.0,
              releaseAngleDeg: 116.0,
              followThroughAngleDeg: 164.0,
              trunkLeanAngleDeg: 11.2,
            },
        (baselinePose || currentPose)
          ? extractFiveCoreAngles(
              (baselinePose || currentPose)!,
              videoDims,
              snapshots?.drawback.elbowAngle,
              snapshots?.release.elbowAngle,
              snapshots?.follow_through.elbowAngle
            )
          : {
              stanceAngleDeg: 174.5,
              drawbackAngleDeg: 52.0,
              releaseAngleDeg: 116.0,
              followThroughAngleDeg: 164.0,
              trunkLeanAngleDeg: 11.2,
            }
      ),
    };
  }, [trajectories, activeThrowIdx, currentPose, baselinePose, calcDeviations, snapshots, videoDims, getMmPerPx, videoMode, duration, slowMoFps, playerHeightCm]);

  // ============================================================================
  // CANVAS OVERLAY RENDERING (INKL. LAUNCH-RADAR, SPEED-CHIP & ABSACK-ALARM)
  // ============================================================================
  const renderCanvasOverlay = useCallback((poseOverride?: PoseKeypoints) => {
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
      ctx.fillText('D1 (Blau) | D2 (Cyan) | D3 (Violett) • 1:1 Original-Spur ab Hüfthöhe', 14 * scale, 38 * scale);
    }

    const activePoseForOverlay = poseOverride || currentPoseRef.current || currentPose;
    const vidTime = videoRef.current ? videoRef.current.currentTime : currentTime;

    // 1. UNGEGLÄTTETE 1:1 HANDGELENK-TRAJEKTORIEN AB HÜFTHÖHE (ZEITSYNCHRON BEIM ABSPIELEN)
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
        const fullPts = tr.points;
        if (fullPts.length < 2) return;

        // Beim aktiven Abspielen wachsen die Kurven zeitsynchron mit der Armbewegung;
        // im pausierten Analyse-/Durchklick-Modus sind alle 3 Kurven vollständig zum Vergleich sichtbar!
        let pts: TrajectoryPoint[];
        if (isAnalysisLocked && isPlaying) {
          const filtered = fullPts.filter((pt) => pt.timeSec <= vidTime + 0.025);
          const firstTime = fullPts[0].timeSec;
          const lastTime = fullPts[fullPts.length - 1].timeSec;
          if (
            vidTime >= firstTime &&
            vidTime <= lastTime &&
            activePoseForOverlay &&
            filtered.length >= 1
          ) {
            pts = [
              ...filtered,
              {
                x: activePoseForOverlay.wrist.x,
                y: activePoseForOverlay.wrist.y,
                timeSec: vidTime,
              },
            ];
          } else {
            pts = filtered;
          }
        } else {
          pts = fullPts;
        }

        // Solange der Spieler diesen Dart noch nicht am Übergabepunkt (Hüfthöhe) aufgenommen hat: Noch keine Kurve zeigen!
        if (pts.length < 2) return;

        const color = colors[(tr.id - 1) % colors.length];

        ctx.strokeStyle = color;
        // 1. Soft Glow (Leuchtkontur im Hintergrund - exakt 1:1 auf den Handgelenkspunkten ohne Glättung)
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 3.8 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x * w, pts[0].y * h);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x * w, pts[i].y * h);
        }
        ctx.stroke();

        // 2. Feingranulare Laser-Kernlinie (1:1 jede Bewegung des Handgelenks ohne Glättung)
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 1.8 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(pts[0].x * w, pts[0].y * h);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x * w, pts[i].y * h);
        }
        ctx.stroke();

        ctx.globalAlpha = 1.0;

        // Startpunkt am Übergabepunkt (Hüfthöhe)
        const first = pts[0];
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(first.x * w, first.y * h, 3.0 * scale, 0, Math.PI * 2);
        ctx.fill();

        const releaseSec = tr.releaseTimeSec ?? fullPts[fullPts.length - 1].timeSec;
        const hasReachedRelease = !isAnalysisLocked || !isPlaying || vidTime >= releaseSec;

        // In Schritt 1 (Ausholen) zusätzlich den Umkehrpunkt (Drawback) jedes Darts klar markieren
        if (tr.drawbackPoint && (!isPlaying || guidedStep === 1)) {
          const dbx = tr.drawbackPoint.x * w;
          const dby = tr.drawbackPoint.y * h;
          ctx.save();
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(dbx, dby, (guidedStep === 1 ? 4.4 : 2.8) * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = (guidedStep === 1 ? 1.6 : 1.0) * scale;
          ctx.stroke();
          if (guidedStep === 1) {
            const dbLabel = `D${tr.id} (${tr.drawbackElbowAngleDeg ?? 54}°)`;
            ctx.font = `bold ${Math.round(8.5 * scale)}px sans-serif`;
            const dlw = ctx.measureText(dbLabel).width;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
            ctx.beginPath();
            ctx.roundRect(dbx - dlw - 10 * scale, dby - 7 * scale, dlw + 6 * scale, 13 * scale, 3 * scale);
            ctx.fill();
            ctx.fillStyle = '#fde68a';
            ctx.fillText(dbLabel, dbx - dlw - 7 * scale, dby + 2.5 * scale);
          }
          ctx.restore();
        }

        if (!hasReachedRelease) {
          // Aktuelle Handgelenks-Spitze während des Hochführens / Ausholens markieren
          const tip = pts[pts.length - 1];
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(tip.x * w, tip.y * h, 3.4 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2 * scale;
          ctx.stroke();
        } else {
          // Release-Punkt (Apex) + Launch-Vektor + Badge anzeigen
          const last = fullPts[fullPts.length - 1];
          const rx = tr.releasePoint ? tr.releasePoint.x * w : last.x * w;
          const ry = tr.releasePoint ? tr.releasePoint.y * h : last.y * h;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(rx, ry, (guidedStep === 3 ? 4.8 : 3.8) * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.3 * scale;
          ctx.stroke();

          // LAUNCH-ANGLE-RADAR: Feiner Tangential-Pfeil am Release für den ersten/aktiven Wurf
          if (idx === 0 || guidedStep === 3) {
            const deg = tr.launchAngleDeg ?? 14.2;
            const rad = (-deg * Math.PI) / 180;
            const arrowLen = 26 * scale;
            const ax = rx + Math.cos(rad) * arrowLen;
            const ay = ry + Math.sin(rad) * arrowLen;

            ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
            ctx.lineWidth = 1.6 * scale;
            ctx.setLineDash([3 * scale, 2 * scale]);
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(ax, ay);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Dezenter Mini-Badge (je nach aktivem Durchklick-Schritt mit winkel- oder geschwindigkeitsspezifischer Info)
          const badgeLabel =
            guidedStep === 4
              ? `D${tr.id}: ${tr.releaseSpeedKmh} km/h (${tr.accelerationDurationMs ?? 145} ms)`
              : guidedStep === 3
              ? `D${tr.id}: @${tr.releaseElbowAngleDeg ?? 114}°`
              : throwsToRender.length === 1 && tr.releaseSpeedKmh
              ? `D${tr.id} • ${tr.releaseSpeedKmh} km/h • ${tr.launchAngleDeg ?? 14}°`
              : `D${tr.id}`;
          ctx.font = `bold ${Math.round(9.5 * scale)}px sans-serif`;
          const tw = ctx.measureText(badgeLabel).width;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.beginPath();
          ctx.roundRect(rx + 6 * scale, ry - 8 * scale + (idx - 1) * 12 * scale, tw + 8 * scale, 14 * scale, 4 * scale);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.fillText(badgeLabel, rx + 10 * scale, ry + 2.5 * scale + (idx - 1) * 12 * scale);
        }
      });

      // SCHRITT 2 SPEZIAL-OVERLAY: Punkt der größten Bahn-Abweichung zwischen Dart 1, 2 und 3 hervorheben!
      if (!isPlaying && guidedStep === 2 && throwsToRender.length >= 2) {
        const divPt = activeMetrics.selfComparison.maxPathDivergence.point;
        const dx = divPt.x * w;
        const dy = divPt.y * h;
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
        ctx.lineWidth = 1.6 * scale;
        ctx.setLineDash([3 * scale, 3 * scale]);
        ctx.beginPath();
        ctx.arc(dx, dy, 14 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const divLabel = `Max. Bahn-Δ: ${activeMetrics.selfComparison.maxPathDivergence.spreadMm} mm`;
        ctx.font = `bold ${Math.round(8.5 * scale)}px sans-serif`;
        const dlw = ctx.measureText(divLabel).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(dx - (dlw + 8 * scale) / 2, dy - 28 * scale, dlw + 8 * scale, 13 * scale, 3 * scale);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.fillText(divLabel, dx - dlw / 2, dy - 18.5 * scale);
        ctx.restore();
      }

      // VISUELLE 3-DART RELEASE-STREUUNGSELLIPSE & LOSLASS-DREIECK:
      const completedReleases = throwsToRender.filter((tr) => {
        const relSec = tr.releaseTimeSec ?? tr.points[tr.points.length - 1]?.timeSec ?? 0;
        return !isAnalysisLocked || !isPlaying || vidTime >= relSec;
      });

      if (
        completedReleases.length > 1 &&
        activeMetrics.dispersion.releaseDispersionMm > 0
      ) {
        const releasePts = completedReleases.map((tr) => {
          const pt = tr.releasePoint || (tr.points.length > 0 ? tr.points[tr.points.length - 1] : { x: 0.5, y: 0.3 });
          return { x: pt.x * w, y: pt.y * h };
        });

        const meanX = releasePts.reduce((sum, p) => sum + p.x, 0) / releasePts.length;
        const meanY = releasePts.reduce((sum, p) => sum + p.y, 0) / releasePts.length;
        const currentMmPerPx = getMmPerPx(baselinePose || currentPose, videoDims);
        const radiusPx = Math.max(
          8 * scale,
          ((activeMetrics.dispersion.releaseDispersionMm / (currentMmPerPx || 1.1)) / 2)
        );

        ctx.save();
        // Zarter Glow-Hintergrund
        ctx.fillStyle =
          activeMetrics.dispersion.dispersionRating === 'EXZELLENT'
            ? 'rgba(16, 185, 129, 0.10)'
            : activeMetrics.dispersion.dispersionRating === 'STABIL'
            ? 'rgba(6, 182, 212, 0.10)'
            : 'rgba(245, 158, 11, 0.10)';
        ctx.beginPath();
        ctx.arc(meanX, meanY, radiusPx, 0, Math.PI * 2);
        ctx.fill();

        // Feine gestrichelte Begrenzungskontur
        ctx.strokeStyle =
          activeMetrics.dispersion.dispersionRating === 'EXZELLENT'
            ? 'rgba(52, 211, 153, 0.75)'
            : activeMetrics.dispersion.dispersionRating === 'STABIL'
            ? 'rgba(34, 211, 238, 0.75)'
            : 'rgba(251, 191, 36, 0.75)';
        ctx.lineWidth = 1.2 * scale;
        ctx.setLineDash([3 * scale, 3 * scale]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cluster-Mittelpunkt Fadenkreuz (Zentroid)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0 * scale;
        ctx.beginPath();
        ctx.moveTo(meanX - 4 * scale, meanY);
        ctx.lineTo(meanX + 4 * scale, meanY);
        ctx.moveTo(meanX, meanY - 4 * scale);
        ctx.lineTo(meanX, meanY + 4 * scale);
        ctx.stroke();

        // Cluster-Label Badge: Ø <mm> mm
        const clusterLabel = `Ø ${activeMetrics.dispersion.releaseDispersionMm} mm`;
        ctx.font = `bold ${Math.round(8.5 * scale)}px sans-serif`;
        const clw = ctx.measureText(clusterLabel).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.beginPath();
        ctx.roundRect(meanX - (clw + 8 * scale) / 2, meanY - radiusPx - 16 * scale, clw + 8 * scale, 13 * scale, 3 * scale);
        ctx.fill();
        ctx.fillStyle =
          activeMetrics.dispersion.dispersionRating === 'EXZELLENT'
            ? '#6ee7b7'
            : activeMetrics.dispersion.dispersionRating === 'STABIL'
            ? '#67e8f9'
            : '#fde68a';
        ctx.fillText(clusterLabel, meanX - clw / 2, meanY - radiusPx - 6.5 * scale);
        ctx.restore();
      }
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
    const p = poseOverride || currentPose;
    if (p) {
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
        ctx.fillStyle = j.color;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 3.2 * scale, 0, Math.PI * 2);
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

      // Optionaler Engine-Röntgenblick (Standardmäßig unsichtbar in der UI; nur bei aktiviertem Experten-Debug sichtbar)
      if (showHiddenRigDebug && p.hiddenRig) {
        const rig = p.hiddenRig;
        const lm = rig.rawLandmarks;
        const sn = rig.syntheticNodes;

        // 1. Virtuelle Wirbelsäule (C7 -> T8 -> CoM)
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.lineWidth = 2.0 * scale;
        ctx.beginPath();
        ctx.moveTo(sn.neckC7.x * w, sn.neckC7.y * h);
        ctx.lineTo(sn.thoraxT8.x * w, sn.thoraxT8.y * h);
        ctx.lineTo(sn.pelvisCoM.x * w, sn.pelvisCoM.y * h);
        ctx.stroke();

        // 2. Wurfhand-Polygon & Haltehand-Dreieck
        if (lm.length >= 23) {
          const drawPoly = (indices: number[], col: string) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.4 * scale;
            ctx.beginPath();
            ctx.moveTo(lm[indices[0]].x * w, lm[indices[0]].y * h);
            for (let i = 1; i < indices.length; i++) {
              ctx.lineTo(lm[indices[i]].x * w, lm[indices[i]].y * h);
            }
            ctx.closePath();
            ctx.stroke();
          };
          drawPoly([16, 18, 20, 22], 'rgba(74, 222, 128, 0.85)');
          drawPoly([15, 17, 19, 21], 'rgba(56, 189, 248, 0.85)');
        }

        // 3. Alle 33 nativen MediaPipe-Punkte (0..32)
        lm.forEach((pt) => {
          ctx.fillStyle =
            pt.id <= 10
              ? '#38bdf8'
              : [12, 14, 16, 18, 20, 22].includes(pt.id)
              ? '#4ade80'
              : [11, 13, 15, 17, 19, 21].includes(pt.id)
              ? '#60a5fa'
              : '#e879f9';
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, 2.2 * scale, 0, Math.PI * 2);
          ctx.fill();
        });

        // 4. Die 7 virtuellen Basis-Knoten (#33..#39)
        const synthList: Array<{ pt: { x: number; y: number }; label: string }> = [
          { pt: sn.dartGripPoint, label: 'P_Dart' },
          { pt: sn.supplyHandCenter, label: 'P_Supply' },
          { pt: sn.neckC7, label: 'C7' },
          { pt: sn.thoraxT8, label: 'T8' },
          { pt: sn.pelvisCoM, label: 'CoM' },
          { pt: sn.forearmPivotAnchor, label: 'L_Arm' },
        ];
        if (rig.isBimanualHandover) {
          synthList.push({ pt: sn.handoverPoint, label: 'P_Handover' });
        }
        ctx.font = `bold ${Math.round(8 * scale)}px monospace`;
        synthList.forEach((s) => {
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(s.pt.x * w, s.pt.y * h, 3.2 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillText(s.label, s.pt.x * w + 5 * scale, s.pt.y * h + 3 * scale);
        });

        // 5. +30 Hochauflösende Sub-Punkte: Handgelenk (W1..W10), Arm (A1..A10), Ellenbogen (E1..E10)
        rig.wristCluster10?.forEach((node) => {
          ctx.fillStyle = '#22d3ee'; // Cyan für +10 Handgelenk-Punkte
          ctx.beginPath();
          ctx.arc(node.x * w, node.y * h, 2.3 * scale, 0, Math.PI * 2);
          ctx.fill();
        });
        rig.armCluster10?.forEach((node) => {
          ctx.fillStyle = '#34d399'; // Smaragd für +10 Arm-Fachwerkpunkte
          ctx.beginPath();
          ctx.arc(node.x * w, node.y * h, 2.3 * scale, 0, Math.PI * 2);
          ctx.fill();
        });
        rig.elbowCluster10?.forEach((node) => {
          ctx.fillStyle = '#fb923c'; // Orange/Gold für +10 Ellenbogen-Kapselpunkte
          ctx.beginPath();
          ctx.arc(node.x * w, node.y * h, 2.4 * scale, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
  }, [
    viewMode,
    showOverlay,
    currentPose,
    baselinePose,
    showGhostBaseline,
    calcElbowAngle,
    showTrajectory,
    showPlumbLine,
    showFootTriangle,
    showHiddenRigDebug,
    trajectories,
    activeThrowIdx,
    isAnalysisLocked,
    isPlaying,
    guidedStep,
    currentTime,
    activeMetrics.isElbowDropping,
    activeMetrics.dispersion.dispersionRating,
    activeMetrics.dispersion.releaseDispersionMm,
    activeMetrics.selfComparison.maxPathDivergence,
    getMmPerPx,
    videoDims,
  ]);

  useEffect(() => {
    renderCanvasOverlay();
  }, [renderCanvasOverlay]);

  // 60-FPS FLÜSSIGE SKELETT-WIEDERGABE OHNE KI-LATENZ (ENTKOPPELTE DUPLIKATION)
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastSliderUpdate = 0;

    const tick = () => {
      const vid = videoRef.current;
      if (vid && !vid.paused) {
        const cur = vid.currentTime;
        if (Math.abs(cur - lastSliderUpdate) > 0.065) {
          lastSliderUpdate = cur;
          setCurrentTime(cur);
        }

        if (poseTimelineRef.current.length > 0) {
          const pose = getInterpolatedPose(poseTimelineRef.current, cur);
          if (pose) {
            currentPoseRef.current = pose;
            renderCanvasOverlay(pose);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying, renderCanvasOverlay]);

  // Berechnet das exakte Pixel-Rechteck (sx, sy, sw, sh) für den frei gewählten Oberkörper-/Custom-Ausschnitt
  const computeExportCropRect = useCallback(
    (cropType: 'active_crop' | 'full', w: number, h: number) => {
      if (cropType === 'full') {
        return { sx: 0, sy: 0, sw: w, sh: h };
      }
      const scale = zoomMode === 'custom' ? customCrop.zoom : zoomMode === 'upper_body' ? 2.15 : customCrop.zoom;
      const cx = zoomMode === 'custom' ? customCrop.centerX : autoUpperBodyCenter.cx;
      const cy = zoomMode === 'custom' ? customCrop.centerY : autoUpperBodyCenter.cy;
      const ox = (cx / 100) * w;
      const oy = (cy / 100) * h;
      const sx = Math.max(0, Math.min(w - w / scale, ox * (1 - 1 / scale)));
      const sy = Math.max(0, Math.min(h - h / scale, oy * (1 - 1 / scale)));
      const sw = Math.max(80, Math.min(w - sx, w / scale));
      const sh = Math.max(80, Math.min(h - sy, h / scale));
      return { sx, sy, sw, sh };
    },
    [zoomMode, customCrop.zoom, customCrop.centerX, customCrop.centerY, autoUpperBodyCenter]
  );

  // Zeichnet ein vollständiges Export-Bild (Video+Kurven ODER Nur Kurven, im gewählten Ausschnitt + 3-Dart-Vergleichs-Stempel)
  const drawCompositeExportFrame = useCallback(
    (
      targetCanvas: HTMLCanvasElement,
      mode: 'video' | 'isolated',
      cropType: 'active_crop' | 'full'
    ) => {
      const srcCanvas = canvasRef.current;
      const video = videoRef.current;
      if (!srcCanvas) return;

      const w = srcCanvas.width || videoDims.width;
      const h = srcCanvas.height || videoDims.height;
      if (targetCanvas.width !== w || targetCanvas.height !== h) {
        targetCanvas.width = w;
        targetCanvas.height = h;
      }

      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      const { sx, sy, sw, sh } = computeExportCropRect(cropType, w, h);
      const scale = Math.max(1, Math.min(w, h) / 500);

      ctx.clearRect(0, 0, w, h);

      if (mode === 'video' && video && video.readyState >= 2) {
        ctx.fillStyle = '#050814';
        ctx.fillRect(0, 0, w, h);
        try {
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
        } catch {}
      } else {
        // Dunkles Biomechanik-Analyse-Grid ("Nur Kurven")
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
      }

      // Überlagere den exakt gleichen Ausschnitt des Kurven-/Skelett-Canvas
      try {
        ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, w, h);
      } catch {}

      // Kompaktes 3-Dart-Selbstvergleichs-Banner unten einbrennen
      const d1 = activeMetrics.selfComparison.darts[0];
      const d2 = activeMetrics.selfComparison.darts[1];
      const d3 = activeMetrics.selfComparison.darts[2];
      const barH = Math.round(66 * scale);
      const barY = h - barH - Math.round(10 * scale);
      const barX = Math.round(12 * scale);
      const barW = w - Math.round(24 * scale);

      ctx.fillStyle = 'rgba(5, 8, 20, 0.88)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 10 * scale);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 1.2 * scale;
      ctx.stroke();

      ctx.font = `bold ${Math.round(10.5 * scale)}px sans-serif`;
      ctx.fillStyle = '#10b981';
      ctx.fillText(
        `LIONS 3-DART SELBSTVERGLEICH • KONSTANZ: ${activeMetrics.selfComparison.repeatabilityScorePct}% • FLUGZEIT: ~${activeMetrics.ballisticTrajectory.flightTimeMs} ms • LOSLASS-SPANNE: ${activeMetrics.selfComparison.pairwiseReleaseMm.maxSpreadMm} mm`,
        barX + 12 * scale,
        barY + 18 * scale
      );

      ctx.font = `bold ${Math.round(9.5 * scale)}px monospace`;
      ctx.fillStyle = '#60a5fa';
      ctx.fillText(
        `D1: ${d1.releaseSpeedKmh} km/h (${d1.accelerationDurationMs}ms) | Aushol ${d1.drawbackAngleDeg}° | Release ${d1.releaseAngleDeg}°`,
        barX + 12 * scale,
        barY + 36 * scale
      );
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(
        `D2: ${d2.releaseSpeedKmh} km/h (${d2.accelerationDurationMs}ms) | Aushol ${d2.drawbackAngleDeg}° | Release ${d2.releaseAngleDeg}°`,
        barX + 12 * scale,
        barY + 50 * scale
      );
      ctx.fillStyle = '#c084fc';
      ctx.fillText(
        `D3: ${d3.releaseSpeedKmh} km/h (${d3.accelerationDurationMs}ms) | Aushol ${d3.drawbackAngleDeg}° | Release ${d3.releaseAngleDeg}°`,
        barX + 12 * scale,
        barY + 62 * scale
      );
    },
    [
      videoDims,
      computeExportCropRect,
      activeMetrics.selfComparison,
      activeMetrics.ballisticTrajectory.flightTimeMs,
    ]
  );

  // 1. Speichern als hochauflösendes Bild (.png) auf dem Endgerät (mit Modus- & Ausschnitt-Wahl)
  const handleDownloadAnalysisImage = (
    modeOverride?: 'video' | 'isolated',
    cropOverride?: 'active_crop' | 'full'
  ) => {
    const chosenMode = modeOverride ?? exportRenderMode;
    const chosenCrop = cropOverride ?? exportCropMode;
    try {
      renderCanvasOverlay();
      const exportCanvas = document.createElement('canvas');
      drawCompositeExportFrame(exportCanvas, chosenMode, chosenCrop);
      const link = document.createElement('a');
      const modeTag = chosenMode === 'video' ? 'Video_plus_Kurven' : 'Nur_Kurven';
      const cropTag = chosenCrop === 'active_crop' ? 'Ausschnitt' : 'Vollbild';
      link.download = `Lions_3Dart_${modeTag}_${cropTag}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
      setStatusMessage(
        `✓ Analyse-Bild (${chosenMode === 'video' ? 'Video + Kurven' : 'Nur Kurven'} · ${chosenCrop === 'active_crop' ? 'Gewählter Ausschnitt' : 'Volles Bild'}) auf deinem Gerät gespeichert!`
      );
    } catch (err) {
      console.error('Export-Fehler:', err);
    }
  };

  // 2. Speichern als komplettes Analyse-Video (.webm / .mp4) auf dem Endgerät (mit Modus- & Ausschnitt-Wahl)
  const handleDownloadAnalysisVideo = async () => {
    const video = videoRef.current;
    const srcCanvas = canvasRef.current;
    if (!video || !srcCanvas || isExportingVideo) return;

    setIsExportingVideo(true);
    setExportVideoProgress(5);
    setStatusMessage(
      `🎥 Erzeuge Analyse-Video (${exportRenderMode === 'video' ? 'Video + Kurven' : 'Nur Kurven'} · ${exportCropMode === 'active_crop' ? 'Gewählter Ausschnitt' : 'Volles Bild'}) für dein Endgerät...`
    );

    try {
      video.pause();
      setIsPlaying(false);

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = srcCanvas.width || videoDims.width;
      exportCanvas.height = srcCanvas.height || videoDims.height;

      const stream = exportCanvas.captureStream(30);
      let mimeType = 'video/webm;codecs=vp9';
      let fileExt = 'webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
          fileExt = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
          fileExt = 'webm';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
          fileExt = 'webm';
        } else {
          mimeType = '';
        }
      }

      const chunks: Blob[] = [];
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4500000 })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const donePromise = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start(100);

      // Rendere die relevanten Wurf-Phasen flüssig in das Export-Video (ca. 90 Frames = ~3-4 Sekunden kompaktes Analyse-Video)
      const vidDur = Math.max(2, video.duration || 10);
      const startSec = trajectories[0]?.points?.[0]?.timeSec ?? 0.1;
      const endSec =
        trajectories[2]?.followThroughTimeSec ??
        trajectories[2]?.points?.[trajectories[2].points.length - 1]?.timeSec ??
        vidDur - 0.1;
      const totalSteps = 75;

      const seekFrame = (t: number) =>
        new Promise<void>((res) => {
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              video.removeEventListener('seeked', finish);
              requestAnimationFrame(() => setTimeout(res, 22));
            }
          };
          video.addEventListener('seeked', finish);
          video.currentTime = Math.max(0.05, Math.min(vidDur - 0.05, t));
          setTimeout(finish, 260);
        });

      for (let i = 0; i <= totalSteps; i++) {
        const t = startSec + ((endSec - startSec) * i) / totalSteps;
        await seekFrame(t);
        setCurrentTime(t);
        const interpPose =
          poseTimelineRef.current.length > 0
            ? getInterpolatedPose(poseTimelineRef.current, t)
            : currentPoseRef.current;
        if (interpPose) {
          currentPoseRef.current = interpPose;
        }
        renderCanvasOverlay(interpPose || undefined);
        drawCompositeExportFrame(exportCanvas, exportRenderMode, exportCropMode);
        setExportVideoProgress(Math.round(((i + 1) / (totalSteps + 1)) * 100));
      }

      recorder.stop();
      await donePromise;

      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const modeTag = exportRenderMode === 'video' ? 'Video_plus_Kurven' : 'Nur_Kurven';
      const cropTag = exportCropMode === 'active_crop' ? 'Ausschnitt' : 'Vollbild';
      a.href = url;
      a.download = `Lions_3Dart_Analyse_${modeTag}_${cropTag}_${new Date().toISOString().slice(0, 10)}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setStatusMessage(
        `✓ Analyse-Video (${exportRenderMode === 'video' ? 'Video + Kurven' : 'Nur Kurven'} · ${exportCropMode === 'active_crop' ? 'Gewählter Ausschnitt' : 'Volles Bild'}) erfolgreich auf deinem Endgerät gespeichert!`
      );
    } catch (err) {
      console.error('Video-Export Fehler:', err);
      setStatusMessage('Hinweis: Video-Export konnte nicht abgeschlossen werden. Nutze alternativ den PNG-Bild-Download.');
    } finally {
      setIsExportingVideo(false);
      setExportVideoProgress(0);
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
      createdAt: new Date().toISOString(),
      playerName: user.name,
      consistencyScore: activeMetrics.consistencyScore,
      releaseSpeedKmh: activeMetrics.speedKmh,
      launchAngleDeg: activeMetrics.launchAngle,
      elbowDropMm: activeMetrics.elbowDropMm,
      shoulderDriftMm: activeMetrics.shoulderDriftMm,
      drawbackAngle: snapshots?.drawback.elbowAngle ?? 58.0,
      releaseAngle: snapshots?.release.elbowAngle ?? 98.5,
      followThroughAngle: snapshots?.follow_through.elbowAngle ?? 158.0,
      stanceAngle: activeMetrics.coreAngles.stanceAngleDeg,
      trunkLeanAngle: activeMetrics.coreAngles.trunkLeanAngleDeg,
      landmarkConfidenceScore: Math.round(landmarkQuality.averageConfidence * 100),
      isHighConfidenceDetection: landmarkQuality.isHighConfidence,
      releaseDispersionMm: activeMetrics.dispersion.releaseDispersionMm,
      speedStdDevKmh: activeMetrics.dispersion.speedStdDevKmh,
      launchAngleStdDevDeg: activeMetrics.dispersion.launchAngleStdDevDeg,
      dispersionRating: activeMetrics.dispersion.dispersionRating,
      calibrationMethod: calibrationMethod,
      videoMode:
        videoMode === 'slowmo' ||
        (videoMode === 'auto' && (videoRef.current?.duration ?? 0) > 32)
          ? 'Slow-Motion'
          : 'Echtzeit',
    };

    const updated = [newEntry, ...savedSessions].slice(0, 15);
    setSavedSessions(updated);
    try {
      localStorage.setItem(`lions_biomechanics_${user.name}`, JSON.stringify(updated));
    } catch {}

    // Optionale Speicherung in Supabase gem. §10 AGENTS.md (0 Bytes Video-Rohdaten)
    saveBiomechanicsSessionAction({
      player_id: user.id,
      player_name: user.name,
      consistency_score: newEntry.consistencyScore,
      release_speed_kmh: newEntry.releaseSpeedKmh,
      launch_angle_deg: newEntry.launchAngleDeg,
      elbow_drop_mm: newEntry.elbowDropMm,
      shoulder_drift_mm: newEntry.shoulderDriftMm,
      drawback_angle_deg: newEntry.drawbackAngle,
      release_angle_deg: newEntry.releaseAngle,
      follow_through_angle_deg: newEntry.followThroughAngle,
      stance_angle_deg: newEntry.stanceAngle,
      trunk_lean_angle_deg: newEntry.trunkLeanAngle,
      landmark_confidence_pct: newEntry.landmarkConfidenceScore,
      is_high_confidence: newEntry.isHighConfidenceDetection,
      release_dispersion_mm: newEntry.releaseDispersionMm,
      speed_std_dev_kmh: newEntry.speedStdDevKmh,
      launch_angle_std_dev_deg: newEntry.launchAngleStdDevDeg,
      dispersion_rating: newEntry.dispersionRating,
      calibration_method: newEntry.calibrationMethod,
      video_mode: newEntry.videoMode,
    }).catch(() => {});

    setIsSaved(true);
    setStatusMessage('✓ Biomechanik-Steckbrief im Spielerprofil gespeichert (On-Device & Cloud-Sync)!');
    setTimeout(() => setIsSaved(false), 3500);
  };

  const handleDeleteSavedSession = (id: string) => {
    const updated = savedSessions.filter((s) => s.id !== id);
    setSavedSessions(updated);
    try {
      localStorage.setItem(`lions_biomechanics_${user.name}`, JSON.stringify(updated));
    } catch {}

    // Optionale Löschung in Supabase (DSGVO §10.3)
    deleteBiomechanicsSessionAction(id).catch(() => {});
  };

  const handleExportSessionJson = (session: SavedBiomechanicsSession) => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(session, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `biomechanik_${(session.playerName || 'spieler').replace(/\s+/g, '_')}_${session.dateStr.replace(/[:. ]/g, '-')}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setStatusMessage('✓ Biomechanik-Steckbrief erfolgreich als JSON exportiert!');
    } catch (err) {
      console.error('Export-Fehler:', err);
    }
  };

  const handlePrintSession = () => {
    try {
      window.print();
    } catch (err) {
      console.error('Druck-Fehler:', err);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      if (currentPoseRef.current) {
        setCurrentPose(currentPoseRef.current);
      }
      setCurrentTime(video.currentTime);
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
    if (poseTimelineRef.current.length > 0) {
      const cached = getInterpolatedPose(poseTimelineRef.current, nextTime);
      if (cached) {
        currentPoseRef.current = cached;
        setCurrentPose(cached);
        renderCanvasOverlay(cached);
        setShowOverlay(true);
        return;
      }
    }
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
      if (poseTimelineRef.current.length > 0) {
        const cached = getInterpolatedPose(poseTimelineRef.current, val);
        if (cached) {
          currentPoseRef.current = cached;
          setCurrentPose(cached);
          renderCanvasOverlay(cached);
          return;
        }
      }
      setTimeout(() => {
        const detected = detectPoseOnCurrentFrame();
        if (detected.isRealDetection) {
          setCurrentPose(detected);
        }
      }, 65);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-4 space-y-4 animate-fadeIn touch-pan-y">
      {/* 1. KOMPAKTER HEADER (Need-to-Know) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            data-ui-id="VIDEO.NAV.BACK_BTN"
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-bold transition-all shrink-0 cursor-pointer"
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
                PRO ENGINE 3.6
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Technische Analyse-Schalter & "Neues Video" (Ergänzung 4) NUR in Stufe 2 anzeigen */}
          {hasUploadedVideo && !isLiveCameraActive && (
            <>
              <button
                type="button"
                onClick={handleResetToStartScreen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-xs font-black transition-all cursor-pointer shadow-sm"
                title="Aktuelles Video schließen und zurück zur Start-Auswahl"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
                <span>🔄 Neues Video</span>
              </button>

              <button
                onClick={() => setAutoTriggerEnabled(!autoTriggerEnabled)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[40px] rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  autoTriggerEnabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
                title="Erkennt Aushol- und Abwurfbewegungen beim Abspielen automatisch"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Trigger: {autoTriggerEnabled ? 'AN' : 'AUS'}</span>
              </button>

              <div className="inline-flex items-center rounded-xl bg-slate-900 border border-white/10 p-0.5 text-[11px]">
                <button
                  onClick={() => setVideoMode('auto')}
                  className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    videoMode === 'auto'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Erkennt Slow-Mo automatisch anhand der Video-Laufzeit"
                >
                  Auto
                </button>
                <button
                  onClick={() => setVideoMode('slowmo')}
                  className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    videoMode === 'slowmo'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Slow-Mo Modus (120/240 FPS Zeitlupe)"
                >
                  Slow-Mo
                </button>
                <button
                  onClick={() => setVideoMode('realtime')}
                  className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    videoMode === 'realtime'
                      ? 'bg-cyan-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Echtzeit-Modus (30 FPS Standard)"
                >
                  30 FPS
                </button>
              </div>
            </>
          )}

          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 text-slate-300 border border-white/10 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% On-Device</span>
          </span>
        </div>
      </div>

      {/* ============================================================================
          STUFE 1: AUFGERÄUMTE START-ANSICHT (NUR NEED-TO-KNOW + ERGÄNZUNGEN 2 & 3)
         ============================================================================ */}
      {!hasUploadedVideo && !isLiveCameraActive ? (
        <div className="max-w-2xl mx-auto w-full py-2 sm:py-6 space-y-4">
          {/* 2 große Need-to-Know Haupt-Aktionen: 1. Video aufnehmen | 2. Video hochladen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Haupt-Aktion 1: Video aufnehmen (Vollbild-Kamera + Sprach-Coach) */}
            <button
              type="button"
              onClick={() => handleStartLiveVoiceCoach(cameraFacingMode)}
              className="group relative flex flex-col justify-between p-6 min-h-[190px] rounded-3xl bg-gradient-to-br from-emerald-500/20 via-slate-900/95 to-slate-950 hover:from-emerald-500/30 border-2 border-emerald-500/50 hover:border-emerald-400 text-left shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Camera className="w-7 h-7 stroke-[2.4]" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  <Mic className="w-3 h-3" />
                  <span>Sprach-Coach</span>
                </span>
              </div>

              <div className="mt-5 space-y-1.5">
                <div className="text-lg sm:text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                  🎙️ Video aufnehmen
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Öffnet die <strong className="text-emerald-300">100% Vollbild-Kamera</strong> mit „Position i.O.“-Ansage, 5s-Countdown auf Zuruf („Start“) und Auto-Stopp nach 3 Darts.
                </p>
              </div>
            </button>

            {/* Haupt-Aktion 2: Video hochladen (Aus Galerie wählen) */}
            <label className="group relative flex flex-col justify-between p-6 min-h-[190px] rounded-3xl bg-gradient-to-br from-cyan-500/15 via-slate-900/95 to-slate-950 hover:from-cyan-500/25 border-2 border-cyan-500/40 hover:border-cyan-400 text-left shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all cursor-pointer active:scale-[0.99]">
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Upload className="w-7 h-7 stroke-[2.2]" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                  Galerie / Datei
                </span>
              </div>

              <div className="mt-5 space-y-1.5">
                <div className="text-lg sm:text-xl font-black text-white group-hover:text-cyan-300 transition-colors">
                  📁 Video hochladen
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Wähle ein vorhandenes Smartphone-Video (Echtzeit oder <strong className="text-cyan-300">120/240 FPS Slow-Mo</strong>) aus deiner Mediathek.
                </p>
              </div>
              <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {/* ERGÄNZUNG 2: Kompakte Wurfarm-Vorauswahl (Rechtshänder | Linkshänder) direkt unter den 2 Karten */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="text-base">✋</span>
              <div>
                <div className="text-xs font-black text-white">Wurfarm-Vorauswahl</div>
                <div className="text-[11px] text-slate-400">
                  Für Kamera-Positionsprüfung („Position i.O.“) & 70-Punkte-Armnetz
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setHandedness('right')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-xs font-black transition-all cursor-pointer ${
                  handedness === 'right'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rechtshänder
              </button>
              <button
                type="button"
                onClick={() => setHandedness('left')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-xs font-black transition-all cursor-pointer ${
                  handedness === 'left'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Linkshänder
              </button>
            </div>
          </div>

          {/* ERGÄNZUNG 3: Eingeklappte Historie ("📂 Meine gespeicherten Analysen (X)") */}
          <div className="rounded-2xl bg-slate-900/80 border border-white/10 shadow-md overflow-hidden">
            <button
              type="button"
              onClick={() => setShowStartHistory(!showStartHistory)}
              className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>📂</span>
                <span>Meine gespeicherten Analysen ({savedSessions.length})</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                {showStartHistory ? '▲ Einklappen' : '▼ Anzeigen'}
              </span>
            </button>

            {showStartHistory && (
              <div className="p-4 pt-2 border-t border-white/10 space-y-2.5 bg-slate-950/60">
                {savedSessions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">
                    Noch keine gespeicherten Wurf-Steckbriefe auf diesem Gerät vorhanden.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        On-Device & Profil-Verlauf
                      </span>
                      <button
                        type="button"
                        onClick={handlePrintSession}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-bold cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-cyan-400" />
                        <span>Drucken</span>
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {savedSessions.map((s) => (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl bg-slate-900/90 border border-white/5 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{s.dateStr}</span>
                              <span className="text-emerald-400 font-mono">
                                {s.consistencyScore}% Konstanz
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {s.releaseSpeedKmh} km/h • +{s.launchAngleDeg}° • Ellenbogen{' '}
                              {s.elbowDropMm} mm
                              {s.releaseDispersionMm !== undefined
                                ? ` • Streuung ${s.releaseDispersionMm} mm`
                                : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleExportSessionJson(s)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 cursor-pointer"
                              title="Steckbrief als JSON exportieren"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedSession(s.id)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer"
                              title="Messung löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ============================================================================
              STUFE 2: ANALYSE-COCKPIT (NACH VIDEO-UPLOAD ODER KAMERA-AUFNAHME)
             ============================================================================ */}
          {!isLiveCameraActive && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3">
              <button
                onClick={handleRunBiomechanicsAnalysis}
                disabled={isScanning}
                className="md:col-span-8 flex items-center justify-between p-3.5 min-h-[52px] rounded-2xl border transition-all shadow-lg text-left bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 border-emerald-300 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-950/20 text-slate-950">
                    <Sparkles className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black flex items-center gap-2 flex-wrap text-slate-950">
                      <span>
                        {isScanning
                          ? `Analysiere 70-Punkte-Kinematik (${scanProgress}%)...`
                          : '🎯 Aufnahme analysieren (Alle 3 Darts)'}
                      </span>
                    </div>
                    <p className="text-[11px] truncate text-slate-900 font-semibold">
                      Berechnet echte Arm-Rotationskurven (Ausholen → Release), Speed (km/h) & Ellenbogen-Sensor
                    </p>
                  </div>
                </div>
              </button>

              {/* ERGÄNZUNG 4: "🔄 Neues Video" Button direkt neben der Analyse-Aktion */}
              <button
                type="button"
                onClick={handleResetToStartScreen}
                className="md:col-span-4 flex items-center justify-between p-3.5 min-h-[52px] rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 hover:border-cyan-400/50 text-white transition-all shadow-md cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      🔄 Neues Video
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      Zurück zur Start-Auswahl
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* 3. HAUPT-GRID: LINKS VIDEO-VIEWPORT, RECHTS NEED-TO-KNOW DIAGNOSE-STECKBRIEF */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LINKE SPALTE: VIDEO & KOMPAKTE STEUERUNG */}
            <div className="lg:col-span-7 flex flex-col gap-3 min-w-0 w-full">
              {/* Kompakte Modus-, Ausschnitt- & Wurf-Auswahl */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5 shadow-md">
                {/* Zeile 1: Ansicht & Bildausschnitt (Video+Kurven | Nur Kurven | Oberkörper | Eigener Ausschnitt | Vollbild) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('video');
                      setExportRenderMode('video');
                    }}
                    className={`px-2 py-2 min-h-[42px] rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                      viewMode === 'video'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    🎬 Video + Kurven
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('isolated');
                      setExportRenderMode('isolated');
                    }}
                    className={`px-2 py-2 min-h-[42px] rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                      viewMode === 'isolated'
                        ? 'bg-cyan-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    📈 Nur Kurven
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomMode('upper_body');
                      setShowCropControls(false);
                    }}
                    className={`px-2 py-2 min-h-[42px] rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                      zoomMode === 'upper_body'
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    🎯 Auto-Oberkörper
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomMode('custom');
                      setShowCropControls((v) => !v || zoomMode !== 'custom');
                    }}
                    className={`px-2 py-2 min-h-[42px] rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                      zoomMode === 'custom'
                        ? 'bg-purple-500 text-white font-black shadow-sm border border-purple-300'
                        : 'bg-slate-950 text-purple-300 hover:text-white border border-purple-500/30'
                    }`}
                  >
                    ✂️ Ausschnitt wählen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomMode('full');
                      setShowCropControls(false);
                    }}
                    className={`col-span-2 sm:col-span-1 px-2 py-2 min-h-[42px] rounded-xl text-[11px] font-bold cursor-pointer transition-all text-center truncate ${
                      zoomMode === 'full'
                        ? 'bg-white text-slate-950 font-black shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    🧍 Gesamtkörper
                  </button>
                </div>

                {/* INTERAKTIVER AUSSCHNITT-EDITOR (Frei wählbarer Bereich für Oberkörper / Wurfarm & Export) */}
                {(zoomMode === 'custom' || showCropControls) && (
                  <div className="p-3 rounded-xl bg-slate-950/95 border border-purple-500/40 space-y-2.5 animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-black text-purple-200 flex items-center gap-1.5">
                        <span>✂️ Bildausschnitt frei definieren ({customCrop.zoom.toFixed(1)}x Zoom)</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          • Ziehe das Videobild direkt mit Finger/Maus oder nutze die Regler
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCropControls(false)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer px-2 py-0.5 rounded bg-white/5"
                      >
                        Fertig ✓
                      </button>
                    </div>

                    {/* Zoom-Stufen Regler + Schnell-Fokus-Presets */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5 flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-white/10">
                        <span className="text-[10px] font-bold text-slate-300 shrink-0">Zoom:</span>
                        <input
                          type="range"
                          min={1.2}
                          max={3.5}
                          step={0.05}
                          value={customCrop.zoom}
                          onChange={(e) => {
                            setZoomMode('custom');
                            setCustomCrop((prev) => ({ ...prev, zoom: parseFloat(e.target.value) }));
                          }}
                          className="flex-1 accent-purple-400 cursor-pointer h-1.5"
                        />
                        <span className="text-[11px] font-mono font-black text-purple-300 w-9 text-right">
                          {customCrop.zoom.toFixed(1)}x
                        </span>
                      </div>

                      <div className="sm:col-span-7 grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setZoomMode('custom');
                            setCustomCrop({
                              zoom: 2.25,
                              centerX: autoUpperBodyCenter.cx,
                              centerY: autoUpperBodyCenter.cy,
                            });
                          }}
                          className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-[10px] font-bold text-slate-200 border border-white/10 cursor-pointer truncate"
                        >
                          🎯 Oberkörper
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setZoomMode('custom');
                            const relC = activeMetrics.selfComparison.pairwiseReleaseMm.centroid;
                            setCustomCrop({
                              zoom: 2.85,
                              centerX: Math.round(Math.max(15, Math.min(85, relC.x * 100))),
                              centerY: Math.round(Math.max(15, Math.min(85, relC.y * 100))),
                            });
                          }}
                          className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 cursor-pointer truncate"
                        >
                          🚀 Loslass-Zone
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setZoomMode('custom');
                            const dbC = activeMetrics.selfComparison.pairwiseDrawbackMm.centroid;
                            setCustomCrop({
                              zoom: 2.75,
                              centerX: Math.round(Math.max(15, Math.min(85, dbC.x * 100))),
                              centerY: Math.round(Math.max(15, Math.min(85, dbC.y * 100))),
                            });
                          }}
                          className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-[10px] font-bold text-amber-300 border border-amber-500/30 cursor-pointer truncate"
                        >
                          🔄 Aushol-Zone
                        </button>
                      </div>
                    </div>

                    {/* Fein-Verschiebung (Links / Rechts / Hoch / Runter) */}
                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400">Ausschnitt verschieben:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCustomCrop((p) => ({ ...p, centerX: Math.max(12, p.centerX - 4) }))
                          }
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-200 border border-white/10 cursor-pointer"
                        >
                          ◀ Links
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomCrop((p) => ({ ...p, centerY: Math.max(12, p.centerY - 4) }))
                          }
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-200 border border-white/10 cursor-pointer"
                        >
                          ▲ Hoch
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomCrop((p) => ({ ...p, centerY: Math.min(88, p.centerY + 4) }))
                          }
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-200 border border-white/10 cursor-pointer"
                        >
                          ▼ Runter
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomCrop((p) => ({ ...p, centerX: Math.min(88, p.centerX + 4) }))
                          }
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-200 border border-white/10 cursor-pointer"
                        >
                          ▶ Rechts
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
              <div className="w-full rounded-3xl bg-slate-950 border-2 border-emerald-500/20 shadow-2xl p-2 flex flex-col items-center justify-center min-h-[340px] overflow-hidden relative">
                {zoomMode === 'custom' && !isLiveCameraActive && (
                  <div className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-lg bg-purple-950/85 border border-purple-400/50 text-[10px] font-black text-purple-200 pointer-events-none shadow-md">
                    ✂️ Eigener Ausschnitt ({customCrop.zoom.toFixed(1)}x) • Bild ziehen zum Verschieben
                  </div>
                )}
                <div
                  ref={liveFullscreenContainerRef}
                  style={
                    isLiveCameraActive
                      ? undefined
                      : { aspectRatio: `${videoDims.width} / ${videoDims.height}` }
                  }
                  className={
                    isLiveCameraActive
                      ? 'fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black flex items-center justify-center overflow-hidden'
                      : 'relative max-h-[64vh] w-auto max-w-full rounded-2xl overflow-hidden shadow-xl bg-black'
                  }
                  onMouseDown={(e) => {
                    if (zoomMode !== 'custom' || isLiveCameraActive) return;
                    cropDragRef.current = {
                      active: true,
                      startX: e.clientX,
                      startY: e.clientY,
                      origCX: customCrop.centerX,
                      origCY: customCrop.centerY,
                    };
                  }}
                  onMouseMove={(e) => {
                    if (!cropDragRef.current.active || zoomMode !== 'custom') return;
                    const dx = e.clientX - cropDragRef.current.startX;
                    const dy = e.clientY - cropDragRef.current.startY;
                    const nextCX = Math.round(Math.max(12, Math.min(88, cropDragRef.current.origCX - dx * 0.14)));
                    const nextCY = Math.round(Math.max(12, Math.min(88, cropDragRef.current.origCY - dy * 0.14)));
                    setCustomCrop((prev) => ({ ...prev, centerX: nextCX, centerY: nextCY }));
                  }}
                  onMouseUp={() => {
                    cropDragRef.current.active = false;
                  }}
                  onMouseLeave={() => {
                    cropDragRef.current.active = false;
                  }}
                  onTouchStart={(e) => {
                    if (zoomMode !== 'custom' || isLiveCameraActive || e.touches.length !== 1) return;
                    cropDragRef.current = {
                      active: true,
                      startX: e.touches[0].clientX,
                      startY: e.touches[0].clientY,
                      origCX: customCrop.centerX,
                      origCY: customCrop.centerY,
                    };
                  }}
                  onTouchMove={(e) => {
                    if (!cropDragRef.current.active || zoomMode !== 'custom' || e.touches.length !== 1) return;
                    const dx = e.touches[0].clientX - cropDragRef.current.startX;
                    const dy = e.touches[0].clientY - cropDragRef.current.startY;
                    const nextCX = Math.round(Math.max(12, Math.min(88, cropDragRef.current.origCX - dx * 0.16)));
                    const nextCY = Math.round(Math.max(12, Math.min(88, cropDragRef.current.origCY - dy * 0.16)));
                    setCustomCrop((prev) => ({ ...prev, centerX: nextCX, centerY: nextCY }));
                  }}
                  onTouchEnd={() => {
                    cropDragRef.current.active = false;
                  }}
                >
                  <div
                    style={{
                      transform: !isLiveCameraActive ? `scale(${activeZoomScale})` : 'scale(1)',
                      transformOrigin: dynamicZoomOrigin,
                    }}
                    className={`w-full h-full relative flex items-center justify-center ${
                      zoomMode === 'custom' && !isLiveCameraActive ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                  >
                  <video
                    ref={videoRef}
                    src={videoSrc ?? undefined}
                    preload="auto"
                    playsInline
                    muted
                    onLoadedMetadata={handleLoadedMetadata}
                    onLoadedData={handleLoadedData}
                    onPause={() => {
                      setIsPlaying(false);
                      if (currentPoseRef.current) {
                        setCurrentPose(currentPoseRef.current);
                      }
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      if (currentPoseRef.current) {
                        setCurrentPose(currentPoseRef.current);
                      }
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onTimeUpdate={() => {
                      if (isScanningRef.current) return;
                      const vid = videoRef.current;
                      if (!vid) return;
                      if (poseTimelineRef.current.length > 0) {
                        const cached = getInterpolatedPose(poseTimelineRef.current, vid.currentTime);
                        if (cached) {
                          currentPoseRef.current = cached;
                          renderCanvasOverlay(cached);
                        }
                        return;
                      }

                      setCurrentTime(vid.currentTime);

                      // LIVE-TRACKING & AUTO-TRIGGER WÄHREND DER WIEDERGABE (VOM ÜBERGABEPUNKT AB HÜFTHÖHE)
                      if (isPlaying || Math.abs(vid.playbackRate) > 0) {
                        const detected = detectPoseOnCurrentFrame();
                        currentPoseRef.current = detected;
                        setCurrentPose(detected);

                        if (!isAnalysisLocked && autoTriggerEnabled) {
                          const curAngle = calcElbowAngle(detected);
                          const curWrist = detected.wrist;
                          const st = autoTriggerStateRef.current;
                          const isBimanualHandover = detected.hiddenRig?.isBimanualHandover ?? false;
                          const isAtHipLevel = isBimanualHandover || curWrist.y >= detected.elbow.y + 0.01;

                          if (curAngle < st.minElbowAngle) {
                            st.minElbowAngle = curAngle;
                          }

                          // 1. Übergabepunkt unten auf Hüfthöhe: Solange die Hand unten an der Hüfte den neuen Dart greift,
                          // wird der Startpunkt für den aktuellen Dart neu an der Hüfte gesetzt.
                          if (!st.inDrawback && isAtHipLevel) {
                            st.inDrawback = true;
                            st.hasReachedDrawback = false;
                            st.bufferPts = [{ x: curWrist.x, y: curWrist.y, timeSec: vid.currentTime }];
                          } else if (st.inDrawback) {
                            // Falls die Hand zu Beginn noch leicht Richtung Hüfte absinkt, Startpunkt am tiefsten Punkt nachführen
                            if (
                              !st.hasReachedDrawback &&
                              st.bufferPts.length <= 4 &&
                              isAtHipLevel &&
                              curWrist.y >= st.prevWristY
                            ) {
                              st.bufferPts = [{ x: curWrist.x, y: curWrist.y, timeSec: vid.currentTime }];
                            } else {
                              // Jede Bewegung vom Handgelenk ab dem Übergabepunkt (Hüfthöhe) 1:1 ohne Glättung aufzeichnen!
                              const lastPt = st.bufferPts[st.bufferPts.length - 1];
                              if (!lastPt || Math.hypot(lastPt.x - curWrist.x, lastPt.y - curWrist.y) > 0.0015) {
                                st.bufferPts.push({ x: curWrist.x, y: curWrist.y, timeSec: vid.currentTime });
                              }
                            }

                            // Prüfen, ob der Arm bereits oben zum Gesicht ausgeholt hat (Drawback)
                            if (curWrist.y <= detected.elbow.y + 0.04 && curAngle < 88) {
                              st.hasReachedDrawback = true;
                            }

                            const slot = st.currentDartSlot % 3;
                            const mmPerPx = getMmPerPx(baselinePose || detected, videoDims);
                            const kin = computeThrowKinematics(
                              st.bufferPts,
                              videoDims,
                              mmPerPx,
                              (vid.duration || 0) > 40
                            );

                            if (st.bufferPts.length >= 2) {
                              setTrajectories((prev) => {
                                const next = [...prev];
                                next[slot] = {
                                  id: slot + 1,
                                  points: [...st.bufferPts],
                                  releaseSpeedKmh: kin.releaseSpeedKmh,
                                  launchAngleDeg: kin.launchAngleDeg,
                                  elbowDropMm: activeMetrics.elbowDropMm,
                                };
                                return next;
                              });
                            }

                            // Wurf abgeschlossen (Nach dem Ausholen komplett nach vorne durchgestreckt oder Arm sinkt nach Wurf wieder Richtung Hüfte):
                            // Nächste Kurve beginnt wieder neu unten am Übergabepunkt, sobald der nächste Dart genommen wird!
                            const isFollowThroughDone =
                              st.hasReachedDrawback &&
                              st.bufferPts.length >= 8 &&
                              (curAngle >= 145 || curWrist.y > detected.elbow.y + 0.04);

                            if (isFollowThroughDone) {
                              st.inDrawback = false;
                              st.hasReachedDrawback = false;
                              st.currentDartSlot = (st.currentDartSlot + 1) % 3;
                              st.bufferPts = [];
                              st.minElbowAngle = 180;
                            }
                          }

                          st.prevWristY = curWrist.y;
                        }
                      }
                    }}
                    className={`w-full h-full block ${
                      isLiveCameraActive ? 'object-contain' : 'object-fill'
                    } transition-opacity duration-200 ${
                      viewMode === 'isolated' ? 'opacity-0' : 'opacity-100'
                    }`}
                  />

                  <canvas
                    ref={canvasRef}
                    width={videoDims.width}
                    height={videoDims.height}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                </div>

                {/* VOLLBILD-KAMERA HUD: 3-METER FERN-AMPEL, SPRACH-COACH & JEDERZEITIGER ABBRUCH-BUTTON */}
                {isLiveCameraActive && (
                  <div
                    className={`absolute inset-0 pointer-events-none border-[8px] sm:border-[10px] transition-all duration-300 flex flex-col justify-between p-3 sm:p-5 ${
                      isLiveRecording
                        ? 'border-rose-500 shadow-[inset_0_0_50px_rgba(244,63,94,0.5)]'
                        : framingCheck?.isPositionIO
                        ? 'border-emerald-400 shadow-[inset_0_0_55px_rgba(16,185,129,0.5)]'
                        : framingCheck?.status === 'adjust'
                        ? 'border-amber-400 shadow-[inset_0_0_45px_rgba(251,191,36,0.4)]'
                        : 'border-rose-500/80 shadow-[inset_0_0_40px_rgba(244,63,94,0.35)]'
                    }`}
                  >
                    {/* OBERE LEISTE: FERN-AMPEL-STATUS + GROSSER "✕ ABBRECHEN"-BUTTON RECHTS OBEN */}
                    <div className="flex flex-col gap-2.5 pointer-events-auto max-w-4xl w-full mx-auto">
                      <div className="flex items-stretch gap-2.5">
                        <div
                          className={`flex-1 px-4 py-3 rounded-2xl backdrop-blur-md border text-center shadow-2xl flex flex-col justify-center ${
                            isLiveRecording
                              ? 'bg-rose-950/90 border-rose-400 text-white'
                              : framingCheck?.isPositionIO
                              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                              : framingCheck?.status === 'adjust'
                              ? 'bg-amber-950/90 border-amber-400 text-amber-200'
                              : 'bg-slate-950/90 border-rose-500/50 text-rose-200'
                          }`}
                        >
                          <div className="text-base sm:text-xl font-black tracking-wide uppercase">
                            {isLiveRecording
                              ? `🔴 AUFNAHME LÄUFT (${liveRecordingElapsedSec.toFixed(1)}s) · DART ${liveThrowCounter.completedDartsInVisit} / 3`
                              : framingCheck?.shortBadge || 'PRÜFE POSITION AM OCHE...'}
                          </div>
                          <div className="text-xs sm:text-sm font-semibold opacity-95 mt-0.5">
                            {isLiveRecording
                              ? captureSessionMode === 'single_visit_3_darts'
                                ? 'Automatischer Stopp direkt nach deinem 3. Dart (oder rufe „Stopp“ / „Abbrechen“)'
                                : `Ganzes-Leg-Modus aktiv · Gesamt-Darts: ${liveThrowCounter.totalCompletedDartsInLeg}`
                              : framingCheck?.voicePrompt ||
                                'Stelle dich seitlich ans Oche. Sage „Position“, „Start“ oder „Abbrechen“.'}
                          </div>
                        </div>

                        {/* PROMINENTER ABBRECHEN-BUTTON OBEN RECHTS (Mind. 52px Touch-Höhe) */}
                        <button
                          type="button"
                          onClick={handleCancelLiveCamera}
                          className="min-h-[56px] px-4 sm:px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs sm:text-sm border-2 border-rose-300 shadow-[0_0_25px_rgba(225,29,72,0.6)] cursor-pointer flex items-center justify-center gap-2 shrink-0"
                          title="Kamera und Aufnahme sofort abbrechen und zur App zurückkehren"
                        >
                          <X className="w-5 h-5 stroke-[3]" />
                          <span>Abbrechen</span>
                        </button>
                      </div>

                      {/* Zweite Kopfzeile: Mikrofon-Status, Modus-Umschalter & Kamera-Wechsel */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/85 border border-white/15 px-3.5 py-2 rounded-xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                          <Volume2 className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                          <span className="truncate max-w-[260px] sm:max-w-md">
                            {lastHeardCommand
                              ? `🎙️ Gehört: „${lastHeardCommand}“`
                              : isListeningVoice
                              ? '🎙️ Sprachbefehle: „Position“ · „Start“ · „Stopp“ · „Abbrechen“'
                              : '🔊 Sprach-Coach aktiv'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCaptureSessionMode((m) =>
                                m === 'single_visit_3_darts'
                                  ? 'full_leg_multi_visit'
                                  : 'single_visit_3_darts'
                              )
                            }
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer ${
                              captureSessionMode === 'single_visit_3_darts'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            }`}
                          >
                            {captureSessionMode === 'single_visit_3_darts'
                              ? '🎯 Auto-Stopp: 3 Darts'
                              : '🏁 Ganzes Leg (Multi-Visit)'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setVoiceControlEnabled((v) => !v)}
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-black border cursor-pointer transition-colors flex items-center gap-1.5 ${
                              voiceControlEnabled
                                ? 'bg-purple-500/20 text-purple-300 border-purple-400/40 hover:bg-purple-500/30'
                                : 'bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700'
                            }`}
                            title="Sprach-Coach und Töne an/aus"
                          >
                            <Volume2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{voiceControlEnabled ? 'Audio an' : 'Audio stumm'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleStartLiveVoiceCoach(
                                cameraFacingMode === 'environment' ? 'user' : 'environment'
                              )
                            }
                            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 cursor-pointer flex items-center gap-1.5"
                          >
                            <Camera className="w-4 h-4" />
                            <span>{cameraFacingMode === 'environment' ? 'Rückkamera' : 'Frontkamera'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* RIESIGER 5-SEKUNDEN-COUNTDOWN IN DER BILDMITTE (5 - 4 - 3 - 2 - 1 - LOS!) */}
                    {countdownRemaining !== null && (
                      <div className="my-auto flex flex-col items-center justify-center gap-4 pointer-events-auto">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-slate-950/95 border-4 border-emerald-400 shadow-[0_0_70px_rgba(16,185,129,0.85)] flex flex-col items-center justify-center animate-pulse">
                          <span className="text-6xl sm:text-7xl font-black text-emerald-300 font-mono">
                            {countdownRemaining === 0 ? 'LOS!' : countdownRemaining}
                          </span>
                          <span className="text-xs font-bold text-white uppercase tracking-widest mt-1">
                            {countdownRemaining === 0 ? 'Wirf 3 Darts' : 'Sekunden'}
                          </span>
                        </div>
                        {countdownRemaining > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (countdownTimerRef.current) {
                                clearInterval(countdownTimerRef.current);
                                countdownTimerRef.current = null;
                              }
                              isCountingDownRef.current = false;
                              setCountdownRemaining(null);
                              speakCoachMessage('Countdown abgebrochen.', true);
                            }}
                            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-rose-600/95 hover:bg-rose-500 text-white font-black text-xs border border-rose-300 shadow-lg cursor-pointer flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            <span>Countdown stoppen</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* UNTERE STEUERLEISTE IM VOLLBILD: 3-DART-FORTSCHRITT + START/STOPP + KAMERA SCHLIESSEN */}
                    <div className="max-w-4xl w-full mx-auto flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/90 border border-white/15 p-3 rounded-2xl backdrop-blur-md pointer-events-auto">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3].map((dNum) => {
                          const done = liveThrowCounter.completedDartsInVisit >= dNum;
                          return (
                            <div
                              key={dNum}
                              className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border flex items-center justify-center transition-all ${
                                done
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                  : 'bg-slate-900 text-slate-300 border-white/10'
                              }`}
                            >
                              Dart {dNum} {done ? '✓' : ''}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleCancelLiveCamera}
                          className="min-h-[52px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-white font-black text-xs sm:text-sm border border-white/20 cursor-pointer flex items-center gap-1.5 transition-all"
                        >
                          <X className="w-4 h-4 text-rose-400" />
                          <span>Kamera schließen</span>
                        </button>

                        {!isLiveRecording ? (
                          <button
                            type="button"
                            onClick={triggerFiveSecondCountdown}
                            disabled={countdownRemaining !== null}
                            className="min-h-[52px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer shadow-lg"
                          >
                            {countdownRemaining !== null
                              ? `Countdown (${countdownRemaining}s)...`
                              : '▶️ 5s-Countdown starten („Start“)'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStopLiveRecording('manual_stop')}
                            className="min-h-[52px] px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs sm:text-sm cursor-pointer shadow-lg"
                          >
                            ⏹️ Jetzt fertig & analysieren („Stopp“)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-cyan-300 shrink-0">
                  {activePhase === 'drawback'
                    ? '🔄 Ausholen'
                    : activePhase === 'release'
                    ? '🎯 Release'
                    : '⚡ Durchschwung'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={togglePlayPause}
                    className="min-h-[52px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-md"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlaying ? 'Pause' : 'Abspielen'}</span>
                  </button>

                  <button
                    onClick={() => stepFrame(-0.04)}
                    className="min-w-[52px] min-h-[52px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                    title="Einzelbild zurück"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => stepFrame(0.04)}
                    className="min-w-[52px] min-h-[52px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                    title="Einzelbild vor"
                  >
                    <ChevronRight className="w-5 h-5" />
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
                      if (!isAnalysisLocked) {
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
                        setStatusMessage('✓ Gelenkpunkte & Wurfkurven auf dem aktuellen Standbild neu vermessen.');
                      } else {
                        setStatusMessage('✓ Gelenkpunkte aktualisiert (Wurfkurven der Analyse bleiben fixiert).');
                      }
                      setShowOverlay(true);
                      setShowTrajectory(true);
                    }}
                    className="min-h-[52px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    title="Punkte auf diesem Standbild neu platzieren"
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>Bild vermessen</span>
                  </button>

                  <div className="min-h-[52px] flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-white/5">
                    {[0.25, 0.5, 1.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (videoRef.current) videoRef.current.playbackRate = rate;
                        }}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
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

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setShowExportPanel((prev) => !prev)}
                    className={`min-h-[52px] px-3.5 py-2 rounded-xl border text-xs font-black cursor-pointer flex items-center gap-1.5 transition-all ${
                      showExportPanel
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/20'
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-400/30'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>Auf Gerät speichern</span>
                  </button>
                  <button
                    onClick={() => handleDownloadAnalysisImage(exportRenderMode, exportCropMode)}
                    className="min-h-[52px] px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold cursor-pointer flex items-center gap-1"
                    title="Schnell-Download als Standbild (PNG)"
                  >
                    <span>📸 PNG</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsAnalysisLocked(false);
                      setTrajectories([
                        { id: 1, points: [], releaseSpeedKmh: 21.4, launchAngleDeg: 14.2, elbowDropMm: -3.2 },
                        { id: 2, points: [], releaseSpeedKmh: 21.1, launchAngleDeg: 13.8, elbowDropMm: -4.1 },
                        { id: 3, points: [], releaseSpeedKmh: 21.6, launchAngleDeg: 14.9, elbowDropMm: -2.8 },
                      ]);
                    }}
                    className="min-w-[52px] min-h-[52px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 cursor-pointer"
                    title="Kurven zurücksetzen"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ON-DEVICE EXPORT-STUDIO: VIDEO + KURVEN ODER NUR KURVEN (INKL. OBERKÖRPER-AUSSCHNITT) */}
              {showExportPanel && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/95 border border-emerald-500/40 space-y-3 shadow-2xl">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <div className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-1.5">
                        <Save className="w-4 h-4 text-emerald-400" />
                        <span>Wurfanalyse auf Endgerät speichern</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Wähle zwischen Video mit Kurven oder reinem Kurven-Diagramm – im gewählten Oberkörper-Ausschnitt oder Vollbild.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowExportPanel(false)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Schließen ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Darstellungs-Modus: Video + Kurven vs. Nur Kurven */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        1. Inhalt (Darstellung):
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setExportRenderMode('video')}
                          className={`min-h-[48px] px-2.5 py-2 rounded-xl border text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                            exportRenderMode === 'video'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow'
                              : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                          }`}
                        >
                          <span>🎬 Video + Kurven</span>
                          <span className="text-[9px] opacity-80 font-semibold">Realbild & 3 Spuren</span>
                        </button>
                        <button
                          onClick={() => setExportRenderMode('isolated')}
                          className={`min-h-[48px] px-2.5 py-2 rounded-xl border text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                            exportRenderMode === 'isolated'
                              ? 'bg-cyan-400 text-slate-950 border-cyan-200 shadow'
                              : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                          }`}
                        >
                          <span>📈 Nur Kurven</span>
                          <span className="text-[9px] opacity-80 font-semibold">Dunkles Analyse-Grid</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Bildausschnitt: Gewählter Oberkörper-Ausschnitt vs. Volles Bild */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300">
                          2. Bildausschnitt (Zoom):
                        </label>
                        <button
                          onClick={() => {
                            setZoomMode('custom');
                            setShowCropControls(true);
                          }}
                          className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                        >
                          ✂️ Ausschnitt feinjustieren
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setExportCropMode('active_crop')}
                          className={`min-h-[48px] px-2.5 py-2 rounded-xl border text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                            exportCropMode === 'active_crop'
                              ? 'bg-amber-400 text-slate-950 border-amber-200 shadow'
                              : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                          }`}
                        >
                          <span>✂️ Oberkörper-Zoom</span>
                          <span className="text-[9px] opacity-80 font-semibold">
                            {zoomMode === 'custom' ? `Eigener Bereich (${customCrop.zoom.toFixed(1)}x)` : 'Fokus Wurfarm (1.85x)'}
                          </span>
                        </button>
                        <button
                          onClick={() => setExportCropMode('full')}
                          className={`min-h-[48px] px-2.5 py-2 rounded-xl border text-[11px] font-black cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                            exportCropMode === 'full'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow'
                              : 'bg-slate-900 text-slate-300 border-white/10 hover:bg-slate-800'
                          }`}
                        >
                          <span>🧍 Volles Bild</span>
                          <span className="text-[9px] opacity-80 font-semibold">Gesamte Aufnahme (1.0x)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Speichern-Buttons: Video (.mp4/.webm) oder Standbild (.png) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      onClick={handleDownloadAnalysisVideo}
                      disabled={isExportingVideo}
                      className={`min-h-[52px] px-4 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                        isExportingVideo
                          ? 'bg-amber-500/30 border border-amber-400/50 text-amber-200 cursor-wait'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>
                        {isExportingVideo
                          ? `Rendert Analyse-Video... (${exportVideoProgress}%)`
                          : exportRenderMode === 'isolated'
                          ? '🎥 Als Kurven-Video speichern'
                          : '🎥 Als Video + Kurven speichern'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleDownloadAnalysisImage(exportRenderMode, exportCropMode)}
                      disabled={isExportingVideo}
                      className="min-h-[52px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/15 font-black text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                    >
                      <Save className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>
                        {exportRenderMode === 'isolated'
                          ? '📸 Nur Kurven als Bild (.png)'
                          : '📸 Video + Kurven als Bild (.png)'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RECHTE SPALTE: 5-SCHRITT DURCHKLICK-ANALYSE (3-DART SELBSTVERGLEICH OHNE NORMZWANG) */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-w-0 w-full">
          {/* Status-Banner */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-medium flex items-center gap-2.5">
            <Target className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">{statusMessage}</span>
          </div>

          {/* HAUPT-COCKPIT: 5-SCHRITT DURCHKLICK-ANALYSE (DART 1 vs. DART 2 vs. DART 3) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            {/* Kopfzeile mit Wiederholgenauigkeit & Stamm-Paar */}
            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Dein 3-Dart Selbstvergleich (Ohne Lehrbuch-Norm)</span>
                </div>
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>Durchklick-Analyse: Dart 1 vs. 2 vs. 3</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Klicke Schritt für Schritt durch deine 3 Würfe – das Video springt automatisch zur passenden Stelle.
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-mono text-xs font-black">
                  {activeMetrics.selfComparison.repeatabilityScorePct}% synchron
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Basis: <strong className="text-white">{activeMetrics.selfComparison.referencePairLabel}</strong>
                </span>
              </div>
            </div>

            {/* 5 SCHRITT-REITER ZUM DIREKTEN ANWÄHLEN */}
            <div className="grid grid-cols-5 gap-1">
              {([1, 2, 3, 4, 5] as GuidedAnalysisStep[]).map((stepNum) => {
                const st = activeMetrics.selfComparison.steps[stepNum];
                const isCurrent = guidedStep === stepNum;
                const dotColor =
                  st.status === 'KONSTANT'
                    ? 'bg-emerald-400'
                    : st.status === 'LEICHTE_VARIANZ'
                    ? 'bg-amber-400'
                    : 'bg-rose-500';
                return (
                  <button
                    key={stepNum}
                    onClick={() => handleSelectGuidedStep(stepNum)}
                    className={`min-h-[52px] px-1.5 py-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isCurrent
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/70 hover:bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span className="text-[10px] font-black font-mono">#{stepNum}</span>
                    </div>
                    <span className="text-[10px] font-bold leading-tight truncate w-full">
                      {st.shortTitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* AKTIVER DURCHKLICK-SCHRITT: FRAGE, ANTWORT & 3-DART-VERGLEICH */}
            {(() => {
              const stepOrder: GuidedAnalysisStep[] = [1, 2, 3, 4, 5];
              const currentIdx = Math.max(0, stepOrder.indexOf(guidedStep));
              const activeStepObj =
                activeMetrics.selfComparison.steps[guidedStep] ||
                activeMetrics.selfComparison.steps[1];
              const prevStep = stepOrder[(currentIdx - 1 + stepOrder.length) % stepOrder.length];
              const nextStep = stepOrder[(currentIdx + 1) % stepOrder.length];

              const statusBadgeClass =
                activeStepObj.status === 'KONSTANT'
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                  : activeStepObj.status === 'LEICHTE_VARIANZ'
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  : 'bg-rose-500/20 border-rose-400/50 text-rose-300';

              const statusLabel =
                activeStepObj.status === 'KONSTANT'
                  ? '✓ Hohe Wiederholgenauigkeit'
                  : activeStepObj.status === 'LEICHTE_VARIANZ'
                  ? '⚡ Leichte Abweichung'
                  : '⚠️ Deutlicher Ausreißer';

              return (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/95 border border-white/15 space-y-3.5 shadow-inner">
                  {/* Frage & Status-Badge */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-[11px] font-bold text-cyan-300">
                        Frage {activeStepObj.step}/5: {activeStepObj.question}
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                        {activeStepObj.headline}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-black shrink-0 ${statusBadgeClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Klartext-Antwort für den Spieler */}
                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/90 p-3 rounded-xl border border-white/5">
                    {activeStepObj.feedbackText}
                  </p>

                  {/* DIREKTER 3-DART-KARTENVERGLEICH (Antippen springt im Video exakt zu diesem Wurf!) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                      <span>Direktvergleich deiner 3 Würfe (Antippen = Wurf im Video zeigen):</span>
                      <span className="font-mono text-slate-300">
                        {activeStepObj.primaryMetricLabel}: {activeStepObj.primaryMetricValue}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {activeStepObj.perDartValues.map((dv, idx) => {
                        const dartColors = [
                          {
                            border: dv.isOutlier ? 'border-rose-500/70 bg-rose-950/25' : 'border-emerald-500/40 bg-emerald-950/15',
                            badge: 'bg-emerald-500 text-slate-950',
                            text: 'text-emerald-300',
                          },
                          {
                            border: dv.isOutlier ? 'border-rose-500/70 bg-rose-950/25' : 'border-cyan-500/40 bg-cyan-950/15',
                            badge: 'bg-cyan-400 text-slate-950',
                            text: 'text-cyan-300',
                          },
                          {
                            border: dv.isOutlier ? 'border-rose-500/70 bg-rose-950/25' : 'border-amber-500/40 bg-amber-950/15',
                            badge: 'bg-amber-400 text-slate-950',
                            text: 'text-amber-300',
                          },
                        ][idx] || {
                          border: 'border-white/15 bg-slate-900',
                          badge: 'bg-slate-700 text-white',
                          text: 'text-white',
                        };

                        const isSelectedDart = activeThrowIdx === idx;

                        return (
                          <button
                            key={dv.dartId}
                            onClick={() => handleSelectGuidedStep(guidedStep, idx)}
                            className={`min-h-[76px] p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              dartColors.border
                            } ${isSelectedDart ? 'ring-2 ring-white shadow-lg' : 'hover:border-white/40'}`}
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${dartColors.badge}`}>
                                {dv.label}
                              </span>
                              {dv.isOutlier ? (
                                <span className="text-[9px] font-black text-rose-400">⚠️ Ausreißer</span>
                              ) : (
                                <span className="text-[9px] font-bold text-emerald-400">✓ Synchron</span>
                              )}
                            </div>
                            <div className={`text-xs sm:text-sm font-black font-mono mt-1.5 ${dartColors.text}`}>
                              {dv.primaryValue}
                            </div>
                            {dv.secondaryValue && (
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {dv.secondaryValue}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SCHRITT-SPEZIFISCHE ZUSATZ-INFOS (Paarabstände in Schritt 3, Tempo-Balken in Schritt 4, Filter in Schritt 5) */}
                  {guidedStep === 3 && (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10">
                      <div className="text-[10px] font-bold text-slate-400 mb-1.5">
                        Paarweiser Loslass-Abstand im Raum (Millimeter):
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-white/5">
                          <div className="text-[9px] text-slate-400">Dart 1 ↔ Dart 2</div>
                          <div className={`font-black ${activeMetrics.selfComparison.pairwiseReleaseMm.d1_d2 <= 16 ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {activeMetrics.selfComparison.pairwiseReleaseMm.d1_d2.toFixed(1)} mm
                          </div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-white/5">
                          <div className="text-[9px] text-slate-400">Dart 2 ↔ Dart 3</div>
                          <div className={`font-black ${activeMetrics.selfComparison.pairwiseReleaseMm.d2_d3 <= 16 ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {activeMetrics.selfComparison.pairwiseReleaseMm.d2_d3.toFixed(1)} mm
                          </div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-white/5">
                          <div className="text-[9px] text-slate-400">Dart 1 ↔ Dart 3</div>
                          <div className={`font-black ${activeMetrics.selfComparison.pairwiseReleaseMm.d1_d3 <= 16 ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {activeMetrics.selfComparison.pairwiseReleaseMm.d1_d3.toFixed(1)} mm
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {guidedStep === 4 && (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400">
                        Durchzugs-Zeit (Umkehrpunkt → Loslassen) & Abwurf-Tempo:
                      </div>
                      {activeMetrics.selfComparison.darts.map((dp, idx) => {
                        const maxMs = Math.max(
                          220,
                          ...activeMetrics.selfComparison.darts.map((d) => d.accelerationDurationMs)
                        );
                        const widthPct = Math.min(100, Math.max(25, Math.round((dp.accelerationDurationMs / maxMs) * 100)));
                        const barClass = idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-cyan-400' : 'bg-amber-400';
                        return (
                          <div key={dp.id} className="space-y-0.5">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-300 font-bold">{dp.label}</span>
                              <span className="text-white font-black">
                                {dp.accelerationDurationMs} ms • {dp.releaseSpeedKmh.toFixed(1)} km/h
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                              <div className={`h-full rounded-full ${barClass}`} style={{ width: `${widthPct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-cyan-300">
                        <span>🎯 Ballistische Flugzeit (2,37 m):</span>
                        <span className="font-bold">
                          ~{activeMetrics.ballisticTrajectory.flightTimeMs} ms ({activeMetrics.ballisticTrajectory.releaseSpeedMs} m/s) • Einschlag: {activeMetrics.ballisticTrajectory.impactHeightMm} mm
                        </span>
                      </div>
                    </div>
                  )}

                  {guidedStep === 5 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setActiveThrowIdx(-1)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black cursor-pointer border ${
                            activeThrowIdx === -1
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                              : 'bg-slate-900 text-slate-300 border-white/10'
                          }`}
                        >
                          Alle 3 Kurven überlagern
                        </button>
                        {[0, 1, 2].map((dIdx) => (
                          <button
                            key={dIdx}
                            onClick={() => setActiveThrowIdx(dIdx)}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-black cursor-pointer border ${
                              activeThrowIdx === dIdx
                                ? 'bg-white text-slate-950 border-white'
                                : 'bg-slate-900 text-slate-400 border-white/10'
                            }`}
                          >
                            Nur D{dIdx + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setShowExportPanel(true)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[11px] font-black cursor-pointer flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Analyse auf Gerät speichern</span>
                      </button>
                    </div>
                  )}

                  {/* VOR / ZURÜCK NAVIGATION (DURCHKLICK-STEUERUNG MIT 52PX TOUCH-HÖHE) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleSelectGuidedStep(prevStep)}
                      className="min-h-[52px] px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <span>◀ Vorheriger Punkt</span>
                    </button>
                    <button
                      onClick={() => handleSelectGuidedStep(nextStep)}
                      className="min-h-[52px] px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/15 transition-all"
                    >
                      <span>Nächster Punkt ({ ((currentIdx + 1) % 5) + 1 }/5) ▶</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* SPEICHERN IM SPIELER-STECKBRIEF + DIREKT-EXPORT AUF ENDGERÄT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleSaveSessionToProfile}
                className="w-full min-h-[52px] py-3 px-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Im Profil gespeichert!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 shrink-0" />
                    <span>Im Spielerprofil sichern</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowExportPanel((prev) => !prev)}
                className="w-full min-h-[52px] py-3 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-black text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Video / Kurven herunterladen</span>
              </button>
            </div>

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

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300 font-bold">Slow-Mo FPS:</span>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => setSlowMoFps(120)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          slowMoFps === 120
                            ? 'bg-cyan-400 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="120 FPS Zeitlupe (4x Dehnung)"
                      >
                        120 FPS (4x)
                      </button>
                      <button
                        onClick={() => setSlowMoFps(240)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          slowMoFps === 240
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="240 FPS Ultra-Slow-Mo (8x Dehnung)"
                      >
                        240 FPS (8x)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300 font-bold">Kalibrierung:</span>
                    <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => setCalibrationMethod('anthropometric')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          calibrationMethod === 'anthropometric'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Anthropometrisch nach Dempster/Winter (Körpergröße)"
                      >
                        Körper
                      </button>
                      <button
                        onClick={() => setCalibrationMethod('board_height')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          calibrationMethod === 'board_height'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="BBDV Boardhöhe 1,73 m"
                      >
                        Board 1,73m
                      </button>
                      <button
                        onClick={() => setCalibrationMethod('oche_marker')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          calibrationMethod === 'oche_marker'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Oche-Markierung 20 cm"
                      >
                        Oche 20cm
                      </button>
                    </div>
                  </div>

                  {calibrationMethod === 'board_height' && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/80 border border-white/5">
                      <span className="text-[11px] text-slate-300">Board-Höhe Pixel (1,73m):</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={boardRefPixels}
                          onChange={(e) => setBoardRefPixels(Math.max(200, Number(e.target.value) || 1380))}
                          className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-white/15 text-emerald-400 font-mono text-center text-xs"
                        />
                        <span className="text-[10px] text-slate-400">px</span>
                      </div>
                    </div>
                  )}
                  {calibrationMethod === 'oche_marker' && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/80 border border-white/5">
                      <span className="text-[11px] text-slate-300">Oche-Linie Pixel (20cm):</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={ocheRefPixels}
                          onChange={(e) => setOcheRefPixels(Math.max(40, Number(e.target.value) || 160))}
                          className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-white/15 text-emerald-400 font-mono text-center text-xs"
                        />
                        <span className="text-[10px] text-slate-400">px</span>
                      </div>
                    </div>
                  )}

                  {/* Maßstabsanzeige in mm/px */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/20 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Aktiver Kalibrierungs-Maßstab:</span>
                    <span className="font-mono font-black text-emerald-400">
                      {getMmPerPx(baselinePose || currentPose, videoDims).toFixed(3)} mm / px
                    </span>
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
                    <button
                      onClick={() => setShowHiddenRigDebug(!showHiddenRigDebug)}
                      className={`col-span-2 px-2 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                        showHiddenRigDebug
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                      title="Blendet alle 70 Hintergrund-Messpunkte (33 MediaPipe + 7 Basis + je 10 an Handgelenk, Arm & Ellenbogen) als Röntgenblick ein"
                    >
                      🔬 70-Punkte-Hintergrundnetz (Debug): {showHiddenRigDebug ? 'SICHTBAR' : 'IM HINTERGRUND'}
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
                    className="w-full min-h-[52px] py-3 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>Aktuelles Bild als Nullpunkt setzen</span>
                  </button>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintSession}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-bold cursor-pointer transition-all"
                    title="Analyse-Steckbrief drucken / als PDF speichern"
                  >
                    <Printer className="w-3 h-3 text-cyan-400" />
                    <span className="hidden sm:inline">Drucken</span>
                  </button>
                  <span className="text-[10px] text-slate-400">On-Device Speicher</span>
                </div>
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
                        {s.releaseSpeedKmh} km/h • +{s.launchAngleDeg}° • Ellenbogen {s.elbowDropMm} mm{s.releaseDispersionMm !== undefined ? ` • Streuung ${s.releaseDispersionMm} mm` : ''}{s.stanceAngle !== undefined ? ` • Stand ${s.stanceAngle}° • Neigung ${s.trunkLeanAngle}°` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleExportSessionJson(s)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 cursor-pointer"
                        title="Steckbrief als JSON exportieren (Datensicherung gem. §10 DSGVO)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSavedSession(s.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer"
                        title="Messung löschen (§10.3 DSGVO)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
