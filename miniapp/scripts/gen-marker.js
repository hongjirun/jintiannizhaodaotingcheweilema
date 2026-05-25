const fs = require('fs')
const path = require('path')

// 生成停车场标记SVG：蓝色气泡形，中间有一辆车的轮廓
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="96" viewBox="0 0 80 96">
  <!-- 气泡主体 -->
  <ellipse cx="40" cy="42" rx="36" ry="36" fill="#1677ff"/>
  <!-- 底部尖角 -->
  <polygon points="28,70 52,70 40,92" fill="#1677ff"/>
  <!-- 白色车图标 -->
  <!-- 车身 -->
  <rect x="18" y="38" width="44" height="20" rx="5" fill="white"/>
  <!-- 车顶 -->
  <rect x="24" y="28" width="32" height="14" rx="4" fill="white"/>
  <!-- 左轮 -->
  <circle cx="26" cy="58" r="6" fill="#1677ff"/>
  <circle cx="26" cy="58" r="3" fill="white"/>
  <!-- 右轮 -->
  <circle cx="54" cy="58" r="6" fill="#1677ff"/>
  <circle cx="54" cy="58" r="3" fill="white"/>
  <!-- 挡风玻璃 -->
  <rect x="26" y="30" width="28" height="10" rx="2" fill="#90c8ff" opacity="0.7"/>
</svg>`

const outPath = path.join(__dirname, '../static/marker.png')
const svgPath = path.join(__dirname, '../static/marker.svg')

fs.writeFileSync(svgPath, svg, 'utf8')
console.log('SVG saved to:', svgPath)
console.log('Please convert marker.svg to marker.png (80x96px) and place in static/')
