"""Contact sheets so you can SEE which frame is which.   python tools/contact_sheet.py <dataset> [every_n]"""
import cv2, glob, os, sys
ds = sys.argv[1]; every = int(sys.argv[2]) if len(sys.argv) > 2 else 5
files = sorted(glob.glob(os.path.join("data", ds, "series", "series_*.jpg")))[::every]
COLS, TW, PER = 3, 640, 18; th = []
for f in files:
    im = cv2.imread(f); h, w = im.shape[:2]; im = cv2.resize(im, (TW, int(h * TW / w)), interpolation=cv2.INTER_AREA)
    cv2.putText(im, f"#{int(os.path.basename(f)[7:10])}", (8, 28), cv2.FONT_HERSHEY_SIMPLEX, .8, (0, 255, 255), 2); th.append(im)
for k, s in enumerate(range(0, len(th), PER), 1):
    c = th[s:s + PER]
    while len(c) % COLS: c.append(c[0] * 0)
    o = os.path.join("data", ds, f"contact_sheet_{k}.jpg")
    cv2.imwrite(o, cv2.vconcat([cv2.hconcat(c[i:i + COLS]) for i in range(0, len(c), COLS)]), [cv2.IMWRITE_JPEG_QUALITY, 88]); print("wrote", o)