/**
 * 生成分享封面图片
 */
const fs = require('fs')
const path = require('path')

function createShareImage(width, height, drawFn) {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  const ihdr = createChunk('IHDR', Buffer.concat([
    writeUint32(width),
    writeUint32(height),
    Buffer.from([8, 2, 0, 0, 0])
  ]))
  
  const imageData = Buffer.alloc(width * height * 3)
  const rowSize = width * 3
  
  drawFn((x, y, r, g, b) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = y * rowSize + x * 3
      imageData[idx] = r
      imageData[idx + 1] = g
      imageData[idx + 2] = b
    }
  })
  
  const rawData = Buffer.alloc(height * (rowSize + 1))
  for (let y = 0; y < height; y++) {
    rawData[y * (rowSize + 1)] = 0
    imageData.copy(rawData, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize)
  }
  
  const zlib = require('zlib')
  const compressed = zlib.deflateSync(rawData)
  const idat = createChunk('IDAT', compressed)
  const iend = createChunk('IEND', Buffer.alloc(0))
  
  return Buffer.concat([pngSignature, ihdr, idat, iend])
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const chunkData = Buffer.concat([typeBuffer, data])
  const crc = calculateCRC(chunkData)
  return Buffer.concat([writeUint32(data.length), chunkData, writeUint32(crc)])
}

function writeUint32(val) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32BE(val >>> 0)
  return buf
}

function calculateCRC(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1))
    }
  }
  return ~crc >>> 0
}

// 绘制分享封面（500x400）
const png = createShareImage(500, 400, (setPixel) => {
  // 背景渐变（蓝色系）
  for (let y = 0; y < 400; y++) {
    for (let x = 0; x < 500; x++) {
      const r = 22
      const g = Math.floor(119 + (y / 400) * 50)
      const b = Math.floor(255 - (y / 400) * 100)
      setPixel(x, y, r, g, b)
    }
  }
  
  // 绘制停车图标（简单的P图标）
  const centerX = 250
  const iconY = 150
  const radius = 60
  
  // 圆形背景（白色）
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= radius * radius) {
        setPixel(centerX + x, iconY + y, 255, 255, 255)
      }
    }
  }
  
  // P字母（蓝色）
  for (let y = -30; y <= 30; y++) {
    for (let x = -20; x <= 20; x++) {
      // P的形状
      if ((x >= -15 && x <= -5 && y >= -25 && y <= 25) || // 竖线
          (y >= 20 && y <= 25 && x >= -15 && x <= 15) ||   // 上横线
          (y >= -5 && y <= 0 && x >= -15 && x <= 15) ||    // 中横线
          (x >= 10 && x <= 15 && y >= -5 && y <= 20)) {   // 右竖线
        setPixel(centerX + x, iconY + y, 22, 119, 255)
      }
    }
  }
  
  // 底部文字区域（白色背景条）
  for (let y = 300; y < 360; y++) {
    for (let x = 50; x < 450; x++) {
      setPixel(x, y, 255, 255, 255)
    }
  }
})

const outPath = path.join(__dirname, 'share-cover.png')
fs.writeFileSync(outPath, png)
console.log('✅ 分享封面已生成:', outPath)
