"""Check that the crop in config.json really is the whole globe (180W-180E, 90N-90S).
 python tools/verify_geo.py <dataset> <keyframe.jpg>      -> data/<dataset>/verify_geo.jpg
Draws the equator, the 12 sound bands (70N-50S) and known coastal points. Every red cross must sit on its coast."""
import cv2, json, os, sys
ds, kf = sys.argv[1], sys.argv[2]; cfg = json.load(open(os.path.join("data", ds, "config.json")))
im = cv2.imread(kf); h, w = im.shape[:2]; cx, cy, cw, ch = cfg["crop"]
m = cv2.resize(im[int(cy * h):int((cy + ch) * h), int(cx * w):int((cx + cw) * w)], (1024, 576))   # same 1024x576 the page reads
P = {"Cape Horn": (-55.98, -67.27), "Cape Good Hope": (-34.36, 18.47), "Gulf of Guinea coast": (4.5, 7.0),
     "Panama": (8.9, -79.5), "Cape Comorin": (8.08, 77.55), "Cape York": (-10.7, 142.5), "Dakar": (14.7, -17.5)}
for b in range(13):
    y = 64 + 32 * b; cv2.line(m, (0, y), (1023, y), (255, 255, 0) if b else (255, 255, 255), 1)
cv2.line(m, (0, 288), (1023, 288), (0, 255, 0), 1)
for n, (la, lo) in P.items():
    x, y = int((lo + 180) / 360 * 1024), int((90 - la) / 180 * 576)
    cv2.drawMarker(m, (x, y), (0, 0, 255), cv2.MARKER_CROSS, 14, 2); cv2.putText(m, n, (x + 6, y - 6), cv2.FONT_HERSHEY_SIMPLEX, .4, (255, 255, 255), 1)
o = os.path.join("data", ds, "verify_geo.jpg"); cv2.imwrite(o, m); print("wrote", o)