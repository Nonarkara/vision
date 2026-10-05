// A PNG writer in 40 lines, so the examples need no packages.
//
// A PNG file is: an 8-byte signature, then "chunks". Each chunk is
// [length][type][data][CRC]. We need three: IHDR (size and pixel format),
// IDAT (the pixels, zlib-compressed, each row prefixed with a filter byte),
// and IEND (the end). That is the whole format for an RGBA picture.

import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Encode an ImageData-shaped object ({ data: RGBA bytes, width, height }) as PNG bytes. */
export function encodePng({ data, width, height }) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bits per channel
  ihdr[9] = 6   // colour type 6 = RGBA
  // [10..12] compression, filter, interlace: all 0
  const rows = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    rows[y * (width * 4 + 1)] = 0 // filter type 0: the row as-is
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(rows, y * (width * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Write a PNG, scaled up by an integer factor with hard pixel edges (so small pictures stay readable). */
export function writePng(file, img, scale = 1) {
  const out = scale === 1 ? img : upscale(img, scale)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, encodePng(out))
  return file
}

export function upscale({ data, width, height }, s) {
  const W = width * s, H = height * s
  const out = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const src = (((y / s) | 0) * width + ((x / s) | 0)) * 4
    out.set(data.subarray(src, src + 4), (y * W + x) * 4)
  }
  return { data: out, width: W, height: H }
}
