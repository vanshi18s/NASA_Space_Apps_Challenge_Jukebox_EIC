import os
import cv2
import numpy as np

SRC = os.path.join("data", "nightlights")
OUT = os.path.join(SRC, "keyframes")


YEARS = {
    2012: (2, 1),   
    2013: (8, 2),
    2014: (16, 2),
    2015: (21, 2),
    2016: (26, 2),
    2017: (31, 2),
    2018: (38, 2),
    2019: (46, 2),
    2020: (51, 2),
    2021: (56, 2),
    2022: (61, 2),
    2023: (80, 10), 
}
CHANGE = (160, 25)  


LABEL_BOX = (0.46, 0.42, 0.60, 0.60)   


def path(n):
    return os.path.join(SRC, f"series_{n:03d}.jpg")


def small_gray(n):
    if n < 1:
        return None
    im = cv2.imread(path(n), cv2.IMREAD_GRAYSCALE)
    if im is None:
        return None
    h, w = im.shape
    return cv2.resize(im, (512, max(1, int(h * 512 / w))), interpolation=cv2.INTER_AREA).astype(np.float32)


def most_stable(center, radius):
    lo, hi = max(1, center - radius), center + radius
    best, best_score = None, 1e18
    for n in range(lo, hi + 1):
        a, b, c = small_gray(n - 1), small_gray(n), small_gray(n + 1)
        if b is None:
            continue
        diffs = []
        if a is not None:
            diffs.append(float(np.mean(np.abs(b - a))))
        if c is not None:
            diffs.append(float(np.mean(np.abs(b - c))))
        score = max(diffs) if diffs else 1e18
        if score < best_score:
            best, best_score = n, score
    return best, best_score


def crop_label(im):
    h, w = im.shape[:2]
    x0, y0, x1, y1 = LABEL_BOX
    c = im[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    c = cv2.resize(c, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
   
    return cv2.convertScaleAbs(c, alpha=4.0, beta=0)


def main():
    os.makedirs(OUT, exist_ok=True)
    tiles = []
    for year, (c, r) in YEARS.items():
        n, score = most_stable(c, r)
        if n is None:
            print(f"{year}: no frames found near #{c}")
            continue
        im = cv2.imread(path(n))
        cv2.imwrite(os.path.join(OUT, f"year_{year}.jpg"), im, [cv2.IMWRITE_JPEG_QUALITY, 92])
        print(f"{year}: frame #{n:03d}  t={(n - 1) / 10:.1f}s  change-vs-neighbour={score:.2f}")
        tile = crop_label(im)
        cv2.putText(tile, f"{year} -> #{n}", (6, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        tiles.append(tile)

    n, score = most_stable(*CHANGE)
    if n is not None:
        cv2.imwrite(os.path.join(OUT, "change_map.jpg"), cv2.imread(path(n)), [cv2.IMWRITE_JPEG_QUALITY, 92])
        print(f"change map: frame #{n:03d}  t={(n - 1) / 10:.1f}s  change-vs-neighbour={score:.2f}")

    if tiles:
        th, tw = tiles[0].shape[:2]
        tiles = [cv2.resize(t, (tw, th)) for t in tiles]
        cols = 3
        while len(tiles) % cols:
            tiles.append(np.zeros_like(tiles[0]))
        rows = [cv2.hconcat(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]
        cv2.imwrite(os.path.join("data", "verify_labels.jpg"), cv2.vconcat(rows), [cv2.IMWRITE_JPEG_QUALITY, 90])
        print("wrote data/verify_labels.jpg - open it and check each tile shows the year in its title")


if __name__ == "__main__":
    main()