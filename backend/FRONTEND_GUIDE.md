# 前端对接指南

本文档面向前端开发同学，说明如何对接后端接口。

---

## 一、快速开始

### 1. 环境准备

确保后端服务已启动：
- 后端地址：`http://localhost:3000`
- 进入 `backend` 目录，执行 `node server.js`

### 2. 配置代理（Vite）

在 `vite.config.js` 中添加代理：

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

之后前端所有 `/api/*` 请求会自动转发到后端。

---

## 二、认证流程

### 核心概念

- `/api/auth/*` 和 `/api/public/*` 接口**不需要登录**
- 其他所有接口（`/api/buildings/*`, `/api/build/*`, `/api/uav/*`, `/api/nofly/*`, `/api/userdata/*`, `/api/admin/*`）**需要登录**
- 登录成功后返回 `token`（JWT格式）
- 请求时在请求头携带：`Authorization: Bearer <token>`

### 注册流程

```
1. 调用 /api/auth/captcha 获取图形验证码 → 显示SVG图片给用户
2. 调用 /api/auth/send-code 发送邮箱/手机验证码 → 用户收验证码
3. 调用 /api/auth/register 提交注册信息 → 注册成功
```

### 登录流程

```
1. 调用 /api/auth/captcha 获取图形验证码 → 显示SVG图片给用户
2. 用户输入用户名、密码、图形验证码
3. 调用 /api/auth/login → 登录成功，保存 token
4. 后续所有请求携带 token
```

---

## 三、封装请求工具

建议封装一个统一的请求函数：

```javascript
// utils/request.js
import axios from 'axios'

const service = axios.create({
  baseURL: '/api',
  timeout: 30000
})

service.interceptors.request.use(
  config => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.token) {
      config.headers['Authorization'] = `Bearer ${user.token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code === 401) {
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth-logout'))
      return Promise.reject(new Error('请先登录'))
    }
    if (res.code !== 0) {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  error => {
    return Promise.reject(error)
  }
)

