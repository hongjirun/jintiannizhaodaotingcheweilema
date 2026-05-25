const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const W = 80, H = 96
const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')

// 气泡背景
ctx.fillStyle = '#1677ff'
ctx.beginPath()
ctx.arc(40, 38, 36, 0, Math.PI * 2)
ctx.fill()

// 底部尖角
ctx.beginPath()
ctx.moveTo(27, 66)
ctx.lineTo(53, 66)
ctx.lineTo(40, 90)
ctx.closePath()
ctx.fill()

// 车身
ctx.fillStyle = 'white'
ctx.beginPath()
ctx.roundRect(15, 35, 50, 20, 5)
ctx.fill()

// 车顶
ctx.beginPath()
ctx.roundRect(22, 22, 36, 16, 4)
ctx.fill()

// 挡风玻璃
ctx.fillStyle = '#90c8ff'
ctx.globalAlpha = 0.9
ctx.beginPath()
ctx.roundRect(24, 24, 32, 12, 2)
ctx.fill()
ctx.globalAlpha = 1

// 左轮
ctx.fillStyle = '#1677ff'
ctx.beginPath()
ctx.arc(24, 56, 7, 0, Math.PI * 2)
ctx.fill()
ctx.fillStyle = 'white'
ctx.beginPath()
ctx.arc(24, 56, 3.5, 0, Math.PI * 2)
ctx.fill()

// 右轮
ctx.fillStyle = '#1677ff'
ctx.beginPath()
ctx.arc(56, 56, 7, 0, Math.PI * 2)
ctx.fill()
ctx.fillStyle = 'white'
ctx.beginPath()
ctx.arc(56, 56, 3.5, 0, Math.PI * 2)
ctx.fill()

const outPath = path.resolve(__dirname, '../static/marker.png')
const buf = canvas.toBuffer('image/png')
fs.writeFileSync(outPath, buf)
console.log('marker.png generated:', outPath)
