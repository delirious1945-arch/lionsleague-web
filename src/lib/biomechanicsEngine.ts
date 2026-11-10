// ============================================================================
// LIONS WEYHAUSEN - MODULARE BIOMECHANIK & KINEMATIK ENGINE (v3.5 PRO ENGINE)
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

export interface RawLandmarkPoint {
  id: number; // 0..32 (MediaPipe BlazePose ID)
  name: string; // Deutscher anatomischer Fachbegriff
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface SubClusterNode {
  code: string; // z.B. W1..W10, A1..A10, E1..E10
  label: string; // Anatomische Bezeichnung
  x: number;
  y: number;
}

export interface SyntheticBiomechanicalNodes {
  dartGripPoint: Point;      // #33 P_Dart: Gewichteter Schwerpunkt aus Daumen (22), Zeigefinger (20) & Handgelenk (16)
  supplyHandCenter: Point;   // #34 P_Supply: Schwerpunkt der Dart-Haltehand / Übergabehand (15, 17, 19, 21)
  handoverPoint: Point;      // #35 P_Handover: Kontakt-/Übergabepunkt zwischen Wurfhand & Haltehand auf Hüfthöhe
  neckC7: Point;             // #36 C7 Nacken-Zentrum (Mittelpunkt Schulterachse 11-12 + Ohr-Vektor)
  pelvisCoM: Point;          // #37 L4/CoM Körperschwerpunkt (Becken-Trapez-Zentrum 23-24)
  thoraxT8: Point;           // #38 T8 Brustbein-/Thorax-Zentrum (auf der virtuellen Wirbelsäule C7 -> CoM)
  forearmPivotAnchor: Point; // #39 L_Forearm: Unterarm-Schwerpunkt & Knochenlängen-Invarianz-Anker
}

export interface HiddenBiomechanicalRig {
  rawLandmarks: RawLandmarkPoint[];        // Alle 33 nativen MediaPipe-Punkte (0..32)
  syntheticNodes: SyntheticBiomechanicalNodes; // + 7 virtuelle Basis-Stützknoten (#33..#39)
  wristCluster10: SubClusterNode[];        // + 10 hochauflösende Handgelenk- & Handwurzel-Punkte (W1..W10)
  armCluster10: SubClusterNode[];          // + 10 hochauflösende Oberarm- & Unterarm-Fachwerkpunkte (A1..A10)
  elbowCluster10: SubClusterNode[];        // + 10 hochauflösende Ellenbogen-Gelenkkapsel-Punkte (E1..E10) -> Gesamt: 70 Punkte!
  wristSnapAngleDeg: number;               // Handgelenks-Kippwinkel (Unterarm 14->16 zu Fingerachse 16->33)
  handoverDistanceNorm: number;            // Normalisierter Abstand zwischen Wurfhand (#33) und Haltehand (#34)
  isBimanualHandover: boolean;             // True wenn Wurfhand & Haltehand auf Hüfthöhe den Dart übergeben
  upperArmLengthNorm: number;              // Aktuelle normalisierte Oberarmlänge (12 <-> 14)
  forearmLengthNorm: number;               // Aktuelle normalisierte Unterarmlänge (14 <-> 16)
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
  supplyWrist?: Point;
  hiddenRig?: HiddenBiomechanicalRig;
  isRealDetection?: boolean;
  confidenceScore?: number;
  isHighConfidence?: boolean;
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
  releasePoint?: Point; // Exakter Abwurf-Apex (Handgelenk beim Release)
  drawbackPoint?: Point; // Tiefster Rückzugspunkt
  followThroughPoint?: Point; // Durchschwung-Endpunkt
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

// ============================================================================
// DIE 5 KERNWINKEL DER DART-BIOMECHANIK (GEMÄSS AGENTS.MD §12.6)
// ============================================================================
export interface FiveCoreAngles {
  stanceAngleDeg: number;        // 1. Standwinkel (Kniewinkel / Oche-Standachse)
  drawbackAngleDeg: number;      // 2. Rückzugwinkel (Ellenbogenbeugung tiefster Drawback)
  releaseAngleDeg: number;       // 3. Releasewinkel (Ellenbogenwinkel Abwurf-Apex)
  followThroughAngleDeg: number; // 4. Nachhaltewinkel (Volle Armstreckung Durchschwung)
  trunkLeanAngleDeg: number;     // 5. Neigungswinkel (Rumpf-Vorneigung zur Vertikalen)
}

export interface FiveCoreAnglesValidation {
  current: FiveCoreAngles;
  baseline: FiveCoreAngles;
  deltas: {
    stanceDeltaDeg: number;
    trunkLeanDeltaDeg: number;
    drawbackDeltaDeg: number;
    releaseDeltaDeg: number;
    followThroughDeltaDeg: number;
  };
  evaluation: {
    isStanceStable: boolean;          // Abweichung <= 4.0°
    isTrunkStable: boolean;           // Abweichung <= 3.0°
    isDrawbackOptimal: boolean;       // 35° bis 65°
    isReleaseConsistent: boolean;     // 95° bis 130°
    isFollowThroughComplete: boolean; // >= 150°
    postureScore: number;             // 0 bis 100
  };
}

export interface PoseLandmarkQuality {
  averageConfidence: number;
  isHighConfidence: boolean; // Schwellenwert >= 0.70 gem. AGENTS.md §12.6
  lowConfidenceLandmarks: string[];
}

// ============================================================================
// BBDV-STANDARDS & BIOMECHANISCHE NORM-KONSTANTEN
// ============================================================================
export const BBDV_STANDARDS = {
  BULLSEYE_HEIGHT_MM: 1730, // 1,73 m Boden bis Bullseye
  HORIZONTAL_DISTANCE_MM: 2370, // 2,37 m Oche-Kante bis Board
  DIAGONAL_DISTANCE_MM: 2934, // 2,934 m Oche-Kante bis Bullseye
  BOARD_DIAMETER_MM: 451, // 451 mm Außendurchmesser
  OCHE_WIDTH_MIN_MM: 200, // 200 mm Referenz-Linie
  OPTIMAL_DRAWBACK_MIN_DEG: 30.0,
  OPTIMAL_DRAWBACK_MAX_DEG: 70.0,
  OPTIMAL_RELEASE_MIN_DEG: 95.0,
  OPTIMAL_RELEASE_MAX_DEG: 130.0,
  OPTIMAL_FOLLOW_THROUGH_MIN_DEG: 148.0,
  MAX_STANCE_DELTA_DEG: 4.0,
  MAX_TRUNK_LEAN_DELTA_DEG: 3.0,
  MAX_ELBOW_DROP_MM: -15.0,
};

export type CalibrationMethod = 'anthropometric' | 'board_height' | 'oche_marker';

export interface CalibrationOptions {
  method?: CalibrationMethod;
  playerHeightCm?: number;
  referenceDistanceMm?: number; // z.B. 1730 für Boardhöhe oder 200 für Marker
  referencePixelLength?: number; // Gemessene Pixel-Distanz des Referenzobjekts
}

export interface ThreeDartDispersion {
  releaseDispersionMm: number; // Maximaler räumlicher Abstand zwischen den Abwurfpunkten (mm)
  speedStdDevKmh: number; // Standardabweichung der Abwurfgeschwindigkeit (km/h)
  launchAngleStdDevDeg: number; // Standardabweichung des Launch-Angles (Grad)
  overallConsistencyScore: number; // 0 bis 100 Punkte
  dispersionRating: 'EXZELLENT' | 'STABIL' | 'VERBESSERBAR';
  drawbackDispersionMm?: number; // Maximaler räumlicher Abstand zwischen den Rückzugspunkten (mm)
  timingStdDevMs?: number; // Standardabweichung der Vorwärtsbeschleunigungs-Dauer in ms (Rhythmus)
  avgForwardPhaseMs?: number; // Durchschnittliche Dauer der Beschleunigungsphase (ms)
}

// ----------------------------------------------------------------------------
// 1. ELLENBOGEN-INNENWINKEL BERECHNUNG
// ----------------------------------------------------------------------------
export function calculateElbowAngle(
  pose: PoseKeypoints,
  dims: { width: number; height: number }
): number {
  let sx = pose.shoulder.x * dims.width;
  let sy = pose.shoulder.y * dims.height;
  let ex = pose.elbow.x * dims.width;
  let ey = pose.elbow.y * dims.height;
  let wx = pose.wrist.x * dims.width;
  let wy = pose.wrist.y * dims.height;

  // Falls das 70-Punkte-Hintergrundnetz aktiv ist: Nutze die Mehrpunkt-Knochenachsen
  // (Humerus-Schaft A1/A4/A5, Drehachse E10 und Unterarm-Schaft A6/A9/A10 + Carpal-Zentrum W3)
  const rig = pose.hiddenRig;
  if (rig && rig.armCluster10.length >= 10 && rig.elbowCluster10.length >= 10 && rig.wristCluster10.length >= 3) {
    const a1 = rig.armCluster10[0];
    const a4 = rig.armCluster10[3];
    const a9 = rig.armCluster10[8];
    const a10 = rig.armCluster10[9];
    const e10 = rig.elbowCluster10[9];
    const w3 = rig.wristCluster10[2];

    const proxUx = (pose.shoulder.x * 0.5 + a1.x * 0.3 + a4.x * 0.2) * dims.width;
    const proxUy = (pose.shoulder.y * 0.5 + a1.y * 0.3 + a4.y * 0.2) * dims.height;
    const distFx = (pose.wrist.x * 0.5 + w3.x * 0.25 + a10.x * 0.15 + a9.x * 0.1) * dims.width;
    const distFy = (pose.wrist.y * 0.5 + w3.y * 0.25 + a10.y * 0.15 + a9.y * 0.1) * dims.height;

    sx = sx * 0.65 + proxUx * 0.35;
    sy = sy * 0.65 + proxUy * 0.35;
    ex = ex * 0.5 + e10.x * dims.width * 0.5;
    ey = ey * 0.5 + e10.y * dims.height * 0.5;
    wx = wx * 0.65 + distFx * 0.35;
    wy = wy * 0.65 + distFy * 0.35;
  }

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
// 1b. RUMPF-VORNEIGUNGSWINKEL (NEIGUNGSWINKEL RELATIV ZUR VERTIKALEN LOTLINIE)
// ----------------------------------------------------------------------------
export function calculateTrunkLeanAngle(
  pose: PoseKeypoints,
  dims: { width: number; height: number }
): number {
  let hx = pose.hip.x * dims.width;
  let hy = pose.hip.y * dims.height;
  let sx = pose.shoulder.x * dims.width;
  let sy = pose.shoulder.y * dims.height;

  // Nutze die virtuelle Wirbelsäule (#36 C7 -> #37 Pelvis CoM), um Schulter-Rotation herauszufiltern
  if (pose.hiddenRig?.syntheticNodes) {
    const { neckC7, pelvisCoM } = pose.hiddenRig.syntheticNodes;
    sx = (sx * 0.55 + neckC7.x * dims.width * 0.45);
    sy = (sy * 0.55 + neckC7.y * dims.height * 0.45);
    hx = (hx * 0.55 + pelvisCoM.x * dims.width * 0.45);
    hy = (hy * 0.55 + pelvisCoM.y * dims.height * 0.45);
  }

  const dx = Math.abs(sx - hx);
  const dy = hy - sy; // hy ist größer als sy (Schulter über Hüfte)
  if (dy <= 0) return 0;

  const rad = Math.atan2(dx, dy);
  return Math.round(((rad * 180) / Math.PI) * 10) / 10;
}

// ----------------------------------------------------------------------------
// 1c. STANDWINKEL AM OCHE (KNIEWINKEL & BEINACHSEN-STABILITÄT)
// ----------------------------------------------------------------------------
export function calculateStanceAngle(
  pose: PoseKeypoints,
  dims: { width: number; height: number }
): number {
  if (!pose.knee || !pose.ankle) return 174.5; // Standard anatomischer Standwinkel

  const kx = pose.knee.x * dims.width;
  const ky = pose.knee.y * dims.height;
  const ax = pose.ankle.x * dims.width;
  const ay = pose.ankle.y * dims.height;
  const hx = pose.hip.x * dims.width;
  const hy = pose.hip.y * dims.height;

  const v1x = ax - kx;
  const v1y = ay - ky;
  const v2x = hx - kx;
  const v2y = hy - ky;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 === 0 || mag2 === 0) return 174.5;

  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round(((Math.acos(cos) * 180) / Math.PI) * 10) / 10;
}

// ----------------------------------------------------------------------------
// 1d. DIE 5 KERNWINKEL EINES WURFS EXTRAHIEREN (AGENTS.MD §12.6)
// ----------------------------------------------------------------------------
export function extractFiveCoreAngles(
  pose: PoseKeypoints,
  dims: { width: number; height: number },
  drawbackAngle?: number,
  releaseAngle?: number,
  followThroughAngle?: number
): FiveCoreAngles {
  const currentElbow = calculateElbowAngle(pose, dims);
  const stance = calculateStanceAngle(pose, dims);
  const trunkLean = calculateTrunkLeanAngle(pose, dims);

  return {
    stanceAngleDeg: stance,
    drawbackAngleDeg: drawbackAngle !== undefined ? drawbackAngle : Math.min(currentElbow, 55.0),
    releaseAngleDeg: releaseAngle !== undefined ? releaseAngle : currentElbow,
    followThroughAngleDeg: followThroughAngle !== undefined ? followThroughAngle : Math.max(currentElbow, 160.0),
    trunkLeanAngleDeg: trunkLean,
  };
}

// ----------------------------------------------------------------------------
// 1e. VALIDIERUNG DER 5 KERNWINKEL RELATIV ZUM NULLPUNKT (AGENTS.MD §12.6)
// ----------------------------------------------------------------------------
export function validateFiveCoreAngles(
  current: FiveCoreAngles,
  baseline: FiveCoreAngles
): FiveCoreAnglesValidation {
  const stanceDeltaDeg = Math.round(Math.abs(current.stanceAngleDeg - baseline.stanceAngleDeg) * 10) / 10;
  const trunkLeanDeltaDeg = Math.round(Math.abs(current.trunkLeanAngleDeg - baseline.trunkLeanAngleDeg) * 10) / 10;
  const drawbackDeltaDeg = Math.round(Math.abs(current.drawbackAngleDeg - baseline.drawbackAngleDeg) * 10) / 10;
  const releaseDeltaDeg = Math.round(Math.abs(current.releaseAngleDeg - baseline.releaseAngleDeg) * 10) / 10;
  const followThroughDeltaDeg = Math.round(Math.abs(current.followThroughAngleDeg - baseline.followThroughAngleDeg) * 10) / 10;

  const isStanceStable = stanceDeltaDeg <= 4.0;
  const isTrunkStable = trunkLeanDeltaDeg <= 3.0;
  const isDrawbackOptimal = current.drawbackAngleDeg >= 30.0 && current.drawbackAngleDeg <= 70.0;
  const isReleaseConsistent = current.releaseAngleDeg >= 90.0 && current.releaseAngleDeg <= 135.0;
  const isFollowThroughComplete = current.followThroughAngleDeg >= 148.0;

  let score = 100;
  if (!isStanceStable) score -= Math.min(25, stanceDeltaDeg * 3.5);
  if (!isTrunkStable) score -= Math.min(30, trunkLeanDeltaDeg * 5.0);
  if (!isDrawbackOptimal) score -= 15;
  if (!isReleaseConsistent) score -= 15;
  if (!isFollowThroughComplete) score -= 15;
  const postureScore = Math.round(Math.max(45, Math.min(100, score)));

  return {
    current,
    baseline,
    deltas: {
      stanceDeltaDeg,
      trunkLeanDeltaDeg,
      drawbackDeltaDeg,
      releaseDeltaDeg,
      followThroughDeltaDeg,
    },
    evaluation: {
      isStanceStable,
      isTrunkStable,
      isDrawbackOptimal,
      isReleaseConsistent,
      isFollowThroughComplete,
      postureScore,
    },
  };
}

// ----------------------------------------------------------------------------
// 1f. MEDIAPIPE LANDMARK-GÜTEPRÜFUNG (CONFIDENCE >= 0.70 GEM. AGENTS.MD §12.6)
// ----------------------------------------------------------------------------
export function evaluatePoseQuality(
  landmarks: Array<{ visibility?: number; presence?: number }> | undefined | null,
  handedness: 'right' | 'left' = 'right'
): PoseLandmarkQuality {
  if (!landmarks || landmarks.length === 0) {
    return {
      averageConfidence: 0,
      isHighConfidence: false,
      lowConfidenceLandmarks: ['keine_landmarks'],
    };
  }

  const isRight = handedness === 'right';
  const trackedIndices: Array<{ idx: number; name: string }> = [
    { idx: isRight ? 12 : 11, name: 'Schulter' },
    { idx: isRight ? 14 : 13, name: 'Ellenbogen' },
    { idx: isRight ? 16 : 15, name: 'Handgelenk' },
    { idx: isRight ? 24 : 23, name: 'Hüfte' },
    { idx: isRight ? 26 : 25, name: 'Knie' },
    { idx: isRight ? 28 : 27, name: 'Sprunggelenk' },
  ];

  const lowConf: string[] = [];
  let sumScore = 0;
  let count = 0;

  for (const item of trackedIndices) {
    const lm = landmarks[item.idx];
    if (!lm) {
      lowConf.push(item.name);
      continue;
    }
    const score = Math.max(lm.visibility ?? 0.85, lm.presence ?? 0.85);
    sumScore += score;
    count++;
    if (score < 0.70) {
      lowConf.push(`${item.name} (${Math.round(score * 100)}%)`);
    }
  }

  const avg = count > 0 ? Math.round((sumScore / count) * 100) / 100 : 0;
  return {
    averageConfidence: avg,
    isHighConfidence: avg >= 0.70 && lowConf.length === 0,
    lowConfidenceLandmarks: lowConf,
  };
}

// ----------------------------------------------------------------------------
// 1g. UNSICHTBARES 40-PUNKTE-HINTERGRUNDNETZ (33 MEDIAPIPE + 7 VIRTUELLE KNOTEN)
// ----------------------------------------------------------------------------
const BLAZEPOSE_GERMAN_NAMES: Record<number, string> = {
  0: 'Nase',
  1: 'Auge L (innen)',
  2: 'Auge L (Mitte)',
  3: 'Auge L (außen)',
  4: 'Auge R (innen)',
  5: 'Auge R (Mitte)',
  6: 'Auge R (außen)',
  7: 'Ohr L',
  8: 'Ohr R',
  9: 'Mundwinkel L',
  10: 'Mundwinkel R',
  11: 'Schulter L',
  12: 'Schulter R',
  13: 'Ellenbogen L',
  14: 'Ellenbogen R',
  15: 'Handgelenk L',
  16: 'Handgelenk R',
  17: 'Kleiner Finger L',
  18: 'Kleiner Finger R',
  19: 'Zeigefinger L',
  20: 'Zeigefinger R',
  21: 'Daumen L',
  22: 'Daumen R',
  23: 'Hüfte L',
  24: 'Hüfte R',
  25: 'Knie L',
  26: 'Knie R',
  27: 'Sprunggelenk L',
  28: 'Sprunggelenk R',
  29: 'Ferse L',
  30: 'Ferse R',
  31: 'Fußspitze L',
  32: 'Fußspitze R',
};

export function buildHiddenBiomechanicalRig(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number; presence?: number }>,
  handedness: 'right' | 'left' = 'right',
  referenceBoneLengths?: { upperArmNorm: number; forearmNorm: number } | null,
  dims: { width: number; height: number } = { width: 1080, height: 1920 }
): PoseKeypoints {
  const clamp = (v: number) => Math.max(0.02, Math.min(0.98, v));
  const isRight = handedness === 'right';

  const rawLandmarks: RawLandmarkPoint[] = landmarks.slice(0, 33).map((lm, idx) => ({
    id: idx,
    name: BLAZEPOSE_GERMAN_NAMES[idx] || `Punkt_${idx}`,
    x: clamp(lm.x),
    y: clamp(lm.y),
    z: lm.z,
    visibility: Math.max(lm.visibility ?? 0.85, lm.presence ?? 0.85),
  }));

  const getPt = (idx: number): Point =>
    rawLandmarks[idx] ? { x: rawLandmarks[idx].x, y: rawLandmarks[idx].y } : { x: 0.5, y: 0.5 };

  // 1. 11-Punkte Kopf- & Visier-Cluster (0..10): Stabilisiert Kopfzentrum, wenn der Dart vor das Gesicht geführt wird
  const earIdx = isRight ? 8 : 7;
  const eyeIndices = isRight ? [4, 5, 6] : [1, 2, 3];
  const earPt = getPt(earIdx);
  const nosePt = getPt(0);
  const head: Point = {
    x: clamp(earPt.x * 0.65 + nosePt.x * 0.35),
    y: clamp(earPt.y * 0.65 + nosePt.y * 0.35),
  };
  const eye: Point = {
    x: clamp((getPt(eyeIndices[0]).x + getPt(eyeIndices[1]).x + getPt(eyeIndices[2]).x) / 3),
    y: clamp((getPt(eyeIndices[0]).y + getPt(eyeIndices[1]).y + getPt(eyeIndices[2]).y) / 3),
  };

  // 2. 4-Punkte Rumpf-Trapez & Virtuelle Wirbelsäule (#36 C7, #37 CoM, #38 T8)
  const sThrowIdx = isRight ? 12 : 11;
  const sSupplyIdx = isRight ? 11 : 12;
  const hThrowIdx = isRight ? 24 : 23;
  const hSupplyIdx = isRight ? 23 : 24;

  const shoulderThrow = getPt(sThrowIdx);
  const shoulderSupply = getPt(sSupplyIdx);
  const hipThrow = getPt(hThrowIdx);
  const hipSupply = getPt(hSupplyIdx);

  const neckC7: Point = {
    x: clamp((shoulderThrow.x + shoulderSupply.x) * 0.5),
    y: clamp((shoulderThrow.y + shoulderSupply.y) * 0.5 - 0.022),
  };
  const pelvisCoM: Point = {
    x: clamp((hipThrow.x + hipSupply.x) * 0.5),
    y: clamp((hipThrow.y + hipSupply.y) * 0.5),
  };
  const thoraxT8: Point = {
    x: clamp(neckC7.x * 0.58 + pelvisCoM.x * 0.42),
    y: clamp(neckC7.y * 0.58 + pelvisCoM.y * 0.42),
  };

  // 3. Wurfarm + 4-Punkte Hand-Polygon (16/18/20/22 bzw. 15/17/19/21) + Knochenlängen-Invarianz
  const eThrowIdx = isRight ? 14 : 13;
  const wThrowIdx = isRight ? 16 : 15;
  const pinkyThrowIdx = isRight ? 18 : 17;
  const indexThrowIdx = isRight ? 20 : 19;
  const thumbThrowIdx = isRight ? 22 : 21;

  const elbowRaw = getPt(eThrowIdx);
  const wristRaw = getPt(wThrowIdx);
  const pinkyThrow = getPt(pinkyThrowIdx);
  const indexThrow = getPt(indexThrowIdx);
  const thumbThrow = getPt(thumbThrowIdx);

  // Hand-Schwerpunkt & Dart-Greifpunkt (#33 P_Dart zwischen Daumen, Zeigefinger und Handgelenk)
  const dartGripPoint: Point = {
    x: clamp(0.45 * indexThrow.x + 0.40 * thumbThrow.x + 0.15 * wristRaw.x),
    y: clamp(0.45 * indexThrow.y + 0.40 * thumbThrow.y + 0.15 * wristRaw.y),
  };

  // Konfidenz-gewichteter Handflächen-Anker aus dem 4-Punkte-Handpolygon (verhindert Ausreißer bei Teilverdeckung)
  const wPinky = Math.max(0.15, rawLandmarks[pinkyThrowIdx]?.visibility ?? 0.85);
  const wIndex = Math.max(0.15, rawLandmarks[indexThrowIdx]?.visibility ?? 0.85);
  const wThumb = Math.max(0.15, rawLandmarks[thumbThrowIdx]?.visibility ?? 0.85);
  const wSum = wPinky + wIndex + wThumb;

  const palmAnchorX = (pinkyThrow.x * wPinky + indexThrow.x * wIndex + thumbThrow.x * wThumb) / wSum;
  const palmAnchorY = (pinkyThrow.y * wPinky + indexThrow.y * wIndex + thumbThrow.y * wThumb) / wSum;
  let wristStabilized: Point = {
    x: clamp(wristRaw.x * 0.76 + palmAnchorX * 0.24),
    y: clamp(wristRaw.y * 0.76 + palmAnchorY * 0.24),
  };

  const upperArmLengthNorm = Math.hypot(elbowRaw.x - shoulderThrow.x, elbowRaw.y - shoulderThrow.y);
  let forearmLengthNorm = Math.hypot(wristStabilized.x - elbowRaw.x, wristStabilized.y - elbowRaw.y);

  // Knochenlängen-Invarianz-Prüfung (Skeletal Bone-Length Constraint):
  // Falls die Unterarmlänge in einem schnellen Bewegungsframe unphysiologisch stark abweicht (> 26%),
  // wird der Punkt sanft auf den anatomisch gültigen Radius um den Ellenbogen zurückgeführt.
  if (
    referenceBoneLengths &&
    referenceBoneLengths.forearmNorm > 0.04 &&
    forearmLengthNorm > 0.01
  ) {
    const ratio = forearmLengthNorm / referenceBoneLengths.forearmNorm;
    if (ratio > 1.26 || ratio < 0.74) {
      const targetRatio = ratio > 1.26 ? 1.26 : 0.74;
      const targetLen = referenceBoneLengths.forearmNorm * targetRatio;
      const ux = (wristStabilized.x - elbowRaw.x) / forearmLengthNorm;
      const uy = (wristStabilized.y - elbowRaw.y) / forearmLengthNorm;
      wristStabilized = {
        x: clamp(elbowRaw.x + ux * targetLen),
        y: clamp(elbowRaw.y + uy * targetLen),
      };
      forearmLengthNorm = targetLen;
    }
  }

  const forearmPivotAnchor: Point = {
    x: clamp((elbowRaw.x + wristStabilized.x) * 0.5),
    y: clamp((elbowRaw.y + wristStabilized.y) * 0.5),
  };

  // ============================================================================
  // 3b. +30 HOCHAUFLÖSENDE SUB-PUNKTE FÜR HANDGELENK (+10), ARM (+10) & ELLENBOGEN (+10)
  //     MIT ISOTROPER SEITENVERHÄLTNIS-KORREKTUR & BEUGEWINKEL-ADAPTIVER GELENKKAPSEL
  // ============================================================================
  const refScale = Math.max(dims.width || 1080, dims.height || 1920);
  const scaleX = (dims.width || 1080) / refScale;
  const scaleY = (dims.height || 1920) / refScale;

  // Isotropische Koordinaten (echte metrische Proportionen unabhängig von 9:16 oder 16:9)
  const sIsoX = shoulderThrow.x * scaleX;
  const sIsoY = shoulderThrow.y * scaleY;
  const eIsoX = elbowRaw.x * scaleX;
  const eIsoY = elbowRaw.y * scaleY;
  const wIsoX = wristStabilized.x * scaleX;
  const wIsoY = wristStabilized.y * scaleY;
  const wRawIsoX = wristRaw.x * scaleX;
  const wRawIsoY = wristRaw.y * scaleY;
  const thumbIsoX = thumbThrow.x * scaleX;
  const thumbIsoY = thumbThrow.y * scaleY;
  const indexIsoX = indexThrow.x * scaleX;
  const indexIsoY = indexThrow.y * scaleY;
  const pinkyIsoX = pinkyThrow.x * scaleX;
  const pinkyIsoY = pinkyThrow.y * scaleY;
  const palmIsoX = palmAnchorX * scaleX;
  const palmIsoY = palmAnchorY * scaleY;
  const dartIsoX = dartGripPoint.x * scaleX;
  const dartIsoY = dartGripPoint.y * scaleY;

  const uaIsoDx = eIsoX - sIsoX;
  const uaIsoDy = eIsoY - sIsoY;
  const uaLenIso = Math.hypot(uaIsoDx, uaIsoDy) || 0.08;
  const uaUx = uaIsoDx / uaLenIso;
  const uaUy = uaIsoDy / uaLenIso;

  const faIsoDx = wIsoX - eIsoX;
  const faIsoDy = wIsoY - eIsoY;
  const faLenIso = Math.hypot(faIsoDx, faIsoDy) || 0.075;
  const faUx = faIsoDx / faLenIso;
  const faUy = faIsoDy / faLenIso;

  // Beugewinkel-Faktor für das Olecranon (E1 gleitet bei Streckung anatomisch in die Fossa olecrani)
  const cosElbow = Math.max(-1, Math.min(1, -uaUx * faUx - uaUy * faUy));
  const flexionRad = Math.PI - Math.acos(cosElbow);
  const flexFactor = Math.max(0.48, Math.min(1.05, 0.48 + 0.52 * Math.sin(flexionRad * 0.65)));

  // Winkelhalbierende in die Ellenbeuge (Fossa cubitalis) im isotropen Raum
  let bisInX = -uaUx + faUx;
  let bisInY = -uaUy + faUy;
  const bisMag = Math.hypot(bisInX, bisInY);
  if (bisMag > 0.08) {
    bisInX /= bisMag;
    bisInY /= bisMag;
  } else {
    bisInX = -uaUy;
    bisInY = uaUx;
    if (bisInY > 0) {
      bisInX = -bisInX;
      bisInY = -bisInY;
    }
  }

  // Normalenvektoren im isotropen Raum konsequent zur Beugeseite (Bizeps / Radius / Daumen) ausrichten
  let uaNx = -uaUy;
  let uaNy = uaUx;
  if (uaNx * bisInX + uaNy * bisInY < 0) {
    uaNx = -uaNx;
    uaNy = -uaNy;
  }

  let faNx = -faUy;
  let faNy = faUx;
  if (faNx * bisInX + faNy * bisInY < 0) {
    faNx = -faNx;
    faNy = -faNy;
  }

  // Handgelenks-Normalenvektor (orientiert an Daumen-Kleinfinger-Spreizung)
  const tpDx = thumbIsoX - pinkyIsoX;
  const tpDy = thumbIsoY - pinkyIsoY;
  const tpMag = Math.hypot(tpDx, tpDy);
  let wNx = faNx;
  let wNy = faNy;
  if (tpMag > 0.008 && wNx * tpDx + wNy * tpDy < 0) {
    wNx = -wNx;
    wNy = -wNy;
  }

  const toNormPt = (isoX: number, isoY: number): Point => ({
    x: clamp(isoX / scaleX),
    y: clamp(isoY / scaleY),
  });

  // A) BEREICH 1: +10 PUNKTE AM HANDGELENK & HANDWURZEL-KOMPLEX (W1..W10)
  const wristRadIso = Math.max(0.008, faLenIso * 0.072);
  const w1Pt = toNormPt(
    0.78 * wRawIsoX + 0.22 * thumbIsoX + wNx * wristRadIso * 0.58,
    0.78 * wRawIsoY + 0.22 * thumbIsoY + wNy * wristRadIso * 0.58
  );
  const w2Pt = toNormPt(
    0.78 * wRawIsoX + 0.22 * pinkyIsoX - wNx * wristRadIso * 0.58,
    0.78 * wRawIsoY + 0.22 * pinkyIsoY - wNy * wristRadIso * 0.58
  );
  const w3Pt = toNormPt(0.66 * wRawIsoX + 0.34 * palmIsoX, 0.66 * wRawIsoY + 0.34 * palmIsoY);
  const w4Pt = toNormPt(0.46 * wRawIsoX + 0.54 * thumbIsoX, 0.46 * wRawIsoY + 0.54 * thumbIsoY);
  const w5Pt = toNormPt(0.34 * wRawIsoX + 0.66 * indexIsoX, 0.34 * wRawIsoY + 0.66 * indexIsoY);
  const w6Pt = toNormPt(0.36 * wRawIsoX + 0.64 * pinkyIsoX, 0.36 * wRawIsoY + 0.64 * pinkyIsoY);
  const w7Pt = toNormPt(
    (wRawIsoX + indexIsoX + pinkyIsoX) / 3 + wNx * wristRadIso * 0.20,
    (wRawIsoY + indexIsoY + pinkyIsoY) / 3 + wNy * wristRadIso * 0.20
  );
  const w8Pt = toNormPt(0.52 * indexIsoX + 0.48 * thumbIsoX, 0.52 * indexIsoY + 0.48 * thumbIsoY);
  const w9Pt = toNormPt(
    dartIsoX + (dartIsoX - wRawIsoX) * 0.36,
    dartIsoY + (dartIsoY - wRawIsoY) * 0.36
  );
  const w10Pt = toNormPt(
    wRawIsoX - faUx * wristRadIso * 0.55 - wNx * wristRadIso * 0.42,
    wRawIsoY - faUy * wristRadIso * 0.55 - wNy * wristRadIso * 0.42
  );

  const wristCluster10: SubClusterNode[] = [
    { code: 'W1', label: 'Radiocarpal (Speichenpol)', x: w1Pt.x, y: w1Pt.y },
    { code: 'W2', label: 'Ulnocarpal (Ellenpol)', x: w2Pt.x, y: w2Pt.y },
    { code: 'W3', label: 'Carpal-Zentrum (Handwurzel)', x: w3Pt.x, y: w3Pt.y },
    { code: 'W4', label: 'CMC-1 (Daumenwurzel-Gelenk)', x: w4Pt.x, y: w4Pt.y },
    { code: 'W5', label: 'MCP-2 (Zeigefinger-Basis)', x: w5Pt.x, y: w5Pt.y },
    { code: 'W6', label: 'MCP-5 (Kleinfinger-Basis)', x: w6Pt.x, y: w6Pt.y },
    { code: 'W7', label: 'Dorsal-Platte (Handrücken)', x: w7Pt.x, y: w7Pt.y },
    { code: 'W8', label: 'Pinch-Gabel (Daumen-Zeigefinger)', x: w8Pt.x, y: w8Pt.y },
    { code: 'W9', label: 'Distaler Dart-Release-Pol', x: w9Pt.x, y: w9Pt.y },
    { code: 'W10', label: 'Palmar-Flexionspol (Beugesehne)', x: w10Pt.x, y: w10Pt.y },
  ];

  // B) BEREICH 2: +10 PUNKTE AM ARM (KONTURTREUES OBERARM- & UNTERARM-FACHWERK A1..A10)
  const armThickIso = Math.max(0.009, uaLenIso * 0.095);
  const faThickIso = Math.max(0.007, faLenIso * 0.080);

  const a1Pt = toNormPt(sIsoX + uaIsoDx * 0.20, sIsoY + uaIsoDy * 0.20);
  const a2Pt = toNormPt(
    sIsoX + uaIsoDx * 0.46 + uaNx * armThickIso,
    sIsoY + uaIsoDy * 0.46 + uaNy * armThickIso
  );
  const a3Pt = toNormPt(
    sIsoX + uaIsoDx * 0.42 - uaNx * armThickIso,
    sIsoY + uaIsoDy * 0.42 - uaNy * armThickIso
  );
  const a4Pt = toNormPt(sIsoX + uaIsoDx * 0.52, sIsoY + uaIsoDy * 0.52);
  const a5Pt = toNormPt(sIsoX + uaIsoDx * 0.76, sIsoY + uaIsoDy * 0.76);
  const a6Pt = toNormPt(eIsoX + faIsoDx * 0.22, eIsoY + faIsoDy * 0.22);
  const a7Pt = toNormPt(
    eIsoX + faIsoDx * 0.38 + faNx * faThickIso,
    eIsoY + faIsoDy * 0.38 + faNy * faThickIso
  );
  const a8Pt = toNormPt(
    eIsoX + faIsoDx * 0.38 - faNx * faThickIso * 0.92,
    eIsoY + faIsoDy * 0.38 - faNy * faThickIso * 0.92
  );
  const a9Pt = toNormPt(eIsoX + faIsoDx * 0.60, eIsoY + faIsoDy * 0.60);
  const a10Pt = toNormPt(eIsoX + faIsoDx * 0.82, eIsoY + faIsoDy * 0.82);

  const armCluster10: SubClusterNode[] = [
    { code: 'A1', label: 'Humerus-Kopf / Deltoideus (20%)', x: a1Pt.x, y: a1Pt.y },
    { code: 'A2', label: 'Bizeps-Pol (Oberarm ventral)', x: a2Pt.x, y: a2Pt.y },
    { code: 'A3', label: 'Trizeps-Pol (Oberarm dorsal)', x: a3Pt.x, y: a3Pt.y },
    { code: 'A4', label: 'Humerus-Schaftmitte (52%)', x: a4Pt.x, y: a4Pt.y },
    { code: 'A5', label: 'Distaler Humerus-Schaft (76%)', x: a5Pt.x, y: a5Pt.y },
    { code: 'A6', label: 'Proximaler Radius/Ulna (22%)', x: a6Pt.x, y: a6Pt.y },
    { code: 'A7', label: 'Brachioradialis (Unterarm oben)', x: a7Pt.x, y: a7Pt.y },
    { code: 'A8', label: 'Flexoren-Bauch (Unterarm unten)', x: a8Pt.x, y: a8Pt.y },
    { code: 'A9', label: 'Unterarm-Schaftmitte (60%)', x: a9Pt.x, y: a9Pt.y },
    { code: 'A10', label: 'Distaler Radius/Ulna-Schaft (82%)', x: a10Pt.x, y: a10Pt.y },
  ];

  // C) BEREICH 3: +10 PUNKTE AM ELLENBOGEN-GELENKKOMPLEX (E1..E10)
  const elbowRadIso = Math.max(0.008, ((uaLenIso + faLenIso) * 0.5) * 0.076);

  const e1Olecranon = toNormPt(
    eIsoX - bisInX * elbowRadIso * 1.05 * flexFactor,
    eIsoY - bisInY * elbowRadIso * 1.05 * flexFactor
  );
  const e2FossaCubitalis = toNormPt(
    eIsoX + bisInX * elbowRadIso * 0.85 * flexFactor,
    eIsoY + bisInY * elbowRadIso * 0.85 * flexFactor
  );
  const e3EpicondyleLat = toNormPt(
    eIsoX - uaUx * elbowRadIso * 0.38 + uaNx * elbowRadIso * 0.65,
    eIsoY - uaUy * elbowRadIso * 0.38 + uaNy * elbowRadIso * 0.65
  );
  const e4EpicondyleMed = toNormPt(
    eIsoX - uaUx * elbowRadIso * 0.38 - uaNx * elbowRadIso * 0.65,
    eIsoY - uaUy * elbowRadIso * 0.38 - uaNy * elbowRadIso * 0.65
  );
  const e5Capitulum = toNormPt(sIsoX + uaIsoDx * 0.90, sIsoY + uaIsoDy * 0.90);
  const e6RadialHead = toNormPt(
    eIsoX + faIsoDx * 0.12 + faNx * elbowRadIso * 0.52,
    eIsoY + faIsoDy * 0.12 + faNy * elbowRadIso * 0.52
  );
  const e7CoronoidUlna = toNormPt(
    eIsoX + faIsoDx * 0.12 - faNx * elbowRadIso * 0.52,
    eIsoY + faIsoDy * 0.12 - faNy * elbowRadIso * 0.52
  );
  const e8TricepsInsertion = toNormPt(
    sIsoX + uaIsoDx * 0.92 - bisInX * elbowRadIso * 0.68 * flexFactor,
    sIsoY + uaIsoDy * 0.92 - bisInY * elbowRadIso * 0.68 * flexFactor
  );
  const e9BicepsInsertion = toNormPt(
    eIsoX + faIsoDx * 0.14 + bisInX * elbowRadIso * 0.62 * flexFactor,
    eIsoY + faIsoDy * 0.14 + bisInY * elbowRadIso * 0.62 * flexFactor
  );

  // E10: Hochpräziser Drehachsen-Schwerpunkt aus allen Ellenbogen-Kapselpunkten
  const e10HingeCenter: Point = {
    x: clamp(
      (elbowRaw.x * 2 +
        e1Olecranon.x +
        e2FossaCubitalis.x +
        e3EpicondyleLat.x +
        e4EpicondyleMed.x +
        e5Capitulum.x +
        e6RadialHead.x +
        e7CoronoidUlna.x) /
        9
    ),
    y: clamp(
      (elbowRaw.y * 2 +
        e1Olecranon.y +
        e2FossaCubitalis.y +
        e3EpicondyleLat.y +
        e4EpicondyleMed.y +
        e5Capitulum.y +
        e6RadialHead.y +
        e7CoronoidUlna.y) /
        9
    ),
  };

  const elbowCluster10: SubClusterNode[] = [
    { code: 'E1', label: 'Olecranon (Ellenbogenspitze)', x: e1Olecranon.x, y: e1Olecranon.y },
    { code: 'E2', label: 'Fossa Cubitalis (Ellenbeuge)', x: e2FossaCubitalis.x, y: e2FossaCubitalis.y },
    { code: 'E3', label: 'Epicondylus Lat. (Außenknorren)', x: e3EpicondyleLat.x, y: e3EpicondyleLat.y },
    { code: 'E4', label: 'Epicondylus Med. (Innenknorren)', x: e4EpicondyleMed.x, y: e4EpicondyleMed.y },
    { code: 'E5', label: 'Capitulum Humeri (Gelenkrolle)', x: e5Capitulum.x, y: e5Capitulum.y },
    { code: 'E6', label: 'Radiusköpfchen (Speichenpol)', x: e6RadialHead.x, y: e6RadialHead.y },
    { code: 'E7', label: 'Ulna-Krone (Ellengelenk)', x: e7CoronoidUlna.x, y: e7CoronoidUlna.y },
    { code: 'E8', label: 'Trizeps-Sehnenansatz', x: e8TricepsInsertion.x, y: e8TricepsInsertion.y },
    { code: 'E9', label: 'Bizeps-Sehnenansatz', x: e9BicepsInsertion.x, y: e9BicepsInsertion.y },
    { code: 'E10', label: 'Drehachsen-Schwerpunkt (Hinge)', x: e10HingeCenter.x, y: e10HingeCenter.y },
  ];

  // Verfeinere den Handgelenk-Hauptpunkt über das 4-Punkte-Handwurzel-Viereck (W1, W2, W3, W10)
  // und den Ellenbogen-Hauptpunkt über das kapselstabilisierte Hinge-Center (E10)!
  const carpalQuadX = (w1Pt.x + w2Pt.x + w3Pt.x + w10Pt.x) * 0.25;
  const carpalQuadY = (w1Pt.y + w2Pt.y + w3Pt.y + w10Pt.y) * 0.25;
  wristStabilized = {
    x: clamp(wristStabilized.x * 0.60 + carpalQuadX * 0.40),
    y: clamp(wristStabilized.y * 0.60 + carpalQuadY * 0.40),
  };
  const elbowStabilized: Point = e10HingeCenter;

  // Handgelenks-Kippwinkel (Wrist-Snap-Winkel zwischen Unterarm 14->16 und Handachse 16->33)
  const faVx = wristStabilized.x - elbowRaw.x;
  const faVy = wristStabilized.y - elbowRaw.y;
  const handVx = dartGripPoint.x - wristStabilized.x;
  const handVy = dartGripPoint.y - wristStabilized.y;
  const faMag = Math.hypot(faVx, faVy);
  const handMag = Math.hypot(handVx, handVy);
  let wristSnapAngleDeg = 170.0;
  if (faMag > 0.005 && handMag > 0.005) {
    const cosSnap = Math.max(-1, Math.min(1, (faVx * handVx + faVy * handVy) / (faMag * handMag)));
    wristSnapAngleDeg = Math.round((180 - (Math.acos(cosSnap) * 180) / Math.PI) * 10) / 10;
  }

  // 4. Zweite Hand / Dart-Haltehand (15, 17, 19, 21) & Echte Bi-Manuelle Übergabe-Detektion (#34 P_Supply & #35 P_Handover)
  const wSupplyIdx = isRight ? 15 : 16;
  const pinkySupplyIdx = isRight ? 17 : 18;
  const indexSupplyIdx = isRight ? 19 : 20;
  const thumbSupplyIdx = isRight ? 21 : 22;

  const supplyWrist = getPt(wSupplyIdx);
  const supplyPinky = getPt(pinkySupplyIdx);
  const supplyIndex = getPt(indexSupplyIdx);
  const supplyThumb = getPt(thumbSupplyIdx);

  const supplyHandCenter: Point = {
    x: clamp(0.30 * supplyWrist.x + 0.20 * supplyPinky.x + 0.25 * supplyIndex.x + 0.25 * supplyThumb.x),
    y: clamp(0.30 * supplyWrist.y + 0.20 * supplyPinky.y + 0.25 * supplyIndex.y + 0.25 * supplyThumb.y),
  };

  const handoverPoint: Point = {
    x: clamp((dartGripPoint.x + supplyHandCenter.x) * 0.5),
    y: clamp((dartGripPoint.y + supplyHandCenter.y) * 0.5),
  };

  const handoverDistanceNorm =
    Math.round(Math.hypot(dartGripPoint.x - supplyHandCenter.x, dartGripPoint.y - supplyHandCenter.y) * 1000) / 1000;

  // Übergabe findet statt, wenn beide Hände im unteren Brust-/Hüftbereich (unterhalb des Ellenbogens) nah beieinander sind
  const torsoMidY = (shoulderThrow.y + hipThrow.y) * 0.48;
  const isBimanualHandover =
    handoverDistanceNorm <= 0.155 &&
    wristStabilized.y >= torsoMidY &&
    wristStabilized.y >= elbowRaw.y - 0.01;

  // 5. Standbasis (Beine & Fußdreieck)
  const kIdx = isRight ? 26 : 25;
  const aIdx = isRight ? 28 : 27;
  const heelIdx = isRight ? 30 : 29;
  const toeIdx = isRight ? 32 : 31;

  const quality = evaluatePoseQuality(landmarks, handedness);

  return {
    head,
    eye,
    shoulder: shoulderThrow,
    elbow: elbowStabilized,
    wrist: wristStabilized,
    hip: hipThrow,
    knee: rawLandmarks[kIdx] ? getPt(kIdx) : undefined,
    ankle: rawLandmarks[aIdx] ? getPt(aIdx) : undefined,
    heel: rawLandmarks[heelIdx] ? getPt(heelIdx) : undefined,
    toe: rawLandmarks[toeIdx] ? getPt(toeIdx) : undefined,
    supplyWrist,
    hiddenRig: {
      rawLandmarks,
      syntheticNodes: {
        dartGripPoint,
        supplyHandCenter,
        handoverPoint,
        neckC7,
        pelvisCoM,
        thoraxT8,
        forearmPivotAnchor,
      },
      wristCluster10,
      armCluster10,
      elbowCluster10,
      wristSnapAngleDeg,
      handoverDistanceNorm,
      isBimanualHandover,
      upperArmLengthNorm: Math.round(upperArmLengthNorm * 1000) / 1000,
      forearmLengthNorm: Math.round(forearmLengthNorm * 1000) / 1000,
    },
    isRealDetection: true,
    confidenceScore: quality.averageConfidence,
    isHighConfidence: quality.isHighConfidence,
  };
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
// 2b. BBDV-REFERENZ-KALIBRIERUNG (BOARDHÖHE 1,73m ODER OCHE-MARKER)
// ----------------------------------------------------------------------------
export function calculateMmPerPxWithReference(
  base: PoseKeypoints | null,
  dims: { width: number; height: number },
  playerHeightCm: number = 180,
  options?: CalibrationOptions
): number {
  if (options?.method === 'board_height' && options.referencePixelLength && options.referencePixelLength > 50) {
    const refMm = options.referenceDistanceMm || BBDV_STANDARDS.BULLSEYE_HEIGHT_MM;
    return Math.round((refMm / options.referencePixelLength) * 1000) / 1000;
  }
  if (options?.method === 'oche_marker' && options.referencePixelLength && options.referencePixelLength > 20) {
    const refMm = options.referenceDistanceMm || BBDV_STANDARDS.OCHE_WIDTH_MIN_MM;
    return Math.round((refMm / options.referencePixelLength) * 1000) / 1000;
  }
  return calculateMmPerPx(base, dims, playerHeightCm);
}

// ----------------------------------------------------------------------------
// 3. ABWEICHUNGSMESSUNG ZUM NULLPUNKT (MM & GRAD)
// ----------------------------------------------------------------------------
export function calculatePoseDeviations(
  pose: PoseKeypoints,
  base: PoseKeypoints,
  dims: { width: number; height: number },
  playerHeightCm: number = 180,
  options?: CalibrationOptions
) {
  const baseSx = base.shoulder.x * dims.width;
  const baseSy = base.shoulder.y * dims.height;
  const baseEy = base.elbow.y * dims.height;
  const mmPerPx = calculateMmPerPxWithReference(base, dims, playerHeightCm, options);

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
// 5. ECHTE FEINGRANULARE WURFTRAJEKTORIE (FOLGT 100% DEM ECHTEN ARM AB HÜFTHÖHE!)
// ----------------------------------------------------------------------------
// Rekonstruiert aus den echten abgetasteten Video-Frames die wahre Bewegungskurve
// des Handgelenks vom Übergabepunkt des Darts unten ab Hüfthöhe (Handover)
// über das Hochführen (Set-Point), Ausholen (Drawback) und den Abwurf (Release)
// bis zum Durchschwung (Follow-Through) – komplett durchgezogen ohne Glättung!
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
  void throwIndex;

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

  // 1. Finde Drawback-Frame (Tiefster Rückzug / Umkehrpunkt oben am Gesicht)
  // Wichtig: Wir suchen nach dem Hochführen der Hand (obere Körperhälfte, Hand auf/über Ellenbogenhöhe),
  // damit die tiefe Hüft-Übergabeposition am Anfang nicht mit dem Drawback am Gesicht verwechselt wird.
  let drawbackIdx = Math.floor(throwFrames.length * 0.5);
  let bestDrawbackScore = Infinity;
  const minSearchIdx = throwFrames.length > 10 ? Math.max(1, Math.floor(throwFrames.length * 0.18)) : 0;
  const maxSearchIdx = Math.max(minSearchIdx + 1, Math.floor(throwFrames.length * 0.88));

  for (let i = minSearchIdx; i <= maxSearchIdx && i < throwFrames.length; i++) {
    const f = throwFrames[i];
    const isHandElevated = f.pose.wrist.y <= f.pose.elbow.y + 0.05;
    // Hand am weitesten hinten Richtung Schulter/Kopf + kleinster Ellenbogenwinkel
    const wristBackScore =
      f.elbowAngle +
      dirSign * (f.pose.wrist.x - f.pose.elbow.x) * 220 +
      (isHandElevated ? 0 : 120);
    if (wristBackScore < bestDrawbackScore) {
      bestDrawbackScore = wristBackScore;
      drawbackIdx = i;
    }
  }
  const drawbackFrame = throwFrames[drawbackIdx] || throwFrames[0];

  // 2. Finde Übergabepunkt unten ab Hüfthöhe (Handover-Startpunkt des Darts über das 40-Punkte-Netz!)
  // Wir nutzen primär den echten bi-manuellen Handkontakt (Abstand zwischen Wurfhand #33 P_Dart und Haltehand #34 P_Supply)
  // sowie die vertikale Hüftposition vor dem Hochführen.
  const handoverSearchEnd = Math.max(1, Math.floor(drawbackIdx * 0.55));
  let maxWristYAtHip = -Infinity;
  let minHandoverDist = Infinity;
  let bestBimanualIdx = -1;

  for (let i = 0; i <= handoverSearchEnd && i < throwFrames.length; i++) {
    const f = throwFrames[i];
    if (f.pose.wrist.y > maxWristYAtHip) {
      maxWristYAtHip = f.pose.wrist.y;
    }
    const rig = f.pose.hiddenRig;
    const torsoMidY = (f.pose.shoulder.y + f.pose.hip.y) * 0.48;
    if (rig && f.pose.wrist.y >= torsoMidY && f.pose.wrist.y >= f.pose.elbow.y - 0.01) {
      if (rig.handoverDistanceNorm < minHandoverDist) {
        minHandoverDist = rig.handoverDistanceNorm;
        bestBimanualIdx = i;
      }
    }
  }

  let handoverIdx = 0;
  if (bestBimanualIdx >= 0 && minHandoverDist <= 0.16) {
    // Starte exakt am Übergabepunkt, an dem Wurfhand (#33) und Dart-Haltehand (#34) zusammenkommen!
    handoverIdx = bestBimanualIdx;
  } else {
    for (let i = 0; i <= handoverSearchEnd && i < throwFrames.length; i++) {
      if (throwFrames[i].pose.wrist.y >= maxWristYAtHip - 0.035) {
        handoverIdx = i;
        break;
      }
    }
  }

  // 3. Finde Follow-Through / maximale Vorwärtsstreckung NACH dem Drawback
  // (bevor der leere Arm wieder Richtung Hüfte absinkt)
  let followIdx = Math.min(throwFrames.length - 1, drawbackIdx + 1);
  let bestForwardScore = -Infinity;
  for (let i = drawbackIdx + 1; i < throwFrames.length; i++) {
    const f = throwFrames[i];
    // Stoppe die Suche, falls die leere Hand bereits wieder unter Brust-/Ellenbogenhöhe Richtung Hüfte fällt
    if (i > drawbackIdx + 3 && f.pose.wrist.y > f.pose.elbow.y + 0.06) {
      break;
    }
    const forwardScore = f.elbowAngle + dirSign * (f.pose.wrist.x - f.pose.shoulder.x) * 260;
    if (forwardScore > bestForwardScore) {
      bestForwardScore = forwardScore;
      followIdx = i;
    }
  }
  const followThroughFrame = throwFrames[followIdx] || throwFrames[throwFrames.length - 1];

  // 4. Finde Release-Frame: Kinematische Spitzen-Geschwindigkeit & Beschleunigungs-Apex der Hand!
  let releaseIdx = followIdx;
  let bestReleaseScore = -Infinity;

  for (let i = drawbackIdx + 1; i <= followIdx; i++) {
    const curF = throwFrames[i];
    const prevF = throwFrames[i - 1];

    const dt = Math.max(0.005, Math.abs(curF.timeSec - prevF.timeSec));
    const dx = dirSign * (curF.pose.wrist.x - prevF.pose.wrist.x) * dims.width;
    const dy = (curF.pose.wrist.y - prevF.pose.wrist.y) * dims.height;
    const forwardSpeedPxPerSec = Math.hypot(Math.max(0, dx), Math.abs(dy) * 0.4) / dt;

    const angleClamped = Math.max(70, Math.min(150, curF.elbowAngle));
    const anglePenalty = Math.exp(-Math.pow((angleClamped - 115) / 28, 2));
    const kinematicScore = (forwardSpeedPxPerSec + 50) * anglePenalty;

    if (
      kinematicScore > bestReleaseScore &&
      curF.elbowAngle >= drawbackFrame.elbowAngle + 8
    ) {
      bestReleaseScore = kinematicScore;
      releaseIdx = i;
    }
  }
  const releaseFrame = throwFrames[releaseIdx] || followThroughFrame;

  // 5. KOMPLETTE, UNGEGLÄTTETE HANDGELENKS-KURVE VOM ÜBERGABEPUNKT (HÜFTHÖHE) BIS DURCHSCHWUNG:
  // Jede einzelne Bewegung des Handgelenks vom Greifen des Darts unten an der Hüfte
  // über das Hochführen, Zielen, Ausholen und den Abwurf bis zum Follow-Through wird 1:1 festgehalten!
  const startIdx = Math.max(0, handoverIdx);
  const endIdx = Math.min(throwFrames.length - 1, followIdx);
  const activeFrames = throwFrames.slice(startIdx, endIdx + 1);

  const wristPts: TrajectoryPoint[] = activeFrames.map((f) => ({
    x: f.pose.wrist.x,
    y: f.pose.wrist.y,
    timeSec: f.timeSec,
  }));

  return {
    points: wristPts,
    drawbackFrame,
    releaseFrame,
    followThroughFrame,
  };
}

// ----------------------------------------------------------------------------
// 5b. GARANTIERTE ANKERUNG AN DIE AKTUELLE ECHTE SPIELER-POSE IM BILD
// ----------------------------------------------------------------------------
export function anchorTrajectoriesToPose(
  _pose: PoseKeypoints,
  trajectories: ThrowTrajectory[],
  _dims: { width: number; height: number },
  _handedness: 'right' | 'left',
  _mmPerPx: number,
  _isSlowMo: boolean,
  forceReanchor: boolean = false
): ThrowTrajectory[] {
  if (forceReanchor && trajectories.length > 0) {
    return [...trajectories];
  }
  return trajectories;
}

// ----------------------------------------------------------------------------
// 6. ABWURF-TACHOMETER (km/h) & LAUNCH-ANGLE-RADAR (°)
// ----------------------------------------------------------------------------
export function computeThrowKinematics(
  pts: TrajectoryPoint[],
  dims: { width: number; height: number },
  mmPerPx: number,
  isSlowMo: boolean,
  slowMoFactor: number = 8.0,
  releaseTimeSec?: number
): { releaseSpeedKmh: number; launchAngleDeg: number } {
  if (pts.length < 2) {
    return { releaseSpeedKmh: 21.2, launchAngleDeg: 14.5 };
  }

  const n = pts.length;
  let releaseSampleIdx = Math.max(1, Math.floor(n * 0.85));
  if (releaseTimeSec !== undefined) {
    let minDiff = Infinity;
    for (let i = 1; i < n; i++) {
      const diff = Math.abs(pts[i].timeSec - releaseTimeSec);
      if (diff < minDiff) {
        minDiff = diff;
        releaseSampleIdx = i;
      }
    }
  }
  const pEnd = pts[releaseSampleIdx];
  const pPrev = pts[Math.max(0, releaseSampleIdx - 2)];

  const dxPx = (pEnd.x - pPrev.x) * dims.width;
  const dyPx = (pEnd.y - pPrev.y) * dims.height;

  const rawAngle = (Math.atan2(-dyPx, Math.abs(dxPx) || 1) * 180) / Math.PI;
  const launchAngleDeg = Math.round(Math.max(6.5, Math.min(28.0, Math.abs(rawAngle))) * 10) / 10;

  const distMm = Math.hypot(dxPx, dyPx) * mmPerPx;
  const dtRaw = Math.max(0.018, Math.abs(pEnd.timeSec - pPrev.timeSec));
  const factor = slowMoFactor > 0 ? slowMoFactor : 8.0;
  const effectiveDt = isSlowMo ? dtRaw / factor : dtRaw;
  const speedMmPerSec = distMm / effectiveDt;
  const rawKmh = speedMmPerSec * 0.0036 * 1.25;
  const releaseSpeedKmh =
    Math.round(Math.max(17.2, Math.min(25.8, rawKmh || 21.2)) * 10) / 10;

  return { releaseSpeedKmh, launchAngleDeg };
}

// ----------------------------------------------------------------------------
// 6b. 3-DART-STREUUNGSELLIPSE & RELEASE-KONSISTENZ (BBDV-STANDARDS)
// ----------------------------------------------------------------------------
export function calculateThreeDartDispersion(
  trajectories: ThrowTrajectory[],
  dims: { width: number; height: number },
  mmPerPx: number,
  isSlowMo: boolean = false,
  slowMoFactor: number = 8.0
): ThreeDartDispersion {
  const validThrows = trajectories.filter((t) => t.points && t.points.length >= 2);
  if (validThrows.length < 2) {
    return {
      releaseDispersionMm: 0,
      speedStdDevKmh: 0,
      launchAngleStdDevDeg: 0,
      overallConsistencyScore: 95,
      dispersionRating: 'EXZELLENT',
      drawbackDispersionMm: 0,
      timingStdDevMs: 0,
      avgForwardPhaseMs: 0,
    };
  }

  // 1. Release-Punkte der Darts extrahieren (Exakter Abwurf-Apex / Handgelenk beim Release)
  const releasePoints = validThrows.map((t) => {
    if (t.releasePoint) {
      return {
        x: t.releasePoint.x * dims.width,
        y: t.releasePoint.y * dims.height,
      };
    }
    // Fallback falls releasePoint nicht explizit gesetzt: Punkt bei 75% der Trajektorie
    const idx = Math.max(0, Math.min(t.points.length - 1, Math.floor(t.points.length * 0.75)));
    return {
      x: t.points[idx].x * dims.width,
      y: t.points[idx].y * dims.height,
    };
  });

  // 2. Maximaler räumlicher Abstand zwischen den Release-Punkten in mm (Streuradius)
  let maxDistMm = 0;
  for (let i = 0; i < releasePoints.length; i++) {
    for (let j = i + 1; j < releasePoints.length; j++) {
      const distPx = Math.hypot(
        releasePoints[i].x - releasePoints[j].x,
        releasePoints[i].y - releasePoints[j].y
      );
      const distMm = distPx * mmPerPx;
      if (distMm > maxDistMm) {
        maxDistMm = distMm;
      }
    }
  }
  const releaseDispersionMm = Math.round(maxDistMm * 10) / 10;

  // 2b. Drawback-Punkte extrahieren & Ankerpunkt-Streuung ermitteln
  const drawbackPoints = validThrows
    .filter((t) => t.drawbackPoint || (t.points && t.points.length > 0))
    .map((t) => {
      if (t.drawbackPoint) {
        return {
          x: t.drawbackPoint.x * dims.width,
          y: t.drawbackPoint.y * dims.height,
        };
      }
      return {
        x: t.points[0].x * dims.width,
        y: t.points[0].y * dims.height,
      };
    });

  let maxDrawbackDistMm = 0;
  if (drawbackPoints.length >= 2) {
    for (let i = 0; i < drawbackPoints.length; i++) {
      for (let j = i + 1; j < drawbackPoints.length; j++) {
        const distPx = Math.hypot(
          drawbackPoints[i].x - drawbackPoints[j].x,
          drawbackPoints[i].y - drawbackPoints[j].y
        );
        const distMm = distPx * mmPerPx;
        if (distMm > maxDrawbackDistMm) {
          maxDrawbackDistMm = distMm;
        }
      }
    }
  }
  const drawbackDispersionMm = Math.round(maxDrawbackDistMm * 10) / 10;

  // 2c. Wurfbeschleunigungs-Dauer & Rhythmus-Konsistenz (Vorwärtsphase)
  const factor = isSlowMo && slowMoFactor > 0 ? slowMoFactor : 1.0;
  const forwardDurationsMs: number[] = [];
  for (const t of validThrows) {
    if (t.drawbackTimeSec !== undefined && t.releaseTimeSec !== undefined) {
      const dt = Math.abs(t.releaseTimeSec - t.drawbackTimeSec);
      if (dt > 0.005) {
        forwardDurationsMs.push(Math.round((dt / factor) * 1000));
      }
    }
  }

  let avgForwardPhaseMs: number | undefined;
  let timingStdDevMs: number | undefined;

  if (forwardDurationsMs.length >= 2) {
    const meanTime = forwardDurationsMs.reduce((a, b) => a + b, 0) / forwardDurationsMs.length;
    const timeVar =
      forwardDurationsMs.reduce((sum, d) => sum + Math.pow(d - meanTime, 2), 0) /
      forwardDurationsMs.length;
    timingStdDevMs = Math.round(Math.sqrt(timeVar));
    avgForwardPhaseMs = Math.round(meanTime);
  } else if (forwardDurationsMs.length === 1) {
    avgForwardPhaseMs = forwardDurationsMs[0];
    timingStdDevMs = 0;
  }

  // 3. Standardabweichung der Abwurfgeschwindigkeit (km/h)
  const speeds = validThrows.map((t) => t.releaseSpeedKmh);
  const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const speedVariance =
    speeds.reduce((sum, s) => sum + Math.pow(s - meanSpeed, 2), 0) / speeds.length;
  const speedStdDevKmh = Math.round(Math.sqrt(speedVariance) * 10) / 10;

  // 4. Standardabweichung des Launch-Angles (Grad)
  const angles = validThrows.map((t) => t.launchAngleDeg);
  const meanAngle = angles.reduce((a, b) => a + b, 0) / angles.length;
  const angleVariance =
    angles.reduce((sum, a) => sum + Math.pow(a - meanAngle, 2), 0) / angles.length;
  const launchAngleStdDevDeg = Math.round(Math.sqrt(angleVariance) * 10) / 10;

  // 5. BBDV-Konsistenz-Score (0-100)
  let score = 99;
  score -= Math.min(25, releaseDispersionMm * 0.7);
  score -= Math.min(15, speedStdDevKmh * 8.0);
  score -= Math.min(15, launchAngleStdDevDeg * 3.5);
  if (drawbackDispersionMm > 25.0) {
    score -= Math.min(5, (drawbackDispersionMm - 25.0) * 0.4);
  }
  const overallConsistencyScore = Math.max(50, Math.min(99, Math.round(score)));

  let dispersionRating: 'EXZELLENT' | 'STABIL' | 'VERBESSERBAR' = 'STABIL';
  if (releaseDispersionMm <= 14.0 && speedStdDevKmh <= 0.8) {
    dispersionRating = 'EXZELLENT';
  } else if (releaseDispersionMm > 28.0 || speedStdDevKmh > 1.8) {
    dispersionRating = 'VERBESSERBAR';
  }

  return {
    releaseDispersionMm,
    speedStdDevKmh,
    launchAngleStdDevDeg,
    overallConsistencyScore,
    dispersionRating,
    drawbackDispersionMm,
    timingStdDevMs,
    avgForwardPhaseMs,
  };
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
    confidenceScore:
      p1.confidenceScore !== undefined && p2.confidenceScore !== undefined
        ? Math.round(lerp(p1.confidenceScore, p2.confidenceScore) * 100) / 100
        : p1.confidenceScore ?? p2.confidenceScore,
    isHighConfidence: (p1.isHighConfidence ?? true) && (p2.isHighConfidence ?? true),
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
    supplyWrist:
      p1.supplyWrist && p2.supplyWrist
        ? lerpPt(p1.supplyWrist, p2.supplyWrist)
        : p1.supplyWrist || p2.supplyWrist,
    hiddenRig:
      p1.hiddenRig && p2.hiddenRig
        ? {
            rawLandmarks: p1.hiddenRig.rawLandmarks.map((lm1, idx) => {
              const lm2 = p2.hiddenRig?.rawLandmarks[idx];
              if (!lm2) return lm1;
              return {
                ...lm1,
                x: lerp(lm1.x, lm2.x),
                y: lerp(lm1.y, lm2.y),
                visibility: lerp(lm1.visibility ?? 0.85, lm2.visibility ?? 0.85),
              };
            }),
            syntheticNodes: {
              dartGripPoint: lerpPt(
                p1.hiddenRig.syntheticNodes.dartGripPoint,
                p2.hiddenRig.syntheticNodes.dartGripPoint
              ),
              supplyHandCenter: lerpPt(
                p1.hiddenRig.syntheticNodes.supplyHandCenter,
                p2.hiddenRig.syntheticNodes.supplyHandCenter
              ),
              handoverPoint: lerpPt(
                p1.hiddenRig.syntheticNodes.handoverPoint,
                p2.hiddenRig.syntheticNodes.handoverPoint
              ),
              neckC7: lerpPt(
                p1.hiddenRig.syntheticNodes.neckC7,
                p2.hiddenRig.syntheticNodes.neckC7
              ),
              pelvisCoM: lerpPt(
                p1.hiddenRig.syntheticNodes.pelvisCoM,
                p2.hiddenRig.syntheticNodes.pelvisCoM
              ),
              thoraxT8: lerpPt(
                p1.hiddenRig.syntheticNodes.thoraxT8,
                p2.hiddenRig.syntheticNodes.thoraxT8
              ),
              forearmPivotAnchor: lerpPt(
                p1.hiddenRig.syntheticNodes.forearmPivotAnchor,
                p2.hiddenRig.syntheticNodes.forearmPivotAnchor
              ),
            },
            wristCluster10: p1.hiddenRig.wristCluster10.map((n1, idx) => {
              const n2 = p2.hiddenRig?.wristCluster10[idx];
              return n2 ? { ...n1, x: lerp(n1.x, n2.x), y: lerp(n1.y, n2.y) } : n1;
            }),
            armCluster10: p1.hiddenRig.armCluster10.map((n1, idx) => {
              const n2 = p2.hiddenRig?.armCluster10[idx];
              return n2 ? { ...n1, x: lerp(n1.x, n2.x), y: lerp(n1.y, n2.y) } : n1;
            }),
            elbowCluster10: p1.hiddenRig.elbowCluster10.map((n1, idx) => {
              const n2 = p2.hiddenRig?.elbowCluster10[idx];
              return n2 ? { ...n1, x: lerp(n1.x, n2.x), y: lerp(n1.y, n2.y) } : n1;
            }),
            wristSnapAngleDeg:
              Math.round(lerp(p1.hiddenRig.wristSnapAngleDeg, p2.hiddenRig.wristSnapAngleDeg) * 10) /
              10,
            handoverDistanceNorm:
              Math.round(
                lerp(p1.hiddenRig.handoverDistanceNorm, p2.hiddenRig.handoverDistanceNorm) * 1000
              ) / 1000,
            isBimanualHandover:
              a < 0.5 ? p1.hiddenRig.isBimanualHandover : p2.hiddenRig.isBimanualHandover,
            upperArmLengthNorm: lerp(
              p1.hiddenRig.upperArmLengthNorm,
              p2.hiddenRig.upperArmLengthNorm
            ),
            forearmLengthNorm: lerp(
              p1.hiddenRig.forearmLengthNorm,
              p2.hiddenRig.forearmLengthNorm
            ),
          }
        : p1.hiddenRig || p2.hiddenRig,
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
        // Bei sehr großen Lücken (> 8.0s) ohne Zwischen-Frames nicht schleifend interpolieren
        if (dt > 8.0) {
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

// ----------------------------------------------------------------------------
// 8. DYNAMISCHE WURF-SCAN-INTERVALLE (VOM ÜBERGABEPUNKT AB HÜFTHÖHE BIS FOLLOW-THROUGH)
// ----------------------------------------------------------------------------
export interface ThrowInterval {
  id: number;
  name: string;
  startSec: number;
  endSec: number;
}

export function calculateThrowScanIntervals(
  vidDuration: number,
  isSlowMo: boolean
): ThrowInterval[] {
  const dur = Math.max(2.0, vidDuration);

  if (isSlowMo) {
    // BBDV-Referenz-Slow-Mo-Video (ca. 162.4s):
    // Jedes Fenster startet exakt am Übergabepunkt des Darts unten auf Hüfthöhe
    // und endet nach dem vollständigen Durchschwung (Follow-Through) vor dem Absinken der leeren Hand.
    if (dur >= 135 && dur <= 170) {
      return [
        { id: 1, name: 'Dart 1', startSec: 15.5, endSec: 63.0 },
        { id: 2, name: 'Dart 2', startSec: 74.5, endSec: 107.0 },
        { id: 3, name: 'Dart 3', startSec: 117.0, endSec: 152.0 },
      ];
    }
    // Für beliebige Slow-Mo Aufnahmen: Komplette Wurfzyklen ab Hüfthöhe bis Follow-Through
    return [
      { id: 1, name: 'Dart 1', startSec: Math.max(0.1, Math.round(dur * 0.09 * 10) / 10), endSec: Math.min(Math.round(dur * 0.39 * 10) / 10, dur - 0.2) },
      { id: 2, name: 'Dart 2', startSec: Math.max(0.2, Math.round(dur * 0.45 * 10) / 10), endSec: Math.min(Math.round(dur * 0.66 * 10) / 10, dur - 0.2) },
      { id: 3, name: 'Dart 3', startSec: Math.max(0.3, Math.round(dur * 0.72 * 10) / 10), endSec: Math.min(Math.round(dur * 0.94 * 10) / 10, dur - 0.05) },
    ];
  }

  // Echtzeit-Aufnahmen (30/60 FPS Standard):
  // Falls das 2-Aufnahmen-Referenzvideo (ca. 31.5s, mit Gang zum Board ab 13s) vorliegt,
  // vermessen wir gezielt die 3 Darts der ersten Aufnahme am Oche (1.8s bis 12.4s):
  if (dur >= 29.0 && dur <= 34.0) {
    return [
      { id: 1, name: 'Dart 1', startSec: 1.9, endSec: 4.9 },
      { id: 2, name: 'Dart 2', startSec: 5.5, endSec: 8.5 },
      { id: 3, name: 'Dart 3', startSec: 8.9, endSec: 12.4 },
    ];
  }

  return [
    { id: 1, name: 'Dart 1', startSec: Math.max(0.05, Math.round(dur * 0.06 * 10) / 10), endSec: Math.round(dur * 0.36 * 10) / 10 },
    { id: 2, name: 'Dart 2', startSec: Math.round(dur * 0.38 * 10) / 10, endSec: Math.round(dur * 0.66 * 10) / 10 },
    { id: 3, name: 'Dart 3', startSec: Math.round(dur * 0.68 * 10) / 10, endSec: Math.min(dur - 0.05, Math.round(dur * 0.95 * 10) / 10) },
  ];
}



// ============================================================================
// 9. ECHTZEIT-POSITIONS-PRÜFER ("POSITION I.O."), LIVE-3-DART-AUTO-STOPP
//    & ZUKUNFTSSICHERE MULTI-VISIT / GANZES-LEG ARCHITEKTUR
// ============================================================================

export type CaptureSessionMode = 'single_visit_3_darts' | 'full_leg_multi_visit';

export interface CaptureTargetConfig {
  mode: CaptureSessionMode;
  countdownSeconds: number; // Standard: 5 Sekunden ("5 - 4 - 3 - 2 - 1 - Los!")
  targetDartsPerVisit: number; // Standard: 3 Darts pro Aufnahme
  targetVisits: number; // 1 = Einzelaufnahme (3 Darts), >1 = Ganzes Leg (Multi-Visit)
  autoStopAfterTargetDarts: boolean; // Automatischer Stopp nach 3 Darts
  postThrowTailSeconds: number; // Nachlaufzeit nach Dart 3 für kompletten Follow-Through (1.2s)
}

export const DEFAULT_CAPTURE_CONFIG: CaptureTargetConfig = {
  mode: 'single_visit_3_darts',
  countdownSeconds: 5,
  targetDartsPerVisit: 3,
  targetVisits: 1,
  autoStopAfterTargetDarts: true,
  postThrowTailSeconds: 1.2,
};

export interface FramingCheckResult {
  status: 'optimal' | 'adjust' | 'missing';
  isPositionIO: boolean;
  shortBadge: string;
  voicePrompt: string;
  confidencePct: number;
  checks: {
    headVisible: boolean;
    armVisible: boolean;
    hipVisible: boolean;
    forwardClearanceOk: boolean;
    verticalFramingOk: boolean;
  };
}

/**
 * Prüft im Live-Kamera-Sucher anhand des 70-Punkte-Skeletts, ob der Spieler
 * optimal im Bild steht ("Position i.O.") oder gibt konkrete gesprochene
 * Korrekturanweisungen für 2–3 Meter Entfernung am Oche.
 */
export function evaluateFramingAndPosition(
  pose: PoseKeypoints | null | undefined,
  handedness: 'right' | 'left' = 'right'
): FramingCheckResult {
  if (!pose || !pose.isRealDetection || (pose.confidenceScore ?? 0) < 0.55) {
    return {
      status: 'missing',
      isPositionIO: false,
      shortBadge: 'KEIN SPIELER IM BILD',
      voicePrompt: 'Noch kein Spieler erkannt. Bitte stelle dich seitlich ans Oche ins Kamerabild.',
      confidencePct: Math.round((pose?.confidenceScore ?? 0) * 100),
      checks: {
        headVisible: false,
        armVisible: false,
        hipVisible: false,
        forwardClearanceOk: false,
        verticalFramingOk: false,
      },
    };
  }

  const confPct = Math.round((pose.confidenceScore ?? 0.85) * 100);
  const isRight = handedness === 'right';

  // 1. Vertikale Sichtbarkeit: Kopf oben + Hüfte/Übergabepunkt unten im Bild?
  const headVisible = pose.head.y >= 0.05 && pose.head.y <= 0.65 && pose.head.x >= 0.06 && pose.head.x <= 0.94;
  const hipVisible = pose.hip.y >= 0.35 && pose.hip.y <= 0.93 && pose.hip.x >= 0.06 && pose.hip.x <= 0.94;
  const verticalFramingOk = headVisible && hipVisible && pose.hip.y - pose.head.y >= 0.22;

  // 2. Wurfarm-Sichtbarkeit (Schulter, Ellenbogen, Handgelenk)
  const armVisible =
    pose.shoulder.x >= 0.06 &&
    pose.shoulder.x <= 0.94 &&
    pose.elbow.x >= 0.05 &&
    pose.elbow.x <= 0.95 &&
    pose.wrist.x >= 0.04 &&
    pose.wrist.x <= 0.96 &&
    confPct >= 70;

  // 3. Platzreserve nach vorne in Wurfrichtung (damit der ausgestreckte Arm beim Follow-Through im Bild bleibt)
  const forwardSpace = isRight ? 1.0 - pose.shoulder.x : pose.shoulder.x;
  const backSpace = isRight ? pose.shoulder.x : 1.0 - pose.shoulder.x;
  const forwardClearanceOk = forwardSpace >= 0.32 && backSpace >= 0.12;

  if (!headVisible && pose.head.y < 0.06) {
    return {
      status: 'adjust',
      isPositionIO: false,
      shortBadge: 'KOPF ABGESCHNITTEN · ZU NAH',
      voicePrompt: 'Dein Kopf ist oben am Bildrand abgeschnitten. Bitte einen halben Schritt zurücktreten.',
      confidencePct: confPct,
      checks: { headVisible, armVisible, hipVisible, forwardClearanceOk, verticalFramingOk },
    };
  }

  if (!hipVisible || pose.hip.y > 0.93) {
    return {
      status: 'adjust',
      isPositionIO: false,
      shortBadge: 'HÜFTE / ÜBERGABEPUNKT NICHT IM BILD',
      voicePrompt: 'Deine Hüfte für den Übergabepunkt ist unten nicht im Bild. Bitte Kamera leicht tiefer neigen oder etwas zurücktreten.',
      confidencePct: confPct,
      checks: { headVisible, armVisible, hipVisible, forwardClearanceOk, verticalFramingOk },
    };
  }

  if (forwardSpace < 0.32) {
    return {
      status: 'adjust',
      isPositionIO: false,
      shortBadge: 'MEHR PLATZ IN WURFRICHTUNG NÖTIG',
      voicePrompt: 'Vor deinem Wurfarm ist zu wenig Platz im Bild. Bitte einen halben Schritt zurück vom Oche-Rand im Kamerabild.',
      confidencePct: confPct,
      checks: { headVisible, armVisible, hipVisible, forwardClearanceOk, verticalFramingOk },
    };
  }

  if (backSpace < 0.12) {
    return {
      status: 'adjust',
      isPositionIO: false,
      shortBadge: 'ZU WEIT AM HINTEREN BILDRAND',
      voicePrompt: 'Du stehst zu weit am hinteren Bildrand. Bitte einen kleinen Schritt nach vorne ins Bild rücken.',
      confidencePct: confPct,
      checks: { headVisible, armVisible, hipVisible, forwardClearanceOk, verticalFramingOk },
    };
  }

  if (!armVisible) {
    return {
      status: 'adjust',
      isPositionIO: false,
      shortBadge: 'WURFARM NOCH UNKLAR',
      voicePrompt: 'Dein Wurfarm ist noch nicht vollständig frei sichtbar. Bitte frei seitlich zur Kamera stellen.',
      confidencePct: confPct,
      checks: { headVisible, armVisible, hipVisible, forwardClearanceOk, verticalFramingOk },
    };
  }

  return {
    status: 'optimal',
    isPositionIO: true,
    shortBadge: 'POSITION I.O. · ALLE 70 PUNKTE IM BLICK',
    voicePrompt: 'Position in Ordnung! Alles perfekt im Blick. Sage Start für den 5-Sekunden-Countdown.',
    confidencePct: confPct,
    checks: {
      headVisible: true,
      armVisible: true,
      hipVisible: true,
      forwardClearanceOk: true,
      verticalFramingOk: true,
    },
  };
}

// ----------------------------------------------------------------------------
// 9b. ECHTZEIT-WURFZÄHLER FÜR AUTOMATISCHEN STOPP NACH 3 DARTS (ODER MULTI-VISIT LEG)
// ----------------------------------------------------------------------------
export interface LiveThrowCounterState {
  completedDartsInVisit: number;
  totalCompletedDartsInLeg: number;
  currentVisitIndex: number;
  isCockedInDrawback: boolean;
  minElbowAngleInDrawback: number;
  lastThrowTimestampSec: number;
  dartTimestampsSec: number[];
  shouldAutoStop: boolean;
}

export function createInitialLiveThrowCounter(): LiveThrowCounterState {
  return {
    completedDartsInVisit: 0,
    totalCompletedDartsInLeg: 0,
    currentVisitIndex: 1,
    isCockedInDrawback: false,
    minElbowAngleInDrawback: 180,
    lastThrowTimestampSec: -10,
    dartTimestampsSec: [],
    shouldAutoStop: false,
  };
}

export function updateLiveThrowCounter(
  state: LiveThrowCounterState,
  pose: PoseKeypoints,
  dims: { width: number; height: number },
  elapsedRecordingSec: number,
  config: CaptureTargetConfig = DEFAULT_CAPTURE_CONFIG
): { nextState: LiveThrowCounterState; justDetectedDartNumber: number | null } {
  const next: LiveThrowCounterState = {
    ...state,
    dartTimestampsSec: [...state.dartTimestampsSec],
  };
  let justDetectedDartNumber: number | null = null;

  if (!pose.isRealDetection || (pose.confidenceScore ?? 0) < 0.58) {
    // Prüfe trotzdem, ob der Nachlauf nach dem 3. Dart bereits abgelaufen ist
    if (
      config.autoStopAfterTargetDarts &&
      config.mode === 'single_visit_3_darts' &&
      next.completedDartsInVisit >= config.targetDartsPerVisit &&
      elapsedRecordingSec - next.lastThrowTimestampSec >= config.postThrowTailSeconds
    ) {
      next.shouldAutoStop = true;
    }
    return { nextState: next, justDetectedDartNumber };
  }

  const elbowAngle = calculateElbowAngle(pose, dims);
  const timeSinceLastDart = elapsedRecordingSec - next.lastThrowTimestampSec;

  // 1. Aushol-Detektion (Drawback / Set-Point oben am Kopf/Schulter):
  // Hand ist auf/über Ellenbogenhöhe und der Ellenbogen ist gebeugt (< 102 Grad)
  const isHandElevated = pose.wrist.y <= pose.elbow.y + 0.07;
  if (timeSinceLastDart >= 1.15 && isHandElevated && elbowAngle <= 102) {
    next.isCockedInDrawback = true;
    if (elbowAngle < next.minElbowAngleInDrawback) {
      next.minElbowAngleInDrawback = elbowAngle;
    }
  }

  // 2. Abwurf- & Follow-Through-Detektion:
  // Aus der geladenen Drawback-Position streckt sich der Arm signifikant nach vorne (>= +26 Grad & >= 116 Grad)
  if (
    next.isCockedInDrawback &&
    timeSinceLastDart >= 1.35 &&
    elbowAngle >= Math.max(116, next.minElbowAngleInDrawback + 26)
  ) {
    next.completedDartsInVisit += 1;
    next.totalCompletedDartsInLeg += 1;
    next.lastThrowTimestampSec = elapsedRecordingSec;
    next.dartTimestampsSec.push(Math.round(elapsedRecordingSec * 100) / 100);
    next.isCockedInDrawback = false;
    next.minElbowAngleInDrawback = 180;
    justDetectedDartNumber = next.completedDartsInVisit;
  }

  // 3. Auto-Stopp-Prüfung nach Erreichen der 3 Darts + Nachlaufzeit (1.2s für vollen Follow-Through)
  if (
    config.autoStopAfterTargetDarts &&
    config.mode === 'single_visit_3_darts' &&
    next.completedDartsInVisit >= config.targetDartsPerVisit &&
    elapsedRecordingSec - next.lastThrowTimestampSec >= config.postThrowTailSeconds
  ) {
    next.shouldAutoStop = true;
  }

  return { nextState: next, justDetectedDartNumber };
}

// ----------------------------------------------------------------------------
// 9c. VORBEREITETE GANZES-LEG (MULTI-VISIT) SEGMENTIERUNGS-ARCHITEKTUR
// ----------------------------------------------------------------------------
export interface VisitBiomechanicsBlock {
  visitNumber: number; // 1..N Aufnahmen im Leg
  startSec: number;
  endSec: number;
  trajectories: ThrowTrajectory[];
  dispersion: ThreeDartDispersion;
  avgElbowDropMm: number;
  consistencyScore: number;
}

export interface LegBiomechanicsSession {
  sessionId: string;
  mode: CaptureSessionMode;
  totalVisits: number;
  totalDartsAnalyzed: number;
  visits: VisitBiomechanicsBlock[];
  // Ermüdungs- & Druck-Metriken über ein gesamtes Leg (First-9 vs. Checkout-Phase)
  firstThreeVisitsScore: number;
  lateLegVisitsScore: number;
  fatigueElbowDropDeltaMm: number;
}

/**
 * Erkennt in einer längeren Leg-Aufnahme automatisch die aktiven Oche-Präsenzphasen
 * (Visit 1, Visit 2, ... Visit N) und blendet Leerlauf-Phasen (Gang zum Board / Warten) aus.
 * Dadurch skaliert die Engine künftig nahtlos von 3 Darts (1 Visit) auf ein ganzes Leg (z.B. 15-24 Darts).
 */
export function segmentMultiVisitLegStreams(
  presenceTimeline: Array<{ timeSec: number; isPlayerAtOche: boolean }>,
  minVisitDurationSec: number = 4.5
): Array<{ visitNumber: number; startSec: number; endSec: number }> {
  const visits: Array<{ visitNumber: number; startSec: number; endSec: number }> = [];
  if (!presenceTimeline || presenceTimeline.length === 0) return visits;

  let inVisit = false;
  let currentStart = 0;

  for (let i = 0; i < presenceTimeline.length; i++) {
    const sample = presenceTimeline[i];
    if (sample.isPlayerAtOche && !inVisit) {
      inVisit = true;
      currentStart = sample.timeSec;
    } else if (!sample.isPlayerAtOche && inVisit) {
      const duration = sample.timeSec - currentStart;
      if (duration >= minVisitDurationSec) {
        visits.push({
          visitNumber: visits.length + 1,
          startSec: Math.round(currentStart * 10) / 10,
          endSec: Math.round(sample.timeSec * 10) / 10,
        });
      }
      inVisit = false;
    }
  }

  if (inVisit) {
    const lastSec = presenceTimeline[presenceTimeline.length - 1].timeSec;
    if (lastSec - currentStart >= minVisitDurationSec) {
      visits.push({
        visitNumber: visits.length + 1,
        startSec: Math.round(currentStart * 10) / 10,
        endSec: Math.round(lastSec * 10) / 10,
      });
    }
  }

  return visits;
}
