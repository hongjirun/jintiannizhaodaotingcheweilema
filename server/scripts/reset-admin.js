/**
 * 重置管理员密码脚本
 * 用法：node scripts/reset-admin.js [新密码]
 */
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const newPassword = process.argv[2] || 'admin123456';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'parking_db'
  });

  const hash = await bcrypt.hash(newPassword, 10);
  
  // 检查是否存在
  const [rows] = await connection.execute('SELECT id FROM admin_users WHERE username = ?', ['admin']);
  
  if (rows.length === 0) {
    // 创建新管理员
    await connection.execute(
      'INSERT INTO admin_users (username, password, role, status) VALUES (?, ?, ?, ?)',
      ['admin', hash, 'super', 1]
    );
    console.log(`✓ 已创建管理员: admin / ${newPassword}`);
  } else {
    // 更新密码
    await connection.execute(
      'UPDATE admin_users SET password = ? WHERE username = ?',
      [hash, 'admin']
    );
    console.log(`✓ 已重置密码: admin / ${newPassword}`);
  }
  
  await connection.end();
}

main().catch(err => {
  console.error('失败:', err.message);
  console.log('请确认 .env 文件中的数据库配置正确');
});
