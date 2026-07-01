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

  console.log('[请求]', BASE_URL + url, options.body)
  
  const response = await fetch(BASE_URL + url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  console.log('[响应]', response.status, response.statusText)
  
  const data = await response.json()
  
  console.log('[响应数据]', JSON.stringify(data))

  if (data.code === 401 && !url.startsWith('/auth/')) {
    localStorage.removeItem('user')
    throw new Error('请先登录')
  }

  return data
}

export async function getCaptcha() {
  return request('/auth/captcha')
}

export async function login(body) {
  return request('/auth/login', { method: 'POST', body })
}

export async function register(body) {
  return request('/auth/register', { method: 'POST', body })
}

export async function sendCode(body) {
  return request('/auth/send-code', { method: 'POST', body })
}

export async function getBuildings(params = {}) {
  const queryString = new URLSearchParams(params).toString()
  return request('/buildings?' + queryString)
}

export async function getNoFlyZones(params = {}) {
  const queryString = new URLSearchParams(params).toString()
  return request('/nofly/zones?' + queryString)
}

export async function getTakeoffFilter(params = {}) {
  const queryString = new URLSearchParams(params).toString()
  return request('/build/takeoff-filter?' + queryString)
}

export async function queryBuildingByPoint(lng, lat) {
  return request(`/buildings/point-query?lng=${lng}&lat=${lat}`)
}

export async function saveQueryRecord(body) {
  return request('/userdata/save', { method: 'POST', body })
}

export async function getMyRecords(params = {}) {
  const queryString = new URLSearchParams(params).toString()
  return request('/userdata/list?' + queryString)
}

export async function checkRouteCollision(body) {
  return request('/uav/route-check', { method: 'POST', body })
}

export default request