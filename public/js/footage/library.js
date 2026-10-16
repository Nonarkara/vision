// Real frames from public cameras this site already plays.
//
// The bytes were saved from iTIC HLS streams named in the live catalogue
// (the same hosts CSP allows the browser to read). They are photographs,
// not drawings. Labels on the gate tiles were checked by looking at each
// crop: a tile is marked only when a car, a motorbike, or a person is
// actually in that crop. A lorry or a bus is not marked as a car.
//
// Owners: Intelligent Traffic Information Center Foundation
// (มูลนิธิศูนย์ข้อมูลจราจรอัจฉริยะไทย), carried in this catalogue by GISTDA.

export const FOOTAGE_OWNER = {
  id: 'itic',
  th: 'มูลนิธิศูนย์ข้อมูลจราจรอัจฉริยะไทย (iTIC)',
  en: 'iTIC Foundation (Intelligent Traffic Information Center)',
}

const cam = (id, th, en) => ({ id, th, en, owner: 'itic' })

export const CAMERAS = {
  rama4: cam('itic:ITICM_BMAMI0071', 'ถนนพระราม 4 แยกทางด่วนพระราม 4 กรุงเทพฯ', 'Rama IV Road at the expressway junction, Bangkok'),
  ratchada: cam('gistda:ITICM_BMAMI0164', 'รัชดาภิเษก–วงศ์สว่าง', 'Ratchadaphisek–Wongsawang'),
  bigc: cam('itic:ITICM_BMAMI0165', 'บิ๊กซี วงศ์สว่าง', 'Big C Wongsawang'),
  pracha: cam('itic:ITICM_BMAMI0211', 'ประชานุกูล ไปต่างระดับรัชวิภา', 'Prachanukul toward the Ratchawipha interchange'),
  bangna: cam('itic:ITICM_BMAMI0208', 'บางนา–ตราด', 'Bang Na–Trat'),
  sothon: cam('itic:ITICM_BMAMI0182', 'สามแยกศรีโสธรตัดใหม่–ถนนมหาจักพรรดิ์ ฉะเชิงเทรา', 'Si Sothon–Mahachak intersection, Chachoengsao'),
}

const frame = (dir, n) => `/footage/teach/${dir}/${String(n).padStart(2, '0')}.jpg`

export const TEACH = {
  busy: {
    camera: CAMERAS.rama4,
    frames: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => frame('busy', n)),
  },
  quiet: {
    camera: CAMERAS.sothon,
    frames: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => frame('quiet', n)),
  },
}

/** One crop of a real frame. `labels` is what a person can see in that crop. */
function tile(id, camera, labels, gate = false) {
  return { id, src: `/footage/tiles/${id}.jpg`, camera, labels, gate }
}

// Tiles a person can answer at a glance on a phone. Most crops are night
// frames where a car is a few pixels of headlight and a person or motorbike
// is not visible at all, so those stay in the library but never in the gate.
const GATE_CLEAR = new Set([
  // a car is plainly visible
  'rama4-3', 'rama4-4', 'rama4-6', 'rama4-7', 'rama4-8', 'bigc-7',
  // plainly no car: buildings, skyline, blank night sky
  'bangna-3', 'bangna-5', 'bangna-6', 'bigc-0', 'bigc-1', 'bigc-2', 'bigc-3', 'bigc-8',
  'ratchada-0', 'ratchada-1', 'ratchada-2', 'ratchada-7',
])

export const LIBRARY_TILES = [
  tile('rama4-3', 'rama4', ['car']),
  tile('rama4-4', 'rama4', ['car']),
  tile('rama4-5', 'rama4', ['car']),
  tile('rama4-6', 'rama4', ['car']),
  tile('rama4-7', 'rama4', ['car']),
  tile('rama4-8', 'rama4', ['car']),
  tile('ratchada-0', 'ratchada', []),
  tile('ratchada-1', 'ratchada', []),
  tile('ratchada-2', 'ratchada', []),
  tile('ratchada-3', 'ratchada', ['car']),
  tile('ratchada-4', 'ratchada', ['car']),
  tile('ratchada-5', 'ratchada', ['car']),
  tile('ratchada-6', 'ratchada', ['car', 'person']),
  tile('ratchada-7', 'ratchada', []),
  tile('ratchada-8', 'ratchada', []),
  tile('bigc-0', 'bigc', []),
  tile('bigc-1', 'bigc', []),
  tile('bigc-2', 'bigc', []),
  tile('bigc-3', 'bigc', []),
  tile('bigc-4', 'bigc', ['car', 'motorcycle']),
  tile('bigc-5', 'bigc', []),
  tile('bigc-6', 'bigc', ['car', 'motorcycle']),
  tile('bigc-7', 'bigc', ['car', 'motorcycle']),
  tile('bigc-8', 'bigc', []),
  tile('pracha-3', 'pracha', ['car']),
  tile('pracha-5', 'pracha', ['car']),
  tile('pracha-6', 'pracha', ['car', 'person']),
  tile('pracha-7', 'pracha', ['car']),
  tile('pracha-8', 'pracha', ['motorcycle']),
  tile('bangna-3', 'bangna', []),
  tile('bangna-4', 'bangna', ['car']),
  tile('bangna-5', 'bangna', ['car']),
  tile('bangna-6', 'bangna', ['car']),
  tile('bangna-7', 'bangna', ['person']),
]

/** The tiles the Drive gate may deal. */
export const GATE_TILES = LIBRARY_TILES.filter((t) => GATE_CLEAR.has(t.id)).map((t) => ({ ...t, gate: true }))
