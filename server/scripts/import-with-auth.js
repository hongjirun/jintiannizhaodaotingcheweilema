/**
 * 全国主要城市停车场批量导入脚本（带自动登录）
 * 用法：node scripts/import-with-auth.js
 */
const https = require('https')
const http = require('http')

const API_BASE = 'https://api.xianshihuodong.xyz/api'

// 管理员账号密码（从命令行参数获取，默认为 admin/admin123456）
const ADMIN_USER = process.argv[2] || 'admin'
const ADMIN_PASS = process.argv[3] || 'admin123456'
// 从第几个城市开始（0-based，默认0），用法: node import-with-auth.js admin admin123456 50
const START_INDEX = parseInt(process.argv[4]) || 0
// 最多导几个城市（默认全部），用法: node import-with-auth.js admin admin123456 0 30
const MAX_COUNT = parseInt(process.argv[5]) || 999

// 全国城市列表（按优先级排序）
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
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

async function login() {
  console.log('正在登录获取 token...')
  const res = await apiRequest('POST', '/admin/login', { username: ADMIN_USER, password: ADMIN_PASS })
  if (res.code !== 0 || !res.data?.token) {
    throw new Error('登录失败: ' + (res.message || '未知错误'))
  }
  console.log('✓ 登录成功')
  return res.data.token
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function getImportedCities(token) {
  try {
    const res = await apiRequest('GET', '/admin/parking/stats', null, token)
    if (res.code === 0 && res.data?.cityStats) {
      // 同时保留带"市"和不带"市"两种形式，确保能匹配上
      const set = new Set()
      res.data.cityStats.forEach(s => {
        const name = s.city || ''
        set.add(name)
        set.add(name.replace(/市$/, ''))
        set.add(name + '市')
      })
      return set
    }
  } catch (e) {
    console.log('⚠ 获取已导入城市失败，将导入全部城市')
  }
  return new Set()
}

async function main() {
  console.log(`开始导入 ${CITIES.length} 个城市的停车场数据...`)
  console.log('API地址:', API_BASE)
  
  // 登录获取 token
  const token = await login()

  // 获取已有数据的城市，跳过
  process.stdout.write('正在查询已导入城市...')
  const importedCities = await getImportedCities(token)
  console.log(` 已有数据城市 ${importedCities.size} 个: ${[...importedCities].join(', ') || '无'}`)

  let pendingCities = CITIES.filter(c => !importedCities.has(c))
  // 按 START_INDEX 和 MAX_COUNT 切片
  pendingCities = pendingCities.slice(START_INDEX, START_INDEX + MAX_COUNT)
  console.log(`待导入城市: ${pendingCities.length} 个 (从第${START_INDEX + 1}个未导入城市开始)\n`)

  if (pendingCities.length === 0) {
    console.log('所有城市已导入完毕，无需重复导入。')
    return
  }

  let total = 0
  let failed = []

  for (let i = 0; i < pendingCities.length; i++) {
    const city = pendingCities[i]
    process.stdout.write(`[${i+1}/${pendingCities.length}] ${city} ... `)
    try {
      const res = await apiRequest('POST', '/admin/parking/import/poi', { city }, token)
      const count = res.message?.match(/(\d+)/)?.[1] || '?'
      console.log(`✓ 导入 ${count} 条`)
      total += parseInt(count) || 0
    } catch (e) {
      console.log(`✗ 失败: ${e.message}`)
      failed.push(city)
    }
    // 避免频率限制，每个城市间隔3秒
    if (i < pendingCities.length - 1) await sleep(3000)
  }

  console.log(`\n========== 导入完成 ==========`)
  console.log(`本次导入: ${total} 条`)
  if (failed.length > 0) {
    console.log(`失败城市 (${failed.length}): ${failed.join(', ')}`)
  }
}

main().catch(console.error)
