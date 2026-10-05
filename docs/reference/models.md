# Model cards · บัตรข้อมูลโมเดล

What runs on vision.nonarkara.org, what it learned from, what it is good and bad at, and what it must not be used for. Format after Mitchell et al., "Model Cards for Model Reporting" (2019).

[← Handbook](../README.md)

---

## 1. Object detector — SSDLite + MobileNetV2 (COCO)

| | |
|---|---|
| **Used for** | every box on the site: home lens 5, /learn ch. 7–8, /cameras census, /games, /story |
| **Architecture** | SSDLite head (depthwise-separable SSD) on a MobileNetV2 backbone — Liu et al. 2016; Sandler et al. 2018 |
| **Origin** | TensorFlow Object Detection API model zoo, converted for TF.js: `storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/` (same weights as `@tensorflow-models/coco-ssd`'s `lite_mobilenet_v2`) |
| **Licence** | Apache-2.0 |
| **Hosted at** | `/models/ssdlite_mobilenet_v2/` · 18 MB · 5 shards (renamed `.bin` for edge caching) |
| **Input** | `image_tensor`, int32 `[1, H, W, 3]`, any size; resized **inside the graph to 300 × 300**, aspect ratio not kept |
| **Output** | 1,917 anchor boxes × 90 COCO class scores (sigmoid) + box coordinates; we keep the best class per box, drop below `minScore`, NMS at IoU 0.5 |
| **Classes** | 80 COCO categories (ids to 90 with gaps); Thai names ours — [`labels.js`](../../public/js/ml/labels.js) |
| **Published accuracy** | 22.1 mAP on COCO (Sandler et al. 2018, Table 6), ~4.3 M weights, ~0.8 B multiply-adds |
| **Speed in browser** | typically tens to a few hundred milliseconds per frame on WebGL, device-dependent (the site prints its own timing) |

**Good at:** large, clear, centred everyday objects — cars, buses, people, bicycles, motorcycles — in daylight.

**Known weaknesses (observed and expected):**
- small and distant objects (300 × 300 squeeze; see [06](../06-object-detection.md#the-300--300-squeeze-and-why-far-away-things-vanish));
- night, rain, fog, glare, heavy compression;
- vehicles without a COCO class: tuk-tuks, song-thaews, carts, many trucks — reported as "car"/"truck" or missed;
- tall thin objects as "person" (lamp posts), reflective water as "boat";
- crowded scenes: NMS merges neighbours;
- COCO's images are mostly Western consumer photos, not Thai CCTV from poles.

**Out of scope — do not use for:** counting people for safety decisions; enforcement against individuals; any claim that an area is empty or safe; identifying anyone.

## 2. Embedder — MobileNetV2 1.0 / 224 (ImageNet)

| | |
|---|---|
| **Used for** | the 1,280-number fingerprint behind /train (k-NN, trained layer, PCA map, judge) |
| **Architecture** | MobileNetV2, width 1.0, input 224 — Sandler et al. 2018 |
| **Origin** | TF Hub ImageNet classification module, converted for TF.js: `storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/` |
| **Licence** | Apache-2.0 (weights). Training images: ImageNet's terms (non-commercial research) — see the [licensing audit](../system/cvaas-blueprint.md#4-the-licensing-audit-to-finish-with-counsel-before-any-sale) |
| **Hosted at** | `/models/mobilenet_v2_1.0_224/` · 14 MB · 4 shards |
| **Input** | `images`, float32 `[1, 224, 224, 3]`, values 0–1 (we divide by 255 and resize bilinearly) |
| **Outputs used** | `module_apply_default/MobilenetV2/Logits/AvgPool` → 1,280 numbers (L2-normalised before learning). The 1,001-way logits (`…/Logits/output`) are available in code but not shown on the site |
| **Published accuracy** | 72.0% ImageNet top-1, 3.4 M weights, ~300 M multiply-adds |

**Good at:** producing general-purpose features that separate everyday visual categories with few examples.

**Known weaknesses:** features reflect ImageNet's photo style; fine distinctions that ImageNet never needed (wet vs dry asphalt, light vs heavy rain) may be weak; the [shortcut-learning](../07-transfer-learning.md#6-the-trap-shortcut-learning) trap.

**Out of scope:** recognising specific people (the site has no "me / not me" preset, deliberately); medical or safety classification.

## 3. Your trained layer (made on /train)

| | |
|---|---|
| **What** | softmax regression on the embedder's 1,280 numbers; K = 2–4 classes; 1,280·K + K weights |
| **Trained by** | full-batch gradient descent with Adam (lr 0.01, L2 1e-4), 200 passes, in plain JavaScript — [`createLayer`](../../public/js/ml/learner.js) |
| **Data** | your examples (≤ 100 per class), held only in the tab's memory |
| **Evaluation shown** | leave-one-out accuracy (k-NN, k = 5) as you add examples; the judge run on 24 unseen public cameras, answers < 70% marked unsure |
| **Export** | JSON, format `vision.nonarkara.org/train-layer` — [API reference](api.md#the-trained-layer-file) |
| **Caveat** | measured only on your own examples unless you judge it on new cameras; expect lower accuracy elsewhere |

## 4. Classical "models" — every hand-chosen number

Not learned, but they are models of the world too, and they deserve cards:

| Number | Value | Where | Meaning |
|---|---|---|---|
| luma weights | 0.299 / 0.587 / 0.114 | `ops.luma` | ITU-R BT.601 brightness |
| motion delta | 22 (slider 4–80 on /learn) | `lenses.motion` | brightness change that counts as motion |
| motion min area | 10 px at 192 px wide | `lenses.motion` | smaller blobs are noise |
| attention share | 0.4% of pixels | `story/wall.js` | below this a screen is "quiet" |
| live minScore | 0.30 | lenses, census | detections shown by default |
| game floor | 0.15 | `games/common.js` | gray "almost saw it" boxes |
| commit | 0.50 | fewest-pixels game | the detector's guess counts |
| NMS IoU | 0.50 | `detector.js` | overlap that makes a duplicate |
| judge "sure" | 0.70 | `train/judge.js` | below this an answer is "unsure" |
| haze test | mean ≥ 120, spread ≤ 34, saturation ≤ 26 | `ops.readFrame` | "washed out" (fog, wet lens, bright sky) — after FloodDash's `detect.js` |

---

### สรุปภาษาไทย

เว็บไซต์ใช้โมเดลสองตัวและชั้นที่ผู้ใช้ฝึกเอง:

1. **ตัวตรวจจับวัตถุ SSDLite + MobileNetV2** ฝึกจาก COCO (80 ประเภท) ขนาด 18 MB ภาพถูกบีบเป็น 300×300 ภายในโมเดล เก่งกับวัตถุใหญ่ชัดเจนในที่สว่าง แต่พลาดกับวัตถุเล็ก กลางคืน ฝน และพาหนะที่ COCO ไม่รู้จักอย่าง ตุ๊กตุ๊ก สองแถว **ห้ามใช้** ตัดสินเรื่องความปลอดภัยหรือระบุตัวบุคคล
2. **ตัวสร้างลายนิ้วมือ MobileNetV2** ฝึกจาก ImageNet ขนาด 14 MB ให้ตัวเลข 1,280 ตัวต่อภาพ ใช้ในห้อง /train
3. **ชั้นที่คุณฝึก** บนตัวเลข 1,280 ตัว ด้วยโค้ด JavaScript ล้วน อยู่ในหน่วยความจำของแท็บเท่านั้น ดาวน์โหลดเป็นไฟล์ JSON ได้

ตัวเลขทุกตัวที่คนเลือกเอง (เช่น เกณฑ์การเคลื่อนไหว 22 เกณฑ์ความมั่นใจ 0.3) ก็ถือเป็น "โมเดล" ของโลกเช่นกัน จึงมีตารางระบุไว้ทั้งหมด
