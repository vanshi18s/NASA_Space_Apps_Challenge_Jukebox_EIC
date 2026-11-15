"""Pick one steady frame per date in data/<dataset>/config.json and save it as the keyframe.
 python tools/pick_keyframes_dated.py ocean
Needs the series made by extract_series.py (--start/--end must cover exactly config start..end).
Frame number for a date = (date - start) / (end - start) * (frames - 1) + 1, i.e. the video is assumed to play the timeline at constant speed.
It then looks +-radius frames for the least blurry/moving one."""
import cv2, glob, json, os, sys, numpy as np
from datetime import datetime
ds = sys.argv[1]; cfg = json.load(open(os.path.join("data", ds, "config.json")))
files = sorted(glob.glob(os.path.join("data", ds, "series", "series_*.jpg"))); N = len(files)
t0, t1 = [datetime.fromisoformat(cfg[k].replace("Z", "")) for k in ("start", "end")]
out = os.path.join("data", ds, "keyframes"); os.makedirs(out, exist_ok=True)
def g(n):
    if n < 1 or n > N: return None
    im = cv2.imread(files[n - 1], cv2.IMREAD_GRAYSCALE); h, w = im.shape
    return cv2.resize(im, (512, max(1, int(h * 512 / w))), interpolation=cv2.INTER_AREA).astype(np.float32)
R = cfg.get("search_radius", 2)
for f in cfg["frames"]:
    frac = (datetime.fromisoformat(f["date"]) - t0) / (t1 - t0); c = round(frac * (N - 1)) + 1
    best, bs = c, 1e18
    for n in range(max(1, c - R), min(N, c + R) + 1):
        b = g(n); d = [float(np.mean(np.abs(b - o))) for o in (g(n - 1), g(n + 1)) if o is not None]
        if d and max(d) < bs: best, bs = n, max(d)
    cv2.imwrite(os.path.join(out, f["file"]), cv2.imread(files[best - 1]), [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"{f['date']}  ->  frame #{best:03d} of {N}  ({f['file']})")