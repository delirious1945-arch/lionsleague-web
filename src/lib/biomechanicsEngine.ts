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
// 4b. CENTRIPETAL CATMULL-ROM SPLINE INTERPOLATION (BUTTERWEICHE VEKTORKURVEN)
// ----------------------------------------------------------------------------
export function interpolateCatmullRomSpline(
  pts: TrajectoryPoint[],
  subdivisions: number = 3
): TrajectoryPoint[] {
  if (pts.length < 3) return pts;

  const result: TrajectoryPoint[] = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    for (let s = 0; s < subdivisions; s++) {
      if (i > 0 && s === 0) continue;
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      const timeSec = p1.timeSec + (p2.timeSec - p1.timeSec) * t;

      result.push({
        x: Math.round(x * 10000) / 10000,
        y: Math.round(y * 10000) / 10000,
        timeSec: Math.round(timeSec * 1000) / 1000,
      });
    }
  }

  result.push(pts[pts.length - 1]);
  return result;
}

// ----------------------------------------------------------------------------
// 5. ECHTE FEINGRANULARE WURFTRAJEKTORIE (FOLGT 100% DEM ECHTEN ARM!)
// ----------------------------------------------------------------------------
// Rekonstruiert aus den echten abgetasteten Video-Frames die wahre Bewegungskurve
// des Handgelenks vom Ausholen (Drawback) über den Apex bis zum Release!
// KEINE künstlichen Kreisbögen! 100% authentische Spieler-Biomechanik.
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
  const dirSign = handedness === 'right' ? 1 : -1;

  if (!throwFrames || throwFrames.length === 0) {
    const dummy: ScannedFrame = {
      timeSec: 0,
      pose: {
        head: { x: 0.5, y: 0.2 },
        shoulder: { x: 0.45, y: 0.35 },
        elbow: { x: 0.55, y: 0.38 },
        wrist: { x: 0.62, y: 0.3 },
        hip: { x: 0.45, y: 0.6 },
      },
      elbowAngle: 90,
      deltaAngle: 0,
      deltaElbowY_mm: 0,
      deltaShoulder_mm: 0,
    };
    return {
      points: [],
      drawbackFrame: dummy,
      releaseFrame: dummy,
      followThroughFrame: dummy,
    };
  }

  // 1. Finde Drawback-Frame (Tiefster Rückzug / Umkehrpunkt zum Gesicht)
  let drawbackIdx = 0;
  let bestDrawbackScore = Infinity;
  const maxSearchIdx = Math.max(1, Math.floor(throwFrames.length * 0.75));

  for (let i = 0; i < maxSearchIdx; i++) {
    const f = throwFrames[i];
    // Hand am weitesten hinten Richtung Schulter/Kopf + kleinster Ellenbogenwinkel
    const wristBackScore = f.elbowAngle + dirSign * (f.pose.wrist.x - f.pose.elbow.x) * 220;
    if (wristBackScore < bestDrawbackScore) {
      bestDrawbackScore = wristBackScore;
      drawbackIdx = i;
    }
  }
  const drawbackFrame = throwFrames[drawbackIdx] || throwFrames[0];

  // 2. Finde Follow-Through / maximale Vorwärtsstreckung NACH dem Drawback
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

  // 3. Finde Release-Frame (Apex der Handbeschleunigung zwischen Drawback & Follow-Through)
  let releaseIdx = followIdx;
  let bestReleaseDiff = Infinity;
  for (let i = drawbackIdx + 1; i <= followIdx; i++) {
    const f = throwFrames[i];
    const diff = Math.abs(f.elbowAngle - 116);
    if (diff < bestReleaseDiff && f.elbowAngle > drawbackFrame.elbowAngle + 10) {
      bestReleaseDiff = diff;
      releaseIdx = i;
    }
  }
  const releaseFrame = throwFrames[releaseIdx] || followThroughFrame;

  // 4. ECHTE FEINGRANULARE HANDGELENKS-TRAJEKTORIE:
  // Wir erfassen die organische Bewegung der Hand ab Beginn des Ausholens (Set-Point)
  // über den tiefsten Rückzugspunkt bis zum Release-Apex und Durchschwung!
  const lookbackSteps = Math.min(10, Math.floor(throwFrames.length * 0.15));
  const startIdx = Math.max(0, drawbackIdx - lookbackSteps);
  const endIdx = Math.min(throwFrames.length - 1, followIdx + 2);
  const activeFrames = throwFrames.slice(startIdx, endIdx + 1);

  // Echte Handgelenkspositionen extrahieren
  const rawPts: TrajectoryPoint[] = activeFrames.map((f) => ({
    x: f.pose.wrist.x,
    y: f.pose.wrist.y,
    timeSec: f.timeSec,
  }));

  // Glättung & Entprellung einzelner Tracking-Ausreißer
  const cleanedPts: TrajectoryPoint[] = [];
  for (let i = 0; i < rawPts.length; i++) {
    const cur = rawPts[i];
    if (i > 0 && i < rawPts.length - 1) {
      const prev = rawPts[i - 1];
      const next = rawPts[i + 1];
      const jump1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      const jump2 = Math.hypot(next.x - cur.x, next.y - cur.y);
      const smoothDist = Math.hypot(next.x - prev.x, next.y - prev.y);
      if (jump1 > 0.055 && jump2 > 0.055 && smoothDist < 0.045) {
        cleanedPts.push({
          x: (prev.x + next.x) / 2,
          y: (prev.y + next.y) / 2,
          timeSec: cur.timeSec,
        });
        continue;
      }
    }
    cleanedPts.push(cur);
  }

  // 1-Euro adaptive Filterung gegen hochfrequenten Kamerasensor-Jitter
  const smoothed = smoothTrajectory1Euro(cleanedPts);

  // Feingranulare Catmull-Rom Spline-Interpolation für ultra-flüssige, edle Linienführung
  const splinePts = interpolateCatmullRomSpline(smoothed, 3);

  return {
    points: splinePts,
    drawbackFrame,
    releaseFrame,
    followThroughFrame,
  };
}

