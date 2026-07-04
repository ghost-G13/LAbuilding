# 建筑属性查询系统 API 文档

## 基本信息
- **服务地址**: http://localhost:3000
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: JWT Token（请求头 `Authorization: Bearer <token>`）

> **重要**: `/api/auth/*` 和 `/api/public/*` 接口不需要登录，其他所有接口都需要登录认证，未登录返回 401。

---

## 一、用户认证接口 (/api/auth)

### 1. 获取图形验证码
- **URL**: `/api/auth/captcha`
- **方法**: GET
- **不需要登录**
- **响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "image": "<svg>...</svg>",
    "captcha_key": "captcha:1782720338863",
    "expires_in": 120
  }
}
```
- **说明**: 
  - `image` 是 SVG 图片，直接插入页面显示
  - `captcha_key` 需在登录时传回
  - 验证码有效期 120 秒，使用后立即失效

### 2. 发送注册验证码
- **URL**: `/api/auth/send-code`
- **方法**: POST
- **不需要登录**
- **请求体**:
```json
{
  "identifier": "user@example.com"
}
```
- **参数说明**:
  - `identifier`: 手机号或邮箱
- **限流**: 同一账号 60 秒内只能发送一次
- **响应**:
```json
{
  "code": 0,
  "message": "验证码发送成功",
  "data": {
    "identifier": "user@example.com",
    "expires_in": 300
  }
}
```
- **开发环境**: 验证码会打印在服务器控制台

### 3. 用户注册
- **URL**: `/api/auth/register`
- **方法**: POST
- **不需要登录**
- **请求体**:
```json
{
  "username": "newuser",
  "password": "password123",
  "identifier": "user@example.com",
  "code": "123456",
  "role": "user"
}
```
- **参数说明**:
  - `username`: 用户名
  - `password`: 密码
  - `identifier`: 手机号或邮箱（与发送验证码时一致）
  - `code`: 收到的 6 位验证码
  - `role`: 角色（可选，默认 `user`），可选值：`admin`/`regulator`/`dispatcher`/`planner`/`user`

### 4. 用户登录
- **URL**: `/api/auth/login`
- **方法**: POST
- **不需要登录**
- **请求体**:
```json
{
  "username": "admin",
  "password": "admin123",
  "captcha_key": "captcha:1782720338863",
  "captcha_code": "ab2d"
}
```
- **参数说明**:
  - `captcha_key`: 图形验证码的 key（从 `/api/auth/captcha` 获取）
  - `captcha_code`: 用户输入的图形验证码文字（不区分大小写）
- **响应**:
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "phone": null,
    "role": "admin",
    "created_at": "2026-06-28T13:16:33.407Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **说明**: 
  - `token` 是 JWT 令牌，有效期 24 小时
  - 后续请求需在请求头携带：`Authorization: Bearer <token>`

### 5. 获取用户信息
- **URL**: `/api/auth/info/:userId`
- **方法**: GET
- **需要登录**
- **示例**: `/api/auth/info/1`

### 6. 忘记密码 - 发送验证码
- **URL**: `/api/auth/forgot-password`
- **方法**: POST
- **不需要登录**
- **请求体**:
```json
{
  "identifier": "user@example.com"
}
```
- **响应**:
```json
{
  "code": 0,
  "message": "验证码已发送",
  "data": {
    "identifier": "user@example.com",
    "expires_in": 300
  }
}
```

### 7. 重置密码
- **URL**: `/api/auth/reset-password`
- **方法**: POST
- **不需要登录**
- **请求体**:
```json
{
  "identifier": "user@example.com",
  "code": "123456",
  "password": "newpassword123"
}
```

---

## 二、公开接口 (/api/public)

> 所有接口不需要登录

### 1. 获取建筑列表
- **URL**: `/api/public/buildings`
- **方法**: GET
- **参数**:
  - `minHeight`: 最小高度（可选）
  - `maxHeight`: 最大高度（可选）
  - `minArea`: 最小面积（可选）
  - `maxArea`: 最大面积（可选）
  - `page`: 页码（默认 1）
  - `pageSize`: 每页数量（默认 2000）
- **响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "id": 1,
          "bid": "0",
          "height": 3.36,
          "area_m2": 100.14,
          "confidence": -1
        },
        "geometry": { "type": "Polygon", "coordinates": [...] }
      }
    ]
  },
  "count": 2000,
  "total": 76634,
  "page": 1,
  "pageSize": 2000
}
```

### 2. 获取禁飞区数据
- **URL**: `/api/public/nofly-zones`
- **方法**: GET
- **参数**:
  - `lang`: 语言（可选，默认 `zh`），可选值：`zh` / `en`
