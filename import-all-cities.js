/**
 * 批量导入全国停车点位数据
 * 使用腾讯地图 WebService API 搜索各城市停车场
 */

const axios = require('axios')
const mysql = require('mysql2/promise')

// 腾讯地图 API Keys（轮换使用防限流）
const KEYS = [
  'XLFBZ-DHSLQ-WTH5I-4RIC7-IJW3O-WZFCC',
  'YY7BZ-GXEYZ-CWQXZ-ZPQI4-BLIVH-L7BIQ',
  'QCTBZ-PXXCI-YSWG5-UPBKV-RVNO5-MVFGV',
  'EYYBZ-6WGRG-TYCQV-QABFV-SMW3V-FKBOP',
  'UAYBZ-37KC7-AMXX2-HNLUT-5INIQ-N4BKS'
]

// 需要导入的城市列表
const CITIES = [
  // 直辖市
  '北京市', '上海市', '天津市', '重庆市',
  // 省会城市
  '广州市', '深圳市', '杭州市', '南京市', '武汉市', '成都市',
  '西安市', '郑州市', '长沙市', '合肥市', '济南市', '石家庄市',
  '太原市', '沈阳市', '长春市', '哈尔滨市', '福州市', '南昌市',
  '昆明市', '贵阳市', '南宁市', '海口市', '兰州市', '西宁市',
  '银川市', '乌鲁木齐市', '拉萨市', '呼和浩特市',
  // 其他重点城市
  '苏州市', '宁波市', '无锡市', '常州市', '南通市', '徐州市',
  '温州市', '嘉兴市', '绍兴市', '台州市', '金华市',
  '青岛市', '烟台市', '潍坊市', '临沂市', '淄博市',
  '大连市', '鞍山市', '抚顺市',
  '厦门市', '泉州市', '漳州市',
  '珠海市', '佛山市', '东莞市', '中山市', '惠州市',
  '南宁市', '柳州市', '桂林市',
  '唐山市', '保定市', '廊坊市',
  '洛阳市', '南阳市', '新乡市', '商丘市',
  '襄阳市', '宜昌市', '荆州市',
  '岳阳市', '常德市', '衡阳市',
  '芜湖市', '蚌埠市', '安庆市',
  '贵阳市', '遵义市', '六盘水市',
  '三亚市', '三沙市',
  '兰州市', '天水市',
  '咸阳市', '宝鸡市', '渭南市',
  '银川市', '石嘴山市'
]

// 数据库配置
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'parking_db_v2'
}

let keyIndex = 0

// 获取下一个 Key（轮换使用）
function getNextKey() {
  const key = KEYS[keyIndex % KEYS.length]
  keyIndex++
  return key
}

// 搜索城市停车场
async function searchParking(city, pageIndex = 1) {
  const key = getNextKey()
  const url = `https://apis.map.qq.com/ws/place/v1/search`
  
  try {
    const res = await axios.get(url, {
      params: {
        keyword: '停车场',
        boundary: `region(${city},0)`,
        page_size: 20,
        page_index: pageIndex,
        key: key
      },
      timeout: 10000
    })
    
    if (res.data.status === 0) {
      return res.data.data || []
    }
    console.log(`搜索 ${city} 失败:`, res.data.message)
    return []
  } catch (err) {
    console.error(`请求 ${city} 出错:`, err.message)
    return []
  }
}

// 获取城市所有停车场
async function getCityParking(city) {
  const allData = []
  let pageIndex = 1
  let hasMore = true
  
  while (hasMore && pageIndex <= 10) { // 最多获取200条
    const data = await searchParking(city, pageIndex)
    if (data.length === 0) {
      hasMore = false
    } else {
      allData.push(...data)
      pageIndex++
      await new Promise(r => setTimeout(r, 200)) // 防限流
    }
  }
  
  return allData
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
      
      // 插入新数据
      await pool.execute(
        `INSERT INTO free_parking_report 
         (name, address, latitude, longitude, status, reporterName, remark, freeType) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.title,
          item.address,
          item.location.lat,
          item.location.lng,
          1, // status: 已通过
          '腾讯地图导入',
          `城市: ${city}`,
          'night' // 默认夜间免费
        ]
      )
      saved++
    } catch (err) {
      console.error('保存失败:', err.message)
    }
  }
  
  return { saved, skipped }
}

// 主函数
async function main() {
  console.log('开始批量导入停车点位...\n')
  
  const pool = await mysql.createPool(DB_CONFIG)
  
  // 获取已存在的城市
  const [existing] = await pool.execute(
    "SELECT DISTINCT SUBSTRING_INDEX(address, '市', 1) as city FROM free_parking_report WHERE address LIKE '%市%'"
  )
  const existingCities = new Set(existing.map(r => r.city + '市'))
  
  console.log(`已存在城市: ${existingCities.size} 个`)
  console.log(`待导入城市: ${CITIES.length} 个\n`)
  
  // 过滤已存在的城市
  const citiesToImport = CITIES.filter(c => !existingCities.has(c))
  console.log(`实际需要导入: ${citiesToImport.length} 个城市\n`)
  
  let totalSaved = 0
  let totalSkipped = 0
  
  for (let i = 0; i < citiesToImport.length; i++) {
    const city = citiesToImport[i]
    console.log(`[${i + 1}/${citiesToImport.length}] 正在导入: ${city}...`)
    
    const parkingList = await getCityParking(city)
    
    if (parkingList.length > 0) {
      const { saved, skipped } = await saveToDatabase(pool, city, parkingList)
      totalSaved += saved
      totalSkipped += skipped
      console.log(`  ✓ 获取: ${parkingList.length} 条, 保存: ${saved} 条, 跳过: ${skipped} 条`)
    } else {
      console.log(`  ✗ 未获取到数据`)
    }
    
    await new Promise(r => setTimeout(r, 500)) // 城市间延迟
  }
  
  console.log(`\n导入完成! 总计: 保存 ${totalSaved} 条, 跳过 ${totalSkipped} 条`)
  
  await pool.end()
}

main().catch(err => {
  console.error('程序错误:', err)
  process.exit(1)
})
