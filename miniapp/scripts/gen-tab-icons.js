/**
 * 用 jimp 生成三套 tab 图标（地图/搜索/我的）
 * 用不同颜色块区分，灰色=未选中，蓝色=选中
 */
const Jimp = require('jimp')
const path = require('path')

const staticDir = path.resolve(__dirname, '../static')
const SIZE = 81

// 颜色
const GRAY   = 0x999999ff
const BLUE   = 0x1890ffff
const WHITE  = 0xffffffff
const TRANSP = 0x00000000

function clamp(v) { return Math.max(0, Math.min(SIZE - 1, Math.round(v))) }

// 画填充圆
function fillCircle(img, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        if (x >= 0 && x < SIZE && y >= 0 && y < SIZE)
          img.setPixelColor(color, x, y)
      }
    }
  }
}

// 画填充矩形
function fillRect(img, x1, y1, x2, y2, color) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE)
        img.setPixelColor(color, x, y)
}

// 画粗线（通过画矩形模拟）
function fillLine(img, x1, y1, x2, y2, thick, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps
    const x = Math.round(x1 + (x2 - x1) * t)
    const y = Math.round(y1 + (y2 - y1) * t)
    fillRect(img, x - thick, y - thick, x + thick, y + thick, color)
  }
}

async function genMapIcon(color) {
  const img = new Jimp(SIZE, SIZE, TRANSP)
  // 地图矩形背景
  fillRect(img, 8, 16, 72, 58, color)
  // 竖线
  fillRect(img, 28, 16, 30, 58, WHITE)
  fillRect(img, 50, 16, 52, 58, WHITE)
  // 横线
  fillRect(img, 8, 36, 72, 38, WHITE)
  // 定位圆
  fillCircle(img, 40, 30, 7, WHITE)
  // 定位小圆（透明表示洞）
  fillCircle(img, 40, 30, 3, color)
  // 下方三角
  for (let i = 0; i <= 7; i++)
    fillRect(img, 40 - i, 57 + i, 40 + i, 58 + i, color === GRAY ? GRAY : BLUE)
  return img
}

async function genSearchIcon(color) {
  const img = new Jimp(SIZE, SIZE, TRANSP)
  const cx = 30, cy = 30, r = 18, thick = 4
  // 圆环
  for (let angle = 0; angle < 360; angle += 0.5) {
    const rad = angle * Math.PI / 180
    for (let dr = r - thick; dr <= r; dr++) {
      const x = Math.round(cx + dr * Math.cos(rad))
      const y = Math.round(cy + dr * Math.sin(rad))
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE)
        img.setPixelColor(color, x, y)
    }
  }
  // 手柄斜线
  fillLine(img, 44, 44, 64, 64, 3, color)
  return img
}

async function genProfileIcon(color) {
  const img = new Jimp(SIZE, SIZE, TRANSP)
  // 头部圆
  fillCircle(img, 40, 22, 13, color)
  // 身体半圆
  for (let y = 40; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if ((x - 40) ** 2 + (y - 72) ** 2 <= 28 * 28 && y <= 72)
        img.setPixelColor(color, x, y)
    }
  }
  return img
}

async function main() {
  const icons = [
    { fn: genMapIcon,     gray: 'tab-map.png',     blue: 'tab-map-active.png' },
    { fn: genSearchIcon,  gray: 'tab-search.png',  blue: 'tab-search-active.png' },
    { fn: genProfileIcon, gray: 'tab-profile.png', blue: 'tab-profile-active.png' },
  ]

  for (const { fn, gray: gName, blue: bName } of icons) {
    const gImg = await fn(GRAY)
    await gImg.writeAsync(path.join(staticDir, gName))
    console.log('✓', gName)

    const bImg = await fn(BLUE)
    await bImg.writeAsync(path.join(staticDir, bName))
    console.log('✓', bName)
  }

  console.log('\n全部图标生成完毕！')
}

main().catch(console.error)
