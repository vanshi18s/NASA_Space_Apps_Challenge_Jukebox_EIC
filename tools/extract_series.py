"""Cut a NASA video into numbered JPEG frames.   python tools/extract_series.py <dataset> <video> [--start S] [--end S] [--fps F] [--width W]
 --start/--end: seconds of the video that hold the real data (skip intro, title card, zooms, credits).
 Frames go to data/<dataset>/series/series_001.jpg ... and the settings are printed so you can note them in config.json."""
import cv2, os, argparse
p = argparse.ArgumentParser(); p.add_argument("dataset"); p.add_argument("video")
p.add_argument("--start", type=float, default=0); p.add_argument("--end", type=float, default=None)
p.add_argument("--fps", type=float, default=5); p.add_argument("--width", type=int, default=2048)
a = p.parse_args()
out = os.path.join("data", a.dataset, "series"); os.makedirs(out, exist_ok=True)
cap = cv2.VideoCapture(a.video); fps = cap.get(cv2.CAP_PROP_FPS) or 30
total = cap.get(cv2.CAP_PROP_FRAME_COUNT); print(f"video: {fps:.2f} fps, {int(total)} frames, {total/fps:.1f} s")
step = max(1, round(fps / a.fps)); n = saved = 0
cap.set(cv2.CAP_PROP_POS_FRAMES, int(a.start * fps)); n = int(a.start * fps)
while True:
    ok, f = cap.read()
    if not ok or (a.end is not None and n / fps > a.end): break
    if (n - int(a.start * fps)) % step == 0:
        h, w = f.shape[:2]; f = cv2.resize(f, (a.width, int(h * a.width / w)), interpolation=cv2.INTER_AREA)
        saved += 1; cv2.imwrite(os.path.join(out, f"series_{saved:03d}.jpg"), f, [cv2.IMWRITE_JPEG_QUALITY, 90])
    n += 1
print("saved", saved, "frames to", out, "| covers", a.start, "s to", n / fps, "s")