export default service
```

---

## 四、公开接口（不需要登录）

### 1. 获取建筑列表

```javascript
// GET /api/public/buildings
async function getPublicBuildings(params) {
  return request({
    url: '/public/buildings',
    method: 'GET',
    params
  })
  // 参数: minHeight, maxHeight, minArea, maxArea, page, pageSize
  // 返回: { code, message, data: { type, features }, count, total, page, pageSize }
}
```

### 2. 获取禁飞区数据

```javascript
// GET /api/public/nofly-zones
async function getNoFlyZones(lang = 'zh') {
  return request({
    url: '/public/nofly-zones',
    method: 'GET',
    params: { lang }
  })
  // 参数: lang - 'zh' 或 'en'，控制语言显示
  // 返回: { code, message, data: { type, features }, count }
  // features[].properties 包含: id, bid, zone_id, zone_name, restriction, note, flight_ceiling, height_meters, zone_category, area
}
```

### 3. 获取禁飞区总面积

```javascript
// GET /api/public/nofly-area
async function getNoFlyZoneArea(params = {}) {
  return request({
    url: '/public/nofly-area',
    method: 'GET',
    params
  })
  // 参数: zoneCategory (可选) - 'no-fly' 或 'restricted'
  // 返回: { code, message, data: { area_km2 } }
}
```

---

## 五、认证接口

### 1. 获取图形验证码

```javascript
// GET /api/auth/captcha
async function getCaptcha() {
  return request({ url: '/auth/captcha', method: 'GET' })
  // 返回: { code, message, data: { image, captcha_key, expires_in } }
}
```

### 2. 发送注册验证码

```javascript
// POST /api/auth/send-code
async function sendCode(identifier) {
  return request({
    url: '/auth/send-code',
    method: 'POST',
    data: { identifier }
  })
}
```

### 3. 用户注册

```javascript
// POST /api/auth/register
async function register(userInfo) {
  return request({
    url: '/auth/register',
    method: 'POST',
    data: userInfo
  })
  // userInfo: { username, password, identifier, code, role }
}
```

### 4. 用户登录

```javascript
// POST /api/auth/login
async function login(username, password, captcha_key, captcha_code) {
  const res = await request({
    url: '/auth/login',
    method: 'POST',
    data: { username, password, captcha_key, captcha_code }
  })
  localStorage.setItem('user', JSON.stringify(res.data))
  return res.data
}
```

### 5. 获取用户信息

```javascript
// GET /api/auth/info/:userId
async function getUserInfo(userId) {
  return request({ url: `/auth/info/${userId}`, method: 'GET' })
}
```

---

## 六、建筑查询接口（需要登录）

### 1. 点选建筑属性查询

```javascript
// GET /api/buildings/point-query
async function queryBuilding(lng, lat) {
  return request({
    url: '/buildings/point-query',
    method: 'GET',
    params: { lng, lat }
  })
}
```

### 2. 获取建筑列表

```javascript
// GET /api/buildings
async function getBuildings(params) {
  return request({
    url: '/buildings',
    method: 'GET',
    params
  })
  // 参数: minHeight, maxHeight, minArea, maxArea, page, pageSize
}
```

### 3. 获取单个建筑详情

```javascript
// GET /api/buildings/:bid
async function getBuildingDetail(bid) {
  return request({ url: `/buildings/${bid}`, method: 'GET' })
}
```

---

## 七、低空选址筛选接口（需要登录）

### 获取建筑

```javascript
// GET /api/build/takeoff-filter
async function getTakeoffPoints(minHeight, maxHeight, minArea, maxArea) {
  return request({
    url: '/build/takeoff-filter',
    method: 'GET',
    params: { minHeight, maxHeight, minArea, maxArea }
  })
}
```

---

## 八、飞行区域碰撞预警接口（需要登录）

### 航线检测

```javascript
// POST /api/uav/route-check
async function checkRouteCollision(route, flightHeight) {
  return request({
    url: '/uav/route-check',
    method: 'POST',
    data: { route, flightHeight }
  })
}
```

---

## 九、禁飞区接口（需要登录）

### 1. 获取所有禁飞区

```javascript
// GET /api/nofly/zones
async function getNoFlyZonesAuth(params = {}) {
  return request({
    url: '/nofly/zones',
    method: 'GET',
    params
  })
}
```

### 2. 获取单个禁飞区详情

```javascript
// GET /api/nofly/:zoneId
async function getNoFlyZoneDetail(zoneId) {
  return request({ url: `/nofly/${zoneId}`, method: 'GET' })
}
```

### 3. 获取禁飞区面积

```javascript
// GET /api/nofly/area
async function getNoFlyZoneAreaAuth(params = {}) {
  return request({
    url: '/nofly/area',
    method: 'GET',
    params
  })
}
```

---

## 十、用户查询记录接口（需要登录）

### 1. 保存查询记录

```javascript
// POST /api/userdata/save
async function saveQueryRecord(queryType, params, result) {
  return request({
    url: '/userdata/save',
    method: 'POST',
    data: {
      query_type: queryType,
      query_params: params,
      result_count: result?.length || 1,
      result_data: result
    }
  })
}
```

### 2. 获取查询记录列表

```javascript
// GET /api/userdata/list
async function getMyRecords(page = 1, pageSize = 10, queryType = '') {
  return request({
    url: '/userdata/list',
    method: 'GET',
    params: { page, pageSize, query_type: queryType }
  })
}
```

### 3. 获取单条记录详情

```javascript
// GET /api/userdata/detail/:recordId
async function getRecordDetail(recordId) {
  return request({ url: `/userdata/detail/${recordId}`, method: 'GET' })
}
```

### 4. 删除查询记录

```javascript
// DELETE /api/userdata/delete/:recordId
async function deleteRecord(recordId) {
  return request({ url: `/userdata/delete/${recordId}`, method: 'DELETE' })
}
```

---

## 十一、管理员接口（需要登录，仅 admin 角色可用）

### 1. 获取用户列表

```javascript
// GET /api/admin/users
async function getUsers(page = 1, pageSize = 20, role = '') {
  return request({
    url: '/admin/users',
    method: 'GET',
    params: { page, pageSize, role }
  })
}
```

### 2. 获取用户详情

```javascript
// GET /api/admin/user/:userId
async function getUserDetail(userId) {
  return request({ url: `/admin/user/${userId}`, method: 'GET' })
}
```

### 3. 更新用户角色

```javascript
// PUT /api/admin/user/:userId/role
async function updateUserRole(userId, role) {
  return request({
    url: `/admin/user/${userId}/role`,
    method: 'PUT',
    data: { role }
  })
}
```

### 4. 删除用户

```javascript
// DELETE /api/admin/user/:userId
async function deleteUser(userId) {
  return request({ url: `/admin/user/${userId}`, method: 'DELETE' })
}
```

### 5. 查看指定用户的查询记录

```javascript
// GET /api/admin/userdata/:userId
async function getUserRecords(userId, page = 1, pageSize = 20) {
  return request({
    url: `/admin/userdata/${userId}`,
    method: 'GET',
    params: { page, pageSize }
  })
}
```

### 6. 系统统计

```javascript
// GET /api/admin/stats
async function getStats() {
  return request({ url: '/admin/stats', method: 'GET' })
}
```

---

## 十二、路由守卫（Vue Router）

```javascript
// router/index.js
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : ''
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
    return
  }
  
  next()
})
```

路由配置：
```javascript
const routes = [
  { path: '/login', component: Login },
  { 
    path: '/home', 
    component: Home,
    meta: { requiresAuth: true }
  }
]
```

---

## 十三、角色权限判断

### 角色列表

| 角色 | 说明 |
|------|------|
| admin | 管理员，最高权限 |
| regulator | 监管人员 |
| dispatcher | 调度人员 |
| planner | 规划师 |
| user | 普通用户 |

### 判断用户角色

```javascript
function getUserRole() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.role || ''
}

