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
} from 'lucide-react';
import { UserSession } from '@/app/actions';

interface VideoAnalyzerClientProps {
  user: UserSession;
}

type InputSource = 'demo' | 'upload' | 'camera';

interface Point {
  x: number;
  y: number;
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
  const [source, setSource] = useState<InputSource>('upload'); // Direkt upload als Fokus
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Lade ein Video hoch oder nutze die Kamera, um deinen Wurf zu analysieren.'
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Wichtig: Beim Video-Upload standardmäßig KEINE Demo oder störenden Linien anzeigen!
  const [showMarkers, setShowMarkers] = useState<boolean>(false);
  const [hasUploadedVideo, setHasUploadedVideo] = useState<boolean>(false);

  // Interaktive Marker für Winkelmessung auf dem Video (Schulter, Ellenbogen, Handgelenk)
  const [points, setPoints] = useState<{
    shoulder: Point;
    elbow: Point;
    wrist: Point;
  }>({
    shoulder: { x: 220, y: 220 },
    elbow: { x: 320, y: 190 },
    wrist: { x: 420, y: 120 },
  });
  const [draggingPoint, setDraggingPoint] = useState<'shoulder' | 'elbow' | 'wrist' | null>(null);

  // Biomechanik Kennzahlen
  const [metrics, setMetrics] = useState<BiomechanicMetrics>({
    elbowAngle: 98.4,
    drawbackAngle: 62.0,
    releaseAngle: 98.4,
    followThroughAngle: 164.5,
    shoulderDriftMm: 2.8,
    consistencyScore: 94,
    phase: 'release',
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const demoTimeRef = useRef<number>(0);

  // Stoppt Kamera-Stream
  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Winkelberechnung aus 3 Punkten
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

  // Phase bestimmen anhand des Winkels
  const determinePhase = (angle: number): BiomechanicMetrics['phase'] => {
    if (angle < 75) return 'drawback';
    if (angle < 92) return 'acceleration';
    if (angle <= 112) return 'release';
    return 'follow_through';
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
        setStatusMessage('Live-Kamera aktiv (100% lokal im Browser).');
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
      setShowMarkers(false); // Beim Upload standardmäßig KEINE störenden Linien!
      setStatusMessage(`Geladen: ${file.name} (100% lokal auf deinem Gerät)`);
    }
  };

  // Video Play/Pause Toggle
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

  // Video Geschwindigkeit ändern (z. B. 0.25x für Super-Zeitlupe)
  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Frame schrittweise vor/zurück (+/- 1 Frame bei 30fps = ~0.033s)
  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + frames * (1 / 30))
    );
  };

  // Timeline Slider Change
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  // Demo Simulation Loop (Wird AUSSCHLIESSLICH bei source === 'demo' ausgeführt!)
  const runDemoAnimation = useCallback(() => {
    if (source !== 'demo') return; // Sofortiger Abbruch, wenn kein Demo-Modus!

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    // Canvas zeichnen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#060a15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gitterlinien
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

    // Zielscheibe Silhouette rechts
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(canvas.width - 40, canvas.height / 2, 10, 80, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Pose Koordinaten
    const shoulderX = canvas.width * 0.32;
    const shoulderY = canvas.height * 0.48;
    const upperArmLength = 95;
    const forearmLength = 85;

    const elbowX = shoulderX + upperArmLength * Math.cos(0.25);
    const elbowY = shoulderY - upperArmLength * Math.sin(0.25);

    const forearmRad = 0.25 + (Math.PI - (currentElbowAngle * Math.PI) / 180);
    const wristX = elbowX + forearmLength * Math.cos(forearmRad);
    const wristY = elbowY - forearmLength * Math.sin(forearmRad);

    const dartLength = 28;
    const dartX = wristX + dartLength * Math.cos(forearmRad - 0.2);
    const dartY = wristY - dartLength * Math.sin(forearmRad - 0.2);

    // Rumpf
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 30, shoulderY + 160);
    ctx.lineTo(shoulderX, shoulderY);
    ctx.stroke();

    // Schulterlinie
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 60, shoulderY);
    ctx.lineTo(shoulderX + 160, shoulderY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Gelenkachsen
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(wristX, wristY);
    ctx.stroke();

    // Dart-Vektor
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(dartX, dartY);
    ctx.stroke();

    // Punkte
    [
      { x: shoulderX, y: shoulderY },
      { x: elbowX, y: elbowY },
      { x: wristX, y: wristY },
    ].forEach((j) => {
      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(j.x, j.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Ellenbogen-Winkelbogen
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(elbowX, elbowY, 26, 0.25 - 0.5, 0.25 + 0.5);
    ctx.stroke();

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`${Math.round(currentElbowAngle)}°`, elbowX + 12, elbowY - 14);

    if (currentPhase === 'release') {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(dartX, dartY);
      ctx.lineTo(canvas.width - 50, canvas.height * 0.45);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('🎯 ABWURF (RELEASE)', dartX + 10, dartY - 8);
    }

    animationFrameRef.current = requestAnimationFrame(runDemoAnimation);
  }, [source]);

  // Video Marker Overlay zeichnen (NUR wenn showMarkers aktiv ist und ein Video läuft)
  const drawVideoMarkers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Wenn nicht im Demo-Modus und showMarkers AUS ist -> Canvas bleibt absolut leer!
    if (source !== 'demo' && !showMarkers) {
      return;
    }

    if (source !== 'demo' && showMarkers) {
      const { shoulder, elbow, wrist } = points;
      const angle = calculateAngle(shoulder, elbow, wrist);
      const phase = determinePhase(angle);

      setMetrics((prev) => ({
        ...prev,
        elbowAngle: angle,
        releaseAngle: angle,
        phase,
      }));

      // 1. Arm-Linie zeichnen
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shoulder.x, shoulder.y);
      ctx.lineTo(elbow.x, elbow.y);
      ctx.lineTo(wrist.x, wrist.y);
      ctx.stroke();

      // 2. Horizontale Schulterlinie
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(shoulder.x - 50, shoulder.y);
      ctx.lineTo(shoulder.x + 120, shoulder.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Gelenkknoten zeichnen
      const jointList = [
        { key: 'shoulder' as const, pt: shoulder, label: 'Schulter' },
        { key: 'elbow' as const, pt: elbow, label: 'Ellenbogen' },
        { key: 'wrist' as const, pt: wrist, label: 'Handgelenk' },
      ];

      jointList.forEach((j) => {
        ctx.fillStyle = draggingPoint === j.key ? '#f59e0b' : '#00d4ff';
        ctx.beginPath();
        ctx.arc(j.pt.x, j.pt.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(j.label, j.pt.x + 12, j.pt.y + 4);
      });

      // 4. Winkelbogen & Anzeige am Ellenbogen
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(elbow.x, elbow.y, 28, 0, Math.PI * 0.7);
      ctx.stroke();

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`${angle}°`, elbow.x + 14, elbow.y - 12);
    }
  }, [source, showMarkers, points, draggingPoint]);

  // Effekt für Modus-Wechsel & Animation
  useEffect(() => {
    if (source === 'camera') {
      startCamera(facingMode);
    } else if (source === 'demo') {
      stopCameraStream();
      setStatusMessage('Interaktive Simulation aktiv.');
      animationFrameRef.current = requestAnimationFrame(runDemoAnimation);
    } else if (source === 'upload') {
      stopCameraStream();
      if (!hasUploadedVideo) {
        setStatusMessage('Wähle eine Videodatei aus, um deinen Wurf zu analysieren.');
      }
    }

    // Wenn nicht im Demo-Modus, einmalig Marker rendern
    if (source !== 'demo') {
      drawVideoMarkers();
    }

    return () => {
      stopCameraStream();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [source, runDemoAnimation, drawVideoMarkers, facingMode, stopCameraStream, hasUploadedVideo]);

  // Wenn sich die Punkte oder showMarkers im Upload/Kamera-Modus ändern: Marker neu zeichnen
  useEffect(() => {
    if (source !== 'demo') {
      drawVideoMarkers();
    }
  }, [source, showMarkers, points, drawVideoMarkers]);

  // Mouse & Touch Interaktion für Marker
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (source === 'demo' || !showMarkers) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Prüfen, welcher Punkt angeklickt wurde
    const threshold = 30; // Pixel Toleranz
    const distShoulder = Math.hypot(clickX - points.shoulder.x, clickY - points.shoulder.y);
    const distElbow = Math.hypot(clickX - points.elbow.x, clickY - points.elbow.y);
    const distWrist = Math.hypot(clickX - points.wrist.x, clickY - points.wrist.y);

    if (distElbow < threshold) {
      setDraggingPoint('elbow');
    } else if (distWrist < threshold) {
      setDraggingPoint('wrist');
    } else if (distShoulder < threshold) {
      setDraggingPoint('shoulder');
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingPoint || source === 'demo' || !showMarkers) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    setPoints((prev) => ({
      ...prev,
      [draggingPoint]: {
        x: Math.max(10, Math.min(canvas.width - 10, currentX)),
        y: Math.max(10, Math.min(canvas.height - 10, currentY)),
      },
    }));
  };

  const handlePointerUp = () => {
    setDraggingPoint(null);
  };

  // Video Time Update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  // Phasen-Bezeichnungen auf Deutsch
  const phaseLabels: Record<BiomechanicMetrics['phase'], { label: string; color: string }> = {
    setup: { label: 'Zielphase / Stand', color: 'text-slate-300 bg-slate-800' },
    drawback: { label: 'Rückzug (Drawback)', color: 'text-amber-300 bg-amber-500/20' },
    acceleration: { label: 'Beschleunigung', color: 'text-cyan-300 bg-cyan-500/20' },
    release: { label: 'Abwurf (Release-Point)', color: 'text-emerald-300 bg-emerald-500/20' },
    follow_through: { label: 'Nachfolgebewegung', color: 'text-purple-300 bg-purple-500/20' },
  };

  const handleSaveMetrics = () => {
    setIsSaved(true);
    setStatusMessage('Wurfwinkel erfolgreich im Spielerprofil vermerkt!');
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
                2.0 ON-DEVICE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Biomechanik & Wurfwinkel-Diagnostik • SC Weyhausen Dartsport
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
              setShowMarkers(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              source === 'camera'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live-Kamera</span>
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

        {/* Video / Kamera Zusatz-Tools */}
        <div className="flex items-center gap-2">
          {source === 'camera' && (
            <button
              onClick={toggleFacingMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold cursor-pointer"
              title="Kamera wechseln (Front / Rück)"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kamera wechseln</span>
            </button>
          )}

          {/* Mess-Marker Schalter für echtes Video */}
          {source !== 'demo' && (
            <button
              onClick={() => setShowMarkers(!showMarkers)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                showMarkers
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              }`}
              title={showMarkers ? 'Winkel-Marker ausblenden' : 'Winkel-Marker einblenden'}
            >
              {showMarkers ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Winkel-Marker aktiv</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Winkel-Marker einblenden</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. Analyse-Bereich: Video/Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Linke Spalte: Viewport mit Video & Canvas-Overlay */}
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

            {/* Canvas Overlay: Im Demo-Modus simuliert, im Video-Modus nur aktiv wenn showMarkers=true */}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`absolute inset-0 w-full h-full object-contain ${
                source !== 'demo' && !showMarkers
                  ? 'pointer-events-none opacity-0'
                  : source !== 'demo' && showMarkers
                  ? 'cursor-crosshair'
                  : 'pointer-events-none'
              }`}
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

            {/* Live-Gradanzeige Overlay unten links (wird nur angezeigt bei Demo oder wenn showMarkers an ist) */}
            {(source === 'demo' || showMarkers) && (
              <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-400 font-bold">Winkel:</span>
                <span className="text-sm font-mono font-black text-emerald-400">
                  {metrics.elbowAngle.toFixed(1)}°
                </span>
              </div>
            )}
          </div>

          {/* 4. Player-Steuerung für hochgeladenes Video */}
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
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlayPause}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-md"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlaying ? 'Pause' : 'Abspielen'}</span>
                  </button>

                  {/* Einzelbild vor/zurück */}
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

                {/* Geschwindigkeitswahl: Zeitlupe für Darts */}
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
            <span className="text-[11px] font-mono text-slate-500">
              {source === 'demo' ? 'Simulations-Modus' : '100% On-Device Video'}
            </span>
          </div>
        </div>

        {/* Rechte Spalte: Biomechanik & Diagnostik-Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <h2 className="text-base font-black text-white flex items-center justify-between">
              <span>Wurfwinkel & Analyse</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                Score: {metrics.consistencyScore}/100
              </span>
            </h2>

            {/* Metrik 1: Abwurfwinkel */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Gemessener Winkel</span>
                <span className="text-emerald-400 font-mono text-sm">{metrics.elbowAngle}°</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Optimaler BBDV-Release-Korridor: 92° – 105°.
              </p>
            </div>

            {/* Hinweis zur Marker-Justierung im Video */}
            {source !== 'demo' && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                <p className="font-bold">💡 Video-Tipp:</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Über <strong>„Winkel-Marker einblenden“</strong> kannst du Schulter, Ellenbogen und Handgelenk auf dem Standbild exakt nachjustieren, um deinen Release-Winkel frame-genau zu vermessen.
                </p>
              </div>
            )}

            {/* Metrik 2: Rückzugtiefe */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Rückzug-Winkel (Drawback)</span>
                <span className="text-amber-400 font-mono text-sm">{metrics.drawbackAngle}°</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Kompakter Rückzug verhindert Wackeln und sorgt für maximale Wiederholbarkeit.
              </p>
            </div>

            {/* Metrik 3: Schulter- und Ellenbogen-Stabilität */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Ellenbogen-Drift</span>
                <span className="text-cyan-400 font-mono text-sm">±{metrics.shoulderDriftMm} mm</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sehr ruhige Armachse vor dem Release. Kaum vertikales Absacken des Ellenbogens.
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
                  <span>Im Profil vermerkt!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Winkel im Profil sichern</span>
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
              Videos verbleiben zu 100% lokal auf deinem Smartphone oder PC. Es werden niemals
              Videobilder, Gesichter oder Videodateien an einen Server oder Supabase übertragen. Nur
              berechnete Winkelmetriken können optional gesichert werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
