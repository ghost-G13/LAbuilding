const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/public/nofly-area',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('HTTP状态码:', res.statusCode);
  console.log('响应头:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n原始响应数据:', data);
    try {
      const json = JSON.parse(data);
      console.log('\n解析后的JSON:', JSON.stringify(json, null, 2));
      console.log('\ndata.code:', json.code);
      console.log('data.data:', json.data);
      console.log('data.data.area_km2:', json.data?.area_km2);
      console.log('data.data.area_km2类型:', typeof json.data?.area_km2);
      console.log('parseFloat结果:', parseFloat(json.data?.area_km2));
      console.log('isNaN:', isNaN(parseFloat(json.data?.area_km2)));
    } catch (e) {
      console.error('JSON解析错误:', e);
    }
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e);
});

req.end();