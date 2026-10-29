# Community Noise Map

A citizen science app: a phone-based sound level meter that maps noise in a community. Surveyors record a reading, tag the source (church, mosque, event, traffic and so on) and its location, and each reading appears on a shared map coloured by loudness and checked against Ghana EPA noise limits.

The interface is a dashboard: a TC-1 cassette recorder in the centre and a live map on the right, with an icon rail (a bottom tab bar on phones) for Recorder, Tag, Readings and Settings.

It runs entirely in the browser. There is no server, no account and no build step.

## Features

- **Cassette meter**: tap the record button (or the cassette) and the cassette slides into the TC-1 recorder, the glass door closes, REC and PLAY press down and recording starts; tap again to stop and the cassette ejects. The cassette label is a watch-style dial: the long hand shows the level now, the short hand the recording's average (Leq), and ticks past the legal limit are red. While recording, sound ripples pulse out in the loudness colour, the tape runs, the REC lamp glows and the tape winds across as you approach 60 seconds.
- **Highlights**: live tiles for the level now (with a 15-second sound graph), average, time (progress ring to 60 s), peak (per-second bars), background, and a verdict tile that says how far over or under the legal limit the recording is.
- **Survey readings**: Leq (energy average), Max and L90 (background) over each recording.
- **Live map**: OpenStreetMap streets or Esri satellite imagery. Each source is a category icon (church, mosque, music, car…) with its average dB. Tap the counters to filter by type, search by name, and tap a source to open its details: average, peak, visits, a dial against the limit and an open-air estimate of how far away it likely breaks the limit.
- **You → nearest**: with GPS on, a dashed route and distance point from you to the nearest noise source.
- **Automatic location**: while the microphone is on, the app follows your phone's GPS (blue dot) and pins each reading where you recorded it. Tap the map to place a pin by hand instead.
- **Limits**: Ghana EPA ambient noise levels in dB(A). Residential is 55 by day (6am–10pm) and 48 at night. Health & schools, mixed-use and commercial zones are also available.
- **By-source summary**: ranks each church or other source by average level and counts how often it exceeded the limit.
- **Export & import**: CSV and GeoJSON. Combine several surveyors' files into one map; duplicates are skipped. GeoJSON opens in QGIS or Google My Maps.
- **Installable & offline**: add it to the home screen. It opens without a connection and keeps map tiles you have already viewed.

## Use it

Open the GitHub Pages link for this repo on a phone, then:

1. Stand where residents are exposed (a doorway or the street, not under the speaker).
2. Tap the red record button, allow microphone and location access, and record for 30–60 seconds. Tap again to stop.
3. Enter the source name, type and distance, then **Save reading**. Your GPS location is added automatically; tap the map if you want to move the pin.

The microphone and GPS only work over HTTPS. GitHub Pages provides that automatically.

## Calibrate before fieldwork

Phone microphones vary by several dB, so readings start out uncalibrated. Hold each phone beside a real sound level meter, open **Settings & calibration**, and adjust the offset until the two match. Write the offset down for each phone. Uncalibrated readings are fine for comparing places; for evidence, calibrate and follow up hotspots with a certified meter.

## Data and privacy

Readings stay in each phone's browser storage until they are exported. Clearing browser data deletes them, so export CSV after each survey session.

## Deploying your own copy

1. Fork or copy this repo.
2. Go to **Settings → Pages**, set **Source** to *Deploy from a branch*, then choose `main` and `/ (root)`.
3. Your app will be at `https://<your-username>.github.io/<repo-name>/`.

When you change `index.html`, also bump `VERSION` in `sw.js` so installed copies pick up the update.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app: meter, map, tables, export |
| `manifest.webmanifest` | App name, colours and icons for installing |
| `sw.js` | Service worker for offline use |
| `icons/` | App and home-screen icons |
| `vendor/leaflet/` | Leaflet 1.9.4 map library (BSD-2-Clause), bundled so the app works offline |

Built with [Leaflet](https://leafletjs.com/) and [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles.

## License

MIT
