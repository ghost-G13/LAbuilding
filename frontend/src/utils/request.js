import axios from 'axios'

const BASE_URL = '/api'

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

axiosInstance.interceptors.request.use(config => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  
  if (config.url.includes('nofly') || config.url.includes('area')) {
    console.log('[REQUEST-NOFLY] ======== 请求开始 ========')
    console.log('[REQUEST-NOFLY] URL:', config.url)
    console.log('[REQUEST-NOFLY] 参数:', config.params || '无')
    console.log('[REQUEST-NOFLY] 有Token:', !!user.token)
    console.log('[REQUEST-NOFLY] ======== 请求结束 ========')
  } else {
    console.log('[请求]', config.url, config.data)
  }
  
  return config
})

axiosInstance.interceptors.response.use(
  response => {
    if (response.config.url.includes('nofly') || response.config.url.includes('area')) {
      console.log('[RESPONSE-NOFLY] ======== 响应开始 ========')
      console.log('[RESPONSE-NOFLY] URL:', response.config.url)
      console.log('[RESPONSE-NOFLY] HTTP状态:', response.status)
      console.log('[RESPONSE-NOFLY] 响应数据:', JSON.stringify(response.data))
      console.log('[RESPONSE-NOFLY] ======== 响应结束 ========')
    } else {
      console.log('[响应]', response.status, response.data)
    }
    
    const data = response.data
    
    if (data.code === 401 && !response.config.url.startsWith('/auth/')) {
      localStorage.removeItem('user')
      window.dispatchEvent(new CustomEvent('auth-logout'))
      throw new Error(data.message || '请先登录')
    }
    
    return data
  },
  error => {
    console.error('[请求错误]', error)
    if (error.response) {
      return Promise.reject(error.response.data)
    } else if (error.request) {
      return Promise.reject({ code: 500, message: '网络连接失败' })
    } else {
      return Promise.reject({ code: 500, message: error.message || '请求配置错误' })
    }
  }
)

export async function getCaptcha() {
  return axiosInstance.get('/auth/captcha')
}

export async function login(body) {
  return axiosInstance.post('/auth/login', body)
}

export async function register(body) {
  return axiosInstance.post('/auth/register', body)
}

export async function sendCode(body) {
  return axiosInstance.post('/auth/send-code', body)
}

export async function getBuildings(params = {}) {
  return axiosInstance.get('/buildings', { params })
}

export async function getNoFlyZones(params = {}) {
  return axiosInstance.get('/nofly/zones', { params })
}

export async function getNoFlyZoneArea(params = {}) {
  return axiosInstance.get('/public/nofly-area', { params })
}

export async function getTakeoffFilter(params = {}) {
  return axiosInstance.get('/build/takeoff-filter', { params })
}

export async function queryBuildingByPoint(lng, lat) {
  return axiosInstance.get('/buildings/point-query', { params: { lng, lat } })
}

export async function saveQueryRecord(body) {
  return axiosInstance.post('/userdata/save', body)
}

export async function getMyRecords(params = {}) {
  return axiosInstance.get('/userdata/list', { params })
}

export async function checkRouteCollision(body) {
  return axiosInstance.post('/uav/route-check', body)
}

export async function forgotPassword(body) {
  return axiosInstance.post('/auth/forgot-password', body)
}

export async function resetPassword(body) {
  return axiosInstance.post('/auth/reset-password', body)
}

export default axiosInstance