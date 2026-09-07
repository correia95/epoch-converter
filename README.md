# epoch-converter

Epoch & Unix Timestamp Converter. Paste a timestamp (seconds, milliseconds,
microseconds or nanoseconds — auto-detected by digit count) or a date string, and
get the local time, UTC, ISO 8601, RFC 2822, all four timestamp units, relative
time and a few extras (day of year, ISO week, leap year). Live "current Unix
time" clock. Entirely client-side; the value is mirrored to `?t=` for sharing.

**Live:** https://epoch-converter.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker

## Engine

[`src/epoch.ts`](src/epoch.ts): `detectUnit` (magnitude heuristic), `toDate` /
`fromDate` (unit-aware), `parseInput` (integer / decimal / date-string), plus
formatters (`isoLocal` with real offset, `humanUtc`, `rfc2822`, `relativeFrom`)
and `extras` (day-of-year, ISO-8601 week, leap year). Verified in Node against
known instants (epoch 0, negative values, 2038, decimal seconds).

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
