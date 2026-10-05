# API reference · เอกสาร API

Three endpoints, all `GET`, no keys, no accounts. They exist to serve the site; you may read them for learning, politely.

The blocks below are **shape**, not a fact: `version` changes on every deploy and `counts` move every time the catalogue refreshes (tens of cameras a day come and go). Read them for the structure, then run the `curl` above the block for today's numbers.

[← Handbook](../README.md) · Code: [`server/index.js`](../../server/index.js)

> **Be polite.** The cameras belong to road agencies and city halls. Do not bulk-download frames or work around the limits; for data, ask the camera's owner. See [/legal](https://vision.nonarkara.org/legal).

---

## `GET /api/cameras` — the catalogue

```bash
curl -sS --compressed https://vision.nonarkara.org/api/cameras | python3 -m json.tool | head -40
```

```json
{
  "version": "1.2.0",
  "loadedAt": "2026-10-05T09:31:12.257Z",
  "upstreamAt": "2026-10-05T03:58:21.4Z",
  "origin": "flooddash",
  "counts": { "video": 53, "still": 2675, "view": 857, "off": 477, "total": 4062 },
  "sources": [
    { "id": "gistda", "th": "GISTDA · BMA / ทล. / iTIC", "en": "GISTDA · BMA / DOH / iTIC", "count": 956, "status": "live" }
  ],
  "cameras": [
    {
      "id": "gistda:ITICM_BMAMI0076", "src": "gistda",
      "th": "ถนนสาทรหน้าสถานเอกอัครราชทูตเยอรมนี", "en": "", "loc": "",
      "lat": 13.72539, "lng": 100.5426, "k": "video",
      "v": "https://camera1.iticfoundation.org/hls/10.8.0.15_8552.m3u8",
      "w": "https://floodcheck.gistda.or.th/"
    }
  ]
}
```

| Top-level field | Meaning |
|---|---|
| `version` | the site version serving this response |
| `loadedAt` | when this server last adopted a catalogue |
| `upstreamAt` | when FloodDash built it |
| `origin` | `flooddash` (fresh) or `disk` (FloodDash unreachable; last good copy) |
| `counts` | cameras per kind, and total |
| `sources` | the 7 owners/carriers, their counts and status |

| Camera field | Always? | Meaning |
|---|---|---|
| `id` | yes | `source:native-id`, stable across refreshes |
| `src` | yes | `gistda` · `itic` · `nst` · `pakkret` · `rangsit` · `dwr` · `maholan` |
| `th`, `en` | yes | names as the owner wrote them; `en` often empty (never machine-translated) |
| `loc` | yes | road or district context, often empty |
| `lat`, `lng` | yes | rounded to 5 decimals (~1 m) |
| `k` | yes | `video` · `still` · `view` · `off` — see [architecture](../system/architecture.md#3-classifying-a-camera) |
| `v` | video only | HLS playlist; the browser plays it directly from the owner |
| `w` | usually | a page at the owner's site, for credit and checking |
| `face` | sometimes | what the camera faces, only when its own name says so |
| `f` | sometimes | `1` when the owner flags the camera as flooded |
| `h` | stills, after a look | `1` the relay got a frame this session · `0` it failed |

Headers: `Cache-Control: public, max-age=60`; gzip when accepted. The body is rebuilt at most once a minute.
Limit: 300 requests/min per client, burst 120 → `429 {"error":"too many requests"}` with `Retry-After: 10`.

## `GET /api/frame?id=<camera id>` — one still, relayed

Only for cameras with `k: "still"`. The server looks the URL up itself; the request carries only the id. Details: [the relay](../system/relay.md).

```bash
curl -sS -D - -o frame.jpg "https://vision.nonarkara.org/api/frame?id=dwr:dwr-TA020510"
```

```
HTTP/2 200
content-type: image/jpeg
content-length: 139037
cache-control: private, max-age=20
x-content-type-options: nosniff
x-frame-age-ms: 0
```

`x-frame-age-ms` is how long the frame had been in the relay's memory (0 = fetched just now; at most 30,000).

| Status | Body | Meaning |
|---|---|---|
| 200 | image bytes | `image/jpeg`, `image/png` or `image/webp`, ≤ 4 MB |
| 400 | `{"error":"missing camera id"}` | no `id` (or longer than 160 characters) |
| 404 | `{"error":"not a relayable camera"}` | id not in the catalogue, or not a `still` |
| 429 | `{"error":"too many frames — the cameras belong to other people; please slow down"}` | > 600 frames/min (burst 200); `Retry-After: 20` |
| 502 | `{"error":"upstream answered 502"}` · `"…not an image"` · `"frame too large"` · `"frame too small to be a picture"` | the owner's host misbehaved |
| 503 | `{"error":"upstream <host> is resting after repeated failures"}` | circuit breaker open (3 min) |
| 504 | `{"error":"upstream did not answer in time"}` · `"upstream unreachable"` | timeout (9 s) or network error |

## `GET /api/health` — is it working?

```bash
curl -sS https://vision.nonarkara.org/api/health | python3 -m json.tool
```

```json
{
  "ok": true, "version": "1.2.0", "uptime_s": 14395,
  "catalogue": { "origin": "flooddash", "loadedAt": "…", "upstreamAt": "…",
                 "video": 53, "still": 2675, "view": 857, "off": 477, "total": 4062 },
  "relay": { "cached_frames": 0, "inflight": 0, "waiting": 0, "checked_cameras": 0,
             "last_ok": 0, "last_failed": 0, "resting_hosts": [] },
  "memory_mb": 21
}
```

`ok` is `true` when the catalogue holds at least one camera. How to read every field: [operations](../system/operations.md#4-health).

## Pages

| Path | Room |
|---|---|
| `/` | home: one camera, five lenses |
| `/learn` | eight chapters with live instruments |
| `/cameras` | map, studio, census |
| `/train` | teach a model; judge the country |
| `/games` | count race · fewest pixels · fool the machine |
| `/everyday` | computer vision in daily life |
| `/research` | papers, models, open questions |
| `/system` | live diagrams and health |
| `/legal` | the fine print |
| `/story` | the control rooms, the makers |

Append `?source=mine` to any room's URL to start on your own camera.

## The trained-layer file

What /train downloads (format `vision.nonarkara.org/train-layer`, version 1):

```json
{
  "format": "vision.nonarkara.org/train-layer",
  "version": 1,
  "created": "2026-10-05T04:12:00.000Z",
  "embedder": "MobileNetV2 1.0/224, average-pool features (1,280 numbers)",
  "examples": 30,
  "epochs": 200,
  "names": [["รถแน่น", "Busy road"], ["ถนนโล่ง", "Empty road"]],
  "dim": 1280,
  "classes": 2,
  "W": [/* 2,560 numbers: class-major, W[c * 1280 + i] */],
  "b": [/* 2 numbers */]
}
```

To use it elsewhere: compute a MobileNetV2 1.0/224 average-pool embedding of a frame (inputs scaled to 0–1, bilinear resize to 224 × 224), then `score_c = b[c] + Σ W[c·1280 + i] · x[i]` and a softmax. Note the site's learner L2-normalises embeddings before training — do the same to the input. Exact code: `createLayer().predict` in [`learner.js`](../../public/js/ml/learner.js).
