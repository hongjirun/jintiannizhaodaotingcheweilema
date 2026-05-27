const https = require('https');

function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  const loginBody = JSON.stringify({ username: 'admin', password: 'admin123456' });
  const loginRes = await req({
    hostname: 'parking.xianshihuodong.xyz',
    path: '/api/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
  }, loginBody);

  const token = loginRes.data.token;
  console.log('token:', token ? 'ok' : 'fail');

  const importBody = JSON.stringify({ city: '\u60e0\u5dde' });
  const importRes = await req({
    hostname: 'parking.xianshihuodong.xyz',
    path: '/api/admin/parking/import/poi',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(importBody), 'Authorization': 'Bearer ' + token }
  }, importBody);

  console.log('import result:', JSON.stringify(importRes));
}

main().catch(console.error);
