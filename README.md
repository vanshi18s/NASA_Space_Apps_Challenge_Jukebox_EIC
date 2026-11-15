# Frequency_Vista: The Earth Information Jukebox

**NASA's Earth data was built to be seen. We made it something anyone can hear.**

Frequency_Vista turns NASA Earth Information Center visualizations into live, pleasant sound, so blind and low-vision users, and everyone else, can explore how our planet is changing by ear. A scan sweeps the world map from west to east, and what the planet looks like becomes what it sounds like.

Built by **Team Phoenix Flames** for the **2026 NASA International Space Apps Challenge**, challenge "The Earth Information Jukebox".

**Live demo:** https://YOUR-USERNAME.github.io/YOUR-REPO/
**Source code:** https://github.com/YOUR-USERNAME/YOUR-REPO
**2-minute demo video:** _add link_

<!-- Add a screenshot: docs/screenshot.png -->

## Why we built it

Most NASA Earth data is published as images and video. A blind person can't see where the lights of the world are, or how warm the oceans are. Sonification, turning data into non-speech sound, can open that data up. We wanted a tool that is **accurate first** (every sound traces back to a published rule), **usable without sight** (fully keyboard and screen-reader friendly), and **pleasant enough** that people want to keep listening.

## What it does

- **Two NASA datasets, one jukebox.** Choose a data story, a date, and press play.
- **Live sound.** The sound is generated in real time in your browser with the Web Audio API. There are no recordings and no audio files.
- **Fixed, comparable scales.** The same value always sounds the same, so 2012 and 2023 can be heard against each other.
- **Compare mode.** Hear the first date, then a later date, with short cue tones so you always know which one is playing.
- **A navigation system built for blind users.** One vertical menu with stepped, audible controls (see [Accessibility](#accessibility)).

## How the data becomes sound

A scan covers **70°N to 50°S** in **12 latitude bands** (10° each) and **256 scan steps** from west to east. Every dataset is turned into this same grid, so one shared sound engine treats them all the same way.

| Data property | Sound parameter |
|---|---|
| Latitude | Pitch, snapped to an A minor pentatonic scale from 110 Hz (50°S) to about 523 Hz (70°N). North is high, south is low. |
| Longitude | Time (the scan moves west to east) and stereo position (left ear to right ear). |
| Value in each cell (see below) | Loudness |
| Local peaks ("hubs") | A bell tone when the scan reaches them, louder for stronger peaks. At most 48 per map. |

### Night Lights ([SVS 5313](https://svs.gsfc.nasa.gov/5313/))

| Data | Sound |
|---|---|
| Share of lit pixels in a cell (Rec. 709 luminance, fixed floor and range) | Loudness, on a fixed scale where 10% lit is full loudness. Cells below a small threshold are true silence. |
| Bright hubs (local maxima over about 10° of longitude by 30° of latitude, above a fixed threshold) | Bell tones |
| Darker overall frame | Slightly darker tone (low-pass filter), so a dim year sounds subtly softer |

### Sea Surface Temperature ([SVS 3912](https://svs.gsfc.nasa.gov/3912/))

| Data | Sound |
|---|---|
| Colour of each pixel, converted to °C with a lookup table built from NASA's own colour bar | Loudness, on a fixed temperature range |
| Water temperature | Brightness of the tone: warmer water is brighter (a filter cutoff from 500 Hz at 0°C to 8,000 Hz at 32°C) |
| Warmest regions (hubs) | Bell tones ("warm-water bells") |
| Land and background | Skipped. Land is gray and the background is black, so neither counts as water. |

The spoken status also reports the approximate mean sea-surface temperature (50°S to 70°N, weighted by latitude) and how it differs from the first date.

### Compare mode

The first date plays, then a short gap, then the later date. One short cue tone marks the first scan and two higher cue tones mark the second. Both maps are shown stacked on screen, and the scan line moves over the one that is playing.

## Controls

| Control | What it does |
|---|---|
| **Choose a data story** | Night Lights or Sea Surface Temperature |
| **Explore mode** | Single year or date, or compare the first date with another |
| **Year or date** | Steps through the frames, with a rising tick for each step |
| **Playback speed** | 0.5×, 1×, 1.5× or 2× (a scan lasts 16 seconds at 1×) |
| **Sound intensity** | Soft, Medium or Full |

## Accessibility

Accessibility is the core of this project, not an add-on.

**Keyboard navigation** (one vertical menu):

| Key | Action |
|---|---|
| ↑ / ↓ | Move between controls. The tick rises in pitch as you go down the menu. |
| ← / → | Change the value of the selected control, in steps, with a tick. A low thud marks either end. |
| P or Space | Play or stop. On a focused button, Space still presses the button. |
| R | Replay from the start |
| Esc or H | Reset playback |
| L | Sound legend: a low tone (south) then a high tone (north) |
| D / M | Change dataset / change mode without moving focus |
| V | Turn self-voicing on or off |

**Other accessibility features:**

- **On-screen navigation pad** with large Up, Down, Less and More buttons, for mouse, touch and low-vision users. The selected control is highlighted, and a readout names it.
- **Speak first, then sound.** On play, the app announces what is about to play ("Playing. Night Lights, 2023."), and the sonification starts only after the announcement ends, so speech never talks over the data.
- **Self-voicing (off by default).** For people without a screen reader. It speaks the selected control and its value, and lowers the data sound while it speaks. Leave it off if you use a screen reader, so the two voices don't clash.
- **Screen readers.** Controls are native HTML (`<select>`, `<input type="range">`, `<button>`) with labels. Sliders announce words ("1.5x speed", "Medium") instead of bare numbers. A live status region announces changes, and the map has a text description that updates with the selected date.
- **Everything works with Tab alone.** If a screen reader captures the arrow keys, use Tab, or switch it to focus mode.
- **Low vision.** A skip link, a visible focus outline, high-contrast colours, and reduced-motion support.
- **Text always available.** Every spoken message also appears as text in the status line.

**User testing:** _Add feedback from a blind or low-vision tester here, with permission._

## Run it

The page reads image pixels, so it must be served over HTTP. Opening `index.html` by double-clicking will not work.

1. Clone the repository.
2. In VS Code, install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**.
3. Press **Tab** or **↓** to begin, then **P** to play.

The live demo on GitHub Pages is served over HTTPS, which browsers also require for audio.

## Why rules and not machine learning

The mapping is deterministic and published, so the same data always gives the same sound, and every sound can be traced to a formula. No machine learning is used. All analysis is plain pixel analysis in the browser, and the colour-to-temperature table is built offline from NASA's colour bar.

## Accuracy: what we checked, and the limits

- **Fixed scales, never auto-normalized**, so different years and dates are heard on the same scale.
- **The year label printed in NASA's night-lights video is never analysed.** The frame holds the world map twice side by side. We analyse only the left copy, and the small colour-bar sliver that crosses into it is masked.
- **Copies verified:** the two map copies differ by less than 1 grey level at a 1024 px shift.
- **Land versus lights:** gray land measures 36 or below on a 0 to 255 scale, and city lights start from about 40, so gray land is ignored.
- **Geo-registration:** the left map edge is at about −171.8° longitude, checked by overlaying 12 cities (expect about 3° of error). Latitude spans the full height linearly.
- **The 12 year frames** were picked automatically as the most stable frame near each year, then confirmed by reading the printed year on each.
- **Smoothing:** a 3-step moving average (1-2-1 weights), about 4° of longitude, makes the sound glide.

**Limits.**
- The frames are NASA's display-stretched visualizations, not calibrated measurements. The sound shows patterns and relative differences, not exact values.
- Sea-surface temperatures are read from colours, so they are approximate. The visible current-flow lines are not sonified.
- Year-to-year change in the night lights is small. The 2012 versus 2023 comparison is where the difference is clearest.
- The musical scale, the tones and the bell sound are artistic choices. What is loud, high, bright or ringing comes from the data.

## Datasets

| Dataset | Status |
|---|---|
| Night Lights, 2012 to 2023 ([SVS 5313](https://svs.gsfc.nasa.gov/5313/)) | Working |
| Global Sea Surface Currents and Temperature ([SVS 3912](https://svs.gsfc.nasa.gov/3912/)) | Working |

Each dataset is one entry in `DATASETS` in `js/sonify.js` (frames, crop, masks, analysis type).

## Roadmap

- **Change mode:** hear only the difference between two dates, with rising tones where there is more and falling tones where there is less. The engine already supports it (`Sonify.diff`); it is not yet in the interface.
- **Story mode:** a guided tour with text captions and optional narration, from the 2012 night lights to the warming ocean.
- **Validation page:** a synthetic gradient (must sweep upward), a blank image (must be silent), and a known bright city (must give the expected pitch).
- **More datasets:** Lightning from the ISS ([SVS 5011](https://svs.gsfc.nasa.gov/5011/)), GEOS Aerosols ([SVS 5669](https://svs.gsfc.nasa.gov/5669/)), DYAMOND CO₂ ([SVS 5196](https://svs.gsfc.nasa.gov/5196/)), GEDI Forest Height ([SVS 4950](https://svs.gsfc.nasa.gov/4950/)).

## Repository layout

```
index.html                    the app (layout, controls, keyboard navigation)
js/sonify.js                  sonification logic: settings, analysis, audio engine
data/nightlights/keyframes/   year_2012.jpg ... year_2023.jpg (frames from NASA SVS)
data/ocean/                   keyframes, config.json, lut.json (colour-to-temperature table)
tools/                        offline data preparation (Python)
  extract_series.py             cut frames from the NASA video
  contact_sheet.py              make labelled review sheets
  pick_keyframes.py             choose the most stable frame per year
  build_lut.py                  build the colour-to-temperature table from NASA's colour bar
CREDITS.md                    NASA credit lines for each dataset
```

Data preparation: download the SVS video, run `extract_series.py`, then `contact_sheet.py`, then `pick_keyframes.py`. Frames are cropped and analysed in the browser.

## Credits and references

- NASA Scientific Visualization Studio, [Change in Night Lights between 2012 and 2023 – EIC Version (SVS 5313)](https://svs.gsfc.nasa.gov/5313/), based on NASA [Black Marble](https://blackmarble.gsfc.nasa.gov/) (Suomi NPP VIIRS).
- NASA Scientific Visualization Studio, [Global Sea Surface Currents and Temperature (SVS 3912)](https://svs.gsfc.nasa.gov/3912/), from the ECCO2 model.
- NASA [Earth Information Center](https://svs.gsfc.nasa.gov/gallery/earth-information-center/) content database.
- Web Audio API and Web Speech API (browser built-ins), OpenCV (`opencv-python`), Python.
- Fonts: [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), SIL Open Font License.

## Use of AI

Code (including the keyboard and audio navigation system), documentation and submission text were written with assistance from **Claude (Anthropic)**, then run, measured and checked by the team against NASA's frames. All sound is synthesized live in the browser with the Web Audio API. No audio recordings, samples or AI-generated audio files are used. Self-voicing uses the browser's built-in speech synthesis. No images or videos were AI-generated.

## Disclaimer

Frequency_Vista is an independent project made for the NASA International Space Apps Challenge. NASA does not endorse this project or any non-U.S. Government entity and is not responsible for the content of non-U.S. Government websites. Do not use it for scientific analysis or safety decisions.

## License

See [LICENSE](LICENSE).
