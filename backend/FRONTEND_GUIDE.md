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

- 除了 `/api/auth/*` 接口外，**所有接口都需要登录**
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
const BASE_URL = '/api'

function getToken() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.token || ''
}

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(BASE_URL + url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  const data = await response.json()

  if (data.code === 401) {
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('请先登录')
  }

  if (data.code !== 0) {
    throw new Error(data.message || '请求失败')
  }

  return data.data
}

export default request
```

---

## 四、常用接口示例

### 1. 注册

```javascript
import request from '@/utils/request'

// 1. 获取图形验证码
async function getCaptcha() {
  return request('/auth/captcha')
  // 返回: { image: '<svg>...</svg>', captcha_key: 'xxx', expires_in: 120 }
}

// 2. 发送注册验证码
async function sendCode(identifier) {
  return request('/auth/send-code', {
    method: 'POST',
    body: { identifier } // identifier 是邮箱或手机号
  })
}

// 3. 注册
async function register(userInfo) {
  return request('/auth/register', {
    method: 'POST',
    body: userInfo
    // userInfo: { username, password, identifier, code, role }
  })
}
```

### 2. 登录

```javascript
// 登录页面组件示例
async function login(username, password, captcha_key, captcha_code) {
  const userData = await request('/auth/login', {
    method: 'POST',
    body: { username, password, captcha_key, captcha_code }
  })
  
  // 保存用户信息和token
  localStorage.setItem('user', JSON.stringify(userData))
  
  return userData
}
```

### 3. 图形验证码组件

```vue
<template>
  <div class="captcha-wrapper">
    <div v-html="captchaImage" @click="refreshCaptcha" 
         style="cursor: pointer; display: inline-block;" />
    <span style="margin-left: 8px; color: #999; font-size: 12px;">点击刷新</span>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const emit = defineEmits(['update:modelValue'])

const captchaImage = ref('')
const captchaKey = ref('')

async function refreshCaptcha() {
  const data = await request('/auth/captcha')
  captchaImage.value = data.image
  captchaKey.value = data.captcha_key
  emit('update:modelValue', data.captcha_key)
}

onMounted(refreshCaptcha)

defineExpose({ refreshCaptcha, captchaKey })
</script>
```

### 4. 建筑点选查询

```javascript
async function queryBuilding(lng, lat) {
  return request(`/buildings/point-query?lng=${lng}&lat=${lat}`)
}
```

### 5. 保存查询记录

```javascript
async function saveQueryRecord(queryType, params, result) {
  return request('/userdata/save', {
    method: 'POST',
    body: {
      query_type: queryType,      // point-query / takeoff-filter / route-check / nofly-zones
      query_params: params,       // 查询参数对象
      result_count: 1,            // 结果数量
      result_data: result         // 完整结果（可选）
    }
  })
}

// 使用示例
const building = await queryBuilding(-118.208, 34.08)
await saveQueryRecord('point-query', { lng: -118.208, lat: 34.08 }, building)
```

### 6. 获取我的查询记录

```javascript
async function getMyRecords(page = 1, pageSize = 10, queryType = '') {
  let url = `/userdata/list?page=${page}&pageSize=${pageSize}`
  if (queryType) url += `&query_type=${queryType}`
  return request(url)
}
```

### 7. 起降点分析

```javascript
async function getTakeoffPoints(minHeight, maxHeight, minArea, maxArea) {
  return request(`/build/takeoff-filter?minHeight=${minHeight}&maxHeight=${maxHeight}&minArea=${minArea}&maxArea=${maxArea}`)
}
```

### 8. 航线碰撞检测

```javascript
async function checkRouteCollision(route, flightHeight) {
  return request('/uav/route-check', {
    method: 'POST',
    body: { route, flightHeight }
  })
}
```

### 9. 禁飞区查询

```javascript
async function getNoFlyZones() {
  return request('/nofly/zones')
}
```

---

## 五、路由守卫（Vue Router）

```javascript
// router/index.js
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : ''
  
  // 需要登录的页面
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
    meta: { requiresAuth: true }  // 需要登录
  }
]
```

---

## 六、角色权限判断

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

// 使用示例
if (isAdmin()) {
  // 显示管理员菜单
}

if (hasRole('dispatcher')) {
  // 调度人员及以上可以看到航线功能
}
```

---

## 七、管理员接口（仅 admin 角色可用）

```javascript
// 获取用户列表
async function getUsers(page = 1, pageSize = 20) {
  return request(`/admin/users?page=${page}&pageSize=${pageSize}`)
}

// 更新用户角色
async function updateUserRole(userId, role) {
  return request(`/admin/user/${userId}/role`, {
    method: 'PUT',
    body: { role }
  })
}

// 删除用户
async function deleteUser(userId) {
  return request(`/admin/user/${userId}`, {
    method: 'DELETE'
  })
}

// 查看指定用户的查询记录
async function getUserRecords(userId, page = 1, pageSize = 20) {
  return request(`/admin/userdata/${userId}?page=${page}&pageSize=${pageSize}`)
}

// 系统统计
async function getStats() {
  return request('/admin/stats')
}
```

---

## 八、测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| planner | planner123 | 规划师 |
| dispatcher | dispatcher123 | 调度人员 |
| regulator | regulator123 | 监管人员 |

---

## 九、常见问题

### Q: 接口返回 401？
A: token 过期或未登录，清除 localStorage 跳转到登录页。

### Q: 接口返回 403？
A: 权限不足，当前用户角色没有访问该接口的权限。

### Q: 图形验证码怎么显示？
A: 接口返回的 `image` 字段是 SVG 字符串，直接用 `v-html` 渲染即可。

### Q: 注册验证码在哪里？
A: 开发环境下，验证码会打印在后端服务器控制台。生产环境需要配置短信或邮件服务。

### Q: 怎么保存查询记录？
A: 每次查询后调用 `/api/userdata/save` 接口，`user_id` 会自动从 token 中获取，不需要传。

### Q: 航线检测的 route 参数格式？
A: GeoJSON LineString 格式，例如：
```javascript
{
  type: 'LineString',
  coordinates: [
    [lng1, lat1],
    [lng2, lat2],
    [lng3, lat3]
  ]
}
```

---

## 十、完整接口文档

详细接口文档请参考：[API_DOCUMENT.md](./API_DOCUMENT.md)