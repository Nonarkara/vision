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

export function cocoName(id, lang) {
  const row = COCO[id]
  if (!row) return `#${id}`
  return lang === 'th' ? row[1] : row[0]
}
