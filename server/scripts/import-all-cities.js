/**
 * 全国主要城市停车场批量导入脚本
 * 用法：先获取 JWT token，然后运行：
 *   node scripts/import-all-cities.js <token>
 */
const https = require('https')
const http = require('http')

const API_BASE = 'https://parking.xianshihuodong.xyz/api'
const TOKEN = process.argv[2]

if (!TOKEN) {
  console.error('用法: node scripts/import-all-cities.js <JWT_TOKEN>')
  console.error('先调用 POST /api/admin/login 获取 token')
  process.exit(1)
}

const CITIES = [
  // 直辖市
  '北京', '上海', '天津', '重庆',
  // 广东省
  '广州', '深圳', '佛山', '东莞', '珠海', '惠州', '中山', '汕头', '湛江', '江门', '茂名', '肇庆', '梅州', '揭阳', '清远', '韶关', '河源', '阳江', '云浮', '潮州', '汕尾',
  // 其他省会/主要城市
  '成都', '武汉', '杭州', '南京', '西安', '郑州', '长沙', '沈阳', '哈尔滨', '长春',
  '合肥', '福州', '南昌', '济南', '太原', '石家庄', '呼和浩特', '南宁', '海口', '贵阳',
  '昆明', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐',
  // 重要地级市
  '苏州', '宁波', '青岛', '无锡', '烟台', '大连', '厦门', '温州', '绍兴', '金华',
  '南通', '常州', '嘉兴', '台州', '徐州', '泉州', '保定', '唐山', '洛阳', '南阳',
  '临沂', '潍坊', '淄博', '济宁', '泰安', '芜湖', '扬州', '镇江', '泰州', '宿迁',
  '漳州', '莆田', '赣州', '宜春', '上饶', '九江', '吉安', '衡阳', '株洲', '湘潭',
  '常德', '岳阳', '邵阳', '宜昌', '襄阳', '荆州', '黄石', '十堰',
  '绵阳', '德阳', '宜宾', '南充', '乐山', '达州', '遵义', '昆明', '大理', '丽江',
  '桂林', '柳州', '北海', '玉林',
]

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path)
    const isHttps = url.protocol === 'https:'
    const lib = isHttps ? https : http
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 60000,
    }
    const req = lib.request(options, (res) => {
      let raw = ''
      res.on('data', chunk => raw += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) } catch { resolve(raw) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    if (data) req.write(data)
    req.end()
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log(`开始导入 ${CITIES.length} 个城市的停车场数据...`)
  let total = 0
  let failed = []

  for (let i = 0; i < CITIES.length; i++) {
    const city = CITIES[i]
    process.stdout.write(`[${i+1}/${CITIES.length}] ${city} ... `)
    try {
      const res = await apiRequest('POST', '/admin/parking/import/poi', { city }, TOKEN)
      const count = res.message?.match(/(\d+)/)?.[1] || '?'
      console.log(`✓ 导入 ${count} 条`)
      total += parseInt(count) || 0
    } catch (e) {
      console.log(`✗ 失败: ${e.message}`)
      failed.push(city)
    }
    // 避免频率限制，每个城市间隔2秒
    if (i < CITIES.length - 1) await sleep(2000)
  }

  console.log(`\n========== 导入完成 ==========`)
  console.log(`累计导入: ${total} 条`)
  if (failed.length > 0) {
    console.log(`失败城市 (${failed.length}): ${failed.join(', ')}`)
  }
}

main().catch(console.error)
