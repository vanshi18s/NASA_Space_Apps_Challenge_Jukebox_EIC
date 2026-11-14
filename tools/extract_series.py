import cv2, os

VIDEO = r"raw\5313\nightlights_flat_series_and_change_wZooms_13_EIC_2160p30_h265.mp4"
OUT = r"data\nightlights"
SECONDS = 20      # stop before the continent zooms
FPS_OUT = 10      # frames kept per second
WIDTH = 2048

os.makedirs(OUT, exist_ok=True)
cap = cv2.VideoCapture(VIDEO)
fps = cap.get(cv2.CAP_PROP_FPS) or 30
step = max(1, round(fps / FPS_OUT))
n = saved = 0
while True:
    ok, frame = cap.read()
    if not ok or n / fps > SECONDS:
        break
    if n % step == 0:
        h, w = frame.shape[:2]
        frame = cv2.resize(frame, (WIDTH, int(h * WIDTH / w)), interpolation=cv2.INTER_AREA)
        saved += 1
        cv2.imwrite(os.path.join(OUT, f"series_{saved:03d}.jpg"), frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    n += 1
print("saved", saved, "frames")