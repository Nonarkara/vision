# Superpowers · ความสามารถถัดไปของ Vision

The execution strategy below was refreshed on **21 October 2026** against Vision 1.19.5 and current primary sources. It takes priority over the historical candidate ranking that follows.

The original shortlist: ten upgrades worth making to [vision.nonarkara.org](https://vision.nonarkara.org) (1.13.3), ranked. Each one was read against a real licence, a real file size, and a room that already exists. The sources, with the star counts and the measurements, are [The ultimate sources](SOURCES.md). This page does not add a model. It says which ones deserve the next change, and which ones must stay off the public site.

Checked 12 October 2026, the same pass as the source list.

[← Handbook](README.md) · [Sources](SOURCES.md) · [Model cards](reference/models.md) · [Browser runtime](system/browser-runtime.md)

---

## Execution strategy · 21 October 2026

**Strengthen evidence, time and teaching before adding more rooms or replacing every model.** This is a researched implementation plan, not a report of capabilities already shipped. Effort and acceptance criteria below are proposed, not measured results.

### What the field offers, and where it fits

| Direction | What a visitor should understand | Fit for Vision |
|---|---|---|
| Detection → tracking | A box says where an object is now; a track follows it through time. | High: Cameras already has boxes and readable video. |
| Segmentation | A box contains background; a mask marks the selected object's pixels. | High as one bounded interactive lesson. |
| Learned representations / self-supervision | Similar pictures can be near each other before we give our own labels. | Teach already groups embeddings; explain that its current encoder was pretrained with ImageNet labels. Clustering without new labels is not the same as training the encoder without labels. |
| Embodied / sequential learning | An action can change what happens next. | Drive is controllable; prerecorded camera footage is not. |
| Foundation and multimodal models | One model can accept concepts or prompts and cover many tasks. | Research comparison first; device cost, model terms and grounded evaluation determine deployment. |
| Efficient on-device inference | Model quality must survive the actual phone, browser and bandwidth budget. | Essential to every addition; preserve local processing. |

### Start here: one reference pack and a repeatable baseline

Create a small, versioned pack of **rights-cleared or synthetic** road frames and short sequences. An initial target of roughly 200 frames and 12 clips is a regression pack, not a representative Thai traffic benchmark. Include daylight, darkness, rain/glare, small motorcycles, crowding, obstruction, empty scenes, stale frames and broadcast/slate screens. Do not start unattended camera recording or retain visitors' imagery.

Split development and evaluation by **camera and recording session**, not randomly adjacent frames. Keep an untouched evaluation partition. Record provenance and dataset/model versions with results.

Measure detection precision/recall by class and size, false alerts per minute, tracking ID switches and count error, and confidence reliability where enough labels exist. Measure cold download/startup, warm median/p95 inference time, interaction stalls and memory during a bounded session on a mid-range Android, iPhone/Safari and desktop. Automated unit tests establish correctness; they do not establish visual model accuracy.

**First deliverable:** a reproducible evaluation command, the reference-pack manifest and a baseline report for the current SSDLite/MobileNet implementation. Do not claim a model upgrade improves Thai CCTV until this exists. Separately watch whether first-time testers can choose a method, add an example and test a new view without coaching; collect that through invited testing rather than background analytics.

### Prioritized work

| Order | Change and implementation starting point | User-visible result | Acceptance criterion / dependency |
|---|---|---|---|
| 1 | Evaluation pack and source suitability. Extend `core/specimen.js` / `core/catalog.js` with session-local suitability checks after a source loads. | Clear states: usable picture, too dark/blurred, unchanged, or unable to assess; one action to try another source. | A readable stream is not assumed to show a useful road. Do not equate unchanged pixels with a broken camera or identify a broadcast slate from motion alone. Preserve owner cooldowns and the current source until a replacement succeeds. |
| 2 | Make Teach's test phase explicit, using `train/video-lesson.js` and `train/video-learning.js`. | **Show examples → Learn → Try unseen pictures → Correct mistakes.** The same chosen footage remains visible across methods; a different camera/recording tests transfer. | Separate training examples from held-out evaluation. Keep “not enough evidence” available. Label the current nearest-neighbour vote as a score, not a calibrated chance of being right. Explain the frozen encoder versus the small learner. |
| 3 | Add detection-to-track association for real video before changing the detector. Replace or clearly separate `cv/spotted.js`'s proximity counter. | Stable session-only vehicle labels, a short trail, direction and line crossings; count a crossing once instead of counting successive boxes. | Compare association with the current heuristic on fixed clips. Handle occlusion, dropped/irregular frames, source changes and low frame rates. Reset on source change; keep no persistent identity. Do not infer km/h without scene calibration or run temporal claims on isolated stills. |
| 4 | Add MediaPipe Hand Landmarker to Gesture through a bounded worker, reusing the Focus worker pattern. | The visitor sees the hand points behind an action; compare landmark-based gestures with whole-picture classification. | Test no hand, held gesture, lighting/background changes and accidental triggers. Preserve stop/cooldown controls; no action from an unassessable frame. Self-host the runtime/model; verify the exact artifact's terms and download size. |
| 5 | Add one interactive segmentation experiment to Learn, using MediaPipe Interactive Segmenter as the first candidate. | **Tap an object → see its outline → compare mask and box.** | Begin with an owned/cleared still, then optional personal imagery processed locally. Mask quality and phone latency pass the reference cases; never turn a mask into a flood-depth claim. Keep instructions, image and action together. |
| 6 | Benchmark a small RT-DETR/RT-DETRv2 export beside SSDLite, rather than replacing it immediately. | An optional comparison showing misses, false positives and elapsed time on the same frame. | Independently verify code, weights and data provenance; exported graph/operator support; actual transferred bytes and peak memory. Promote only if evaluation improves the intended cases while meeting an explicitly agreed phone budget. Feature-detect and test runtime fallback; keep the current detector available. |
| 7 | Add a small, bounded sequential-learning exercise in Drive. | Compare fixed driving rules with a learner whose braking/acceleration changes future states and rewards. | Current frame-feedback learning is a **contextual-bandit-style** lesson: it scores actions but does not make the recorded road react. Teach that distinction. Use seeded runs, a time/episode limit, cancellation, and evaluation on unseen seeds. Keep simulation-generated perception separate from real neural detections. |

Orders 1–2 are prerequisites for judging progress. Tracking is the next broad visual improvement; Hand Landmarker is a smaller, contained capability upgrade. Sequential Drive learning comes after the existing simulator and the explanation have a clean comparison contract.

### Architecture and release gates

- Keep `detector`, `embedder`, `tracker` and lesson-specific logic separate. Introduce the smallest shared result envelope needed: frame/source token, capture/inference timestamps, normalized geometry, model/version and evidence state. Reject results from a source that has since changed.
- Bound worker work and queues: at most one current inference job per instrument; drop obsolete frames instead of building a backlog. Record capture age separately from inference time. Pause hidden work and dispose resources on stop.
- ONNX Runtime Web supports a wider model path, but GPU execution providers support only subsets of operators. Browser support tables and platform support evolve; feature detection alone is not proof that a particular model runs. Test the exact export on target browsers. Do not make WebGPU mandatory for the whole classroom.
- New models load only after an intentional action, with real progress and cancellation. Keep personal images local. Do not add continuous identity recognition or infer a person's mood from appearance.
- No new top-level room for each model. Reuse the existing lesson image and place its choices and result beside it. Preserve Thai/English/Chinese reading behaviour and honest translation fallbacks.
- Each shipped increment needs its relevant correctness checks, model/lesson evaluation, real-device measurements, scoped responsive review and the existing `npm run check` release gate. A laboratory model comparison is not a production replacement.

### Research track, not a default download

DINOv3 is a current representation-learning reference, but its code and weights have their own DINOv3 License. SAM 3/3.1 demonstrates concept-prompted segmentation and tracking; the official SAM 3 implementation describes 848M parameters, CUDA prerequisites and its SAM License. Those facts justify studying them and comparing cleared examples, **not assuming either is a drop-in phone model**. Review the exact smaller/converted artifact before any experiment. Likewise, OCR and monocular depth remain useful later lessons, after the first sequence is trustworthy; predicted relative depth is not a tape measure.

### Primary sources checked for this update

- [MediaPipe Hand Landmarker, Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js): synchronous inference can block the UI; Google recommends workers for camera processing.
- [MediaPipe Interactive Segmenter, Web](https://developers.google.com/edge/mediapipe/solutions/vision/interactive_segmenter/web_js): browser-oriented interactive mask task.
- [ByteTrack, paper](https://arxiv.org/abs/2110.06864): temporal association uses lower-score boxes to recover tracks; benchmark results do not predict our browser performance.
- [RT-DETR, official implementation](https://github.com/lyuwenyu/RT-DETR): candidate detector family and export path, not a measured replacement here.
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/): execution-provider and operator constraints.
- [On Calibration of Modern Neural Networks](https://arxiv.org/abs/1706.04599): raw confidence can differ from empirical correctness. Calibrating a score requires held-out evidence.
- [DINOv3, official repository](https://github.com/facebookresearch/dinov3) and [SAM 3, official repository](https://github.com/facebookresearch/sam3): current foundation-model capabilities and model-specific terms.

The agent-reach CLI and its update checker were unavailable (missing Python module); its documented Jina reader route worked for the MediaPipe source, with direct primary-source web reads used for the remaining checks. No model downloads, training jobs, camera captures or production changes were made for this research.

---

## Historical candidate evaluation · 12 October 2026

## How a rank was given

A rank is a fit for *this* classroom, not a leaderboard.

| | What "fit" means |
|---|---|
| Ability | A thing a visitor can newly see, in a room that already exists. |
| Browser | The bytes a tab would download, measured where a file exists. A PyTorch checkpoint is not that number. |
| Licence | Apache-2.0 or MIT can be served from a public site with the notice kept. AGPL, CC-BY-NC, Gemma, and a missing licence cannot, not without a lawyer and not in this ranking. |
| Effort | **Small** — a new file beside a runtime the site already has. **Medium** — a new instrument and tests, same runtime. **Large** — a new runtime, a Content-Security-Policy exception, and a model bigger than the 18 MB detector. |
| Risk | Privacy, a fake number, or a licence that would bind the whole site. |

The Focus room already runs MediaPipe in a worker. That worker is the only response whose CSP adds `'wasm-unsafe-eval'`. Anything new that compiles WASM has to live in a worker like that one. Webcam frames and photos still never leave the tab. Public cameras still belong to the agencies that run them.

The catalogue at **2026-10-12T01:47:51Z** held **3,427** cameras: **53 video**, 2,676 still, 222 view-only, 476 off. Ranks that need a sequence of frames apply to those 53.

---

## The ranking

| Rank | Upgrade | Room | Ship? |
|---|---|---|---|
| 1 | MediaPipe Hand Landmarker | Gesture | Yes, when someone builds it |
| 2 | MoveNet Lightning | Learn, Games | Yes, when someone builds it |
| 3 | ByteTrack on the boxes we already have, and speed only with a measured scale | Cameras, Everyday | The tracks yes. The km/h only after a tape measure |
| 4 | Lane-line visibility | Everyday, and FloodDash's wall | The question yes. A dashcam lane network, not yet |
| 5 | RT-DETR-R18 through ONNX Runtime Web | Learn, Cameras | Study. Replace SSDLite only after a phone measurement |
| 6 | Thai OCR, on the visitor's own photo | Everyday | Yes, with plates refused in the interface |
| 7 | Depth Anything V2 Small | Learn | Study. Small only |
| 8 | MobileSAM, click to outline | Learn | Study. A mask is not a flood gauge |
| 9 | Florence-2-base | Research | Desktop experiment only |
| 10 | Ultralytics YOLO | — | Read it. Do not vendor it |

---

## 1. Hands the Gesture room can actually see

**Source.** [MediaPipe](SOURCES.md#mediapipe), Hand Landmarker. Apache-2.0. The float16 task file is **7,819,105 bytes**.

**New ability.** Twenty-one points on a hand, and which hand it is. Gesture today classifies a whole picture with the same MobileNet fingerprint Train uses. A raised finger and a bright window can look alike. Landmarks are the difference between "the picture changed" and "the index finger is up."

**Room.** Gesture. The same worker pattern as Focus.

**Browser and size.** 7,819,105 bytes, on top of the MediaPipe WASM the Focus room already downloads. CPU delegate, as Focus does, until a GPU delegate is shown to obey the CSP.

**Licence.** Apache-2.0. Keep Google's notice with the `.task` file, as the face landmarker already does.

**Effort.** Small. A task file, a worker, a drawing of the points. The MediaPipe runtime and the "frames never leave the tab" rule are already written. The `'wasm-unsafe-eval'` exception is attached only to `js/focus/worker.js`, so a Gesture worker needs that same exception on its own URL.

**Risk.** Landmarks are a measurement of a body, not an identity, and the screen should say so. Store nothing. Two frames a second is the Focus ceiling for a reason; hands can go a little faster and should still have a ceiling. A road camera has no business running the hand model.

## 2. A pose, inside TensorFlow.js

**Source.** [MoveNet](SOURCES.md#movenet) SinglePose Lightning. Apache-2.0. Weight shards **4,650,216 bytes**, plus a `model.json` of 168,013 bytes.

**New ability.** Seventeen body keypoints for the one person in frame. Learn can show a skeleton next to the edge image, so a visitor sees that a pose is a set of coordinates. Games can ask "hold still" against those points instead of against a class score.

**Room.** Learn, and the webcam side of Games. Not the camera wall: a pole camera's person is often ten pixels tall, and Lightning's input is 192×192.

**Browser and size.** 4,650,216 bytes of weights, plus the 168,013-byte `model.json`. It is a TF.js graph. The runtime already vendored with the site is 1,469,843 bytes. No WASM, no new CSP line.

**Licence.** Apache-2.0, same family as the detector.

**Effort.** Medium. Load the graph the way the detector loads, draw the keypoints, dispose the tensors. MultiPose (9,448,838 bytes of shards, up to six people) is a later switch with the limit printed on the screen.

**Risk.** A skeleton on a public CCTV frame is still a person. Offer it on the visitor's camera first. Do not record the points. Thunder is more accurate in Google's own comparison and three times the download; Lightning is the one that matches this site's appetite.

## 3. The same car, still the same car — and a speed only when the road has a scale

**Source.** [ByteTrack](SOURCES.md#bytetrack) for the association, MIT. [The CCTV speed baseline](SOURCES.md#vehicle-speed-from-a-fixed-camera) for the unit, Apache-2.0. That README refuses to estimate speed until you set `px_to_meter` from a length you measured.

**New ability.** A track id on the boxes SSDLite already emits, so a census can say "three cars this minute" instead of "three boxes this frame." On a video camera, pixels per second is a real measurement. Kilometres per hour is that measurement times a scale.

**Room.** Cameras, for tracks on the 53 video streams. Everyday, for the lesson on units. The story wall, if a track is shown, shows it as a track and not as a person of interest.

**Browser and size.** No new weights. The algorithm is a match between boxes, frame to frame. The speed baseline uses Lucas–Kanade, which is the same family as the motion chapter.

**Licence.** MIT and Apache-2.0. Keep both notices.

**Effort.** Medium for tracks on video. Large for a honest speed, because each camera needs its own scale and the interface has to refuse a number when the scale is missing.

**Risk.** A track id kept for days is a soft identifier. Keep it for the seconds the visitor is looking, in the tab. A still JPEG has no frame rate, so it has no speed. Printing km/h from an uncalibrated pole camera would break the site's own rule that a number on screen is a number it measured.

### The flood angle

FloodDash's wall is the catalogue above. Three readings are worth adding, and one is not.

| Reading | What it needs | What it must not claim |
|---|---|---|
| Is the lane paint still a line? | Rank 4, on a still or a video frame | That the car should steer |
| How fast is that vehicle? | Rank 3, **video only**, and a measured length in the frame | A speed for a JPEG, or a speed copied from the next camera down the road |
| Where is the water, if I point at it? | Rank 8, a mask from a click | A depth, a "safe to drive," or a district-wide flood map |
| Is this pixel wet? | A dataset of *these* cameras, labelled in CVAT or Label Studio, then the Train room's embedder | A mask from FloodNet, Sen1Floods11, or ml4floods. Those are drones and satellites. [The datasets](SOURCES.md#flood-and-water-datasets) are for learning the difference |

V-FloodNet is the paper whose task — water level from street video, using objects of known size — matches a camera wall. Its repository had no licence file on 12 October 2026. Read it. Do not copy it in.

## 4. Can you still see the lane line?

**Source.** [CLRNet](SOURCES.md#lane-detection) (Apache-2.0) and Ultra-Fast-Lane-Detection (MIT) are the research. The first instrument does not need them.

**New ability.** A yes-or-no, with a confidence, for "the painted line is visible in this frame." Rain, glare and standing water are exactly when a human operator glances away. The edge lens already draws the gradients. A lane reading is those gradients, grouped into a line, and then a statement of how much of the line survived.

**Room.** Everyday, beside the lane-keeping lesson. A single camera on the FloodDash wall, chosen because it looks down a road, not a tile of all 3,427.

**Browser and size.** The classical version is the code in `cv/ops.js`. A learned model from CLRNet or Ultra-Fast-Lane-Detection is a training repository; no ONNX file was measured, and neither was trained on Thai pole cameras.

**Licence.** The classical instrument is this site's own code. A later learned model should be Apache or MIT. CLRNet is the one that already is.

**Effort.** Medium for a visibility meter on the edge image. Large for a real lane network, and only after a labelled set from these cameras exists.

**Risk.** A green line on a wet road reads as "the lane is there, drive." The sentence on screen is "the paint is still a line" or "it is not," with the confidence, and "not detected" still does not mean "not there."

## 5. A detector that is allowed to replace SSDLite

**Source.** [RT-DETR](SOURCES.md#rt-detr), the R18 export. Apache-2.0. `model.safetensors` is **80,904,152 bytes**. The runtime would be [ONNX Runtime Web](SOURCES.md#onnx-runtime-web) 1.30.0, MIT.

**New ability.** A transformer detector in the same COCO vocabulary, so Learn can show what the 300×300 SSDLite squeeze costs, on the same frame, with two confidences. Far cars and night scenes are where the current card says the model is weak.

**Room.** Learn first, one button, off by default. Cameras only if a phone can run it without stalling the page.

**Browser and size.** 80,904,152 bytes is the safetensors file, not the file a browser should receive. An ONNX build has to be measured before anyone quotes a size. The WASM runtime needs a worker and `'wasm-unsafe-eval'`, copied from the Focus pattern, not added to every page.

**Licence.** Apache-2.0 on the code repository and on the R18 model card. This is the reason it outranks YOLO.

**Effort.** Large. Export, quantise, host a new folder under `public/models/`, keep the CSP narrow, and put the timing on screen the way the current detector does.

**Risk.** A quieter failure mode: the new model is better on a desktop GPU and worse on the phone the classroom is actually opened on. Ship the comparison, not a silent replacement.

## 6. Thai text, on a photo the visitor chose

**Source.** [PaddleOCR's Thai recogniser](SOURCES.md#paddleocr) for quality, and [tesseract.js](SOURCES.md#tesseract) plus `tha.traineddata` (1,072,519 bytes, Apache-2.0) for a runtime that already exists in JavaScript. [PyThaiNLP](SOURCES.md#pythainlp) cuts the words after the line is read. [ThaiOCRBench](SOURCES.md#thaiocrbench) is how you find out you are wrong.

**New ability.** Everyday already explains OCR. A visitor could point it at a sign in a photo they opened, and see the string, the confidence, and the places it breaks on Thai.

**Room.** Everyday. The visitor's photo. Not the camera wall.

**Browser and size.** Tesseract.js and the 1 MB Thai data are the browser-shaped pair. Paddle's table lists the Thai recognition model at 7.5 MB, which is their storage figure for the recogniser alone. A browser export of that recogniser was not measured. The full pipeline still needs a detector to find the line.

**Licence.** Apache-2.0 on Tesseract, tessdata, PaddleOCR, and PyThaiNLP. ThaiOCRBench's repository had no SPDX licence; use it as a test, and read the dataset card before copying any sample into this repo.

**Effort.** Medium for Tesseract.js on a local photo, in a worker. Large for Paddle's Thai model, until an export exists.

**Risk.** OCR on a road reads licence plates and shop names. The instrument refuses a public camera, says why, and leaves plate reading off. A wrong Thai line is the lesson; a silent wrong line is not.

## 7. Near and far, not metres

**Source.** [Depth Anything V2 Small](SOURCES.md#depth-anything-v2). Apache-2.0. The checkpoint is **99,218,434 bytes**. Base and Large are CC-BY-NC-4.0. They do not ship.

**New ability.** A grey picture of relative depth beside the photo, so Learn can show that "far" is a pattern in the pixels and not a laser. Wet asphalt and a pale sky are good failure cases to put on the same screen.

**Room.** Learn.

**Browser and size.** The 99,218,434-byte checkpoint is a large lesson. It stays behind a button. An ONNX or Core ML export may be smaller; the README thanks the Transformers and Core ML ports, and this page did not measure those files.

**Licence.** Small is Apache-2.0. Shipping Base or Large on a public site would ignore the non-commercial grant. The README is explicit. So is the model card.

**Effort.** Large, because of the runtime and the size. The lesson is worth it only if the button is honest about being relative.

**Risk.** Someone will read a dark puddle as "deep water." The caption is "relative depth, not metres, not a flood height."

## 8. Click, and the region gets a mask

**Source.** [MobileSAM](SOURCES.md#mobilesam). Apache-2.0. `weights/mobile_sam.pt` is **40,728,226 bytes** in the Git tree. SAM 2 tiny is 155,841,672 bytes and can wait.

**New ability.** The visitor clicks a region — a vehicle, a puddle, a shadow — and sees a mask. Learn finally has a segmentation instrument. On a flood camera, a click on the water shows the region the model thinks is one thing. It does not name the thing.

**Room.** Learn. A single opted-in frame from Cameras is a demonstration, not a product.

**Browser and size.** 40,728,226 bytes of PyTorch weights. The README documents ONNX export. The ONNX file a browser would load was not measured. Same WASM worker rule as rank 5.

**Licence.** Apache-2.0.

**Effort.** Large. Smaller than Florence, larger than MoveNet.

**Risk.** A mask draped on a wet road looks like an official flood extent. The sentence beside it: "this is the region around your click. It is not a measurement of water, and it was not trained on this camera."

## 9. One model that can caption, point, and read

**Source.** [Florence-2-base](SOURCES.md#florence-2). MIT. 0.23B parameters on the model card. The safetensors file is **463,221,266 bytes**. There was no official GitHub repository under `microsoft/Florence` on the day this was checked.

**New ability.** A caption, a box for a phrase, and text in a region, from one MIT-licensed model. Research can show what a vision-language model is, on a picture the visitor supplies.

**Room.** Research, or a corner of Everyday. Desktop. Own photo.

**Browser and size.** 463,221,266 bytes before quantisation. Transformers.js can host the experiment in a worker. It is not a camera-wall model, and this page did not test Thai. ThaiOCRBench is the test, later, on a machine with the memory.

**Licence.** MIT. Keep Microsoft's notice.

**Effort.** Large, and easy to do badly. Quantise first, measure the quantised file, and keep it off the default page.

**Risk.** A caption of a face is not face recognition, and it is still a description of a person. Own photo, opt-in, nothing stored. Moondream's repository is Apache-2.0 and describes a 0.5B edge variant, but the Moondream 2 file that was measured is **3,854,538,968 bytes**. The 0.5B file was not measured. Qwen3-VL-2B and PaliGemma 3B are server models; PaliGemma is Gemma-licensed and gated. They are not ranks.

## 10. The famous one that stays in the library

**Source.** [Ultralytics YOLO](SOURCES.md#ultralytics-yolo). **AGPL-3.0**, 62,392 stars. The `LICENSE` file is the Affero GPL. The README sends production use to an [enterprise licence](https://www.ultralytics.com/license).

**New ability.** In a notebook, the fastest way to see a strong detector, a segmenter and a pose model in one API. On this website, no new ability, because the weights do not get served.

**Room.** None, until counsel says otherwise.

**Browser and size.** Not measured, on purpose.

**Licence.** AGPL-3.0 is a free licence and a network copyleft. Visitors who interact with the program over a network are entitled to the corresponding source. A public classroom that serves the model is that situation. The enterprise licence is the project's own way around it. Neither has been negotiated here.

**Effort.** The effort of not adding it is small. The effort of adding it and getting the licence wrong is the whole site.

**Risk.** Copying a YOLO weight into `public/models/` because it is the easy export. RT-DETR is the Apache-licensed detector in this ranking. ByteTrack and MoveNet do the tracking and the pose without it.

---

## Also studied, and not a rank

| Source | Why it stopped here |
|---|---|
| [Grounding DINO tiny](SOURCES.md#grounding-dino) and [OWL-ViT](SOURCES.md#owl-vit) | The right idea — name an object COCO lacks — and the wrong size. 689,359,096 and 612,983,940 bytes. |
| [SAM 2](SOURCES.md#segment-anything-and-sam-2) | Apache-2.0 and excellent. Tiny is still 155,841,672 bytes. MobileSAM is the one that fits a page. |
| [RTMPose](SOURCES.md#rtmpose) | The COCO table is worth reading (and it disagrees with the sentence above it). It is a PyTorch toolbox, not a TF.js graph. |
| [BoT-SORT](SOURCES.md#bot-sort) | Camera-motion compensation is for a moving camera. Re-identification is an appearance match of a person. The pole cameras do not move, and this site does not re-identify. |
| [supervision](SOURCES.md#supervision) | MIT, and the right notebook toolkit. ByteTrack is on the `main` branch and absent from the default branch `develop`. Pin a commit or use FoundationVision's repository. |
| [MiDaS](SOURCES.md#midas) | Archived. Depth Anything V2 Small replaces it for new work. |
| [OpenDataCam](SOURCES.md#counting-what-crosses-a-line) | The right product shape for a count. It is a server, and its detector weights need their own licence check. |
| [CVAT](SOURCES.md#cvat) and [Label Studio](SOURCES.md#label-studio) | Where a wet-road dataset would be made. Not features of the public site. |
| [Qwen3-VL](SOURCES.md#qwen-vl), [PaliGemma](SOURCES.md#paligemma), [Moondream 2](SOURCES.md#moondream) | Real models, wrong place. Qwen's 2B Instruct card is Apache-2.0 and still a server. PaliGemma is Gemma and gated. Moondream 2's measured file is 3.85 GB. |

---

## What the site keeps

These are already decisions, and none of the ten ranks reopens them.

- The server still never looks at a picture. A new model runs in the tab.
- No accounts, no analytics, no stored frames, no stored landmarks.
- No face recognition, no plate reading, no re-identification.
- A number on screen is a number the page measured, with a unit, or it is not on screen.
- "Not detected" is still not "not there." A flood mask, a lane line and a speed all inherit that sentence.

---

### สรุปภาษาไทย

สิบอันดับนี้เรียงตามความเหมาะกับห้องเรียน ไม่ใช่ตามคะแนนบนตารางเปรียบเทียบ

1. **มือ** ด้วย MediaPipe Hand Landmarker ขนาด 7,819,105 ไบต์ สัญญา Apache-2.0 ใส่ในห้องท่าทาง ระบบรัน MediaPipe อยู่แล้วในห้องสมาธิ
2. **ท่าทางทั้งตัว** ด้วย MoveNet Lightning ผ่าน TensorFlow.js น้ำหนัก 4,650,216 ไบต์ ใส่ในห้องเรียนและห้องเกม บนกล้องของผู้เยี่ยมชมเป็นที่แรก
3. **ติดตามกล่องเดิม** ด้วยวิธีของ ByteTrack และความเร็วเฉพาะเมื่อมีสเกลจากความยาวจริงในภาพ ใช้ได้กับกล้องวิดีโอ 53 ตัว ไม่ใช่ภาพนิ่ง
4. **เส้นเลนยังมองเห็นไหม** ในฝนและน้ำท่วม เริ่มจากขอบภาพที่เว็บมีอยู่ โมเดลเลนจากงานวิจัยยังไม่ผ่านการวัดบนกล้องไทย
5. **ตัวตรวจจับ RT-DETR** สัญญา Apache-2.0 เป็นตัวเลือกแทน YOLO ไฟล์ที่วัดได้ใหญ่กว่าโมเดลปัจจุบันมาก ต้องแปลงและวัดบนมือถือก่อน
6. **อ่านอักษรไทย** จากรูปที่ผู้ใช้เปิดเอง ด้วย Tesseract และข้อมูลภาษาไทย ห้ามอ่านป้ายทะเบียน และห้ามชี้ไปที่กล้องสาธารณะ
7. **ความลึกสัมพัทธ์** จาก Depth Anything V2 Small เท่านั้น รุ่นใหญ่กว่านั้นเป็นสัญญาแบบไม่เชิงพาณิชย์ และความลึกนี้ไม่ใช่ระดับน้ำ
8. **คลิกแล้วได้มาสก์** ด้วย MobileSAM มาสก์ไม่ใช่แผนที่น้ำท่วม
9. **Florence-2** ไว้ทดลองบนเครื่องเดสก์ท็อป ไฟล์หลายร้อยเมกะไบต์ สัญญา MIT
10. **Ultralytics YOLO** ไว้ศึกษา สัญญา AGPL-3.0 ห้ามนำน้ำหนักโมเดลมาเสิร์ฟบนเว็บนี้จนกว่าจะมีคำแนะนำทางกฎหมาย

มุมน้ำท่วมของ FloodDash คือสามคำถาม: เส้นเลนยังเห็นไหม, รถคันนี้เร็วเท่าไรหลังมีสเกล, และบริเวณที่คลิกคือบริเวณเดียวกันหรือไม่ ชุดข้อมูลน้ำท่วมสาธารณะที่มีอยู่เป็นภาพโดรนหรือดาวเทียม นำมาป้ายบนกล้องวงจรปิดแล้วเรียกว่าน้ำท่วมไม่ได้
