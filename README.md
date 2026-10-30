# Noise Map: community noise walks

Map the sound of your streets, one walk at a time. Like Strava, but for noise: start a walk, and your phone's microphone measures sound while GPS draws your route. Every few seconds a point is mapped, coloured by loudness and checked against Ghana EPA noise limits. Share the walk to a community map, give kudos, claim squares, unlock badges and climb the weekly leaderboard.

## How it works

1. **Start walk.** Allow the microphone and location. Hold the phone in your hand (not your pocket), mic uncovered.
2. **Walk.** The radial meter shows the level now. Your trail draws on the map, and a point is mapped every 5 seconds or 15 metres (energy-averaged Leq). Tap **Pin source** to mark what you hear: traffic, music & speakers, construction, generators, markets, worship, animals or quiet nature.
3. **Finish** (tap twice). See your distance, time, average and loudest levels, % of the route over the legal limit, new squares and badges. Then **Save & share** to put it on the community map, or make a share-card image.

## Features

- **Community feed**: everyone's walks with mini trail maps, stats and kudos.
- **Weekly leaderboard**: by distance, squares or walks over the last 7 days.
- **Squares**: the map is split into ~160 m squares. Walk new streets to claim them (lime = yours).
- **Badges & streaks**: First steps, 5 km club, Marathon mapper, Night owl, Early bird, Quiet hunter, Storm chaser, Explorer, On a roll and more.
- **You**: totals, 8-week distance chart, records, your walks and settings.
- **Did you know?**: sourced facts on noise and health (WHO, NIOSH) and Ghana's limits (GS 1222:2018).
- **Walk audio**: the sound of the walk is kept in memory for playback and download. It is never uploaded.
- **Works offline**: walks finished offline are saved on the phone and upload automatically later. If the app closes mid-walk, you can recover it.
- **Installable**: add it to your home screen.

## Limits

Ghana EPA ambient noise limits in dB(A). Residential is 55 by day (6am–10pm) and 48 at night. Choose schools/health, mixed-use or commercial under You → Settings.

## Privacy

- You join with just a walker name and emoji (an anonymous account, no email).
- By default the first and last 150 m of each walk are hidden before it is shared, so your home isn't on the map.
- Audio is never uploaded.

## Calibrate

Phone microphones vary by several dB. Hold your phone beside a real sound level meter and adjust the calibration offset under You → Settings until they match.

## Backend

Walks, profiles and kudos are stored in [Supabase](https://supabase.com) (Postgres with row-level security: anyone can read; you can only write your own rows). In the Supabase dashboard, **Authentication → Sign In / Providers → Allow anonymous sign-ins** must be on.

## Files

| File | Purpose |
|---|---|
| `index.html` | Layout and styles |
| `app.js` | Walk engine, meter, map, feed, leaderboard, badges |
| `sw.js` | Service worker for offline use (bump `VERSION` on every change) |
| `manifest.webmanifest`, `icons/` | Install metadata |
| `vendor/leaflet/` | Leaflet 1.9.4 (BSD-2-Clause) |
| `vendor/supabase/` | supabase-js 2 (MIT) |

Maps © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors; imagery © Esri.

## License

MIT
