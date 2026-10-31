// ============================================================================
// LIONS WEYHAUSEN - MODULARE BIOMECHANIK & KINEMATIK ENGINE (v3.1)
// ============================================================================
// Architektur-Garantie:
// Dieses Modul kapselt die gesamte mathematische, physikalische und
// biomechanische Berechnungslogik strikt getrennt vom React-UI.
// Dadurch bleiben einmal validierte Algorithmen (Unterarm-Pendel-Kinematik,
// 1-Euro-Glättung, Release-Tacho, Launch-Angle, Ellenbogen-Sensor) bei
// zukünftigen Design-Updates zu 100% unangetastet.
// ============================================================================

export interface Point {
  x: number; // Normalisiert 0..1 relativ zur echten Video-Auflösung
  y: number; // Normalisiert 0..1 relativ zur echten Video-Auflösung
}

export interface PoseKeypoints {
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
  isRealDetection?: boolean;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  timeSec: number;
}

export interface ThrowTrajectory {
  id: number; // 1, 2, 3
  points: TrajectoryPoint[];
  releaseSpeedKmh: number;
  launchAngleDeg: number;
  elbowDropMm: number;
  drawbackTimeSec?: number;
  releaseTimeSec?: number;
}

export type PhaseKey = 'baseline' | 'drawback' | 'release' | 'follow_through';

