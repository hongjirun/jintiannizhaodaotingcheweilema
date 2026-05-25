/**
 * 生成tabBar图标PNG（不依赖canvas，直接写最小有效PNG）
 * 地图图标：地图+定位针 | 搜索图标：放大镜
 */
const fs = require('fs')
const path = require('path')

// 最小1x1透明PNG base64
// 我们用SVG转PNG的方式：先生成SVG内容，再用sharp或直接写SVG数据URI
// 由于环境限制，直接写带内容的最小PNG

// 用纯JS生成32x32 PNG（不依赖任何包）
// PNG格式：PNG signature + IHDR + IDAT + IEND

const zlib = require('zlib')

function byte(...args) { return Buffer.from(args) }

function uint32BE(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n, 0)
  return b
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  const table = makeCRCTable()
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

let _crcTable = null
function makeCRCTable() {
  if (_crcTable) return _crcTable
  _crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    _crcTable[n] = c
  }
  return _crcTable
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBytes, data])
  const crcVal = crc32(crcData)
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crcVal)])
}

function makePNG(pixels, w, h) {
  // pixels: Uint8Array of RGBA w*h*4
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = chunk('IHDR', Buffer.concat([
    uint32BE(w), uint32BE(h),
    byte(8, 2, 0, 0, 0) // bit depth=8, color type=2(RGB), no alpha for simplicity
  ]))
  // Actually use RGBA: color type 6
  const ihdr2 = chunk('IHDR', Buffer.concat([
    uint32BE(w), uint32BE(h),
    byte(8, 6, 0, 0, 0) // bit depth=8, color type=6(RGBA)
  ]))

  // Build raw scanlines
  const raw = []
  for (let y = 0; y < h; y++) {
    raw.push(0) // filter byte
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3])
    }
  }
  const rawBuf = Buffer.from(raw)
  const compressed = zlib.deflateSync(rawBuf)
  const idat = chunk('IDAT', compressed)
  const iend = chunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, ihdr2, idat, iend])
}

function createPixels(w, h, drawFn) {
  const pixels = new Uint8Array(w * h * 4)
  // fill transparent
  for (let i = 0; i < w * h * 4; i += 4) {
    pixels[i] = 0; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 0
  }
  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= w || y < 0 || y >= h) return
    const i = (Math.round(y) * w + Math.round(x)) * 4
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a
  }
  function fillRect(x1, y1, x2, y2, r, g, b, a = 255) {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++)
        setPixel(x, y, r, g, b, a)
  }
  function circle(cx, cy, radius, r, g, b, a = 255, fill = true) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if (fill ? d <= radius : (d >= radius - 1.2 && d <= radius))
          setPixel(x, y, r, g, b, a)
      }
    }
  }
  drawFn({ setPixel, fillRect, circle, w, h })
  return pixels
}

// 颜色
const GRAY   = [153, 153, 153]
const BLUE   = [22, 119, 255]
const WHITE  = [255, 255, 255]

// 地图图标（灰色）：地图折叠形状 + 定位针
function drawMapIcon(color) {
  return ({ fillRect, circle, setPixel, w, h }) => {
    const [r, g, b] = color
    // 地图轮廓：梯形/矩形
    for (let y = 8; y <= 20; y++) {
      for (let x = 4; x <= 27; x++) {
        // 地图折线纹路
        const inMap = (y >= 8 && y <= 20 && x >= 4 && x <= 27)
        if (!inMap) continue
        // 边框
        if (y === 8 || y === 20 || x === 4 || x === 27) {
          setPixel(x, y, r, g, b)
        }
      }
    }
    // 地图内的折线（简化）
    for (let x = 10; x <= 21; x++) setPixel(x, 13, r, g, b)
    for (let y = 8; y <= 20; y++) setPixel(12, y, r, g, b)
    for (let y = 8; y <= 20; y++) setPixel(19, y, r, g, b)

    // 定位针：圆头+尖底
    circle(16, 22, 4, r, g, b, 255, true)
    // 针尖
    for (let dy = 0; dy <= 4; dy++) {
      const hw = Math.max(0, 2 - dy)
      for (let dx = -hw; dx <= hw; dx++) setPixel(16 + dx, 26 + dy, r, g, b)
    }
    // 针中心白点
    circle(16, 22, 1.5, 255, 255, 255, 255, true)
  }
}

// 搜索图标：放大镜
function drawSearchIcon(color) {
  return ({ circle, setPixel }) => {
    const [r, g, b] = color
    circle(13, 13, 7, r, g, b, 255, false)
    for (let i = 0; i <= 6; i++) {
      setPixel(18 + i, 18 + i, r, g, b)
      setPixel(19 + i, 18 + i, r, g, b)
      setPixel(18 + i, 19 + i, r, g, b)
    }
  }
}

// 我的图标：人物轮廓
function drawProfileIcon(color) {
  return ({ circle, fillRect, setPixel }) => {
    const [r, g, b] = color
    // 头部
    circle(16, 10, 5, r, g, b, 255, true)
    // 身体（梯形）
    for (let y = 17; y <= 26; y++) {
      const hw = Math.round(3 + (y - 17) * 0.5)
      for (let x = 16 - hw; x <= 16 + hw; x++) {
        setPixel(x, y, r, g, b)
      }
    }
  }
}

const outDir = path.join(__dirname, 'static')
const distDir = path.join(__dirname, 'dist', 'build', 'mp-weixin', 'static')

const icons = [
  { file: 'tab-map.png',            draw: drawMapIcon(GRAY) },
  { file: 'tab-map-active.png',     draw: drawMapIcon(BLUE) },
  { file: 'tab-search.png',         draw: drawSearchIcon(GRAY) },
  { file: 'tab-search-active.png',  draw: drawSearchIcon(BLUE) },
  { file: 'tab-profile.png',        draw: drawProfileIcon(GRAY) },
  { file: 'tab-profile-active.png', draw: drawProfileIcon(BLUE) },
]

for (const { file, draw } of icons) {
  const pixels = createPixels(32, 32, draw)
  const png = makePNG(pixels, 32, 32)
  fs.writeFileSync(path.join(outDir, file), png)
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, file), png)
  }
  console.log(`✅ ${file} (${png.length} bytes)`)
}
// 地图标记点图标：蓝色圆点带P字（36x36）
function drawMarkerIcon() {
  return ({ circle, fillRect, setPixel }) => {
    // 背景蓝色圆形
    circle(18, 18, 14, 22, 119, 255, 255, true)
    // 白色P字（简化）
    for (let y = 10; y <= 26; y++) {
      setPixel(14, y, 255, 255, 255)
    }
    for (let x = 14; x <= 22; x++) {
      setPixel(x, 10, 255, 255, 255)
      setPixel(x, 18, 255, 255, 255)
    }
    for (let y = 10; y <= 18; y++) {
      setPixel(22, y, 255, 255, 255)
    }
  }
}

// 生成 marker.png
const markerPixels = createPixels(36, 36, drawMarkerIcon())
const markerPng = makePNG(markerPixels, 36, 36)
fs.writeFileSync(path.join(outDir, 'marker.png'), markerPng)
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'marker.png'), markerPng)
}
console.log(`✅ marker.png (${markerPng.length} bytes)`)

console.log('图标生成完成')
