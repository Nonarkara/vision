# Glossary · อภิธานศัพท์

Every term used in the handbook, in English and Thai, with the chapter where it is explained. Thai renderings follow common Thai usage in computing; where Thai speakers usually keep the English word, we do too.

[← Handbook](../README.md)

| English | ไทย | Plain meaning · ความหมาย | Ch. |
|---|---|---|---|
| **pixel** | พิกเซล | one square of a picture; three numbers (R, G, B) from 0 to 255 | 01 |
| **resolution** | ความละเอียด | how many pixels a picture has; how many numbers you keep | 01 |
| **RGB** | อาร์จีบี (แดง เขียว น้ำเงิน) | the three colour channels a screen and most cameras use | 01 |
| **channel** | ช่องสี | one of the colour layers (R, G or B) of a picture | 01 |
| **brightness / luma** | ความสว่าง | one number per pixel: 0.299R + 0.587G + 0.114B | 01 |
| **grayscale** | ภาพขาวดำ (ระดับเทา) | a picture reduced to brightness only | 02 |
| **histogram** | ฮิสโทแกรม | a count of how many pixels have each brightness | 02 |
| **threshold** | เกณฑ์ / ค่าแบ่ง | one number dividing "on" from "off" | 02 |
| **Otsu's method** | วิธีของโอตสึ | choosing the threshold that best separates two groups | 02 |
| **colour space** | ปริภูมิสี | a way of describing colour with numbers (RGB, HSV, Lab…) | 02 |
| **convolution** | คอนโวลูชัน | sliding a small window of weights over a picture, multiply-and-add at each spot | 03 |
| **kernel / filter** | เคอร์เนล / ตัวกรอง | the small grid of weights used in a convolution | 03 |
| **edge** | ขอบ | where brightness changes sharply | 03 |
| **Sobel operator** | ตัวดำเนินการโซเบล | a pair of 3×3 kernels measuring horizontal and vertical change | 03 |
| **blur** | การเบลอ | averaging neighbours; removes noise and detail | 03 |
| **noise** | สัญญาณรบกวน | random variation in pixel values from the sensor | 03, 04 |
| **frame** | เฟรม / ภาพหนึ่งภาพ | one picture in a video | 04 |
| **frame differencing** | การลบภาพต่อเนื่อง | subtracting the previous frame to find what changed | 04 |
| **dilation** | การขยายพื้นที่ | growing marked pixels so broken shapes join | 04 |
| **connected component / blob** | กลุ่มพิกเซลที่ต่อกัน | a group of touching marked pixels | 04 |
| **bounding box** | กรอบล้อมวัตถุ | the rectangle drawn around something found | 04, 06 |
| **optical flow** | การไหลของภาพ | estimating where each pixel moved between frames | 04 |
| **tracking** | การติดตาม | linking the same object across frames; sensitive when the object is a person | 04, 08 |
| **neural network** | โครงข่ายประสาทเทียม | layers of weighted sums whose weights are learned from examples | 05 |
| **CNN (convolutional neural network)** | โครงข่ายประสาทเทียมแบบคอนโวลูชัน | a neural network built from learned convolutions | 05 |
| **layer** | ชั้น | one stage of a network, transforming the previous stage's output | 05 |
| **weight / parameter** | น้ำหนัก / พารามิเตอร์ | one learned number inside a network | 05 |
| **training** | การฝึก | adjusting weights to make fewer mistakes on labelled examples | 05, 07 |
| **label** | ป้ายกำกับ | the right answer attached to a training example | 05 |
| **loss** | ค่าความสูญเสีย | a number measuring how wrong the network was | 05, 07 |
| **gradient descent** | การลดตามความชัน | nudging every weight a little in the direction that lowers the loss | 05, 07 |
| **backpropagation** | การแพร่ย้อนกลับ | the method that computes which way to nudge each weight | 05 |
| **Adam** | อดัม | a gradient-descent method that adapts the step size per weight | 07 |
| **epoch / pass** | รอบการฝึก | one pass over every training example | 07 |
| **feature** | ลักษณะเด่น | a number (or set of numbers) describing something useful about a picture | 05 |
| **embedding / fingerprint** | เอมเบดดิง / ลายนิ้วมือของภาพ | the 1,280 numbers MobileNetV2 produces to summarise a picture | 05, 07 |
| **backbone** | โครงข่ายฐาน | a network reused to produce features for another task | 05, 06 |
| **depthwise separable convolution** | คอนโวลูชันแบบแยกความลึก | a cheaper convolution: space and channels handled in separate steps | 05 |
| **ImageNet** | อิมเมจเน็ต | 14 million labelled photos; its 1,000-class subset trained MobileNetV2 | 05 |
| **COCO** | โคโค่ | a detection dataset with 80 object categories; trained our detector | 06 |
| **classification** | การจำแนก | one label for a whole picture | 05, 06 |
| **object detection** | การตรวจจับวัตถุ | finding what is where: boxes with labels and scores | 06 |
| **segmentation** | การแบ่งส่วนภาพ | a label for every pixel | 06 |
| **anchor box** | กล่องอ้างอิง | a preset box the detector adjusts to fit objects; SSDLite has 1,917 | 06 |
| **confidence score** | คะแนนความมั่นใจ | how strongly a pattern resembled a class — not the chance of being right | 05, 06 |
| **IoU (intersection over union)** | อัตราส่วนพื้นที่ทับซ้อน | overlap area ÷ combined area of two boxes | 06 |
| **non-maximum suppression (NMS)** | การกำจัดกล่องซ้ำ | keeping the best of overlapping boxes, dropping the rest | 06 |
| **precision** | ความแม่นยำ (ของสิ่งที่ตอบ) | of the answers given, the share that were right | 06 |
| **recall** | ความครบถ้วน (ของสิ่งที่หาเจอ) | of the real things, the share that were found | 06 |
| **false positive / false alarm** | ผลบวกลวง / แจ้งเตือนผิด | the machine found something that is not there | 06 |
| **false negative / miss** | ผลลบลวง / พลาด | the machine missed something that is there | 06, 08 |
| **mAP (mean average precision)** | ค่าเฉลี่ยความแม่นยำ | the standard single-number score for detectors | 06 |
| **transfer learning** | การเรียนรู้แบบถ่ายโอน | reusing a trained network and teaching only the last step | 07 |
| **k-nearest neighbours (k-NN)** | เพื่อนบ้านใกล้สุด k ตัว | labelling by a vote of the most similar examples | 07 |
| **cosine similarity** | ความคล้ายโคไซน์ | how closely two embeddings point the same way (1 = same) | 07 |
| **softmax** | ซอฟต์แมกซ์ | turning scores into probabilities that sum to 1 | 07 |
| **leave-one-out** | การทดสอบแบบเว้นหนึ่ง | testing each example by predicting it from all the others | 07 |
| **PCA (principal component analysis)** | การวิเคราะห์องค์ประกอบหลัก | squeezing many numbers into a few, keeping the most variation | 07 |
| **overfitting** | การจำแทนการเข้าใจ | doing well on training examples, badly on new ones | 07 |
| **shortcut learning** | การเรียนทางลัด | learning an easy, wrong difference (e.g. "dark = river") | 07 |
| **active learning** | การเรียนรู้เชิงรุก | asking a person to label the cases the model is least sure of | 07 |
| **drift** | การเลื่อนไหลของข้อมูล | accuracy decaying as the world or the camera changes | 07, 08 |
| **adversarial example** | ตัวอย่างหลอกลวง | an input crafted to fool a model | 05, 08 |
| **bias** | อคติ | errors falling unevenly on some groups or places | 08 |
| **human in the loop** | ให้คนร่วมตัดสินใจ | a person reviews the machine's findings before action | 08 |
| **personal data** | ข้อมูลส่วนบุคคล | information identifying a person directly or indirectly (PDPA s.6) | 08 |
| **biometric data** | ข้อมูลชีวภาพ | body-derived identifiers such as faces; sensitive under PDPA s.26 | 08 |
| **CORS** | คอร์ส (การอนุญาตข้ามโดเมน) | a site's permission for other pages to read its content | sys |
| **tainted canvas** | แคนวาสปนเปื้อน | a canvas holding unpermitted pixels, which JavaScript may not read | sys |
| **HLS** | เอชแอลเอส | HTTP Live Streaming: video sent as small files listed in a playlist | sys |
| **relay** | ตัวส่งต่อ | our server passing a still frame through memory, same-origin | sys |
| **circuit breaker** | ตัวตัดวงจร | pausing requests to a host that keeps failing | sys |
| **rate limit** | การจำกัดอัตรา | a cap on requests per client per minute | sys |
| **CSP (Content-Security-Policy)** | นโยบายความปลอดภัยเนื้อหา | browser rules limiting where a page may load code and media from | sys |
| **WebGL** | เว็บจีแอล | the browser's access to the graphics card; TF.js computes with it | sys |
| **tensor** | เทนเซอร์ | a block of numbers with a shape, e.g. 1 × 300 × 300 × 3 | sys |
| **edge inference** | การประมวลผลที่ปลายทาง | running models where the camera is, sending only results | sys |

*"sys" = the [system](../system/architecture.md) pages.*
