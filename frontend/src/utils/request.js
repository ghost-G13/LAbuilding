const BASE_URL = '/api'

function getToken() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.token || ''
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  const response = await fetch(BASE_URL + url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  
  const data = await response.json()
  return data
}

export async function getCaptcha() {
  const data = await request('/auth/captcha')
  if (data.code === 0 && data.data?.image) {
    const svgBlob = new Blob([data.data.image], { type: 'image/svg+xml' })
    return {
      src: URL.createObjectURL(svgBlob),
      key: data.data.captcha_key
    }
  }
  throw new Error('获取验证码失败')
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

export default request