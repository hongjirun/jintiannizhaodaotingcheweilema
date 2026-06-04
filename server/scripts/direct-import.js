/**
 * 直接从腾讯地图API拉取全国停车点位数据
 * 并直接导入数据库
 */
const https = require('https')
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

// 腾讯地图API Keys（轮换使用防限流）
const TENCENT_MAP_KEYS = [
  'XLFBZ-DHSLQ-WTH5I-4RIC7-IJW3O-WZFCC',
  'YY7BZ-GXEYZ-CWQXZ-ZPQI4-BLIVH-L7BIQ',
  'QCTBZ-PXXCI-YSWG5-UPBKV-RVNO5-MVFGV',
  'EYYBZ-6WGRG-TYCQV-QABFV-SMW3V-FKBOP',
  'UAYBZ-37KC7-AMXX2-HNLUT-5INIQ-N4BKS'
]
let keyIndex = 0

// 获取下一个 Key
function getNextKey() {
  const key = TENCENT_MAP_KEYS[keyIndex % TENCENT_MAP_KEYS.length]
  keyIndex++
  return key
}
const BASE_URL = 'https://apis.map.qq.com/ws/place/v1/search'

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
  '绵阳', '德阳', '宜宾', '南充', '乐山', '达州', '遵义', '大理', '丽江',
  '桂林', '柳州', '北海', '玉林',
]

function apiRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let raw = ''
      res.on('data', chunk => raw += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) } catch { resolve(raw) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.setTimeout(10000)
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchParkingByCity(city) {
  const results = []
  let page = 0
  const pageSize = 20

  console.log(`开始拉取城市: ${city}`)

  while (true) {
    try {
      await sleep(200) // 避免频率限制
      const url = `${BASE_URL}?keyword=停车场&boundary=region(${city},0)&page_size=${pageSize}&page_index=${page}&key=${getNextKey()}`
      const res = await apiRequest(url)

      if (res.status !== 0 || !res.data || res.data.length === 0) {
        break
      }

      results.push(...res.data)
      console.log(`  城市[${city}] 第${page + 1}页，获取${res.data.length}条，累计${results.length}条`)

      if (res.data.length < pageSize) break
      page++
      if (page >= 50) break // 最多1000条
    } catch (e) {
      console.error(`  拉取失败: ${e.message}`)
      break
    }
  }

  return results
}

function formatPoiToParking(poi, city) {
  return {
    poiId: poi.id || null,
    name: poi.title || '',
    address: poi.address || '',
    city: city,
    province: poi.ad_info?.province || '',
    longitude: poi.location?.lng || 0,
    latitude: poi.location?.lat || 0,
    phone: poi.tel || '',
    status: 1,
    dataSource: 'tencent',
  }
}

// 数据库配置
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'parking_db_v2'
}

// 获取已导入的城市列表
async function getImportedCities(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT SUBSTRING_INDEX(remark, '城市: ', -1) as city 
       FROM free_parking_report 
       WHERE reporterName = '腾讯地图导入' AND remark LIKE '城市: %'`
    )
    return rows.map(r => r.city)
  } catch (err) {
    console.log('  查询已导入城市失败:', err.message)
    return []
  }
}

// 保存到数据库
async function saveToDatabase(pool, city, parkingList) {
  let saved = 0
  let skipped = 0
  
  for (const item of parkingList) {
    try {
      // 检查是否已存在
      const [exists] = await pool.execute(
        'SELECT id FROM free_parking_report WHERE name = ? AND address = ?',
        [item.title, item.address]
      )
      
      if (exists.length > 0) {
        skipped++
        continue
      }
      
      // 插入新数据 - 普通停车点位（不标记为免费）
      await pool.execute(
        `INSERT INTO free_parking_report 
         (name, address, latitude, longitude, status, reporterName, remark, freeType) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.title,
          item.address,
          item.location?.lat || 0,
          item.location?.lng || 0,
          1, // status: 已通过
          '腾讯地图POI',
          `城市: ${city}`,
          null // 不标记免费类型，等待用户核实
        ]
      )
      saved++
    } catch (err) {
      console.error('保存失败:', err.message)
    }
  }
  
  return { saved, skipped }
}

// 从命令行参数获取起始索引（支持断点续传）
const START_INDEX = parseInt(process.argv[2]) || 0
const END_INDEX = parseInt(process.argv[3]) || CITIES.length

async function main() {
  // 连接数据库
  const pool = await mysql.createPool(DB_CONFIG)
  console.log('数据库连接成功\n')
  
  // 获取已导入的城市列表
  const importedCities = await getImportedCities(pool)
  console.log(`已导入城市 (${importedCities.length}): ${importedCities.join(', ')}\n`)
  
  // 过滤掉已导入的城市
  let citiesToImport = CITIES.slice(START_INDEX, END_INDEX)
    .filter(city => !importedCities.includes(city))
  
  if (citiesToImport.length === 0) {
    console.log('✓ 所有城市已导入完成，无需继续')
    await pool.end()
    return
  }
  
  console.log(`开始拉取 ${citiesToImport.length} 个城市的停车场数据...`)
  console.log(`范围: [${START_INDEX}-${END_INDEX-1}] / 总${CITIES.length}个城市`)
  console.log(`过滤后剩余: ${citiesToImport.length} 个未导入城市\n`)
  
  let totalSaved = 0
  let totalSkipped = 0
  let failed = []
  let consecutiveEmpty = 0

  for (let i = 0; i < citiesToImport.length; i++) {
    const city = citiesToImport[i]
    const globalIndex = START_INDEX + i
    console.log(`[${globalIndex + 1}/${CITIES.length}] 正在导入: ${city}...`)
    
    try {
      const rawList = await fetchParkingByCity(city)
      
      if (rawList.length > 0) {
        consecutiveEmpty = 0  // 重置计数
        const { saved, skipped } = await saveToDatabase(pool, city, rawList)
        totalSaved += saved
        totalSkipped += skipped
        console.log(`  ✓ 获取: ${rawList.length} 条, 保存: ${saved} 条, 跳过: ${skipped} 条`)
      } else {
        consecutiveEmpty++
        console.log(`  ✗ 未获取到数据 (连续${consecutiveEmpty}次)`)
        
        // 连续3次空数据，可能是API配额用完
        if (consecutiveEmpty >= 3) {
          console.log(`\n⚠️ 检测到连续${consecutiveEmpty}个城市无数据，API配额可能已用完`)
          console.log(`建议: 等待明天继续，或从索引 ${globalIndex - consecutiveEmpty + 1} 重新开始`)
          console.log(`命令: node scripts/direct-import.js ${globalIndex - consecutiveEmpty + 1}\n`)
          break
        }
      }
    } catch (e) {
      console.log(`  ✗ 失败: ${e.message}`)
      failed.push(city)
    }
    
    // 增加延时避免触发频率限制
    const delay = consecutiveEmpty > 0 ? 5000 : 500  // 空数据后增加延时
    if (i < citiesToImport.length - 1) await sleep(delay)
  }

  await pool.end()

  console.log(`\n========== 导入完成 ==========`)
  console.log(`本次范围: [${START_INDEX}-${END_INDEX-1}]`)
  console.log(`总计: 保存 ${totalSaved} 条, 跳过 ${totalSkipped} 条`)
  if (failed.length > 0) console.log(`失败城市: ${failed.join(', ')}`)
  console.log(`\n下次执行命令:`)
  console.log(`  node scripts/direct-import.js ${START_INDEX + citiesToImport.length}`)
}

main().catch(err => {
  console.error('程序错误:', err)
  process.exit(1)
})