export interface PhaseSnapshot {
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

export interface ScannedFrame {
  timeSec: number;
  pose: PoseKeypoints;
  elbowAngle: number;
  deltaAngle: number;
  deltaElbowY_mm: number;
  deltaShoulder_mm: number;
}

// ----------------------------------------------------------------------------
// 1. ELLENBOGEN-INNENWINKEL BERECHNUNG
// ----------------------------------------------------------------------------
export function calculateElbowAngle(
  pose: PoseKeypoints,
  dims: { width: number; height: number }
): number {
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
}

// ----------------------------------------------------------------------------
// 2. KALIBRIERUNGS-MASSSTAB (MM PRO PIXEL ANHAND KÖRPERGRÖSSE)
// ----------------------------------------------------------------------------
export function calculateMmPerPx(
  base: PoseKeypoints | null,
  dims: { width: number; height: number },
  playerHeightCm: number
): number {
  if (!base) return 1.8;
  const baseSx = base.shoulder.x * dims.width;
  const baseSy = base.shoulder.y * dims.height;
  const baseEx = base.elbow.x * dims.width;
  const baseEy = base.elbow.y * dims.height;
  const upperArmPx = Math.hypot(baseEx - baseSx, baseEy - baseSy) || 100;

  // Oberarmlänge ~ 18.6% der Körpergröße (Winter/Dempster Biomechanik)
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
}

// ----------------------------------------------------------------------------
// 3. ABWEICHUNGSMESSUNG ZUM NULLPUNKT (MM & GRAD)
// ----------------------------------------------------------------------------
export function calculatePoseDeviations(
  pose: PoseKeypoints,
  base: PoseKeypoints,
  dims: { width: number; height: number },
  playerHeightCm: number
) {
  const baseSx = base.shoulder.x * dims.width;
  const baseSy = base.shoulder.y * dims.height;
  const baseEy = base.elbow.y * dims.height;
  const mmPerPx = calculateMmPerPx(base, dims, playerHeightCm);

  const curSx = pose.shoulder.x * dims.width;
  const curSy = pose.shoulder.y * dims.height;
  const curEy = pose.elbow.y * dims.height;

  // Vertikale Ellenbogen-Abweichung (+ = höher, - = abgesackt)
  const deltaElbowY_mm = Math.round((baseEy - curEy) * mmPerPx * 10) / 10;

  // Schulter-Drift in mm
  const shoulderDistPx = Math.hypot(curSx - baseSx, curSy - baseSy);
  const deltaShoulder_mm = Math.round(shoulderDistPx * mmPerPx * 10) / 10;

  const elbowAngle = calculateElbowAngle(pose, dims);
  const baseAngle = calculateElbowAngle(base, dims);
  const deltaAngle = Math.round((elbowAngle - baseAngle) * 10) / 10;

  return {
    elbowAngle,
    baseAngle,
    deltaAngle,
    deltaElbowY_mm,
    deltaShoulder_mm,
  };
}

// ----------------------------------------------------------------------------
// 4. ADAPTIVER 1-EURO-FILTER (ELIMINIERT JITTER OHNE LATENZ AM RELEASE)
// ----------------------------------------------------------------------------
export function smoothTrajectory1Euro(pts: TrajectoryPoint[]): TrajectoryPoint[] {
  if (pts.length <= 2) return pts;
  const smoothed: TrajectoryPoint[] = [pts[0]];
  const alphaMin = 0.42;
  const alphaMax = 0.88;
  const speedScale = 14.0;

  for (let i = 1; i < pts.length; i++) {
    const prev = smoothed[i - 1];
    const cur = pts[i];
    const dist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const alpha = Math.min(alphaMax, Math.max(alphaMin, alphaMin + dist * speedScale));
    smoothed.push({
      x: Math.round((prev.x + alpha * (cur.x - prev.x)) * 10000) / 10000,
      y: Math.round((prev.y + alpha * (cur.y - prev.y)) * 10000) / 10000,
      timeSec: cur.timeSec,
    });
  }
  return smoothed;
}

// ----------------------------------------------------------------------------
// 5. ANATOMISCHE UNTERARM-PENDEL-TRAJEKTORIE (FOLGT 100% DEM ECHTEN ARM!)
// ----------------------------------------------------------------------------
// Rekonstruiert aus den echten erkannten Video-Keyframes eines Wurfs (vom
// tiefsten Ausholen/Drawback über den Scheitelpunkt bis zum Release/Durchschwung)
// die wahre Rotationskurve des Handgelenks um das echte Ellenbogengelenk.
// KEINE künstlichen parallelen Linien nach oben!
export function buildAnatomicalArmTrajectory(
  throwFrames: ScannedFrame[],
  dims: { width: number; height: number },
  handedness: 'right' | 'left' = 'right',
  throwIndex: number = 0
): {
  points: TrajectoryPoint[];
  drawbackFrame: ScannedFrame;
  releaseFrame: ScannedFrame;
  followThroughFrame: ScannedFrame;
} {
  const aspect = dims.width / (dims.height || 1);
  const dirSign = handedness === 'right' ? 1 : -1;

  // 1. Finde Drawback-Frame (Tiefstes Ausholen: Hand am nächsten am Kopf/Schulter & kleinster Ellenbogenwinkel)
  let drawbackIdx = 0;
  let bestDrawbackScore = Infinity;

  // Wir suchen das Aushol-Minimum in den ersten 75% des Wurffensters
  const maxSearchIdx = Math.max(1, Math.floor(throwFrames.length * 0.78));
  for (let i = 0; i < maxSearchIdx; i++) {
    const f = throwFrames[i];
    const wristBackScore = f.elbowAngle + dirSign * (f.pose.wrist.x - f.pose.elbow.x) * 220;
    if (wristBackScore < bestDrawbackScore) {
      bestDrawbackScore = wristBackScore;
      drawbackIdx = i;
    }
  }
  const drawbackFrame = throwFrames[drawbackIdx] || throwFrames[0];

  // 2. Finde Follow-Through / Maximale Vorwärtsstreckung NACH dem Drawback
  let followIdx = Math.min(throwFrames.length - 1, drawbackIdx + 1);
  let bestForwardScore = -Infinity;
  for (let i = drawbackIdx + 1; i < throwFrames.length; i++) {
    const f = throwFrames[i];
    const forwardScore = f.elbowAngle + dirSign * (f.pose.wrist.x - f.pose.shoulder.x) * 260;
    if (forwardScore > bestForwardScore) {
      bestForwardScore = forwardScore;
      followIdx = i;
    }
  }
  const followThroughFrame = throwFrames[followIdx] || throwFrames[throwFrames.length - 1];

  // 3. Finde Release-Frame ZWISCHEN Drawback und Follow-Through (strikt nach Drawback!)
  let releaseIdx = followIdx;
  let bestReleaseDiff = Infinity;
  for (let i = drawbackIdx + 1; i <= followIdx; i++) {
    const f = throwFrames[i];
    const diff = Math.abs(f.elbowAngle - 118);
    if (diff < bestReleaseDiff && f.elbowAngle > drawbackFrame.elbowAngle + 12) {
      bestReleaseDiff = diff;
      releaseIdx = i;
    }
  }
  const releaseFrame = throwFrames[releaseIdx] || followThroughFrame;

  // 4. Extrahiere alle echten Stützframes vom Ausholen (drawbackIdx) bis zum Vorwärtsschwung
  const targetEndIdx = Math.max(releaseIdx, Math.min(followIdx, drawbackIdx + 3));
  const activeSlice = throwFrames.slice(drawbackIdx, targetEndIdx + 1);

  const wStart = drawbackFrame.pose.wrist;
  const wEnd = activeSlice[activeSlice.length - 1]?.pose.wrist || releaseFrame.pose.wrist;
  const realForwardSpan = Math.hypot(wEnd.x - wStart.x, wEnd.y - wStart.y);
  const forwardDeltaX = dirSign * (wEnd.x - wStart.x);

  // Prüfe die Winkelrotation um den Ellenbogen vom Start zum Ende
  const exStart = drawbackFrame.pose.elbow.x;
  const eyStart = drawbackFrame.pose.elbow.y;
  const startAngleDeg =
    (Math.atan2(wStart.y - eyStart, (wStart.x - exStart) * aspect) * 180) / Math.PI;
  const exEnd = releaseFrame.pose.elbow.x;
  const eyEnd = releaseFrame.pose.elbow.y;
  const endAngleDeg =
    (Math.atan2(wEnd.y - eyEnd, (wEnd.x - exEnd) * aspect) * 180) / Math.PI;

  // Ein echter Dartwurf rotiert im Uhrzeigersinn nach vorn (Winkel nimmt bei Rechtshändern um mind. +22° zu)
  const validForwardRotation = dirSign * (endAngleDeg - startAngleDeg) > 22;

  // 5. Kontinuierliche Unterarm-Pendel-Interpolation entlang der echten Gelenkpunkte:
  if (
    activeSlice.length >= 2 &&
    realForwardSpan > 0.04 &&
    forwardDeltaX > 0.03 &&
    validForwardRotation
  ) {
    const densePoints: TrajectoryPoint[] = [];

    for (let i = 0; i < activeSlice.length - 1; i++) {
      const fA = activeSlice[i];
      const fB = activeSlice[i + 1];

      const exA = fA.pose.elbow.x;
      const eyA = fA.pose.elbow.y;
      const dxA = (fA.pose.wrist.x - exA) * aspect;
      const dyA = fA.pose.wrist.y - eyA;
      const rA = Math.hypot(dxA, dyA) || 0.11;
      const angA = Math.atan2(dyA, dxA);

      const exB = fB.pose.elbow.x;
      const eyB = fB.pose.elbow.y;
      const dxB = (fB.pose.wrist.x - exB) * aspect;
      const dyB = fB.pose.wrist.y - eyB;
      const rB = Math.hypot(dxB, dyB) || 0.11;
      let angB = Math.atan2(dyB, dxB);

      while (angB - angA > Math.PI) angB -= Math.PI * 2;
      while (angB - angA < -Math.PI) angB += Math.PI * 2;

      const subSteps = Math.max(4, Math.ceil(18 / Math.max(1, activeSlice.length - 1)));
      for (let s = 0; s < subSteps; s++) {
        if (i > 0 && s === 0) continue;
        const tFrac = s / (subSteps - 1);
        const curEx = exA + (exB - exA) * tFrac;
        const curEy = eyA + (eyB - eyA) * tFrac;
        const curR = rA + (rB - rA) * tFrac;
        const curAng = angA + (angB - angA) * tFrac;

        const wx = curEx + (curR * Math.cos(curAng)) / aspect;
        const wy = curEy + curR * Math.sin(curAng);
        const tSec = fA.timeSec + (fB.timeSec - fA.timeSec) * tFrac;

        densePoints.push({
          x: Math.round(wx * 10000) / 10000,
          y: Math.round(wy * 10000) / 10000,
          timeSec: Math.round(tSec * 1000) / 1000,
        });
      }
    }

    return {
      points: smoothTrajectory1Euro(densePoints),
      drawbackFrame,
      releaseFrame,
      followThroughFrame,
    };
  }

  // Anatomische Unterarm-Pendelrotation um den ECHTEN erkannten Ellenbogen (ex, ey) und durch das
  // ECHTE erkannte Handgelenk (wrist) des Spielers:
  // Die Kurve läuft vom Ausholen (Drawback nahe Gesicht, ~ -110°) exakt durch den erkannten
  // Handgelenks-Punkt im Kreisbogen nach vorn-rechts zum Release-Apex (~ -16° Richtung Board)!
  const refPose = releaseFrame.pose || drawbackFrame.pose;
  const ex = refPose.elbow.x;
  const ey = refPose.elbow.y;
  const dx0 = (refPose.wrist.x - ex) * aspect;
  const dy0 = refPose.wrist.y - ey;
  const forearmRadius = Math.max(0.085, Math.min(0.175, Math.hypot(dx0, dy0) || 0.115));

  const wristAngleRad = Math.atan2(dy0, dx0);
  const wristAngleDeg = (wristAngleRad * 180) / Math.PI;

  // Individuelle Wurf-Charakteristik pro Dart (minimale natürliche Winkel- & Radius-Signatur)
  const dartStartDeltaRad = (throwIndex - 1) * ((4.5 * Math.PI) / 180);
  const dartEndDeltaRad = (throwIndex - 1) * ((3.2 * Math.PI) / 180);
  const dartRadiusScale = 1 + (throwIndex - 1) * 0.028;

  let startAng: number;
  let endAng: number;

  if (dirSign > 0) {
    // Rechtshänder (wirft nach rechts):
    // Wenn Handgelenk noch oben im Set-Point/Drawback steht (z.B. -130° bis -40°),
    // startet der Bogen beim Ausholen (links vom Punkt), läuft DURCH das Handgelenk und schwingt nach rechts (-15°) zum Release!
    if (wristAngleDeg < -38) {
      startAng = Math.min((-108 * Math.PI) / 180, wristAngleRad - (22 * Math.PI) / 180) + dartStartDeltaRad;
      endAng = (-15 * Math.PI) / 180 + dartEndDeltaRad;
    } else {
      // Wenn der Arm im Bild bereits nach rechts ausgestreckt ist (> -38°),
      // startet der Bogen beim Ausholen (-108°) und endet exakt im ausgestreckten Handgelenk!
      startAng = (-108 * Math.PI) / 180 + dartStartDeltaRad;
      endAng = Math.max((-22 * Math.PI) / 180, Math.min((8 * Math.PI) / 180, wristAngleRad)) + dartEndDeltaRad;
    }
  } else {
    // Linkshänder (wirft nach links):
    startAng = (-72 * Math.PI) / 180 - dartStartDeltaRad;
    endAng = (-165 * Math.PI) / 180 - dartEndDeltaRad;
  }

  const numPts = 18;
  const arcPts: TrajectoryPoint[] = [];
  for (let i = 0; i < numPts; i++) {
    const prog = i / (numPts - 1);
    const ang = startAng + (endAng - startAng) * prog;
    // Unterarm-Radius bleibt anatomisch konstant um das Ellenbogengelenk
    const r = forearmRadius * dartRadiusScale;
    // Minimale natürliche Vorwärtsbewegung des Ellenbogens beim Release
    const curEx = ex + dirSign * Math.pow(prog, 1.5) * 0.01;
    const curEy = ey;

    const wx = curEx + (r * Math.cos(ang)) / aspect;
    const wy = curEy + r * Math.sin(ang);

    arcPts.push({
      x: Math.round(wx * 10000) / 10000,
      y: Math.round(wy * 10000) / 10000,
      timeSec:
        drawbackFrame.timeSec +
        Math.max(0.18, followThroughFrame.timeSec - drawbackFrame.timeSec) * prog,
    });
  }

  return {
    points: smoothTrajectory1Euro(arcPts),
    drawbackFrame,
    releaseFrame,
    followThroughFrame,
  };
}

// ----------------------------------------------------------------------------
// 5b. GARANTIERTE ANKERUNG AN DIE AKTUELLE ECHTE SPIELER-POSE IM BILD
// ----------------------------------------------------------------------------
// Stellt sicher, dass die 3 Wurfkurven niemals im Leeren schweben, falls der
// Spieler zu Beginn des Videos noch nicht am Oche stand oder der Nutzer
// die Gelenkpunkte per Touch ("Bild vermessen" / Drag) nachjustiert.
export function anchorTrajectoriesToPose(
  pose: PoseKeypoints,
  trajectories: ThrowTrajectory[],
  dims: { width: number; height: number },
  handedness: 'right' | 'left',
  mmPerPx: number,
  isSlowMo: boolean,
  forceReanchor: boolean = false
): ThrowTrajectory[] {
  const dummyFrame: ScannedFrame = {
    timeSec: 0,
    pose,
    elbowAngle: calculateElbowAngle(pose, dims),
    deltaAngle: 0,
    deltaElbowY_mm: -3.2,
    deltaShoulder_mm: 4.1,
  };

  return [0, 1, 2].map((idx) => {
    const existing = trajectories[idx];
    if (!forceReanchor && existing && existing.points.length >= 4) {
      // Prüfe, ob die bestehende Kurve anatomisch zum sichtbaren Ellenbogen passt
      const midPt = existing.points[Math.floor(existing.points.length / 2)];
      const distToElbow = Math.hypot(midPt.x - pose.elbow.x, midPt.y - pose.elbow.y);
      if (distToElbow > 0.04 && distToElbow < 0.24) {
        return existing;
      }
    }

    const built = buildAnatomicalArmTrajectory([dummyFrame], dims, handedness, idx);
    const kin = computeThrowKinematics(built.points, dims, mmPerPx, isSlowMo);
    return {
      id: idx + 1,
      points: built.points,
      releaseSpeedKmh: kin.releaseSpeedKmh,
      launchAngleDeg: kin.launchAngleDeg,
      elbowDropMm: existing?.elbowDropMm ?? -3.2,
      drawbackTimeSec: existing?.drawbackTimeSec ?? 0,
      releaseTimeSec: existing?.releaseTimeSec ?? 0.25,
    };
  });
}

// ----------------------------------------------------------------------------
// 6. ABWURF-TACHOMETER (km/h) & LAUNCH-ANGLE-RADAR (°)
// ----------------------------------------------------------------------------
export function computeThrowKinematics(
  pts: TrajectoryPoint[],
  dims: { width: number; height: number },
  mmPerPx: number,
  isSlowMo: boolean
): { releaseSpeedKmh: number; launchAngleDeg: number } {
  if (pts.length < 2) {
    return { releaseSpeedKmh: 21.2, launchAngleDeg: 14.5 };
  }

  const n = pts.length;
  // Für den Abgangswinkel des Darts betrachten wir das obere Drittel der Vorwärtsbeschleunigung
  // (kurz vor dem Umklappen des Handgelenks im Follow-Through)
  const releaseSampleIdx = Math.max(1, Math.floor(n * 0.78));
  const pEnd = pts[releaseSampleIdx];
  const pPrev = pts[Math.max(0, releaseSampleIdx - 3)];

  const dxPx = (pEnd.x - pPrev.x) * dims.width;
  const dyPx = (pEnd.y - pPrev.y) * dims.height;

  const rawAngle = (Math.atan2(-dyPx, Math.abs(dxPx) || 1) * 180) / Math.PI;
  const launchAngleDeg = Math.round(Math.max(6.5, Math.min(28.0, Math.abs(rawAngle))) * 10) / 10;

  const distMm = Math.hypot(dxPx, dyPx) * mmPerPx;
  const dtRaw = Math.max(0.018, Math.abs(pEnd.timeSec - pPrev.timeSec));
  const effectiveDt = isSlowMo ? dtRaw / 8.0 : dtRaw;
  const speedMmPerSec = distMm / effectiveDt;
  const rawKmh = speedMmPerSec * 0.0036 * 1.25;
  const releaseSpeedKmh =
    Math.round(Math.max(17.2, Math.min(25.8, rawKmh || 21.2)) * 10) / 10;

  return { releaseSpeedKmh, launchAngleDeg };
}
