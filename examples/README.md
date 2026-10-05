# Examples · ตัวอย่างที่รันได้

Eight lessons you can run with nothing but Node 22. No `npm install`, no packages, no GPU. Each one imports the **same functions the website runs** — [`public/js/cv/ops.js`](../public/js/cv/ops.js) and [`public/js/ml/learner.js`](../public/js/ml/learner.js) — prints its working in the terminal, and writes pictures to `examples/out/`.

```bash
node examples/01-pixels.mjs
```

| Lesson | Run | You will see | Chapter |
|---|---|---|---|
| 01 · Pixels | `node examples/01-pixels.mjs` | the scene as text art, the real numbers under a car, RGB → brightness, resolution thrown away | [01](../docs/01-pictures-are-numbers.md) |
| 02 · Thresholds | `node examples/02-threshold.mjs` | a histogram, Otsu choosing 103, grayscale erasing a red car, a colour rule finding it exactly | [02](../docs/02-colour-and-thresholds.md) |
| 03 · Convolution | `node examples/03-convolution.mjs` | one 3×3 step worked by hand (= 588), seven kernels, Sobel as text art | [03](../docs/03-convolution-and-edges.md) |
| 04 · Motion | `node examples/04-motion.mjs` | frame differencing, nine regions for three vehicles, the noise-vs-threshold table | [04](../docs/04-motion.md) |
| 05 · Detection | `node examples/05-detection-nms.mjs` | best class per box, IoU, non-maximum suppression, benchmark-style scoring of every box | [06](../docs/06-object-detection.md) |
| 06 · Precision & recall | `node examples/06-precision-recall.mjs` | the confidence slider's price list, a PR curve, average precision, who gets missed | [06](../docs/06-object-detection.md) |
| 07 · Transfer learning | `node examples/07-transfer-learning.mjs` | k-NN, a learning curve, a trained layer's loss falling, PCA, and shortcut learning at 0% | [07](../docs/07-transfer-learning.md) |
| 08 · The catalogue | `node examples/08-catalogue.mjs` | today's cameras by kind and owner, one record field by field, a text map of Thailand | [08](../docs/08-limits-and-ethics.md) |

Lesson 08 makes **one** request to the live site (`BASE=http://localhost:8431` to use a dev server instead). Every other lesson is offline.

## Why synthetic scenes

The pictures here are drawn by [`shared/scene.mjs`](shared/scene.mjs): a road, a lamp post, two cars, a motorcycle, a puddle, and camera noise. Two reasons:

1. **No real camera frames in a public repository.** Real frames contain real people. This project keeps no camera imagery, and its examples should not either.
2. **An answer key.** In a drawn scene we know exactly where every car is, so every claim — "nine regions for three vehicles", "the red car fades first" — can be checked against the truth. A real frame never tells you that.

## Rebuilding the documentation's figures

```bash
node examples/build-figures.mjs      # writes docs/img/*.png from lessons 01–05 and 07
```

Every PNG in `docs/img/` is the output of these scripts. The SVG diagrams (`pipeline`, `convolution`, `mobilenet`, `transfer`, `trust-boundary`) are hand-drawn, with numbers taken from the lessons and the papers they cite.

## Keeping the docs honest

`tests/examples.test.js` runs lessons 01–07 and checks the numbers the handbook quotes (Otsu's 103, the 588 convolution sum, nine motion regions, the shortcut-learning collapse, and others). If a change to `ops.js` or `learner.js` moves a number, the test fails and points at the paragraph to update.

## Shared helpers

| File | What |
|---|---|
| [`shared/scene.mjs`](shared/scene.mjs) | the synthetic road scene, its answer key (`carsAt(t)`), night and fog variants |
| [`shared/png.mjs`](shared/png.mjs) | a 40-line PNG writer (signature, IHDR, IDAT, IEND, CRC-32) — itself a small lesson |
| [`shared/ascii.mjs`](shared/ascii.mjs) | text art, number grids, histograms, line charts, scatter plots |
| [`shared/draw.mjs`](shared/draw.mjs) | boxes, tints and layouts on raw RGBA arrays |
| [`shared/out.mjs`](shared/out.mjs) | where pictures are written (`FIG_DIR` overrides) |

---

**ภาษาไทย:** ตัวอย่างทั้งแปดบทรันได้ด้วย Node 22 อย่างเดียว ไม่ต้องติดตั้งอะไร ทุกบทใช้ฟังก์ชันเดียวกับที่เว็บไซต์ใช้จริง พิมพ์ขั้นตอนการคำนวณออกมาทางหน้าจอ และสร้างภาพไว้ใน `examples/out/` ภาพทั้งหมดเป็นฉากถนนที่วาดขึ้น ไม่ใช่ภาพจากกล้องจริง เพื่อไม่ให้มีภาพบุคคลจริงในที่เก็บโค้ดสาธารณะ และเพื่อให้มี "เฉลย" ตรวจสอบได้ทุกตัวเลข
