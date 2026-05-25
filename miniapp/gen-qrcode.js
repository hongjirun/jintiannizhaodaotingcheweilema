const fs = require('fs')
const path = require('path')

// 生成一个简单的二维码占位图（200x200）
const zlib = require('zlib')

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

function createPNG(width, height, drawFn) {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type (RGBA)
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const pixels = Buffer.alloc((width + 1) * height * 4)
  
  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const rowStart = y * (width + 1) * 4 + 4
    const idx = rowStart + x * 4
    pixels[idx] = r
    pixels[idx + 1] = g
    pixels[idx + 2] = b
    pixels[idx + 3] = a
  }

  // 白色背景
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(x, y, 255, 255, 255)
    }
  }
  
  drawFn({ setPixel, width, height })

  const compressed = zlib.deflateSync(pixels)
  const ihdrChunk = chunk('IHDR', ihdr)
  const idatChunk = chunk('IDAT', compressed)
  const iendChunk = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([PNG_SIG, ihdrChunk, idatChunk, iendChunk])
}

// 绘制二维码样式图案
function drawQRCode({ setPixel, width, height }) {
  const size = 120
  const startX = (width - size) / 2
  const startY = (height - size) / 2
  const cellSize = Math.floor(size / 25)
  
  // 二维码数据（简化版：三个定位角 + 随机点）
  function drawPositionMarker(sx, sy) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4)) {
          for (let dy = 0; dy < cellSize; dy++) {
            for (let dx = 0; dx < cellSize; dx++) {
              setPixel(sx + x * cellSize + dx, sy + y * cellSize + dy, 0, 0, 0)
            }
          }
        }
      }
    }
  }
  
  // 三个定位角
  drawPositionMarker(startX, startY)
  drawPositionMarker(startX + size - 7 * cellSize, startY)
  drawPositionMarker(startX, startY + size - 7 * cellSize)
  
  // 中间随机点
  for (let y = 10; y < 15; y++) {
    for (let x = 10; x < 15; x++) {
      if (Math.random() > 0.5) {
        for (let dy = 0; dy < cellSize; dy++) {
          for (let dx = 0; dx < cellSize; dx++) {
            setPixel(startX + x * cellSize + dx, startY + y * cellSize + dy, 0, 0, 0)
          }
        }
      }
    }
  }
  
  // 文字提示区域
  const textY = startY + size + 20
  for (let x = 20; x < width - 20; x++) {
    for (let y = textY; y < textY + 2; y++) {
      setPixel(x, y, 200, 200, 200)
    }
  }
}

const png = createPNG(200, 240, drawQRCode)
const outPath = path.join(__dirname, 'static', 'group-qrcode.png')
fs.writeFileSync(outPath, png)
console.log('✅ group-qrcode.png generated:', outPath, `(${png.length} bytes)`)
