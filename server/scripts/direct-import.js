/**
 * 直接从腾讯地图API拉取全国停车点位数据
 * 并保存为JSON文件，后续可手动导入
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

// 腾讯地图API Key
const TENCENT_MAP_KEY = 'YW6BZ-CJV6Q-CZG5Z-4LU7N-LH5Y3-G4BBY'
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
      await sleep(300) // 避免频率限制
      const url = `${BASE_URL}?keyword=停车场&boundary=region(${city},0)&page_size=${pageSize}&page_index=${page}&key=${TENCENT_MAP_KEY}`
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

async function main() {
  console.log(`开始拉取 ${CITIES.length} 个城市的停车场数据...`)
  
  const allData = []
  let total = 0
  let failed = []

  // 创建输出目录
  const outputDir = path.join(__dirname, '../data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  for (let i = 0; i < CITIES.length; i++) {
    const city = CITIES[i]
    try {
      const rawList = await fetchParkingByCity(city)
      const formatted = rawList.map(item => formatPoiToParking(item, city))
      
      allData.push(...formatted)
      total += formatted.length
      
      console.log(`✓ ${city}: ${formatted.length} 条`)
      
      // 每个城市保存一个文件
      const cityFile = path.join(outputDir, `${city}-parking.json`)
      fs.writeFileSync(cityFile, JSON.stringify(formatted, null, 2), 'utf8')
      
    } catch (e) {
      console.log(`✗ ${city}: 失败 - ${e.message}`)
      failed.push(city)
    }
    
    // 避免频率限制，每个城市间隔2秒
    if (i < CITIES.length - 1) await sleep(2000)
  }

  // 保存完整数据
  const allFile = path.join(outputDir, 'all-cities-parking.json')
  fs.writeFileSync(allFile, JSON.stringify(allData, null, 2), 'utf8')

  console.log(`\n========== 拉取完成 ==========`)
  console.log(`累计拉取: ${total} 条`)
  console.log(`失败城市 (${failed.length}): ${failed.join(', ')}`)
  console.log(`数据已保存到: ${outputDir}`)
  console.log(`完整数据文件: ${allFile}`)
  
  // 生成导入脚本
  const importScript = `
// 导入数据到本地数据库的脚本
const fs = require('fs');
const axios = require('axios');

const data = JSON.parse(fs.readFileSync('${allFile.replace(/\\/g, '\\\\')}', 'utf8'));

async function importData() {
  console.log(\`准备导入 \${data.length} 条数据\`);
  
  // 需要先获取token
  const loginResponse = await axios.post('http://localhost:3000/api/admin/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  const token = loginResponse.data.access_token;
  console.log('获取token成功');
  
  // 分批导入，每批100条
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      const response = await axios.post('http://localhost:3000/api/admin/parking/import/excel', {
        list: batch
      }, {
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      });
      console.log(\`批次 \${Math.floor(i/batchSize) + 1}/\${Math.ceil(data.length/batchSize)}: 导入 \${batch.length} 条\`);
    } catch (e) {
      console.error(\`批次导入失败: \${e.message}\`);
    }
  }
  
  console.log('导入完成');
}

importData().catch(console.error);
`;
  
  fs.writeFileSync(path.join(outputDir, 'import-data.js'), importScript, 'utf8')
  console.log(`导入脚本: ${path.join(outputDir, 'import-data.js')}`)
}

main().catch(console.error)
