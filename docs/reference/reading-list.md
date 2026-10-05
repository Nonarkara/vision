# Reading list · รายการอ่านเพิ่มเติม

The papers and resources behind each chapter. **Every link was checked on 5 October 2026** — arXiv identifiers against their titles, DOIs through Crossref. Where a publisher blocks automated checks, the DOI was confirmed through Crossref's metadata.

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