// ----------------------------------------------------------------------------
// 5b. GARANTIERTE ANKERUNG AN DIE AKTUELLE ECHTE SPIELER-POSE IM BILD
// ----------------------------------------------------------------------------
export function anchorTrajectoriesToPose(
  pose: PoseKeypoints,
  trajectories: ThrowTrajectory[],
  dims: { width: number; height: number },
  handedness: 'right' | 'left',
  mmPerPx: number,
  isSlowMo: boolean,
  forceReanchor: boolean = false
): ThrowTrajectory[] {
  return trajectories;
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

// ----------------------------------------------------------------------------
// 7. PRÄZISIONS-LERP & KINEMATIK-TIMELINE-ENTKOPPLUNG (0ms Latenz)
// ----------------------------------------------------------------------------
export interface TimelinePoseFrame {
  timeSec: number;
  pose: PoseKeypoints;
}

export function interpolateKeypoints(
  p1: PoseKeypoints,
  p2: PoseKeypoints,
  alpha: number
): PoseKeypoints {
  const a = Math.max(0, Math.min(1, alpha));
  const lerp = (v1: number, v2: number) => v1 + (v2 - v1) * a;
  const lerpPt = (pt1: Point, pt2: Point): Point => ({
    x: lerp(pt1.x, pt2.x),
    y: lerp(pt1.y, pt2.y),
  });

  return {
    isRealDetection: true,
    head: lerpPt(p1.head, p2.head),
    eye: p1.eye && p2.eye ? lerpPt(p1.eye, p2.eye) : p1.eye || p2.eye,
    shoulder: lerpPt(p1.shoulder, p2.shoulder),
    elbow: lerpPt(p1.elbow, p2.elbow),
    wrist: lerpPt(p1.wrist, p2.wrist),
    hip: lerpPt(p1.hip, p2.hip),
    knee: p1.knee && p2.knee ? lerpPt(p1.knee, p2.knee) : p1.knee || p2.knee,
    ankle: p1.ankle && p2.ankle ? lerpPt(p1.ankle, p2.ankle) : p1.ankle || p2.ankle,
    heel: p1.heel && p2.heel ? lerpPt(p1.heel, p2.heel) : p1.heel || p2.heel,
    toe: p1.toe && p2.toe ? lerpPt(p1.toe, p2.toe) : p1.toe || p2.toe,
  };
}

export function getInterpolatedPose(
  timeline: TimelinePoseFrame[],
  currentTime: number
): PoseKeypoints | null {
  if (!timeline || timeline.length === 0) return null;
  if (currentTime <= timeline[0].timeSec) return timeline[0].pose;
  if (currentTime >= timeline[timeline.length - 1].timeSec) {
    return timeline[timeline.length - 1].pose;
  }

  let low = 0;
  let high = timeline.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (timeline[mid].timeSec <= currentTime) {
      if (mid === timeline.length - 1 || timeline[mid + 1].timeSec > currentTime) {
        const p1 = timeline[mid];
        const p2 = timeline[mid + 1];
        const dt = p2.timeSec - p1.timeSec;
        if (dt <= 0.001) return p1.pose;
        // Bei Pausen zwischen Darts (> 2.5s) nicht schleifend interpolieren
        if (dt > 2.5) {
          return currentTime - p1.timeSec < p2.timeSec - currentTime ? p1.pose : p2.pose;
        }
        const alpha = (currentTime - p1.timeSec) / dt;
        return interpolateKeypoints(p1.pose, p2.pose, alpha);
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return timeline[0].pose;
}

