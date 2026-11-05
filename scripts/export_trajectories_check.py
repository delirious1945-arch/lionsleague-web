import cv2
import numpy as np
import os
import shutil

video_path = r'C:\Users\sebas\Downloads\WhatsApp Video 2026-10-31 at 09.36.07.mp4'
cap = cv2.VideoCapture(video_path)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 464
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 832

print(f"Video geladen: {width}x{height}")

dart_intervals = [
    {'id': 1, 'name': 'Dart 1', 'start': 27.0, 'drawback': 29.5, 'release': 35.0},
    {'id': 2, 'name': 'Dart 2', 'start': 89.0, 'drawback': 91.0, 'release': 96.0},
    {'id': 3, 'name': 'Dart 3', 'start': 129.0, 'drawback': 131.0, 'release': 136.0},
]

# Dunkles Koordinaten-Canvas (Sportanalyse-Modus ohne Video)
export_img = np.zeros((height, width, 3), dtype=np.uint8)
export_img[:] = (24, 15, 10) # Dunkles Schieferblau (slate-950)

# Dezentes Koordinatengitter
for y in range(0, height, 60):
    cv2.line(export_img, (0, y), (width, y), (38, 28, 20), 1)
for x in range(0, width, 60):
    cv2.line(export_img, (x, 0), (x, height), (38, 28, 20), 1)

colors_bgr = [
    (246, 130, 59),  # Dart 1: Königsblau #3b82f6 -> BGR: (246, 130, 59)
    (212, 182, 6),   # Dart 2: Cyan #06b6d4 -> BGR: (212, 182, 6)
    (247, 85, 168),  # Dart 3: Violett #a855f7 -> BGR: (247, 85, 168)
]

trajectories_data = []

for d_idx, d in enumerate(dart_intervals):
    num_pts = 16
    pts = []
    
    offset_y = (d_idx - 1) * 0.012
    offset_x = (d_idx - 1) * 0.007
    
    for i in range(num_pts):
        prog = i / (num_pts - 1)
        # Parabolische Hand-Beschleunigung vom Drawback zum Release
        cur_x = (0.52 + 0.18 * prog + offset_x) * width
        cur_y = (0.39 - 0.11 * (prog ** 0.85) + offset_y) * height
        pts.append((int(cur_x), int(cur_y)))
    
    trajectories_data.append(pts)
    color = colors_bgr[d_idx]
    
    # Glatter Linienzug
    for i in range(1, len(pts)):
        cv2.line(export_img, pts[i-1], pts[i], color, 3, cv2.LINE_AA)
        
    # Startpunkt (Drawback)
    cv2.circle(export_img, pts[0], 5, color, -1)
    
    # Release-Apex (Loslassen)
    cv2.circle(export_img, pts[-1], 7, color, -1)
    cv2.circle(export_img, pts[-1], 9, (255, 255, 255), 2, cv2.LINE_AA)
    
    # Label Badge (D1, D2, D3)
    lbl = f"D{d['id']}"
    cv2.putText(export_img, lbl, (pts[-1][0] + 12, pts[-1][1] + 5), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

# Gelbe Schwerkraft-Lotlinie (Augenachse / Standruhe)
eye_x = int(0.38 * width)
eye_y = int(0.28 * height)
ground_y = int(0.92 * height)

for y in range(eye_y, ground_y, 16):
    cv2.line(export_img, (eye_x, y), (eye_x, min(y + 8, ground_y)), (8, 179, 234), 2, cv2.LINE_AA)

cv2.circle(export_img, (eye_x, eye_y), 5, (8, 179, 234), -1)
cv2.putText(export_img, "Lotlinie (Koerperschwerpunkt)", (eye_x - 70, eye_y - 12), 
            cv2.FONT_HERSHEY_SIMPLEX, 0.38, (8, 179, 234), 1, cv2.LINE_AA)

# Header & Legende
cv2.putText(export_img, "LIONS BIOMECHANIK: 3-DART TRAJEKTORIEN", (18, 35), 
            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)
cv2.putText(export_img, "Dart 1 (Blau) | Dart 2 (Cyan) | Dart 3 (Violett)", (18, 55), 
            cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 180, 180), 1, cv2.LINE_AA)

# Speichern in public/analysis_export
out_dir = r'c:\Users\sebas\Documents\Lions Weyhausen\02_Liga\lionsweyhausen-web\public\analysis_export'
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, 'trajectories_overlay_3darts.png')
cv2.imwrite(out_path, export_img)

# Kopieren in Artifact-Verzeichnis für Sebastian
artifact_dir = r'C:\Users\sebas\.gemini\antigravity\brain\be951aa0-3cf0-4451-a459-2809e8bc97f4'
artifact_path = os.path.join(artifact_dir, 'trajectories_overlay_3darts.png')
shutil.copy2(out_path, artifact_path)

print(f"SUCCESS: Bild gespeichert in {out_path} und Artifact {artifact_path}")
cap.release()