- **响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "id": "17",
          "bid": "17",
          "zone_id": "D_PMD003",
          "zone_name": "Class D - PMD",
          "restriction": "管制空域",
          "note": "有效期：2026年1月1日-2026年12月31日...",
          "flight_ceiling": 0,
          "height_meters": 0,
          "zone_category": "限飞区",
          "area": 214.36
        },
        "geometry": { "type": "Polygon", "coordinates": [...] }
      }
    ]
  },
  "count": 32
}
```
- **说明**:
  - `area` 字段单位为 **平方公里（km²）**
  - `note` 和 `restriction` 字段根据 `lang` 参数返回对应语言
  - 数据库中 note 存储格式为 "英文 | 中文"

### 3. 获取禁飞区总面积
- **URL**: `/api/public/nofly-area`
- **方法**: GET
- **参数**:
  - `zoneCategory`: 区域类型（可选），可选值：
    - `no-fly`: 禁飞区（Prohibited）
    - `restricted`: 限飞区（Controlled/Restricted）
    - 不传：查询所有禁飞区
- **响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "area_km2": "4889.32"
  }
}
```
- **说明**: `area_km2` 单位为 **平方公里（km²）**

---

## 三、建筑查询接口 (/api/buildings)

> 需要登录

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
      "flight_cei": null,
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

## 四、起降点分析接口 (/api/build)

> 需要登录

### 获取候选起降点
- **URL**: `/api/build/takeoff-filter`
- **方法**: GET
- **参数**:
  - `minHeight`: 最小建筑高度（默认 0）
  - `maxHeight`: 最大建筑高度（默认 100）
  - `minArea`: 最小屋顶面积（默认 50）
  - `maxArea`: 最大屋顶面积（默认 500）
- **示例**: `/api/build/takeoff-filter?minHeight=0&maxHeight=50&minArea=50&maxArea=500`
- **返回**: GeoJSON FeatureCollection，最多 1000 条

---

## 五、航线碰撞预警接口 (/api/uav)

> 需要登录

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
- **参数说明**:
  - `route`: GeoJSON LineString 航线坐标
  - `flightHeight`: 飞行高度（米）

---

## 六、禁飞区接口 (/api/nofly)

> 需要登录

### 1. 获取所有禁飞区
- **URL**: `/api/nofly/zones`
- **方法**: GET
- **参数**:
  - `zoneType`: 区域类型（可选，模糊匹配 zone_name）
  - `restrict`: 限制类型（可选，精确匹配）
  - `lang`: 语言（可选，默认 `zh`），可选值：`zh` / `en`
- **响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "id": "17",
          "bid": "17",
          "zone_id": "D_PMD003",
          "zone_name": "Class D - PMD",
          "restriction": "管制空域",
          "note": "有效期：2026年1月1日-2026年12月31日...",
          "flight_ceiling": 0,
          "height_meters": 0,
          "zone_category": "限飞区",
          "area": 214.36
        },
        "geometry": { "type": "Polygon", "coordinates": [...] }
      }
    ]
  },
  "count": 32
}
```

### 2. 获取禁飞区面积
- **URL**: `/api/nofly/area`
- **方法**: GET
- **参数**:
  - `zoneCategory`: 区域类型（可选），可选值：`no-fly` / `restricted`
- **响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "area_km2": "4889.32"
  }
}
```

### 3. 获取单个禁飞区详情
- **URL**: `/api/nofly/:zoneId`
- **方法**: GET
- **说明**: 根据 `zone_id` 查询禁飞区详情

---

## 七、用户查询记录接口 (/api/userdata)

> 需要登录，用户只能操作自己的记录

### 1. 保存查询记录
- **URL**: `/api/userdata/save`
- **方法**: POST
- **请求体**:
```json
{
  "query_type": "point-query",
  "query_params": { "lng": -118.208, "lat": 34.08 },
  "result_count": 1,
  "result_data": { ... }
}
```
- **参数说明**:
  - `query_type`: 查询类型，可选值：
    - `point-query`: 点选建筑查询
    - `takeoff-filter`: 起降点分析
    - `route-check`: 航线碰撞检测
    - `nofly-zones`: 禁飞区查询
  - `query_params`: 查询参数（JSON 对象）
  - `result_count`: 结果数量
  - `result_data`: 查询结果数据（JSON 对象，可选）
- **注意**: `user_id` 从登录 token 中自动获取，不需要传

### 2. 获取查询记录列表
- **URL**: `/api/userdata/list`
- **方法**: GET
- **参数**:
  - `query_type`: 查询类型（可选，筛选）
  - `page`: 页码（默认 1）
  - `pageSize`: 每页数量（默认 20）
- **示例**: `/api/userdata/list?page=1&pageSize=10&query_type=point-query`

