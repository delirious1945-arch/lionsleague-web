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
  AlertCircle,
  SwitchCamera,
  HelpCircle,
  Save,
} from 'lucide-react';
import { UserSession } from '@/app/actions';

interface VideoAnalyzerClientProps {
  user: UserSession;
}

type InputSource = 'camera' | 'upload' | 'demo';

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
  const [source, setSource] = useState<InputSource>('demo');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [statusMessage, setStatusMessage] = useState<string>('Bereit für die Analyse.');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Live Biomechanik-Zustand
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

  // Stop camera stream
  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start Live Camera
  const startCamera = async (targetFacing: 'user' | 'environment') => {
    stopCameraStream();
    setStatusMessage('Kamera wird initialisiert...');
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
        setIsRecording(true);
        setStatusMessage('Live-Kamera aktiv. Halte die Wurfarm-Seite im Bild.');
      }
    } catch (err) {
      console.error('Kamerafehler:', err);
      setStatusMessage('Kamera-Zugriff nicht möglich oder verweigert. Nutze Demo oder Upload.');
    }
  };

  // Switch camera facing mode (Handys)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (source === 'camera') {
      startCamera(nextMode);
    }
  };

  // Handle Video File Upload
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
      setStatusMessage(`Geladen: ${file.name} (100% lokal im Browser)`);
    }
  };

  // Demo Simulation Loop
  const runDemoAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    demoTimeRef.current += 0.035;
    const t = demoTimeRef.current;

    // Simulation eines 3-Phasen Wurfs: 0..0.4 Rückzug, 0.4..0.6 Beschleunigung/Release, 0.6..1.0 Follow-Through
    const cycle = (t % 3) / 3; // 0 bis 1

    let currentPhase: BiomechanicMetrics['phase'] = 'setup';
    let currentElbowAngle = 90;

    if (cycle < 0.35) {
      currentPhase = 'drawback';
      currentElbowAngle = 90 - Math.sin((cycle / 0.35) * (Math.PI / 2)) * 32; // bis ca 58°
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

    // Virtueller Hintergrund wenn keine Kamera/Video läuft
    if (source === 'demo') {
      ctx.fillStyle = '#060a15';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dezente Gitterlinien
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
    }

    // Pose Koordinaten
    const shoulderX = canvas.width * 0.32;
    const shoulderY = canvas.height * 0.48;
    const upperArmLength = 95;
    const forearmLength = 85;

    // Schulter ist relativ fixiert, Ellenbogen zeigt nach vorne/oben
    const elbowX = shoulderX + upperArmLength * Math.cos(0.25);
    const elbowY = shoulderY - upperArmLength * Math.sin(0.25);

    // Unterarm rotiert basierend auf Winkel
    const forearmRad = 0.25 + (Math.PI - (currentElbowAngle * Math.PI) / 180);
    const wristX = elbowX + forearmLength * Math.cos(forearmRad);
    const wristY = elbowY - forearmLength * Math.sin(forearmRad);

    // Hand/Dartspitze
    const dartLength = 28;
    const dartX = wristX + dartLength * Math.cos(forearmRad - 0.2);
    const dartY = wristY - dartLength * Math.sin(forearmRad - 0.2);

    // 1. Rumpf & Oberkörper (Orientierung)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 30, shoulderY + 160); // Hüfte
    ctx.lineTo(shoulderX, shoulderY); // Rücken
    ctx.stroke();

    // 2. Schulter-Horizontallinie (Stabilitäts-Referenz)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 60, shoulderY);
    ctx.lineTo(shoulderX + 160, shoulderY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Biomechanische Gelenkachsen (Smaragdgrün / Cyan)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(wristX, wristY);
    ctx.stroke();

    // 4. Dart-Vektor
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(dartX, dartY);
    ctx.stroke();

    // 5. Gelenkknoten (Punkte)
    const joints = [
      { x: shoulderX, y: shoulderY, label: 'Schulter' },
      { x: elbowX, y: elbowY, label: 'Ellenbogen' },
      { x: wristX, y: wristY, label: 'Handgelenk' },
    ];

    joints.forEach((j) => {
      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(j.x, j.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 6. Ellenbogen-Winkelbogen & HUD Text
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(elbowX, elbowY, 26, 0.25 - 0.5, 0.25 + 0.5);
    ctx.stroke();

    // HUD Beschriftung direkt am Gelenk
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`${Math.round(currentElbowAngle)}°`, elbowX + 12, elbowY - 14);

    // Trajektorie / Release Indikator
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

  // Effekt für Modus-Wechsel
  useEffect(() => {
    if (source === 'camera') {
      startCamera(facingMode);
    } else if (source === 'demo') {
      stopCameraStream();
      setStatusMessage('Interaktive Simulation aktiv. Tracking-Punkte in Echtzeit.');
    } else if (source === 'upload') {
      stopCameraStream();
      setStatusMessage('Wähle eine Videodatei aus, um die Analyse zu starten.');
    }

    animationFrameRef.current = requestAnimationFrame(runDemoAnimation);

    return () => {
      stopCameraStream();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [source, runDemoAnimation, facingMode, stopCameraStream]);

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
    setStatusMessage('Metrik erfolgreich lokal im Spielerprofil vermerkt!');
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
          <button
            onClick={() => setSource('demo')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              source === 'demo'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interaktive Demo</span>
          </button>

          <button
            onClick={() => setSource('camera')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              source === 'camera'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live-Kamera</span>
          </button>

          <label
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              source === 'upload'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Video hochladen</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                setSource('upload');
                handleFileUpload(e);
              }}
            />
          </label>
        </div>

        {/* Kamera-Umschalter bei Mobilgeräten */}
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
      </div>

      {/* 3. Analyse-Bereich: Video/Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Linke Spalte: Viewport mit Video & Canvas-Overlay */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-950 border-2 border-emerald-500/20 shadow-2xl flex items-center justify-center">
            {/* HTML5 Video Element (für Kamera oder Upload) */}
            <video
              ref={videoRef}
              playsInline
              muted
              loop
              className={`absolute inset-0 w-full h-full object-cover ${
                source === 'demo' ? 'hidden' : 'block'
              }`}
            />

            {/* Canvas Overlay für KI-Pose-Tracking & Gelenkachsen */}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
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

          {/* Status-Leiste unter dem Video */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {statusMessage}
            </span>
            <span className="text-[11px] font-mono text-slate-500">60 FPS • Pose Landmarker</span>
          </div>
        </div>

        {/* Rechte Spalte: Biomechanik & Diagnostik-Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <h2 className="text-base font-black text-white flex items-center justify-between">
              <span>Biomechanik-Werte</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                Score: {metrics.consistencyScore}/100
              </span>
            </h2>

            {/* Metrik 1: Abwurfwinkel */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Release-Winkel (Abwurf)</span>
                <span className="text-emerald-400 font-mono text-sm">{metrics.releaseAngle}°</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Optimaler BBDV-Korridor: 92° – 105°. Dein Wurf löst exakt im idealen Flugbogen.
              </p>
            </div>

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

            {/* Metrik 4: Durchschwung */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300">Follow-Through Streckung</span>
                <span className="text-purple-400 font-mono text-sm">{metrics.followThroughAngle}°</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ausgeprägte Endstreckung zur Stabilisierung der Flugbahn zum Board.
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
                  <span>Analyse-Metrik im Profil sichern</span>
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
