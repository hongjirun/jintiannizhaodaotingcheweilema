/**
 * 去重脚本：删除重复的停车点位，只保留一条
 * 基于 name + address 判断重复
 */
const mysql = require('mysql2/promise')

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'parking_db_v2'
}

async function deduplicate() {
  const pool = await mysql.createPool(DB_CONFIG)
  console.log('数据库连接成功\n')
  
  // 1. 查找重复数据
  console.log('正在查找重复数据...')
  const [dups] = await pool.execute(`
    SELECT name, address, COUNT(*) as count, 
           GROUP_CONCAT(id ORDER BY id) as ids,
           GROUP_CONCAT(createdAt ORDER BY id) as dates
    FROM free_parking_report 
    WHERE reporterName = '腾讯地图导入'
    GROUP BY name, address 
    HAVING COUNT(*) > 1
  `)
  
  console.log(`发现 ${dups.length} 组重复数据\n`)
  
  if (dups.length === 0) {
    console.log('✓ 没有重复数据，无需清理')
    await pool.end()
    return
  }
  
  // 2. 显示前10个重复
  console.log('前10个重复示例：')
  dups.slice(0, 10).forEach((row, i) => {
    const ids = row.ids.split(',')
    console.log(`  ${i+1}. ${row.name}`)
    console.log(`     地址: ${row.address}`)
    console.log(`     重复: ${row.count} 条, ID: ${row.ids}`)
    console.log('')
  })
  
  // 3. 删除重复，保留ID最小的一条
  console.log('开始删除重复数据...')
  let deletedCount = 0
  
  for (const row of dups) {
    const ids = row.ids.split(',')
    const keepId = ids[0]  // 保留第一个（ID最小）
    const deleteIds = ids.slice(1)  // 删除其余
    
    const [result] = await pool.execute(
      `DELETE FROM free_parking_report WHERE id IN (${deleteIds.join(',')})`
    )
    deletedCount += result.affectedRows
    console.log(`  保留 ID ${keepId}, 删除 ${result.affectedRows} 条`)
  }
  
  // 4. 统计结果
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) as total FROM free_parking_report WHERE reporterName = '腾讯地图导入'`
  )
  
  console.log(`\n========== 去重完成 ==========`)
  console.log(`删除重复: ${deletedCount} 条`)
  console.log(`剩余数据: ${total} 条`)
  console.log(`原始重复组: ${dups.length} 组`)
  
  await pool.end()
}

deduplicate().catch(err => {
  console.error('错误:', err)
  process.exit(1)
})
