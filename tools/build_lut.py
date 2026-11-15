import sys, json, os
import cv2, numpy as np

img, folder, tmin, tmax = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
im = cv2.imread(img)
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(np.int32)
H, W = hsv.shape[:2]
y = int(sys.argv[5]) if len(sys.argv) > 5 else None
if y is None:   # pick the row through the bar that has the most saturated, bright pixels in the left 2/3 of the picture
    cand = [(int(((hsv[r, :int(W*.67), 1] > 120) & (hsv[r, :int(W*.67), 2] > 150)).sum()), r) for r in range(H)]
    y = max(cand)[1]
row = hsv[y, :int(W*.67)]
xs = np.where((row[:, 1] > 120) & (row[:, 2] > 150))[0]
x0, x1 = int(xs.min()) + 2, int(xs.max()) - 4          
print(f"bar row y={y}, x from {x0} to {x1}")
hue = np.unwrap(np.deg2rad(hsv[y, x0:x1 + 1, 0] * 2.0))
hue = np.rad2deg(hue)
if hue[0] < hue[-1]: hue = -hue                         
hue = np.minimum.accumulate(hue)                        
temps = np.linspace(tmin, tmax, len(hue))
step = (tmax - tmin) / 64.0                              
tt = np.arange(tmin, tmax + step / 2, step)
hh = np.interp(tt, temps, hue)
back = np.interp(-hue, -hh, tt)
err = np.abs(back - temps)
out = {"tmin": tmin, "tmax": tmax, "temp": [round(float(t), 3) for t in tt], "hue": [round(float(h), 2) for h in hh],
       "roundtrip_max_error_C": round(float(err.max()), 2), "roundtrip_mean_error_C": round(float(err.mean()), 3),
       "source_image": os.path.basename(img)}
os.makedirs(folder, exist_ok=True)
json.dump(out, open(os.path.join(folder, "lut.json"), "w"), indent=1)
print("hue range", round(float(hh[0]), 1), "->", round(float(hh[-1]), 1), "| round-trip error: max", out["roundtrip_max_error_C"], "C, mean", out["roundtrip_mean_error_C"], "C")