### 3. 获取单条记录详情
- **URL**: `/api/userdata/detail/:recordId`
- **方法**: GET

### 4. 删除查询记录
- **URL**: `/api/userdata/delete/:recordId`
- **方法**: DELETE

---

## 八、管理员接口 (/api/admin)

> 所有接口需要管理员权限（role = admin）

### 1. 获取用户列表
- **URL**: `/api/admin/users`
- **方法**: GET
- **参数**:
  - `page`: 页码（默认 1）
  - `pageSize`: 每页数量（默认 20）
  - `role`: 角色筛选（可选）

### 2. 获取用户详情
- **URL**: `/api/admin/user/:userId`
- **方法**: GET

### 3. 更新用户角色
- **URL**: `/api/admin/user/:userId/role`
- **方法**: PUT
- **请求体**:
```json
{
  "role": "planner"
}
```
- **角色可选值**: `admin` / `regulator` / `dispatcher` / `planner` / `user`

### 4. 删除用户
- **URL**: `/api/admin/user/:userId`
- **方法**: DELETE
- **说明**: 同时删除该用户的所有查询记录，不能删除自己

### 5. 查看指定用户的查询记录
- **URL**: `/api/admin/userdata/:userId`
- **方法**: GET
- **参数**:
  - `query_type`: 查询类型（可选）
  - `page`: 页码（默认 1）
  - `pageSize`: 每页数量（默认 20）

### 6. 查看记录详情
- **URL**: `/api/admin/userdata/detail/:recordId`
- **方法**: GET

### 7. 删除查询记录
- **URL**: `/api/admin/userdata/:recordId`
- **方法**: DELETE

### 8. 系统统计数据
- **URL**: `/api/admin/stats`
- **方法**: GET
- **响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total_users": 7,
    "total_buildings": 76634,
    "total_nofly_zones": 32,
    "total_queries": 2,
    "role_stats": [
      { "role": "user", "count": 3 },
      { "role": "admin", "count": 1 }
    ],
    "query_type_stats": [
      { "query_type": "point-query", "count": 2 }
    ]
  }
}
```

---

## 九、角色权限说明

| 角色 | 等级 | 权限 |
|------|------|------|
| admin | 99 | 所有权限，包括用户管理 |
| regulator | 50 | 监管人员 |
| dispatcher | 40 | 调度人员 |
| planner | 30 | 规划师 |
| user | 10 | 普通用户，只能查询和管理自己的记录 |

---

## 十、测试用户账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | admin |
| planner | planner123 | planner |
| dispatcher | dispatcher123 | dispatcher |
| regulator | regulator123 | regulator |

---

## 十一、错误码说明

| 状态码 | code | 说明 |
|--------|------|------|
| 200 | 0 | 成功 |
| 400 | 400 | 参数错误 |
| 401 | 401 | 未登录或 token 过期 |
| 403 | 403 | 无权限（角色不足） |
| 404 | 404 | 资源不存在 |
| 429 | 429 | 请求过于频繁（限流） |
| 500 | 500 | 服务器内部错误 |

---

## 十二、数据库表结构

### users 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| username | VARCHAR(50) | 用户名 |
| password | VARCHAR(255) | 密码（bcrypt加密） |
| email | VARCHAR(100) | 邮箱 |
| phone | VARCHAR(20) | 手机号 |
| role | VARCHAR(20) | 角色 |
| email_verified | BOOLEAN | 邮箱是否验证 |
| phone_verified | BOOLEAN | 手机号是否验证 |
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

### la_building 建筑表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| bid | VARCHAR(50) | 建筑编号 |
| height | NUMERIC | 建筑高度（米） |
| area_m2 | NUMERIC | 建筑面积（平方米） |
| confidence | INTEGER | 置信度 |
| geom | GEOMETRY | 几何形状（Polygon） |

### nofly_zone 禁飞区表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| bid | VARCHAR(50) | 区域编号 |
| zone_id | VARCHAR(50) | 禁飞区ID |
| zone_name | VARCHAR(100) | 区域名称 |
| restrict | VARCHAR(100) | 限制类型 |
| note | TEXT | 备注说明（格式：英文 \| 中文） |
| flight_cei | NUMERIC | 飞行上限高度 |
| height_met | NUMERIC | 高度（米） |
| area | TEXT | 面积（平方公里） |
| geom | GEOMETRY | 几何形状（Polygon） |

---

## 十三、数据导入说明

### 禁飞区数据导入
```bash
cd backend
node scripts/import-geojson.js
```

### Note字段翻译更新
```bash
cd backend
node scripts/update-note-translation.js
```

---

## 十四、前端对接指南

详细前端对接说明请参考：[FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)