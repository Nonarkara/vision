// The 80 things the detector was taught to find — the COCO dataset's object
// categories (Lin et al., 2014). COCO ids run to 90 with gaps; the gaps are
// categories the dataset's authors dropped, not missing translations.
// Thai names are ours. Every label the model prints also prints its score.

export const COCO = {
  1: ['person', 'คน'], 2: ['bicycle', 'จักรยาน'], 3: ['car', 'รถยนต์'], 4: ['motorcycle', 'รถจักรยานยนต์'],
  5: ['airplane', 'เครื่องบิน'], 6: ['bus', 'รถบัส'], 7: ['train', 'รถไฟ'], 8: ['truck', 'รถบรรทุก'],
  9: ['boat', 'เรือ'], 10: ['traffic light', 'ไฟจราจร'], 11: ['fire hydrant', 'หัวดับเพลิง'],
  13: ['stop sign', 'ป้ายหยุด'], 14: ['parking meter', 'มิเตอร์จอดรถ'], 15: ['bench', 'ม้านั่ง'],
  16: ['bird', 'นก'], 17: ['cat', 'แมว'], 18: ['dog', 'สุนัข'], 19: ['horse', 'ม้า'], 20: ['sheep', 'แกะ'],
  21: ['cow', 'วัว'], 22: ['elephant', 'ช้าง'], 23: ['bear', 'หมี'], 24: ['zebra', 'ม้าลาย'],
  25: ['giraffe', 'ยีราฟ'], 27: ['backpack', 'กระเป๋าเป้'], 28: ['umbrella', 'ร่ม'], 31: ['handbag', 'กระเป๋าถือ'],
  32: ['tie', 'เนกไท'], 33: ['suitcase', 'กระเป๋าเดินทาง'], 34: ['frisbee', 'จานร่อน'], 35: ['skis', 'สกี'],
  36: ['snowboard', 'สโนว์บอร์ด'], 37: ['sports ball', 'ลูกบอล'], 38: ['kite', 'ว่าว'],
  39: ['baseball bat', 'ไม้เบสบอล'], 40: ['baseball glove', 'ถุงมือเบสบอล'], 41: ['skateboard', 'สเก็ตบอร์ด'],
  42: ['surfboard', 'กระดานโต้คลื่น'], 43: ['tennis racket', 'ไม้เทนนิส'], 44: ['bottle', 'ขวด'],
  46: ['wine glass', 'แก้วไวน์'], 47: ['cup', 'ถ้วย'], 48: ['fork', 'ส้อม'], 49: ['knife', 'มีด'],
  50: ['spoon', 'ช้อน'], 51: ['bowl', 'ชาม'], 52: ['banana', 'กล้วย'], 53: ['apple', 'แอปเปิล'],
  54: ['sandwich', 'แซนด์วิช'], 55: ['orange', 'ส้ม'], 56: ['broccoli', 'บรอกโคลี'], 57: ['carrot', 'แครอท'],
  58: ['hot dog', 'ฮอตดอก'], 59: ['pizza', 'พิซซา'], 60: ['donut', 'โดนัท'], 61: ['cake', 'เค้ก'],
  62: ['chair', 'เก้าอี้'], 63: ['couch', 'โซฟา'], 64: ['potted plant', 'ต้นไม้ในกระถาง'], 65: ['bed', 'เตียง'],
  67: ['dining table', 'โต๊ะอาหาร'], 70: ['toilet', 'โถส้วม'], 72: ['tv', 'โทรทัศน์'], 73: ['laptop', 'แล็ปท็อป'],
  74: ['mouse', 'เมาส์'], 75: ['remote', 'รีโมต'], 76: ['keyboard', 'คีย์บอร์ด'], 77: ['cell phone', 'โทรศัพท์มือถือ'],
  78: ['microwave', 'ไมโครเวฟ'], 79: ['oven', 'เตาอบ'], 80: ['toaster', 'เครื่องปิ้งขนมปัง'], 81: ['sink', 'อ่างล้างจาน'],
  82: ['refrigerator', 'ตู้เย็น'], 84: ['book', 'หนังสือ'], 85: ['clock', 'นาฬิกา'], 86: ['vase', 'แจกัน'],
  87: ['scissors', 'กรรไกร'], 88: ['teddy bear', 'ตุ๊กตาหมี'], 89: ['hair drier', 'ไดร์เป่าผม'], 90: ['toothbrush', 'แปรงสีฟัน'],
}

/** The classes that matter on a road camera; the census and games count these. */
export const STREET = [1, 2, 3, 4, 6, 8, 9]

// Simplified Chinese names for the same English COCO labels. Not a third
// column of COCO — the Thai/English pair stays the dataset contract.
const COCO_ZH = {
  person: '人', bicycle: '自行车', car: '汽车', motorcycle: '摩托车', airplane: '飞机',
  bus: '公交车', train: '火车', truck: '卡车', boat: '船', 'traffic light': '红绿灯',
  'fire hydrant': '消防栓', 'stop sign': '停车标志', 'parking meter': '停车计时器', bench: '长椅',
  bird: '鸟', cat: '猫', dog: '狗', horse: '马', sheep: '羊', cow: '牛', elephant: '象',
  bear: '熊', zebra: '斑马', giraffe: '长颈鹿', backpack: '背包', umbrella: '伞', handbag: '手提包',
  tie: '领带', suitcase: '行李箱', frisbee: '飞盘', skis: '滑雪板', snowboard: '单板滑雪',
  'sports ball': '球', kite: '风筝', 'baseball bat': '棒球棒', 'baseball glove': '棒球手套',
  skateboard: '滑板', surfboard: '冲浪板', 'tennis racket': '网球拍', bottle: '瓶子',
  'wine glass': '酒杯', cup: '杯子', fork: '叉子', knife: '刀', spoon: '勺子', bowl: '碗',
  banana: '香蕉', apple: '苹果', sandwich: '三明治', orange: '橙子', broccoli: '西兰花',
  carrot: '胡萝卜', 'hot dog': '热狗', pizza: '披萨', donut: '甜甜圈', cake: '蛋糕',
  chair: '椅子', couch: '沙发', 'potted plant': '盆栽', bed: '床', 'dining table': '餐桌',
  toilet: '马桶', tv: '电视', laptop: '笔记本电脑', mouse: '鼠标', remote: '遥控器',
  keyboard: '键盘', 'cell phone': '手机', microwave: '微波炉', oven: '烤箱', toaster: '烤面包机',
  sink: '水槽', refrigerator: '冰箱', book: '书', clock: '钟', vase: '花瓶', scissors: '剪刀',
  'teddy bear': '泰迪熊', 'hair drier': '吹风机', toothbrush: '牙刷',
}

export function cocoName(id, lang) {
  const row = COCO[id]
  if (!row) return `#${id}`
  if (lang === 'th') return row[1]
  if (lang === 'zh') return COCO_ZH[row[0]] ?? row[0]
  return row[0]
}
