# The ultimate sources · แหล่งอ้างอิงสำหรับงานวิทัศน์

The toolbox around [vision.nonarkara.org](https://vision.nonarkara.org): free repositories you can clone, read, and fork, grouped the way a computer-vision course actually uses them. The chapter papers stay in the [reading list](reference/reading-list.md). This page is the code.

**Checked 12 October 2026.** Star counts are GitHub's `stargazerCount` that morning (UTC). Licences were read from the `LICENSE` file, and from the model card when the weights live somewhere else. File sizes are `Content-Length` from an HTTP request the same day, or a full download where a HEAD was refused. A number in someone else's README is quoted as theirs. Nothing here is a benchmark this repository ran.

If you build on one of these, keep the author's name and licence notice with the copy. That is the condition most of these grants actually make.

[← Handbook](README.md) · [What to upgrade next](SUPERPOWERS.md) · [Model cards](reference/models.md)

---

## How a row is read

| Field | What it means here |
|---|---|
| Licence | What the repository's own licence file says. A public site that *serves* weights is a different act from cloning code to read. |
| Stars | GitHub stars on 12 October 2026. Hugging Face downloads are downloads, and are labelled as such. |
| In the browser | Whether a visitor's tab could run it under this site's rules: self-hosted files, no upload, strict Content-Security-Policy. |
| Use it when | The job it is actually good for, including the job it is the wrong tool for. |

This site already runs three models, all self-hosted. [SSDLite MobileNetV2](reference/models.md) is about 18 MB, Apache-2.0. The MobileNetV2 embedder is about 14 MB, Apache-2.0. The Focus room's face landmarker is the MediaPipe float16 file, **3,758,596 bytes**, the same length as Google's copy of `face_landmarker.task`. TensorFlow.js in `public/vendor/tf.min.js` is **1,469,843 bytes**.

---

## Detection and segmentation

### Ultralytics YOLO

[ultralytics/ultralytics](https://github.com/ultralytics/ultralytics) · **AGPL-3.0** · **62,392** stars on 12 October 2026

The `LICENSE` file is the GNU Affero General Public License v3. The repository description that day names YOLO27, YOLO26, YOLO11 and YOLOv8 for detection, segmentation, classification and pose. The README's licence section points students and researchers at AGPL-3.0 and points production use at a separate [enterprise licence](https://www.ultralytics.com/license).

**In the browser.** The project can export ONNX and TensorFlow.js. This page did not measure an exported file. AGPL is a network copyleft: people who interact with the program over a network are entitled to the corresponding source. Serving those weights from a public website is that case.

**Use it when** you are reading how a modern detector is packaged. Keep the weights out of `public/models/` until counsel has read both the AGPL and the enterprise terms. A detector this site could ship starts at RT-DETR, below.

### RT-DETR

[lyuwenyu/RT-DETR](https://github.com/lyuwenyu/RT-DETR) · **Apache-2.0** · **5,586** stars on 12 October 2026

Official code for Real-Time Detection Transformer. The paper is Zhao et al., [DETRs Beat YOLOs on Real-time Object Detection](https://arxiv.org/abs/2304.08069). The Hugging Face export [`PekingU/rtdetr_r18vd`](https://huggingface.co/PekingU/rtdetr_r18vd) has an Apache-2.0 model card, and its `model.safetensors` was **80,904,152 bytes**. [`PekingU/rtdetr_r50vd`](https://huggingface.co/PekingU/rtdetr_r50vd) was **172,175,856 bytes**, also Apache-2.0 on the card.

**In the browser.** 80,904,152 bytes is a real download next to the 18 MB SSDLite this site ships, and it still needs a runtime (ONNX Runtime Web, below). No browser build was measured here.

**Use it when** you want a detector newer than SSD, with an Apache grant, and you can afford the weight. It is the licence-clean alternative to Ultralytics for a public classroom.

### Segment Anything and SAM 2

[facebookresearch/segment-anything](https://github.com/facebookresearch/segment-anything) · **Apache-2.0** · **54,986** stars on 12 October 2026

[facebookresearch/sam2](https://github.com/facebookresearch/sam2) · **Apache-2.0** · **19,989** stars on 12 October 2026

Meta's promptable segmenters. You click, or you pass a box, and the model returns a mask. SAM does not know the word "car". The paper for the first model is already in the [reading list](reference/reading-list.md). On 12 October 2026 the Hugging Face safetensors files measured:

| Checkpoint | Bytes |
|---|---|
| [`facebook/sam-vit-base`](https://huggingface.co/facebook/sam-vit-base) `model.safetensors` | 374,979,480 |
| [`facebook/sam2-hiera-tiny`](https://huggingface.co/facebook/sam2-hiera-tiny) `model.safetensors` | 155,841,672 |
| [`facebook/sam2-hiera-small`](https://huggingface.co/facebook/sam2-hiera-small) `model.safetensors` | 184,238,888 |

Those Hugging Face cards say Apache-2.0. They are transformers exports, not a claim that Meta's original checkpoint has the same byte length.

**In the browser.** The tiny SAM 2 file is 155,841,672 bytes, about 156 MB. A visitor can wait for that on a desktop. A phone on a flood camera should not be asked to.

**Use it when** a person is in the loop: "outline the thing I click." A mask is not a class, and a mask of water is not a water-level gauge.

### MobileSAM

[ChaoningZhang/MobileSAM](https://github.com/ChaoningZhang/MobileSAM) · **Apache-2.0** · **5,889** stars on 12 October 2026

A lighter Segment Anything, with ONNX export documented in the README. The Git tree lists `weights/mobile_sam.pt` at **40,728,226 bytes**.

**In the browser.** 40,728,226 bytes is the first SAM-family file that is even in the conversation next to this site's 18 MB detector. The README points at a third-party browser demo. That demo is not this repository, and it was not re-run here.

**Use it when** the lesson is "click a region, get a mask" and the page must stay a page. Prefer it over SAM 2 tiny until someone measures a real ONNX build on a phone.

### Grounding DINO

[IDEA-Research/GroundingDINO](https://github.com/IDEA-Research/GroundingDINO) · **Apache-2.0** · **10,663** stars on 12 October 2026

Open-set detection: a text prompt in, boxes out. The paper is [Grounding DINO: Marrying DINO with Grounded Pre-Training for Open-Set Object Detection](https://arxiv.org/abs/2303.05499). The Hugging Face export [`IDEA-Research/grounding-dino-tiny`](https://huggingface.co/IDEA-Research/grounding-dino-tiny) has an Apache-2.0 card, and `model.safetensors` was **689,359,096 bytes**.

**In the browser.** 689,359,096 bytes. That is a workstation model.

**Use it when** you are studying "find the thing I can name," including names COCO does not have (a sandbag, a submerged kerb). Do not put it on the camera wall.

### OWL-ViT

Code: [google-research/scenic](https://github.com/google-research/scenic) `scenic/projects/owl_vit` · **Apache-2.0** · **3,842** stars on 12 October 2026 for the whole Scenic library

Open-vocabulary detection with a vision transformer. The paper is [Simple Open-Vocabulary Object Detection with Vision Transformers](https://arxiv.org/abs/2205.06230). The v1 and v2 notes live in that README. Weights: [`google/owlvit-base-patch32`](https://huggingface.co/google/owlvit-base-patch32), Apache-2.0 on the card, `model.safetensors` **612,983,940 bytes**.

**In the browser.** 612,983,940 bytes. Same conclusion as Grounding DINO.

**Use it when** you want Google's reference implementation of text-prompted boxes, and you are training or evaluating offline. Scenic is a research library, not a web runtime.

---

## Pose, hands and face

### MediaPipe

[google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe) · **Apache-2.0** · **37,232** stars on 12 October 2026

Google's on-device vision tasks: face, hand, pose. This site already vendors MediaPipe 0.10.32 and the face landmarker for [/focus](https://vision.nonarkara.org/focus). The task guide that answered on 12 October 2026 is the [Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker). Float16 task files, measured from `storage.googleapis.com`:

| Task file | Bytes |
|---|---|
| `hand_landmarker.task` | 7,819,105 |
| `pose_landmarker_lite.task` | 5,777,746 |
| `pose_landmarker_full.task` | 9,398,198 |
| `pose_landmarker_heavy.task` | 30,664,242 |
| `face_landmarker.task` | 3,758,596 |

**In the browser.** This is the one stack the site has already proved: a worker, WASM, and a `.task` file, with landmarks discarded when the tab closes.

**Use it when** the question is about a body part in the frame — a hand shape, a stance — and the answer must not be a name. Hand landmarks are the upgrade for [/gesture](https://vision.nonarkara.org/gesture). Pose lite is the upgrade for a stick figure on Learn. Neither one is face recognition.

### MoveNet

Code: [tensorflow/tfjs-models](https://github.com/tensorflow/tfjs-models) `pose-detection/src/movenet` · **Apache-2.0** · **14,806** stars on 12 October 2026 for the whole model zoo

Google's pose network, published for TensorFlow.js. The [TF Hub tutorial](https://www.tensorflow.org/hub/tutorials/movenet) answered on 12 October 2026. Lightning takes a 192×192 input and returns 17 keypoints; Thunder takes 256×256; MultiPose returns up to six people. Weight shards downloaded that day from the TF Hub `tfjs-format=file` URLs (the `model.json` is extra; Lightning's was 168,013 bytes):

| Variant | Weight-shard bytes |
|---|---|
| SinglePose Lightning | 4,650,216 |
| SinglePose Thunder | 12,477,112 |
| MultiPose Lightning | 9,448,838 |

The MoveNet README publishes its own WebGL and WASM frames-per-second table. Those are Google's measurements on the machines named there, not ours.

**In the browser.** Lightning is a TF.js graph. This site already loads TF.js. No new runtime, no new CSP exception.

**Use it when** you want a single person's pose on Learn, Games, or a webcam, and you want to stay inside the library the classroom already teaches. One person only, unless you take MultiPose and say so on the screen.

### RTMPose

Code: [open-mmlab/mmpose](https://github.com/open-mmlab/mmpose) `configs/body_2d_keypoint/rtmpose` · **Apache-2.0** · **7,950** stars on 12 October 2026 for MMPose

OpenMMLab's real-time multi-person pose framework. There is also a hand config and a face config beside the body one. The results table in that README, on COCO val2017 with a detector whose human AP is given as 56.4, lists RTMPose-m at 256×192 as **0.746 AP** and RTMPose-l at 256×192 as **0.758 AP**. The same page's opening sentence says RTMPose-m reaches 75.8% AP. The table and the sentence disagree; use the table. The same opening sentence claims 90+ FPS on an Intel i7-11700 and 430+ FPS on a GTX 1660 Ti. That is their desktop measurement. No ONNX byte size was measured for this page.

**In the browser.** Not as shipped. MMPose is a PyTorch toolbox. A browser build would be an export you measure yourself.

**Use it when** you are comparing pose accuracy offline, or choosing a model to distill later. For the public site, MediaPipe pose and MoveNet are the ones that already fit the page.

---

## Tracking

### ByteTrack

[FoundationVision/ByteTrack](https://github.com/FoundationVision/ByteTrack) · **MIT** · **6,734** stars on 12 October 2026

`ifzhang/ByteTrack` now resolves to this repository. The paper is [ByteTrack: Multi-Object Tracking by Associating Every Detection Box](https://arxiv.org/abs/2110.06864). The idea is small: keep the low-score boxes, and associate them across frames instead of throwing them away. The official code is a Python research repository.

**In the browser.** The association step is arithmetic on boxes the detector already produced. It does not need a second network. It does need a sequence of frames.

**Use it when** a visitor is watching one of the live video cameras and you want "that car, still that car" rather than a fresh guess every frame. A JPEG that updates every few seconds is not that sequence.

### BoT-SORT

[NirAharon/BoT-SORT](https://github.com/NirAharon/BoT-SORT) · **MIT** · **1,562** stars on 12 October 2026

Aharon, Orfaig and Bobrovsky, [BoT-SORT: Robust Associations Multi-Pedestrian Tracking](https://arxiv.org/abs/2206.14651). The README's own feature list is camera-motion compensation and re-identification, on top of a detector.

**In the browser.** Motion compensation is code. Re-identification is a second model that matches appearance.

**Use it when** the camera itself is moving. A pole camera is not. Re-identification of people is the line this site does not cross: an appearance embedding of a person is an identifier, even without a name.

### supervision

[roboflow/supervision](https://github.com/roboflow/supervision) · **MIT** · **51,181** stars on 12 October 2026

Roboflow's library of reusable vision tools: annotators, datasets, metrics. The default branch on 12 October 2026 was `develop`. A recursive listing of that branch had no path containing `byte` or `tracker`. The `main` branch still has `supervision/tracker/byte_tracker/`.

**In the browser.** It is a Python package. Useful beside the site, not inside it.

**Use it when** you are labelling, drawing boxes, or scoring a detector in a notebook. If you came for ByteTrack, pin the branch, or use FoundationVision's repository. The copy in `supervision` depends on which branch you cloned.

---

## Depth

### Depth Anything V2

[DepthAnything/Depth-Anything-V2](https://github.com/DepthAnything/Depth-Anything-V2) · code under the repository's Apache-2.0 file · **8,940** stars on 12 October 2026

Yang, Kang, Huang, Zhao, Xu, Feng and Zhao, [Depth Anything V2](https://arxiv.org/abs/2406.09414). Monocular relative depth: near and far, not metres. The README's licence section is specific, and the Hugging Face cards agree:

| Weights | Card licence | File | Bytes |
|---|---|---|---|
| [V2 Small](https://huggingface.co/depth-anything/Depth-Anything-V2-Small) | Apache-2.0 | `depth_anything_v2_vits.pth` | 99,218,434 |
| [V2 Base](https://huggingface.co/depth-anything/Depth-Anything-V2-Base) | CC-BY-NC-4.0 | `depth_anything_v2_vitb.pth` | 389,961,218 |
| [V2 Large](https://huggingface.co/depth-anything/Depth-Anything-V2-Large) | CC-BY-NC-4.0 | `depth_anything_v2_vitl.pth` | 1,341,395,338 |

The README also places the Giant model under CC-BY-NC-4.0. That file was not measured.

**In the browser.** Small is 99,218,434 bytes. Base and Large are non-commercial, so they are the wrong weights for a public site even before the download.

**Use it when** you want a relative depth picture for teaching, and you ship **Small** only. It does not measure flood depth. A bright wet road and a dry road can both look "near."

### Depth Anything (v1)

[LiheYoung/Depth-Anything](https://github.com/LiheYoung/Depth-Anything) · **Apache-2.0** · **8,230** stars on 12 October 2026

The CVPR 2024 predecessor. Read it for the method. Ship V2 Small if you ship anything.

### MiDaS

[isl-org/MiDaS](https://github.com/isl-org/MiDaS) · **MIT** · **5,419** stars on 12 October 2026 · **archived**

Ranftl et al., the robust monocular depth line that Depth Anything builds on. The repository is archived. Read it. Do not start a new integration from it.

---

## OCR

### PaddleOCR

[PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) · **Apache-2.0** · **90,932** stars on 12 October 2026

The practical multilingual OCR toolkit. For Thai, the documentation table for the text-recognition module lists `th_PP-OCRv5_mobile_rec`: Thai, English and digits, recognition accuracy **82.68** on their set, storage size **7.5 MB**. That 7.5 MB is the recognition model in their table, not a whole detection-plus-recognition pipeline, and it is their figure rather than a file this page downloaded. The Hugging Face card for [`PaddlePaddle/th_PP-OCRv5_mobile_rec`](https://huggingface.co/PaddlePaddle/th_PP-OCRv5_mobile_rec) says Apache-2.0. Docs: [text recognition module](https://www.paddleocr.ai/latest/en/version3.x/module_usage/text_recognition.html).

**In the browser.** Paddle inference is not a browser runtime. 7.5 MB is encouraging only after someone exports the recogniser and measures it. A detector still has to find the line first.

**Use it when** you need Thai text out of a document or a sign, on a machine you control. On a road camera it will also read plates. This site does not read plates.

### Tesseract

[tesseract-ocr/tesseract](https://github.com/tesseract-ocr/tesseract) · **Apache-2.0** · **76,909** stars on 12 October 2026

The long-lived OCR engine. Thai data lives next door:

| Repository | Licence | Stars | `tha.traineddata` |
|---|---|---|---|
| [tesseract-ocr/tessdata](https://github.com/tesseract-ocr/tessdata) | Apache-2.0 | 7,675 | 1,072,519 bytes |
| [tesseract-ocr/tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast) | Apache-2.0 | 617 | 1,072,600 bytes |
| [tesseract-ocr/tessdata_best](https://github.com/tesseract-ocr/tessdata_best) | Apache-2.0 | 1,595 | 7,614,571 bytes |

The `tessdata` README says those files are integerised LSTM models for Tesseract 4 and newer, faster and a little less accurate than `tessdata_best`.

**In the browser.** [naptha/tesseract.js](https://github.com/naptha/tesseract.js) · **Apache-2.0** · **38,760** stars on 12 October 2026. It is a JavaScript port ("more than 100 languages" is their description). Thai means loading `tha.traineddata`. This page did not measure Thai accuracy on a CCTV still.

**Use it when** you want an OCR engine you can run in a tab, and you will show the user how often it is wrong. For a printed Thai document, compare it with PaddleOCR's Thai recogniser before you trust either.

### EasyOCR

[JaidedAI/EasyOCR](https://github.com/JaidedAI/EasyOCR) · **Apache-2.0** · **30,061** stars on 12 October 2026

A ready-to-run OCR package. The repository description says 80+ languages; that count is theirs. Thai is present as a script in the tree: `easyocr/character/th_char.txt` begins with ก ข ค.

**In the browser.** Not as shipped. It is a Python package with a detector and a recogniser.

**Use it when** you want a second opinion on a Thai line in a notebook, beside PaddleOCR and Tesseract. Same plate warning.

### PyThaiNLP

[PyThaiNLP/pythainlp](https://github.com/PyThaiNLP/pythainlp) · **Apache-2.0** · **1,163** stars on 12 October 2026

Thai natural-language processing: tokenisation and the tools that sit *after* a line has been read. It is not an OCR engine. Credit it as the companion, not as a recogniser.

**Use it when** an OCR model has handed you a string and you need to split Thai words, which are written without spaces.

### ThaiOCRBench

[scb-10x/ThaiOCRBench](https://github.com/scb-10x/ThaiOCRBench) · **no SPDX licence on the repository** · **14** stars on 12 October 2026

SCB 10X's benchmark for Thai text in images. The README describes 2,808 human-annotated samples across 13 tasks, and points at the paper [ThaiOCRBench](https://arxiv.org/abs/2511.04479) (IJCNLP-AACL 2025) and the dataset [`scb10x/ThaiOCRBench`](https://huggingface.co/datasets/scb10x/ThaiOCRBench). GitHub reported no licence. Read the paper and the dataset card before you copy samples into this repository.

**Use it when** you want to know whether a vision-language model can actually read Thai. It is an evaluation set, not a model to ship.

---

## Browser runtimes

### ONNX Runtime Web

[microsoft/onnxruntime](https://github.com/microsoft/onnxruntime) · **MIT** · **22,050** stars on 12 October 2026

The browser package on npm, the same day: `onnxruntime-web` **1.30.0**, MIT, described as a JavaScript library for running ONNX models in browsers.

**In the browser.** This is the runtime you would add for RT-DETR, MobileSAM, or a depth export. It compiles WASM. This site's Content-Security-Policy is `script-src 'self'`, and only the Focus worker's response adds `'wasm-unsafe-eval'`. A new WASM runtime needs that same exception, on that worker only.

**Use it when** the model you want is not a TF.js graph and not a MediaPipe `.task`. Measure the exported file. Do not quote the PyTorch checkpoint as the download the visitor pays.

### TensorFlow.js

[tensorflow/tfjs](https://github.com/tensorflow/tfjs) · **Apache-2.0** · **19,148** stars on 12 October 2026

The library this classroom already runs, WebGL first and CPU if WebGL is missing. The vendored build is the 1,469,843-byte file above. MoveNet, the current detector, and the embedder all sit on it.

**Use it when** the model already has a TF.js graph. Adding a second runtime is a cost. Pay it only when TF.js cannot express the model.

### Transformers.js

[huggingface/transformers.js](https://github.com/huggingface/transformers.js) · **Apache-2.0** · **16,342** stars on 12 October 2026

Hugging Face's in-browser transformers. npm `@huggingface/transformers` was **4.3.1**, Apache-2.0, on 12 October 2026.

**In the browser.** It can run some vision and vision-language models with WebGPU or WASM. A 463 MB Florence file does not become a phone model because the runtime is JavaScript. The same WASM CSP rule as ONNX Runtime applies.

**Use it when** you are prototyping a small exported model on a desktop, in a worker, on the visitor's own photo. Not on first load of the camera wall.

### WebGPU

[gpuweb/gpuweb](https://github.com/gpuweb/gpuweb) · **5,500** stars on 12 October 2026 · GitHub's SPDX field is unset

The specification is [WebGPU](https://www.w3.org/TR/webgpu/). The repository's `LICENSE.md` puts documents under the [W3C Software and Document License (2023)](https://www.w3.org/copyright/software-license-2023/) and software contributions under a 3-clause BSD licence.

**In the browser.** WebGPU is a graphics API, not a model. TF.js, ONNX Runtime Web and Transformers.js can each use it where the browser has it. This site's TF.js path today is WebGL, then CPU.

**Use it when** you are deciding why a model is fast on one laptop and absent on a phone. Check for the API. Keep the CPU path, or say the instrument is unavailable.

---

## Traffic, CCTV and flood vision

The catalogue this classroom was reading at **2026-10-12T01:47:51Z**, from FloodDash, was **3,427** cameras: 53 video, 2,676 still, 222 view-only, 476 off. Speed and multi-frame tracking are about those 53 video streams. A still is one JPEG.

### Vehicle speed from a fixed camera

[swhan0329/vehicle_speed_estimation](https://github.com/swhan0329/vehicle_speed_estimation) · **Apache-2.0** · **148** stars on 12 October 2026

The README calls it a modular OpenCV baseline for per-lane vehicle speed from fixed monocular CCTV. The tracker is Lucas–Kanade optical flow. The README's own next step after the demo is calibration: a lane polygon, and a `px_to_meter` scale from a distance you measured (it gives a lane width of 3.5 m as an example). It says the scale changes with road geometry and camera angle, so each camera is recalibrated.

**In the browser.** Optical flow and a scale factor are classical code, close to the motion chapter this site already teaches. The number is only a speed after the scale exists.

**Use it when** someone has stood at that camera, or otherwise measured a real length in the frame. Until then the honest output is pixels per second, with the unit written on the screen.

### Counting what crosses a line

[opendatacam/opendatacam](https://github.com/opendatacam/opendatacam) · **MIT** · **1,730** stars on 12 October 2026

An open tool that detects objects, follows them, and counts crossings of a line you draw. The README says people use it for traffic studies, and that it detects "50+ common objects" out of the box. That count is theirs. It is a server application. This page did not inventory the detector weights it downloads. A MIT program can still fetch AGPL weights. Check before you copy any.

**Use it when** you are designing a count, not a speed. A count of crossings is a weaker claim than kilometres per hour, and it is the one a pole camera can support without a tape measure.

### Lane detection

| Repository | Licence | Stars | What the repository says it is |
|---|---|---|---|
| [cfzd/Ultra-Fast-Lane-Detection](https://github.com/cfzd/Ultra-Fast-Lane-Detection) | MIT | 2,061 | Ultra Fast Structure-aware Deep Lane Detection, ECCV 2020 |
| [Turoad/CLRNet](https://github.com/Turoad/CLRNet) | Apache-2.0 | 596 | CLRNet: Cross Layer Refinement Network for Lane Detection, CVPR 2022 |
| [lucastabelini/LaneATT](https://github.com/lucastabelini/LaneATT) | MIT | 699 | Keep your Eyes on the Lane, CVPR 2021 |

These are training repositories. No browser file was measured. They were not trained on Thai pole cameras, and this page will not pretend a dashcam lane model knows a flooded Sathorn Road.

**Use it when** you are studying how a lane line is represented (a curve, a row-wise classification). For FloodDash, the first honest question is whether the painted line is still visible in the rain. That can start from the edge instrument this site already has. A learned lane model comes after, on frames from these cameras.

### Flood and water datasets

These are the datasets people reach for. None of them is a Thai CCTV still.

| Source | Stars | Licence as checked | What it actually is |
|---|---|---|---|
| [BinaLab/FloodNet-Supervised_v1.0](https://github.com/BinaLab/FloodNet-Supervised_v1.0) | 100 | README: [CDLA-Permissive-1.0](https://cdla.io/permissive-1-0/). GitHub's SPDX field was empty. | 2,343 UAS images after Hurricane Harvey, with semantic damage labels. The README points at [the IEEE paper](https://ieeexplore.ieee.org/document/9460988). Aerial, not a pole. |
| [cloudtostreet/Sen1Floods11](https://github.com/cloudtostreet/Sen1Floods11) | 258 | No `LICENSE` file. | Sentinel-1 radar, georeferenced, for training flood models. Bonafilia, Tellman, Anderson and Issenberg, CVPR Workshops 2020. The [open-access HTML](http://openaccess.thecvf.com/content_CVPRW_2020/html/w11/Bonafilia_Sen1Floods11_A_Georeferenced_Dataset_to_Train_and_Test_Deep_Learning_CVPRW_2020_paper.html) answered. Satellite radar, not a JPEG from a bridge. |
| [xmlyqing00/V-FloodNet](https://github.com/xmlyqing00/V-FloodNet) | 34 | No `LICENSE` file. | Urban **video** flood segmentation and a water level estimated from reference objects. The README cites *Environmental Modelling & Software*, 2023. Closest task to a camera wall. No licence to copy. |
| [spaceml-org/ml4floods](https://github.com/spaceml-org/ml4floods) | 184 | **LGPL-3.0** | An end-to-end pipeline for flood extent. The README badges [doi:10.1038/s41598-023-47595-7](https://doi.org/10.1038/s41598-023-47595-7). Satellite imagery. |

**Use them when** you are learning the difference between sensors. A model trained on a drone or on Sentinel-1 will happily paint a mask on a Bangkok CCTV still. The mask is not evidence of water until you have labelled these cameras. V-FloodNet is the paper to read for "water level from a street video," and it stays a paper until the repository has a licence.

---

## Vision-language models

A vision-language model writes words about a picture. On a public camera those words can describe a person. That is a reason to keep them on the visitor's own photo, opt-in, and off the default camera wall.

### Florence-2

No `microsoft/Florence` GitHub repository existed on 12 October 2026. The official weights are on Hugging Face.

[microsoft/Florence-2-base](https://huggingface.co/microsoft/Florence-2-base) · **MIT** (the card and the `LICENSE` file) · not a GitHub star count

The card's table lists base at **0.23B** parameters and large at **0.77B**, pretrained on FLD-5B. The paper is [Florence-2: Advancing a Unified Representation for a Variety of Vision Tasks](https://arxiv.org/abs/2311.06242). Measured safetensors:

| Model | Downloads that day | Bytes |
|---|---|---|
| [Florence-2-base](https://huggingface.co/microsoft/Florence-2-base) | 3,029,224 | 463,221,266 |
| [Florence-2-large](https://huggingface.co/microsoft/Florence-2-large) | 371,194 | 1,553,563,458 |

Downloads are Hugging Face's counter, not stars. One model, many tasks: caption, detection, phrase grounding, region OCR. This page did not test Thai.

**In the browser.** The base safetensors file is 463,221,266 bytes, before any quantisation this page did not measure. A desktop experiment. Not a first load.

**Use it when** you want one MIT-licensed model that can point at a region and read the text in it, and you are working on a machine with the memory. For Thai, score it on ThaiOCRBench instead of assuming.

### Moondream

[m87-labs/moondream](https://github.com/m87-labs/moondream) · **Apache-2.0** · **10,100** stars on 12 October 2026

`vikhyat/moondream` redirects here. The README describes two variants, a 2B model and a 0.5B model aimed at edge devices. The Hugging Face card for [`vikhyatk/moondream2`](https://huggingface.co/vikhyatk/moondream2) says Apache-2.0, calls that repository the previous generation, and points at Moondream 3 preview as newer. Its `model.safetensors` was **3,854,538,968 bytes**. The 0.5B file was not measured. The card's sample code asks for `trust_remote_code`.

**In the browser.** A 3,854,538,968-byte checkpoint is not a page asset. The 0.5B variant is the one to measure before anyone talks about a phone.

**Use it when** you want a small captioner or a visual question on a server you control. Do not vendor the 3.85 GB file into this site.

### PaliGemma

Code: [google-research/big_vision](https://github.com/google-research/big_vision) · **Apache-2.0** · **3,544** stars on 12 October 2026

The research codebase for Gemma vision models, among others. The weights [`google/paligemma-3b-mix-224`](https://huggingface.co/google/paligemma-3b-mix-224) are a different grant: the model card says **Gemma**, and the repository is gated. A fetch of the README returned HTTP 401. The "3B" is the name of the checkpoint, not a file size measured here.

**In the browser.** A 3B gated model is not a classroom download.

**Use it when** you have accepted the Gemma terms and you are fine-tuning offline. The Apache grant on `big_vision` does not extend to those weights.

### Qwen-VL

[QwenLM/Qwen3-VL](https://github.com/QwenLM/Qwen3-VL) · **Apache-2.0** · **20,060** stars on 12 October 2026

`Qwen2-VL` and `Qwen2.5-VL` now resolve to this repository. The `LICENSE` file is Apache-2.0. The model card for [`Qwen/Qwen3-VL-2B-Instruct`](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct) also says Apache-2.0. The README's news lists larger sizes (4B, 8B, 32B, 30B-A3B, 235B-A22B). Only the 2B Instruct card was checked. The paper linked from the README is the [Qwen3-VL technical report](https://arxiv.org/pdf/2511.21631).

**In the browser.** Even the 2B model is a server model. No file size was measured, and none is needed to know it will not ride along with an 18 MB detector.

**Use it when** you are evaluating open vision-language models, including on ThaiOCRBench, on a GPU machine. Check the card of the exact size you download. Do not assume the 2B card covers the 235B weights.

---

## Data and labeling

### CVAT

[cvat-ai/cvat](https://github.com/cvat-ai/cvat) · **MIT** · **16,900** stars on 12 October 2026

The full annotation platform: boxes, polygons, video tracks. You run it yourself.

**Use it when** you are building a dataset — wet road versus dry road, lane line visible versus not — from frames you have the right to label. Not when you want the public site to store images. This site's rule is that frames are not kept.

### Label Studio

[HumanSignal/label-studio](https://github.com/HumanSignal/label-studio) · **Apache-2.0** · **28,445** stars on 12 October 2026

A broader labelling tool (images, and other data types) with a standard export.

**Use it when** the labelling task is not only boxes, or when the people labelling are more comfortable here than in CVAT. Same privacy rule: label copies you are allowed to hold, on a machine that is not the public web server.

### Roboflow

[roboflow/roboflow-python](https://github.com/roboflow/roboflow-python) · **Apache-2.0** · **634** stars on 12 October 2026

The official client for managing datasets and models on Roboflow. [docs.roboflow.com](https://docs.roboflow.com/) answered. The public catalogue is Universe, `https://universe.roboflow.com/`. An automated request to that host returned **403** on 12 October 2026, so this page does not claim to have enumerated it. Each dataset there has its own licence. Read that licence on the dataset you actually download. A famous page of car images is not a grant.

**Use it when** you want a dataset someone has already boxed, and you have read that dataset's licence. The Python client is Apache. The pictures might not be.

---

## Learning

The [reading list](reference/reading-list.md) remains the paper-by-paper path through this handbook. These are the living courses and libraries around it.

| Source | What was checked | Use it when |
|---|---|---|
| [Papers with Code](https://paperswithcode.com/) | The site returned HTTP 200. The data dump [paperswithcode/paperswithcode-data](https://github.com/paperswithcode/paperswithcode-data) has **944** stars and **no licence file**. | You want the current leaderboard for a task. Cite the paper, not only the table. Do not mirror the dump until it has a licence. |
| [CS231n notes](https://cs231n.github.io/) and the [course page](https://cs231n.stanford.edu/) | Both returned HTTP 200. The notes repository [cs231n/cs231n.github.io](https://github.com/cs231n/cs231n.github.io) is **MIT**, **11,065** stars. | You are learning convolutional networks. This is still the best free set of notes. Stanford's course page is the semester; the notes repository is the text you can fork. |
| [OpenCV](https://github.com/opencv/opencv) and the [4.13.0 docs](https://docs.opencv.org/4.13.0/) | Repository **Apache-2.0**, **91,156** stars. `https://docs.opencv.org/4.x/` redirected to the 4.13.0 modules page. `https://docs.opencv.org/5.0/` also returned HTTP 200. | You are implementing a classical step (optical flow, a line, a camera matrix) and you want the function's contract. Match the doc version to the library you installed. |
| [Dive into Deep Learning](https://github.com/d2l-ai/d2l-en) | **29,815** stars. The `LICENSE` file is **CC BY-SA 4.0**. GitHub's SPDX field was unset. | You want a course that runs, with the maths beside the code. Share-alike applies to adaptations of the book. |
| [fast.ai fastbook](https://github.com/fastai/fastbook) | **25,376** stars. The `LICENSE` file puts notebook **code** under **GPL-3.0** and says the prose is not covered by that grant. It names no other licence for the prose. | You want the practical deep-learning course. Fork the code under the GPL. Do not treat the book text as cleared for reuse. |
| [Szeliski, *Computer Vision: Algorithms and Applications*](https://szeliski.org/Book/) | The book site returned HTTP 200. It is already the textbook in the reading list. | You want the classical reference, free online, from pixels through geometry. |

---

### สรุปภาษาไทย

หน้านี้คือรายการซอร์สที่โคลนได้สำหรับงานคอมพิวเตอร์วิทัศน์ ตรวจเมื่อ 12 ตุลาคม 2569 ตัวเลขดาวคือจำนวนดาวบน GitHub ในวันนั้น สัญญาอนุญาตอ่านจากไฟล์ `LICENSE` และขนาดไฟล์วัดจากการดาวน์โหลดจริง

ของที่เว็บไซต์นี้ใช้อยู่แล้วคือ SSDLite MobileNetV2, MobileNetV2 และ MediaPipe Face Landmarker สัญญา Apache-2.0 ทั้งหมด

ข้อที่ต้องจำก่อนนำไปใช้บนเว็บสาธารณะ: Ultralytics YOLO เป็น **AGPL-3.0** และทางโครงการเองแยกสัญญาสำหรับงานโปรดักชันไว้ต่างหาก Depth Anything V2 เฉพาะรุ่น Small ที่เป็น Apache-2.0 รุ่น Base กับ Large เป็น CC-BY-NC ใช้เชิงพาณิชย์ไม่ได้ PaliGemma เป็นสัญญา Gemma และถูกปิดไว้หลังการขอสิทธิ์ ชุดข้อมูลน้ำท่วมที่มีอยู่เป็นภาพโดรนหรือดาวเทียม ไม่ใช่กล้องวงจรปิดของไทย ส่วน V-FloodNet ใกล้โจทย์ที่สุดแต่ไม่มีไฟล์สัญญาอนุญาตในรีโป

งานอักษรไทยให้เริ่มที่ PaddleOCR รุ่น `th_PP-OCRv5_mobile_rec`, Tesseract (`tha.traineddata`) และ EasyOCR แล้วใช้ PyThaiNLP ตัดคำหลังจากอ่านตัวอักษรได้แล้ว เกณฑ์ประเมินคือ ThaiOCRBench ของ SCB 10X อย่าใช้เครื่องมือเหล่านี้เพื่ออ่านป้ายทะเบียน
