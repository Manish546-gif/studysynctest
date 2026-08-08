const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', 'public')

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const smooth = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

const GOLD = [255, 208, 47]
const PAPER = [255, 248, 240]

function render(size, contentScale) {
  const rgba = Buffer.alloc(size * size * 4)
  const S = size
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4
      const t = y / (S - 1)
      let r = lerp(43, 24, t)
      let g = lerp(45, 26, t)
      let b = lerp(72, 44, t)

      const cx = (x + 0.5) / S
      const cy = (y + 0.5) / S
      const px = 0.5 + (cx - 0.5) / contentScale
      const py = 0.5 + (cy - 0.5) / contentScale

      // soft halo behind the glyph
      const gd = Math.hypot(px - 0.5, py - 0.52)
      const glow = smooth(0.55, 0.2, gd) * 0.45
      r = lerp(r, GOLD[0], glow)
      g = lerp(g, GOLD[1], glow)
      b = lerp(b, GOLD[2], glow)

      // two overlapping nodes
      const dA = Math.hypot(px - 0.4, py - 0.52)
      const dB = Math.hypot(px - 0.6, py - 0.52)
      const cover = Math.max(1 - smooth(0.185, 0.195, dA), 1 - smooth(0.185, 0.195, dB))
      r = lerp(r, GOLD[0], cover)
      g = lerp(g, GOLD[1], cover)
      b = lerp(b, GOLD[2], cover)

      // shared center dot
      const dC = Math.hypot(px - 0.5, py - 0.52)
      const cC = 1 - smooth(0.07, 0.078, dC)
      r = lerp(r, PAPER[0], cC)
      g = lerp(g, PAPER[1], cC)
      b = lerp(b, PAPER[2], cC)

      // sparkle accent
      const dS = Math.hypot(px - 0.74, py - 0.3)
      const cS = 1 - smooth(0.048, 0.054, dS)
      r = lerp(r, PAPER[0], cS)
      g = lerp(g, PAPER[1], cS)
      b = lerp(b, PAPER[2], cS)

      rgba[i] = Math.round(clamp01(r) * 255)
      rgba[i + 1] = Math.round(clamp01(g) * 255)
      rgba[i + 2] = Math.round(clamp01(b) * 255)
      rgba[i + 3] = 255
    }
  }
  return encodePNG(S, S, rgba)
}

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 'pwa-192x192.png'), render(192, 1))
fs.writeFileSync(path.join(OUT_DIR, 'pwa-512x512.png'), render(512, 1))
fs.writeFileSync(path.join(OUT_DIR, 'pwa-maskable-512x512.png'), render(512, 0.72))
console.log('Generated PWA icons in', OUT_DIR)