function isAdmin() {
  return getUserRole() === 'admin'
}

function hasRole(minRole) {
  const roleLevels = {
    admin: 99,
    regulator: 50,
    dispatcher: 40,
    planner: 30,
    user: 10
  }
  const userLevel = roleLevels[getUserRole()] || 0
  const minLevel = roleLevels[minRole] || 0
  return userLevel >= minLevel
}
```

---

## 十四、测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| planner | planner123 | 规划师 |
| dispatcher | dispatcher123 | 调度人员 |
| regulator | regulator123 | 监管人员 |

---

## 十五、常见问题

### Q: 接口返回 401？
A: token 过期或未登录，清除 localStorage 跳转到登录页。

### Q: 接口返回 403？
A: 权限不足，当前用户角色没有访问该接口的权限。

### Q: 图形验证码怎么显示？
A: 接口返回的 `image` 字段是 SVG 字符串，直接用 `v-html` 渲染即可。

### Q: 注册验证码在哪里？
A: 开发环境下，验证码会打印在后端服务器控制台。生产环境需要配置邮件服务。

### Q: 禁飞区数据中 area 字段的单位是什么？
A: `area` 字段的单位是 **平方公里（km²）**。

### Q: 禁飞区的 note 字段支持多语言吗？
A: 支持。数据库中存储格式为 "英文 | 中文"，通过 `lang` 参数控制显示语言。

### Q: 航线检测的 route 参数格式？
A: GeoJSON LineString 格式：
```javascript
{
  type: 'LineString',
  coordinates: [[lng1, lat1], [lng2, lat2], [lng3, lat3]]
}
```

---

## 十六、完整接口文档

详细接口文档请参考：[API_DOCUMENT.md](./API_DOCUMENT.md)