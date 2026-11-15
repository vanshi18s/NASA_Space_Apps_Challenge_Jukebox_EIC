# Earth Jukebox

**NASA's Earth data was built to be seen. We made it something anyone can hear.**

Earth Jukebox turns NASA Earth Information Center (EIC) visualizations into live, pleasant sound, so blind and low-vision users, and everyone else, can explore how our planet is changing by ear. Built for the **2026 NASA International Space Apps Challenge**, challenge "The Earth Information Jukebox".

**Live demo:** https://YOUR-USERNAME.github.io/YOUR-REPO/
**Source code:** https://github.com/YOUR-USERNAME/YOUR-REPO

<!-- Add a screenshot: docs/screenshot.png -->

## What it does

A scan sweeps the world map from west to east while the sound plays:

| Data property | Sound parameter |
|---|---|
| Latitude (70°N to 50°S, 12 bands) | Pitch, in an A minor pentatonic scale (north high, south low) |
| Density and brightness of lights | Loudness, on one fixed scale for every year |
| Longitude | Scan time and stereo position (left ear to right ear) |
| Brightest local clusters ("bright hubs") | A bell tone when the scan reaches them, louder for brighter hubs |

On the map, a gold bar follows the scan. The glow beside it shows the loudness of each latitude band, and each bright hub flashes a ring and stays marked.

**Modes:** Single year (2012 to 2023) and Compare 2012 and 2023 (both maps shown, scanned one after the other with one blip for 2012 and two for 2023). Speed and intensity are adjustable.

## Run it

The page reads image pixels, so it must be served over HTTP, not opened as a file.

1. Clone the repo.
2. In VS Code, install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**.
3. Press **Space** to play.

Keyboard: `Space` play or stop, `H` home, `I` read current settings. Sliders and menus are native HTML controls, so screen readers work out of the box. Sliders move in steps with a rising tick, and a low thud marks each end.

## Why rules and not machine learning

The mapping is deterministic and published, so the same data always gives the same sound and every sound can be traced back to a formula. No ML is used. All analysis is plain pixel analysis (OpenCV offline for frame extraction, the browser canvas at run time).

## Accuracy: what we checked, and the limits

- **Fixed scales, never auto-normalized**, so 2012 and 2023 are heard on the same scale.
- **The year label printed in NASA's video is never analysed.** The frame holds the world map twice side by side. We analyse only the left copy; the label sits in the right copy. We measured it at x 1062 to 1106 in the 2048 px frame. The small colour-bar sliver that crosses into the left copy is also masked.
- **Copies verified:** the two map copies differ by less than 1 grey level at a 1024 px shift.
- **Land versus lights:** gray land measured at 36 or below on a 0 to 255 scale, city lights from about 40 upward, so gray land is ignored.
- **Geo-registration:** the left map edge is about -171.8° longitude, checked by overlaying 12 cities (expect about 3° of error). Latitude spans the full height linearly.
- **The 12 year frames** were picked automatically as the most stable frame near each year, then confirmed by reading the printed year on each.
- **Smoothing:** a 3-column moving average (about 1° of longitude) makes the sound glide.

**Limits.** The frames are NASA's display-stretched visualization, not calibrated radiance, so the sound shows patterns and relative differences, not exact values. The musical scale and tones are artistic choices; what is loud, high or ringing comes from the data. Year-to-year changes are small in the real data; the 2012 versus 2023 comparison is where the difference is clearest.

## Datasets

| Dataset | Status |
|---|---|
| Night Lights 2012 to 2023 ([SVS 5313](https://svs.gsfc.nasa.gov/5313/)) | Working |
| Lightning from the ISS ([SVS 5011](https://svs.gsfc.nasa.gov/5011/)) | Planned |
| GEOS Aerosols ([SVS 5669](https://svs.gsfc.nasa.gov/5669/)) | Planned |
| DYAMOND Global CO₂ ([SVS 5196](https://svs.gsfc.nasa.gov/5196/)) | Planned |
| Perpetual Ocean 2 ([SVS 5425](https://svs.gsfc.nasa.gov/5425/)) | Planned |
| GEDI Forest Height ([SVS 4950](https://svs.gsfc.nasa.gov/4950/)) | Planned |

Each dataset is meant to turn its image into the same grid (12 latitude bands by 256 scan steps), so one shared mapper treats every dataset the same way. Only the extractor and the instrument tone change per dataset. See `DATASETS` in `js/sonify.js`.

## Repository layout

```
index.html               the app (layout and controls)
js/sonify.js             all sonification logic: settings, analysis, audio engine
data/nightlights/keyframes/   year_2012.jpg ... year_2023.jpg (frames from NASA SVS)
nightlights.config.json  measured layout, masks and geo-registration
tools/                   offline data preparation
  extract_series.py        cut frames from the NASA video
  contact_sheet.py         make labelled review sheets
  pick_keyframes.py        choose the most stable frame per year
  fetch_svs.py             optional: find and download SVS media
```

Data preparation: download the SVS 5313 video, run `extract_series.py`, then `contact_sheet.py`, then `pick_keyframes.py`. Frames are cropped and analysed in the browser.

## Credits and references

- NASA Scientific Visualization Studio, [Change in Night Lights between 2012 and 2023 – EIC Version (SVS 5313)](https://svs.gsfc.nasa.gov/5313/), based on NASA [Black Marble](https://blackmarble.gsfc.nasa.gov/) (Suomi NPP VIIRS).
- NASA [Earth Information Center](https://svs.gsfc.nasa.gov/gallery/earth-information-center/) content database.
- Approach inspired by NASA's [Data Sonification: Caldwell 73](https://svs.gsfc.nasa.gov/13786/).
- Web Audio API (W3C), OpenCV (`opencv-python`), Python.
- Fonts: [Atkinson Hyperlegible](https://fonts.google.com/specimen/Atkinson+Hyperlegible) (Braille Institute) and [Unbounded](https://fonts.google.com/specimen/Unbounded), SIL Open Font License.

## Use of AI

Code, documentation and submission text were written with assistance from **Claude (Anthropic)**, then run, measured and checked by the team against NASA's frames. All sound is synthesized live in the browser by that code with the Web Audio API; no audio recordings, samples or AI-generated audio files are used. No images or videos were AI-generated.

## Disclaimer

Earth Jukebox is an independent project made for the NASA International Space Apps Challenge. NASA does not endorse this project or any non-U.S. Government entity and is not responsible for the content of non-U.S. Government websites. Do not use it for scientific analysis or safety decisions.

## License

See [LICENSE](LICENSE).
