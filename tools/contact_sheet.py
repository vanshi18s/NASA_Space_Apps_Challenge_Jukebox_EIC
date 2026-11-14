import cv2, glob, os

files = sorted(glob.glob(r"data\nightlights\series_*.jpg"))[::5]
COLS, TW, PER_SHEET = 3, 640, 18

thumbs = []
for f in files:
    im = cv2.imread(f)
    h, w = im.shape[:2]
    im = cv2.resize(im, (TW, int(h * TW / w)), interpolation=cv2.INTER_AREA)
    n = int(os.path.basename(f)[7:10])
    cv2.putText(im, f"#{n}  t={(n-1)/10:.1f}s", (8, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
    thumbs.append(im)

for k, start in enumerate(range(0, len(thumbs), PER_SHEET), 1):
    chunk = thumbs[start:start + PER_SHEET]
    while len(chunk) % COLS:
        chunk.append(chunk[0] * 0)
    rows = [cv2.hconcat(chunk[i:i + COLS]) for i in range(0, len(chunk), COLS)]
    out = rf"data\contact_sheet_{k}.jpg"
    cv2.imwrite(out, cv2.vconcat(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print("wrote", out)