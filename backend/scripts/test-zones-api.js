const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/public/nofly-zones?lang=zh',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('HTTP状态码:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\nfeatures数量:', json.data?.features?.length || 0);
      if (json.data?.features && json.data.features.length > 0) {
        console.log('\n第一个feature的properties:', JSON.stringify(json.data.features[0].properties));
        console.log('area值:', json.data.features[0].properties?.area);
        console.log('area类型:', typeof json.data.features[0].properties?.area);
      }
    } catch (e) {
      console.error('JSON解析错误:', e);
    }
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e);
});

req.end();