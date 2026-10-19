# Reading list · รายการอ่านเพิ่มเติม

The papers and resources behind each chapter. **Paper links below were checked on 5 October 2026** — arXiv identifiers against their titles, DOIs through Crossref. Where a publisher blocks automated checks, the DOI was confirmed through Crossref's metadata.

[← Handbook](../README.md)

---

## Start here (no maths required)

| Resource | Why |
|---|---|
| [vision.nonarkara.org](https://vision.nonarkara.org) and this handbook | live instruments on real cameras; runnable examples |
| [Teachable Machine](https://teachablemachine.withgoogle.com/) (Google) | the original browser transfer-learning toy; /train follows the same idea |
| [Feature Visualization](https://distill.pub/2017/feature-visualization/) (Olah, Mordvintsev & Schubert, *Distill*, 2017) | beautiful, interactive pictures of what network layers respond to |

## Going deeper

| Resource | Why |
|---|---|
| Richard Szeliski, [*Computer Vision: Algorithms and Applications*](https://szeliski.org/Book/), 2nd ed. (free online) | the standard textbook; classical and deep methods |
| [Stanford CS231n](https://cs231n.github.io/) course notes | the best free introduction to CNNs for vision |
| [TensorFlow.js](https://www.tensorflow.org/js) · [tfjs-models](https://github.com/tensorflow/tfjs-models) | the library and model zoo this site runs |
| [MDN: Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) | why some cameras can be analysed and others cannot |

## Build with open tools

**Choose the job before the library.** A box says *where something might be*. A mask colours its outline. A tracker links guesses across frames. An embedding turns a picture into numbers for comparison. None of those outputs is proof that the machine understood the scene.

**เริ่มจากงานที่อยากทำ:** กรอบบอกตำแหน่งที่คาดว่าเป็นวัตถุ หน้ากากระบายพื้นที่ของวัตถุ ตัวติดตามเชื่อมผลระหว่างเฟรม ส่วนเวกเตอร์ภาพใช้เปรียบเทียบความคล้าย ทั้งหมดอาจผิดได้ ไม่ใช่หลักฐานว่าเครื่องเข้าใจภาพแล้ว

- **Process pixels or camera geometry:** OpenCV. [Try edges and convolution](/learn#edges).
- **Train on named examples:** PyTorch + Torchvision. [Teach a model here](/train).
- **Find known objects:** start with YOLO; compare Detectron2 or MMDetection. [Learn about detection](/handbook/06).
- **Describe what to find in words:** Grounding DINO; CLIP for whole-picture comparisons. [Learn about neural networks](/handbook/05).
- **Outline an object I point at:** Segment Anything. [See segmentation research](/research#history-lab).
- **Follow objects through video:** ByteTrack or Norfair after a detector. [Try motion](/handbook/04).
- **Work with satellite images:** TorchGeo, Raster Vision, eo-learn or SAMGeo. [Go to spatial tools](#spatial-and-geospatial-tools).

### Pixels, training and detection

- **[OpenCV](https://github.com/opencv/opencv)** — Read images and video, correct camera distortion, find edges and match features. Start here for classical vision. OpenCV.js can run selected operations in a browser, but a full build is a substantial addition; Vision's small teaching operators remain plain JavaScript.
- **[PyTorch](https://github.com/pytorch/pytorch) + [Torchvision](https://github.com/pytorch/vision)** — Build and train neural networks; Torchvision supplies vision models, datasets and image transforms. These are Python development tools, not packages visitors need to install. Check the terms for the particular dataset and pretrained weights too.
- **[Ultralytics YOLO](https://github.com/ultralytics/ultralytics)** — A practical workflow for detection, segmentation, pose and tracking. Useful as an offline baseline before replacing a detector. Its repository uses AGPL-3.0 and offers enterprise licensing; inspect the terms for your intended distribution and model.
- **[Detectron2](https://github.com/facebookresearch/detectron2)** — A PyTorch framework for detection and instance segmentation: separating each object into its own region. Useful when you need custom experiments rather than a browser lesson.
- **[MMDetection](https://github.com/open-mmlab/mmdetection)** — Compare detection architectures through configurations and a model zoo. Match its dependency versions carefully; a larger toolbox is not automatically a faster or more accurate model.

**สรุป:** OpenCV เหมาะกับการประมวลผลภาพพื้นฐาน ส่วน PyTorch ใช้สร้างและฝึกโครงข่าย YOLO เป็นจุดเริ่มต้นสำหรับตรวจจับวัตถุ Detectron2 และ MMDetection เหมาะกับการทดลองที่ต้องปรับแต่งมากขึ้น เครื่องมือฝึกเหล่านี้ไม่ได้ทำงานอยู่ในหน้าเว็บนี้

### Outlines, words and visual similarity

- **[Segment Anything (SAM)](https://github.com/facebookresearch/segment-anything)** — Point or draw a box to propose an object's outline. Helpful for assisted labelling, but a person must check the masks. The linked repository is the original SAM, not every later model bearing its name.
- **[Grounding DINO](https://github.com/IDEA-Research/GroundingDINO)** — Propose boxes using text such as “bus”. Open vocabulary means you can ask for new phrases; it does not guarantee recognition of a vague concept such as a dangerous or flooded road.
- **[Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2)** — Estimate relative depth from one image: which surfaces appear nearer or farther. The default output is not a reliable distance in metres. Metric-depth variants are separate; Small weights use Apache-2.0, while Base/Large/Giant weights use CC-BY-NC-4.0 in this repository.
- **[DINOv2](https://github.com/facebookresearch/dinov2)** — Turn images into useful visual features for similarity search, grouping and downstream tasks. A candidate for comparing embeddings offline; it is not a drop-in replacement for Vision's 1,280-number MobileNet vectors. Check the exact model's terms, as specialised weights can differ.
- **[CLIP](https://github.com/openai/CLIP)** — Compare pictures with text descriptions. Useful for image search and choosing among written labels. A high similarity score is not a calibrated probability, a factual description or proof of a hazard.

**สรุป:** SAM ช่วยวาดขอบวัตถุ Grounding DINO ใช้คำบรรยายหากรอบ Depth Anything ประเมินความใกล้ไกล ส่วน DINOv2 และ CLIP ช่วยเปรียบเทียบภาพ ผลเหล่านี้ยังต้องตรวจสอบ โดยเฉพาะระยะทางและคำที่มีความหมายกว้าง

### Video, pose and tracking

- **[MediaPipe](https://github.com/google-ai-edge/mediapipe)** — Hand, face and pose landmarks, with browser-capable tasks. Vision already uses its Face Landmarker in [Focus](/focus); this is an existing dependency, not a newly added capability.
- **[MMPose](https://github.com/open-mmlab/mmpose)** — Human and animal pose models for Python experiments. Predicting joints tells you about visible geometry, not a person's intentions.
- **[ByteTrack](https://github.com/FoundationVision/ByteTrack)** — Link detections over time, including lower-score boxes matched to existing tracks. This can reduce broken tracks during occlusion. Its temporary track IDs are not people's identities. The original ifzhang link redirects to FoundationVision.
- **[Norfair](https://github.com/tryolabs/norfair)** — A lightweight Python tracker that accepts detections from different models. Useful for prototyping trajectories; camera movement, missed detections and crowded scenes can still break associations.
- **[OpenFace](https://github.com/TadasBaltrusaitis/OpenFace)** — A facial-behaviour research toolkit for landmarks, head pose, gaze and facial action units. This is the Baltrušaitis toolkit, not another project with the same name. Facial movements are not reliable readings of mood or attention. Check its specific licence and model/data terms before reuse.

**สรุป:** ตัวติดตามเชื่อมวัตถุข้ามเฟรม แต่หมายเลขชั่วคราวไม่ใช่การรู้ตัวบุคคล เครื่องมือใบหน้าวัดจุดและการเคลื่อนไหวที่เห็น ไม่ได้อ่านความคิด อารมณ์ หรือสมาธิได้แน่นอน

### Spatial and geospatial tools

- **[Raster Vision](https://github.com/azavea/raster-vision)** — Train and run models on aerial and satellite imagery, including processing large rasters in smaller pieces.
- **[TorchGeo](https://github.com/torchgeo/torchgeo)** — Geospatial datasets, samplers, transforms and pretrained models. Useful when location, image extent and aligned inputs matter. The original microsoft link redirects to torchgeo.
- **[eo-learn](https://github.com/sentinel-hub/eo-learn)** — Organise Earth-observation processing over time. Useful for comparing scenes; clouds, seasons and alignment can look like change without being the change you meant to measure.
- **[SAMGeo](https://github.com/opengeos/segment-geospatial)** — Apply segmentation to geospatial images and turn results into map features. Check georeferencing and manually inspect boundaries before treating them as mapped objects.
- **[Esri deep-learning installers](https://github.com/Esri/deep-learning-frameworks)** — Installation support for the ArcGIS ecosystem. This link is not a standalone library named “GeoAI”; it belongs in a workflow that already uses compatible ArcGIS software.
- **[ORB-SLAM3](https://github.com/UZ-SLAMLab/ORB_SLAM3)** — Estimate a moving camera's pose and build a map from visual or visual-inertial input. A robotics/mapping tool, not a traffic detector. It needs suitable camera calibration and uses GPLv3, with separate commercial arrangements described by its authors.

**สรุป:** ภาพดาวเทียมต้องจัดการพิกัด เมฆ เวลา และความตรงกันของภาพก่อนเปรียบเทียบ เครื่องมือ ArcGIS ต้องใช้กับระบบที่รองรับ ส่วน ORB-SLAM3 ใช้หาตำแหน่งกล้องที่เคลื่อนที่และสร้างแผนที่ ไม่ใช่ตรวจรถจากกล้องถนน

### What belongs in Vision?

**In use:** TensorFlow.js with self-hosted SSDLite/MobileNet weights, MediaPipe for face landmarks, and small JavaScript teaching algorithms. Every picture is processed on the visitor's device. Linking a repository here does not mean it runs on this site.

**Improved here:** the existing detector now releases temporary memory after a failed attempt, so retrying does not keep those allocations alive.

**Evaluate separately:** compare YOLO against the current detector on the same permitted clips, with precision/recall, phone latency and download size. Compare DINOv2/CLIP against MobileNet before changing the teaching representation. Add tracking only to a moving source, with explicit missed-frame and source-change behaviour. None of those replacements is deployed here.

**For a separate service:** OpenCV → detector → tracker is a sensible video pipeline; PyTorch is for training, and a runtime such as ONNX Runtime can serve an exported model. Satellite workflows need the spatial tools above. These would change the classroom's deployment and privacy model, so they are architectural options, not silent additions to this page.

**ใช้ในเว็บนี้จริง:** TensorFlow.js, MobileNet/SSDLite และ MediaPipe การทบทวนครั้งนี้ปรับการคืนหน่วยความจำเมื่อการตรวจจับล้มเหลว ส่วนการเปลี่ยนโมเดล เพิ่มตัวติดตาม หรือสร้างบริการประมวลผลบนเซิร์ฟเวอร์ยังเป็นทางเลือกที่ต้องวัดผลก่อน ไม่ได้ติดตั้งเพิ่มจากรายการนี้

Repository links, purposes and the specific qualifications above were reviewed against the maintainers' repositories on **19 October 2026**. Code, weights and datasets can have different terms; follow the linked project's current documentation for installation and reuse.

## By chapter

### 01–02 · Pixels, colour, thresholds
- **First digital image (1957).** Russell Kirsch's 176 × 176 scan of his son at the US National Bureau of Standards. [NIST, 2007](https://www.nist.gov/news-events/news/2007/05/fiftieth-anniversary-first-digital-image-marked).
- **Otsu, N. (1979).** A threshold selection method from gray-level histograms. *IEEE Trans. Systems, Man, and Cybernetics* 9(1). [doi:10.1109/TSMC.1979.4310076](https://doi.org/10.1109/TSMC.1979.4310076)

### 03 · Convolution and edges
- **Hubel, D. H. & Wiesel, T. N. (1959).** Receptive fields of single neurones in the cat's striate cortex. *J. Physiology* 148(3). [doi:10.1113/jphysiol.1959.sp006308](https://doi.org/10.1113/jphysiol.1959.sp006308) — edge-sensitive cells in a living visual system.
- **Sobel, I. & Feldman, G. (1968).** "A 3×3 isotropic gradient operator", Stanford AI Project talk (unpublished; widely documented, e.g. in Szeliski).
- **Canny, J. (1986).** A computational approach to edge detection. *IEEE TPAMI* 8(6). [doi:10.1109/TPAMI.1986.4767851](https://doi.org/10.1109/TPAMI.1986.4767851)
- **Dalal, N. & Triggs, B. (2005).** Histograms of oriented gradients for human detection. *CVPR*. [doi:10.1109/CVPR.2005.177](https://doi.org/10.1109/CVPR.2005.177)
- **Lowe, D. G. (2004).** Distinctive image features from scale-invariant keypoints (SIFT). *IJCV* 60. [doi:10.1023/B:VISI.0000029664.99615.94](https://doi.org/10.1023/B:VISI.0000029664.99615.94)

### 04 · Motion
- **Papert, S. (1966).** The Summer Vision Project. MIT AI Memo 100. [dspace.mit.edu/handle/1721.1/6125](https://dspace.mit.edu/handle/1721.1/6125) — the famous over-optimistic plan to solve vision in one summer.
- **Lucas, B. D. & Kanade, T. (1981)** and **Horn, B. K. P. & Schunck, B. G. (1981)** — the two classic optical-flow methods (see Szeliski, ch. 9).
- **Stauffer, C. & Grimson, W. E. L. (1999).** Adaptive background mixture models for real-time tracking. *CVPR* — the standard background model.

### 05 · Neural networks
- **Fukushima, K. (1980).** Neocognitron. *Biological Cybernetics* 36. [doi:10.1007/BF00344251](https://doi.org/10.1007/BF00344251)
- **LeCun, Y., Bottou, L., Bengio, Y. & Haffner, P. (1998).** Gradient-based learning applied to document recognition. *Proc. IEEE* 86(11). [doi:10.1109/5.726791](https://doi.org/10.1109/5.726791)
- **Deng, J. et al. (2009).** ImageNet: a large-scale hierarchical image database. *CVPR*. [doi:10.1109/CVPR.2009.5206848](https://doi.org/10.1109/CVPR.2009.5206848)
- **Krizhevsky, A., Sutskever, I. & Hinton, G. (2012).** ImageNet classification with deep convolutional neural networks (AlexNet). [NeurIPS](https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html)
- **Zeiler, M. D. & Fergus, R. (2014).** Visualizing and understanding convolutional networks. [arXiv:1311.2901](https://arxiv.org/abs/1311.2901)
- **He, K. et al. (2016).** Deep residual learning for image recognition (ResNet). [arXiv:1512.03385](https://arxiv.org/abs/1512.03385)
- **Howard, A. G. et al. (2017).** MobileNets. [arXiv:1704.04861](https://arxiv.org/abs/1704.04861)
- **Sandler, M. et al. (2018).** MobileNetV2: inverted residuals and linear bottlenecks. [arXiv:1801.04381](https://arxiv.org/abs/1801.04381) — **the network this site runs**, and SSDLite.
- **Dosovitskiy, A. et al. (2020).** An image is worth 16×16 words (Vision Transformer). [arXiv:2010.11929](https://arxiv.org/abs/2010.11929)
- **Radford, A. et al. (2021).** Learning transferable visual models from natural language supervision (CLIP). [arXiv:2103.00020](https://arxiv.org/abs/2103.00020)
- **Kirillov, A. et al. (2023).** Segment Anything. [arXiv:2304.02643](https://arxiv.org/abs/2304.02643)
- **Goodfellow, I., Shlens, J. & Szegedy, C. (2014).** Explaining and harnessing adversarial examples. [arXiv:1412.6572](https://arxiv.org/abs/1412.6572)
- **Brown, T. B. et al. (2017).** Adversarial patch. [arXiv:1712.09665](https://arxiv.org/abs/1712.09665)

### 06 · Object detection
- **Viola, P. & Jones, M. (2001).** Rapid object detection using a boosted cascade of simple features. *CVPR*. [doi:10.1109/CVPR.2001.990517](https://doi.org/10.1109/CVPR.2001.990517)
- **Girshick, R. et al. (2014).** Rich feature hierarchies for accurate object detection (R-CNN). [arXiv:1311.2524](https://arxiv.org/abs/1311.2524)
- **Lin, T.-Y. et al. (2014).** Microsoft COCO: common objects in context. [arXiv:1405.0312](https://arxiv.org/abs/1405.0312) — **the detector's training data**. [cocodataset.org](https://cocodataset.org/)
- **Ren, S. et al. (2015).** Faster R-CNN. [arXiv:1506.01497](https://arxiv.org/abs/1506.01497)
- **Redmon, J. et al. (2016).** You Only Look Once (YOLO). [arXiv:1506.02640](https://arxiv.org/abs/1506.02640)
- **Liu, W. et al. (2016).** SSD: Single Shot MultiBox Detector. [arXiv:1512.02325](https://arxiv.org/abs/1512.02325) — **the detector family this site runs**.
- **Ronneberger, O. et al. (2015).** U-Net (segmentation). [arXiv:1505.04597](https://arxiv.org/abs/1505.04597)

### 07 · Teaching a machine
- **Yosinski, J. et al. (2014).** How transferable are features in deep neural networks? [arXiv:1411.1792](https://arxiv.org/abs/1411.1792)
- **Kingma, D. P. & Ba, J. (2014).** Adam: a method for stochastic optimization. [arXiv:1412.6980](https://arxiv.org/abs/1412.6980) — the optimiser in `createLayer`.
- **Geirhos, R. et al. (2020).** Shortcut learning in deep neural networks. [arXiv:2004.07780](https://arxiv.org/abs/2004.07780)
- **Zech, J. R. et al. (2018).** Variable generalization performance of a deep learning model to detect pneumonia in chest radiographs. *PLOS Medicine*. [doi:10.1371/journal.pmed.1002683](https://doi.org/10.1371/journal.pmed.1002683)
- **Winkler, J. K. et al. (2019).** Association between surgical skin markings in dermoscopic images and diagnostic performance of a deep learning convolutional neural network. *JAMA Dermatology*. [doi:10.1001/jamadermatol.2019.1735](https://doi.org/10.1001/jamadermatol.2019.1735)

### 08 · Limits and ethics
- **Buolamwini, J. & Gebru, T. (2018).** Gender Shades: intersectional accuracy disparities in commercial gender classification. *FAT\**. [PMLR 81](https://proceedings.mlr.press/v81/buolamwini18a.html)
- **Mitchell, M. et al. (2019).** Model cards for model reporting. [arXiv:1810.03993](https://arxiv.org/abs/1810.03993) — the format of [models.md](models.md).
- **Thailand, Personal Data Protection Act B.E. 2562 (2019)**, in force 1 June 2022 — read with a lawyer; overseen by the Office of the Personal Data Protection Committee.

---

### สรุปภาษาไทย

รายการนี้รวบรวมงานวิจัยเบื้องหลังแต่ละบท ทุกลิงก์ตรวจสอบแล้วเมื่อวันที่ 5 ต.ค. 2569 สำหรับผู้เริ่มต้น แนะนำ Teachable Machine และบทความ Feature Visualization ของ Distill สำหรับผู้ที่ต้องการลงลึก แนะนำตำรา Szeliski (อ่านฟรีออนไลน์) และบันทึกวิชา CS231n ของ Stanford งานที่เว็บไซต์นี้ใช้โดยตรงคือ MobileNetV2 (Sandler et al., 2018), SSD (Liu et al., 2016) และ COCO (Lin et al., 2014)
