# 建筑属性查询系统 API 文档

## 基本信息
- **服务地址**: http://localhost:3000
- **数据格式**: JSON
- **字符编码**: UTF-8

---

## 用户认证接口 (/api/auth)

### 1. 用户登录
- **URL**: `/api/auth/login`
- **方法**: POST
- **请求体**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```
- **响应**:
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "created_at": "2026-06-28T13:16:33.407Z",
    "token": "token_1_1782652698766"
  }
}
```

### 2. 用户注册
- **URL**: `/api/auth/register`
- **方法**: POST
- **请求体**:
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "role": "user"
}
```

### 3. 获取用户信息
- **URL**: `/api/auth/info/:userId`
- **方法**: GET
- **示例**: `/api/auth/info/1`

---

## 用户数据接口 (/api/userdata)

### 1. 保存查询记录
- **URL**: `/api/userdata/save`
- **方法**: POST
- **请求体**:
```json
{
  "user_id": 1,
  "query_type": "point-query",
  "query_params": { "lng": -118.208, "lat": 34.08 },
  "result_count": 1,
  "result_data": { ... }
}
```
- **query_type 类型**:
  - `point-query`: 点选建筑查询
  - `takeoff-filter`: 起降点分析
  - `route-check`: 航线碰撞检测
  - `nofly-zones`: 禁飞区查询

### 2. 获取用户查询记录列表
- **URL**: `/api/userdata/list/:userId`
- **方法**: GET
- **参数**:
  - `query_type`: 查询类型（可选）
  - `page`: 页码（默认1）
  - `pageSize`: 每页数量（默认20）
- **示例**: `/api/userdata/list/1?page=1&pageSize=10`

### 3. 获取单条记录详情
- **URL**: `/api/userdata/detail/:recordId`
- **方法**: GET

### 4. 删除查询记录
- **URL**: `/api/userdata/delete/:recordId`
- **方法**: DELETE

---

## 建筑查询接口 (/api/buildings)

### 1. 点选建筑属性查询
- **URL**: `/api/buildings/point-query`
- **方法**: GET
- **参数**:
  - `lng`: 经度
  - `lat`: 纬度
- **示例**: `/api/buildings/point-query?lng=-118.2085569&lat=34.0805717`
- **响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "type": "Feature",
    "properties": {
      "id": "1",
      "bid": "0",
      "height": 3.36,
      "area_m2": 100.14,
      "confidence": -1,
      "zone_name": null,
      "flight_ceil": null,
      "restriction": null
    },
    "geometry": { "type": "Polygon", "coordinates": [...] }
  }
}
```

### 2. 获取建筑列表
- **URL**: `/api/buildings`
- **方法**: GET
- **参数**:
  - `minHeight`: 最小高度
  - `maxHeight`: 最大高度
  - `minArea`: 最小面积
  - `maxArea`: 最大面积
  - `page`: 页码
  - `pageSize`: 每页数量

### 3. 获取单个建筑详情
- **URL**: `/api/buildings/:bid`
- **方法**: GET

---

## 起降点分析接口 (/api/build)

### 获取候选起降点
- **URL**: `/api/build/takeoff-filter`
- **方法**: GET
- **参数**:
  - `minHeight`: 最小建筑高度
  - `maxHeight`: 最大建筑高度
  - `minArea`: 最小屋顶面积
  - `maxArea`: 最大屋顶面积
- **示例**: `/api/build/takeoff-filter?minHeight=0&maxHeight=50&minArea=50&maxArea=500`

---

## 航线碰撞预警接口 (/api/uav)

### 航线检测
- **URL**: `/api/uav/route-check`
- **方法**: POST
- **请求体**:
```json
{
  "route": {
    "type": "LineString",
    "coordinates": [[-118.208, 34.08], [-118.209, 34.081]]
  },
  "flightHeight": 30
}
```

---

## 禁飞区接口 (/api/nofly)

### 1. 获取所有禁飞区
- **URL**: `/api/nofly/zones`
- **方法**: GET
- **参数**:
  - `zoneType`: 区域类型（可选）
  - `restrict`: 限制类型（可选）

### 2. 获取单个禁飞区详情
- **URL**: `/api/nofly/:zoneId`
- **方法**: GET

---

## 前端对接示例 (Vue3)

### 1. 配置 Vite 代理 (vite.config.js)
```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

### 2. 登录并保存查询记录示例
```javascript
// 登录
async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.code === 0) {
    localStorage.setItem('user', JSON.stringify(data.data));
    return data.data;
  }
  throw new Error(data.message);
}

// 点选查询建筑
async function queryBuilding(lng, lat) {
  const res = await fetch(`/api/buildings/point-query?lng=${lng}&lat=${lat}`);
  return await res.json();
}

// 保存查询记录
async function saveQueryRecord(user_id, query_type, params, result) {
  const res = await fetch('/api/userdata/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id,
      query_type,
      query_params: params,
      result_count: 1,
      result_data: result
    })
  });
  return await res.json();
}

// 使用示例
const user = await login('admin', 'admin123');
const building = await queryBuilding(-118.2085569, 34.0805717);
if (building.code === 0) {
  await saveQueryRecord(user.id, 'point-query', { lng: -118.2085569, lat: 34.0805717 }, building.data);
}
```

---

## 测试用户账号
| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | admin |
| planner | planner123 | planner |
| dispatcher | dispatcher123 | dispatcher |
| regulator | regulator123 | regulator |

---

## 数据库表结构

### users 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| username | VARCHAR(50) | 用户名 |
| password | VARCHAR(255) | 密码 |
| email | VARCHAR(100) | 邮箱 |
| role | VARCHAR(20) | 角色 |
| created_at | TIMESTAMP | 创建时间 |
| last_login | TIMESTAMP | 最后登录 |

### userdata 查询记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| user_id | INTEGER | 用户ID |
| query_type | VARCHAR(50) | 查询类型 |
| query_params | TEXT | 查询参数(JSON) |
| result_count | INTEGER | 结果数量 |
| result_data | TEXT | 结果数据(JSON) |
| created_at | TIMESTAMP | 创建时间 |