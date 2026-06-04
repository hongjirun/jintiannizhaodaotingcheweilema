/**
 * 自动导入脚本 - 每天运行，自动跳过已导入城市
 * 使用方法: node scripts/auto-import.js
 */
const https = require('https')
const mysql = require('mysql2/promise')

// 腾讯地图API Keys（多Key轮换）
const TENCENT_MAP_KEYS = [
  'XLFBZ-DHSLQ-WTH5I-4RIC7-IJW3O-WZFCC',
  'YY7BZ-GXEYZ-CWQXZ-ZPQI4-BLIVH-L7BIQ',
  'QCTBZ-PXXCI-YSWG5-UPBKV-RVNO5-MVFGV',
  'EYYBZ-6WGRG-TYCQV-QABFV-SMW3V-FKBOP',
  'UAYBZ-37KC7-AMXX2-HNLUT-5INIQ-N4BKS'
]
let keyIndex = 0
function getNextKey() {
  return TENCENT_MAP_KEYS[keyIndex++ % TENCENT_MAP_KEYS.length]
}

// 全国城市列表
const CITIES = [
  '北京', '上海', '天津', '重庆',
  '广州', '深圳', '佛山', '东莞', '珠海', '惠州', '中山', '汕头', '湛江', '江门', '茂名', '肇庆', '梅州', '揭阳', '清远', '韶关', '河源', '阳江', '云浮', '潮州', '汕尾',
  '成都', '武汉', '杭州', '南京', '西安', '郑州', '长沙', '沈阳', '哈尔滨', '长春',
  '合肥', '福州', '南昌', '济南', '太原', '石家庄', '呼和浩特', '南宁', '海口', '贵阳',
  '昆明', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐',
  '苏州', '宁波', '青岛', '无锡', '烟台', '大连', '厦门', '温州', '绍兴', '金华',
  '南通', '常州', '嘉兴', '台州', '徐州', '泉州', '保定', '唐山', '洛阳', '南阳',
  '临沂', '潍坊', '淄博', '济宁', '泰安', '芜湖', '扬州', '镇江', '泰州', '宿迁',
  '漳州', '莆田', '赣州', '宜春', '上饶', '九江', '吉安', '衡阳', '株洲', '湘潭',
  '常德', '岳阳', '邵阳', '宜昌', '襄阳', '荆州', '黄石', '十堰',
  '绵阳', '德阳', '宜宾', '南充', '乐山', '达州', '遵义', '大理', '丽江',
  '桂林', '柳州', '北海', '玉林',
]

// 数据库配置
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'parking_db_v2'
}

// 从数据库查询已导入的城市
async function getImportedCities(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT SUBSTRING_INDEX(remark, '城市: ', -1) as city 
       FROM free_parking_report 
       WHERE reporterName = '腾讯地图导入' AND remark LIKE '城市: %'`
    )
    return rows.map(r => r.city).filter(c => c)
  } catch (err) {
    console.log('查询已导入城市失败:', err.message)
    return []
  }
}

// API请求
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
    req.setTimeout(15000)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// 拉取单个城市数据
async function fetchParkingByCity(city) {
  const results = []
  let page = 0
  const pageSize = 20
  const maxPages = 50  // 最多1000条/城市
  
  while (page < maxPages) {
    const key = getNextKey()
    const url = `https://apis.map.qq.com/ws/place/v1/search?key=${key}&boundary=region(${city},0)&keyword=停车场&page_size=${pageSize}&page_index=${page}&orderby=_distance`
    
    try {
      const data = await apiRequest(url)
      if (data.status !== 0 || !data.data || data.data.length === 0) break
      
      results.push(...data.data.map(poi => ({
        title: poi.title,
        address: poi.address || '',
        city: city,
        province: poi.ad_info?.province || '',
        longitude: poi.location?.lng || 0,
        latitude: poi.location?.lat || 0,
        phone: poi.tel || '',
        status: 1,
        dataSource: 'tencent',
      })))
      
      if (data.data.length < pageSize) break
      page++
      await new Promise(r => setTimeout(r, 500))  // 限速
    } catch (err) {
      console.log(`  请求失败: ${err.message}`)
      break
    }
  }
  
  return results
}

// 保存到数据库（带去重）
async function saveToDatabase(pool, city, parkingList) {
  let saved = 0, skipped = 0
  
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
      
      // 插入新数据
      await pool.execute(
        `INSERT INTO free_parking_report 
         (name, address, latitude, longitude, freeType, status, reporterName, remark, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          item.title,
          item.address,
          item.latitude,
          item.longitude,
          'night',
          1,
          '腾讯地图导入',
          `城市: ${city} | 来源: 腾讯地图API`
        ]
      )
      saved++
    } catch (err) {
      console.log(`  保存失败: ${item.title}`, err.message)
    }
  }
  
  return { saved, skipped }
}

// 主函数
async function main() {
  console.log('==========================================')
  console.log('🚗 停车场数据自动导入工具')
  console.log('⏰', new Date().toLocaleString())
  console.log('==========================================\n')
  
  const pool = await mysql.createPool(DB_CONFIG)
  console.log('✅ 数据库连接成功\n')
  
  // 获取已导入城市
  const importedCities = await getImportedCities(pool)
  console.log(`📊 已导入城市: ${importedCities.length} 个`)
  if (importedCities.length > 0) {
    console.log(`   ${importedCities.join(', ')}\n`)
  }
  
  // 过滤未导入城市
  const citiesToImport = CITIES.filter(city => !importedCities.includes(city))
  console.log(`🎯 待导入城市: ${citiesToImport.length} 个\n`)
  
  if (citiesToImport.length === 0) {
    console.log('🎉 所有城市已导入完成！')
    await pool.end()
    return
  }
  
  let totalSaved = 0, totalSkipped = 0, failed = []
  let consecutiveEmpty = 0
  
  for (let i = 0; i < citiesToImport.length; i++) {
    const city = citiesToImport[i]
    console.log(`[${i + 1}/${citiesToImport.length}] 🏙️ ${city}`)
    
    try {
      const list = await fetchParkingByCity(city)
      
      if (list.length === 0) {
        consecutiveEmpty++
        console.log(`   ⚠️ 未获取到数据 (连续${consecutiveEmpty}次)`)
        if (consecutiveEmpty >= 5) {
          console.log('\n🚫 API配额可能已用完，停止导入')
          break
        }
        continue
      }
      
      consecutiveEmpty = 0
      const { saved, skipped } = await saveToDatabase(pool, city, list)
      totalSaved += saved
      totalSkipped += skipped
      console.log(`   ✅ 获取${list.length}条 | 保存${saved}条 | 跳过${skipped}条`)
      
    } catch (err) {
      console.log(`   ❌ 失败: ${err.message}`)
      failed.push(city)
    }
  }
  
  await pool.end()
  
  console.log('\n==========================================')
  console.log('📈 导入完成统计')
  console.log(`   保存: ${totalSaved} 条`)
  console.log(`   跳过: ${totalSkipped} 条`)
  console.log(`   失败: ${failed.length} 个`)
  if (failed.length > 0) console.log(`   失败城市: ${failed.join(', ')}`)
  console.log('==========================================')
  console.log('\n💡 提示: 每天运行一次，自动跳过已导入城市')
  console.log('   命令: node scripts/auto-import.js')
}

main().catch(console.error)
