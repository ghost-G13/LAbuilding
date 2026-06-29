<script setup>
import { ref, watch, onMounted, computed } from 'vue'

const isNavCompact = ref(false)

const flightHeightMin = ref('')
const flightHeightMax = ref('')
const areaMin = ref('')
const areaMax = ref('')

const isInputComplete = computed(() => {
  return flightHeightMin.value.trim() && flightHeightMax.value.trim() && areaMin.value.trim()
})

const validateRange = (minRef, maxRef) => {
  const minVal = parseFloat(minRef.value)
  const maxVal = parseFloat(maxRef.value)
  
  if (!isNaN(minVal) && !isNaN(maxVal)) {
    if (maxVal < minVal) {
      maxRef.value = String(minVal)
    }
  }
}

const filteredCount = ref(0)
const hasFiltered = ref(false)
const filteredData = ref([])

const collisionHeightMin = ref('')
const collisionHeightMax = ref('')
const warningStatus = ref('compliant')
const isDrawn = ref(false)
const isDrawing = ref(false)
const isCheckingCollision = ref(false)

const noFlyZoneLayer = ref(false)
const colorLayer = ref(true)

const noFlyZoneArea = ref('1,256.8 公顷')

const showLoginModal = ref(false)
const isRegisterMode = ref(false)
const isLoggedIn = ref(false)
const loggedInUser = ref(null)

const loginForm = ref({
  account: '',
  password: '',
  rememberAccount: false
})

const registerForm = ref({
  username: '',
  phone: '',
  code: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false
})

const showPassword = ref(false)
const showRegisterPassword = ref(false)
const showRegisterConfirmPassword = ref(false)
const codeCountdown = ref(0)
const loginError = ref('')
const registerError = ref('')
const isLoginLoading = ref(false)
const isRegisterLoading = ref(false)

const passwordStrength = computed(() => {
  const pwd = registerForm.value.password
  if (!pwd) return { level: 0, text: '' }
  let level = 0
  if (pwd.length >= 6) level++
  if (pwd.length >= 8) level++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) level++
  if (/\d/.test(pwd)) level++
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)) level++
  const texts = ['', '弱', '中', '中', '强', '强']
  return { level: Math.min(level, 5), text: texts[level] }
})

const canLogin = computed(() => {
  return loginForm.value.account.trim() && loginForm.value.password.trim()
})

const canRegister = computed(() => {
  const f = registerForm.value
  return f.username.trim() && 
         /^1\d{10}$/.test(f.phone) && 
         f.code.length === 6 && 
         f.password.length >= 6 && 
         f.password === f.confirmPassword && 
         f.agreeTerms
})

const handleLogin = async () => {
  if (!canLogin.value) return
  isLoginLoading.value = true
  loginError.value = ''
  
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  if (loginForm.value.account === 'admin' && loginForm.value.password === '123456') {
    isLoggedIn.value = true
    loggedInUser.value = loginForm.value.account
    
    const loginData = {
      user: loginForm.value.account,
      loginTime: Date.now(),
      expires: Date.now() + 72 * 60 * 60 * 1000
    }
    localStorage.setItem('loginData', JSON.stringify(loginData))
    
    closeLogin()
    alert('登录成功！')
  } else {
    loginError.value = '账号或密码错误，请使用 admin / 123456 测试'
  }
  
  isLoginLoading.value = false
}

const handleRegister = async () => {
  if (!canRegister.value) return
  isRegisterLoading.value = true
  registerError.value = ''
  
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  isRegisterMode.value = false
  registerError.value = ''
  alert('注册成功！请登录')
}

const closeLogin = () => {
  showLoginModal.value = false
  loginError.value = ''
  registerError.value = ''
}

const toggleRegister = () => {
  isRegisterMode.value = !isRegisterMode.value
  loginError.value = ''
  registerError.value = ''
}

const togglePassword = (type) => {
  if (type === 'login') showPassword.value = !showPassword.value
  if (type === 'register') showRegisterPassword.value = !showRegisterPassword.value
  if (type === 'confirm') showRegisterConfirmPassword.value = !showRegisterConfirmPassword.value
}

const getCode = () => {
  if (!/^1\d{10}$/.test(registerForm.value.phone)) {
    registerError.value = '请输入正确的手机号'
    return
  }
  codeCountdown.value = 60
  const timer = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

const checkLogin = () => {
  if (!isLoggedIn.value) {
    alert('您尚未登录，请前往登录/注册')
    showLoginModal.value = true
  } else {
    alert('设置功能已触发，当前用户：' + loggedInUser.value)
  }
}

const filterTakeoffPoints = () => {
  if (!isInputComplete.value) return
  
  const minH = parseFloat(flightHeightMin.value)
  const maxH = parseFloat(flightHeightMax.value)
  const minA = parseFloat(areaMin.value)
  const maxA = parseFloat(areaMax.value)
  
  if (window.filterBuildings) {
    hasFiltered.value = true
    filteredCount.value = -1
    
    window.filterCallback = (result) => {
      filteredCount.value = result.count
      filteredData.value = result.data
    }
    window.filterBuildings(minH, maxH, minA, maxA)
  }
}

const clearFilter = () => {
  if (window.resetBuildingColors) {
    window.resetBuildingColors()
  }
  hasFiltered.value = false
  filteredCount.value = 0
  filteredData.value = []
}

const exportResults = () => {
  if (!hasFiltered.value || filteredCount.value === -1 || filteredData.value.length === 0) return
  
  let csv = 'ID,高度(m),面积(m²)\n'
  filteredData.value.forEach(item => {
    csv += `${item.id},${item.height},${item.area}\n`
  })
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `起降点分析结果_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const drawRange = () => {
  if (window.startDrawing) {
    window.startDrawing()
  }
  isDrawing.value = true
}

const clearDraw = () => {
  if (window.clearDrawing) {
    window.clearDrawing()
  }
  isDrawn.value = false
  isDrawing.value = false
  warningStatus.value = 'compliant'
}

window.onDrawComplete = () => {
  isDrawn.value = true
  isDrawing.value = false
  warningStatus.value = 'input_height'
}

function checkCollision() {
  if (!isDrawn.value) return
  
  const minH = parseFloat(collisionHeightMin.value) || 0
  const maxH = parseFloat(collisionHeightMax.value) || 0
  
  if (window.checkRouteCollision) {
    isCheckingCollision.value = true
    window.collisionCallback = (result) => {
      if (result.inNoFlyZone) {
        warningStatus.value = 'no_fly_zone'
      } else {
        warningStatus.value = result.compliant ? 'compliant' : 'warning'
      }
      isCheckingCollision.value = false
    }
    window.checkRouteCollision(minH, maxH)
  }
}

watch(colorLayer, (val) => {
  if (window.setColorLayer) {
    window.setColorLayer(val)
  }
})

watch(noFlyZoneLayer, (val) => {
  if (window.setNoFlyZoneLayer) {
    window.setNoFlyZoneLayer(val)
  }
})

const validateFlightHeight = () => {
  validateRange(flightHeightMin, flightHeightMax)
}

const validateArea = () => {
  validateRange(areaMin, areaMax)
}

const validateCollisionHeight = () => {
  validateRange(collisionHeightMin, collisionHeightMax)
}

onMounted(() => {
  if (window.setColorLayer) {
    window.setColorLayer(colorLayer.value)
  }
  if (window.setNoFlyZoneLayer) {
    window.setNoFlyZoneLayer(noFlyZoneLayer.value)
  }
  
  const storedLoginData = localStorage.getItem('loginData')
  if (storedLoginData) {
    try {
      const loginData = JSON.parse(storedLoginData)
      if (loginData.expires > Date.now()) {
        isLoggedIn.value = true
        loggedInUser.value = loginData.user
        console.log('自动登录成功:', loginData.user)
      } else {
        localStorage.removeItem('loginData')
        console.log('登录已过期')
      }
    } catch (e) {
      localStorage.removeItem('loginData')
    }
  }
})
</script>

<template>
  <div class="app-container">
    <header 
      class="top-nav" 
      :class="{ 'nav-compact': isNavCompact }"
      @mouseenter="isNavCompact = false"
      @mouseleave="isNavCompact = true"
    >
      <div class="nav-particles">
        <div v-for="n in 20" :key="n" class="particle" :style="{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${3 + Math.random() * 4}s`,
          size: `${2 + Math.random() * 3}px`
        }"></div>
      </div>
      <div class="nav-content">
        <div class="nav-left">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
              <line x1="12" y1="22" x2="12" y2="15.5"></line>
              <polyline points="22 8.5 12 15.5 2 8.5"></polyline>
              <polyline points="2 15.5 12 8.5 22 15.5"></polyline>
              <line x1="12" y1="2" x2="12" y2="8.5"></line>
            </svg>
          </div>
          <span class="system-title">城市低空三维白模可视化与分析系统</span>
        </div>
        <div class="nav-right">
          <button class="nav-btn" @click="checkLogin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>设置</span>
          </button>
          <button class="nav-btn" @click="showLoginModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>登录</span>
          </button>
        </div>
      </div>
    </header>
    
    <div class="map-container">
      <router-view />
    </div>
    
    <div class="side-panel" @mouseenter="handlePanelEnter" @mouseleave="handlePanelLeave" @wheel="handlePanelScroll">
      <div class="function-card">
        <h2 class="module-title">01 起降点分析</h2>
        
        <div class="input-group">
          <label class="input-label">输入飞行高度(m)</label>
          <div class="range-input">
            <input type="text" v-model="flightHeightMin" class="input-box" placeholder="最小值">
          <span class="range-separator">-</span>
          <input type="text" v-model="flightHeightMax" class="input-box" placeholder="最大值">
          </div>
        </div>
        
        <div class="input-group">
          <label class="input-label">输入面积要求(m²)</label>
          <div class="range-input">
            <input type="text" v-model="areaMin" class="input-box" placeholder="最低面积">
          </div>
        </div>
        
        <div class="result-area">
          <p class="result-text" v-if="!isInputComplete">请输入以上相关信息！</p>
          <p class="result-text" v-else-if="!hasFiltered">输入完成，请点击筛选</p>
          <p class="result-text" v-else-if="filteredCount === -1">筛选中...</p>
          <p class="result-text" v-else>已筛选出符合条件的起降点位：共 <span>{{ filteredCount }}</span> 个</p>
          <div class="result-actions">
            <div class="action-row">
              <button class="action-btn" @click="clearFilter" :disabled="!hasFiltered">清除筛选</button>
              <button class="action-btn" @click="filterTakeoffPoints" :disabled="!isInputComplete">筛选</button>
            </div>
            <div class="action-row">
              <button class="action-btn" @click="exportResults" :disabled="!hasFiltered">导出结果</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="function-card">
        <h2 class="module-title">02 航线碰撞预警</h2>
        
        <div class="draw-section">
          <button class="draw-btn" @click="drawRange">{{ isDrawing ? '绘制中…' : '绘制范围' }}</button>
          <p class="draw-hint">提示：点击按钮后在地图上绘制多边形区域</p>
        </div>
        
        <div class="input-group">
          <label class="input-label">飞行高度区间(m)</label>
          <div class="range-input">
            <input type="text" v-model="collisionHeightMin" class="input-box" placeholder="最小值" @blur="validateCollisionHeight">
          <span class="range-separator">-</span>
          <input type="text" v-model="collisionHeightMax" class="input-box" placeholder="最大值" @blur="validateCollisionHeight">
          </div>
        </div>
        
        <div class="result-area">
          <button class="action-btn" @click="checkCollision" :disabled="!isDrawn || !collisionHeightMin || !collisionHeightMax || isCheckingCollision">
            {{ isCheckingCollision ? '检测中…' : '检测碰撞' }}
          </button>
        </div>
        
        <div class="warning-area">
          <div class="warning-status" :class="{ 'not-drawn': !isDrawn && !isDrawing, 'compliant': isDrawn && !isCheckingCollision && warningStatus === 'compliant', 'warning': isDrawn && !isCheckingCollision && warningStatus === 'warning', 'no-fly-zone': isDrawn && !isCheckingCollision && warningStatus === 'no_fly_zone', 'input-height': isDrawn && !isCheckingCollision && warningStatus === 'input_height', 'drawing': isDrawing, 'checking': isCheckingCollision }">
            <span class="status-icon">{{ isCheckingCollision ? '🔍' : (isDrawing ? '✏️' : (!isDrawn ? '📋' : (warningStatus === 'input_height' ? '📝' : (warningStatus === 'no_fly_zone' ? '🚫' : (warningStatus === 'compliant' ? '✓' : '⚠'))))) }}</span>
            <span class="status-text">{{ isCheckingCollision ? '检测中…' : (isDrawing ? '绘制中…' : (!isDrawn ? '请绘制' : (warningStatus === 'input_height' ? '请输入飞行高度' : (warningStatus === 'no_fly_zone' ? '警告：位于禁飞区内！' : (warningStatus === 'compliant' ? '合规' : '碰撞告警'))))) }}</span>
          </div>
          <div class="draw-actions" v-if="isDrawn">
            <button class="action-btn small" @click="drawRange">再次绘制</button>
            <button class="action-btn small" @click="clearDraw">清除绘制</button>
          </div>
        </div>
      </div>
      
      <div class="layer-control">
        <div class="layer-section orange-bg">
          <label class="layer-checkbox">
            <input type="checkbox" v-model="noFlyZoneLayer">
            <span>禁飞区图层</span>
          </label>
        </div>
        <div class="layer-section blue-bg">
          <label class="layer-checkbox">
            <input type="checkbox" v-model="colorLayer">
            <span>分层设色图层</span>
          </label>
        </div>
      </div>
      
      <div class="stats-card">
        <div class="stats-label">全域禁飞区面积统计</div>
        <div class="stats-value">{{ noFlyZoneArea }}</div>
      </div>
      
      <div class="footer-note">
        <p>经纬度范围：E 116.00° - 116.50°, N 39.70° - 40.10°</p>
      </div>
    </div>
    
    <div v-if="showLoginModal" class="modal-overlay" @click.self="closeLogin">
      <div class="modal-container">
        <div class="modal-header">
          <div class="modal-title-area">
            <h2>{{ isRegisterMode ? '新用户注册' : '账号登录' }}</h2>
            <p class="modal-subtitle">{{ isRegisterMode ? '已有账号可返回登录' : '未注册账号可切换前往注册' }}</p>
          </div>
          <button class="modal-close" @click="closeLogin">×</button>
        </div>
        
        <div class="modal-body" :class="{ 'register-mode': isRegisterMode }">
          <form v-if="!isRegisterMode" @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input type="text" v-model="loginForm.account" placeholder="请输入手机号/用户名" class="modal-input" @keyup.enter="handleLogin">
              </div>
              <span v-if="!loginForm.account.trim()" class="input-error">请输入账号</span>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input :type="showPassword ? 'text' : 'password'" v-model="loginForm.password" placeholder="请输入登录密码" class="modal-input" @keyup.enter="handleLogin">
                <button class="eye-btn" @click="togglePassword('login')">
                  <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M15 12a3 3 0 1 1-6 0"></path>
                  </svg>
                </button>
              </div>
              <span v-if="!loginForm.password.trim()" class="input-error">请输入密码</span>
            </div>
            
            <div class="form-options">
              <label class="checkbox-label">
                <input type="checkbox" v-model="loginForm.rememberAccount">
                <span>记住账号</span>
              </label>
              <a href="#" class="forgot-link">忘记密码？</a>
            </div>
            
            <span v-if="loginError" class="form-error">{{ loginError }}</span>
            
            <button type="submit" class="submit-btn" :disabled="!canLogin || isLoginLoading">
              <span v-if="isLoginLoading">登录中...</span>
              <span v-else>立即登录</span>
            </button>
            
            <p class="toggle-link">
              没有账号？<a href="#" @click.prevent="toggleRegister"><font color="#0066ff">去注册</font></a>
            </p>
          </form>
          
          <form v-else @submit.prevent="handleRegister" class="register-form">
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input type="text" v-model="registerForm.username" placeholder="请输入用户名" class="modal-input" @keyup.enter="handleRegister">
              </div>
              <span v-if="!registerForm.username.trim()" class="input-error">请输入用户名</span>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <input type="tel" v-model="registerForm.phone" placeholder="请输入手机号" class="modal-input" @keyup.enter="handleRegister">
              </div>
              <span v-if="registerForm.phone && !/^1\d{10}$/.test(registerForm.phone)" class="input-error">请输入正确的11位手机号</span>
            </div>
            
            <div class="form-group">
              <div class="code-row">
                <div class="input-wrapper code-input">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <input type="text" v-model="registerForm.code" placeholder="请输入验证码" class="modal-input" maxlength="6" @keyup.enter="handleRegister">
                </div>
                <button type="button" class="code-btn" :disabled="codeCountdown > 0 || !/^1\d{10}$/.test(registerForm.phone)" @click="getCode">
                  {{ codeCountdown > 0 ? `重新发送 (${codeCountdown}s)` : '获取验证码' }}
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input :type="showRegisterPassword ? 'text' : 'password'" v-model="registerForm.password" placeholder="请设置登录密码" class="modal-input" @keyup.enter="handleRegister">
                <button class="eye-btn" @click="togglePassword('register')">
                  <svg v-if="!showRegisterPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M15 12a3 3 0 1 1-6 0"></path>
                  </svg>
                </button>
              </div>
              <div v-if="registerForm.password" class="password-strength">
                <span class="strength-text">密码强度：{{ passwordStrength.text }}</span>
                <div class="strength-bar">
                  <span v-for="i in 5" :key="i" class="strength-block" :class="{ active: i <= passwordStrength.level }"></span>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input :type="showRegisterConfirmPassword ? 'text' : 'password'" v-model="registerForm.confirmPassword" placeholder="请再次输入密码" class="modal-input" @keyup.enter="handleRegister">
                <button class="eye-btn" @click="togglePassword('confirm')">
                  <svg v-if="!showRegisterConfirmPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M15 12a3 3 0 1 1-6 0"></path>
                  </svg>
                </button>
              </div>
              <span v-if="registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword" class="input-error">两次密码不一致</span>
            </div>
            
            <label class="checkbox-label terms-checkbox">
              <input type="checkbox" v-model="registerForm.agreeTerms">
              <span>我已阅读并同意<a href="#">《用户服务协议》</a>和<a href="#">《隐私政策》</a></span>
            </label>
            
            <span v-if="registerError" class="form-error">{{ registerError }}</span>
            
            <button type="submit" class="submit-btn" :disabled="!canRegister || isRegisterLoading">
              <span v-if="isRegisterLoading">注册中...</span>
              <span v-else>完成注册</span>
            </button>
            
            <p class="toggle-link">
              已有账号？<a href="#" @click.prevent="toggleRegister"><font color="#0066ff">返回登录</font></a>
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    handlePanelEnter() {
      const panel = document.querySelector('.side-panel')
      if (panel) {
        panel.style.overflowY = 'auto'
      }
    },
    handlePanelLeave() {
      const panel = document.querySelector('.side-panel')
      if (panel) {
        panel.style.overflowY = 'hidden'
      }
    },
    handlePanelScroll() {
      const panel = document.querySelector('.side-panel')
      if (panel) {
        panel.style.overflowY = 'auto'
      }
    }
  }
}
</script>

<style>
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  font-family: 'Microsoft YaHei', sans-serif;
  position: relative;
}

.top-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 32px;
  background: linear-gradient(90deg, rgba(148, 184, 224, 0.95) 0%, rgba(60, 100, 160, 0.95) 50%, rgba(40, 70, 120, 0.95) 100%);
  z-index: 200;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.top-nav.nav-compact {
  padding: 10px 30px;
}

.top-nav.nav-compact .logo-icon {
  transform: scale(0.9);
}

.nav-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  top: -10px;
  width: 4px;
  height: 4px;
  background: radial-gradient(circle, rgba(100, 200, 255, 0.8) 0%, rgba(100, 200, 255, 0) 70%);
  border-radius: 50%;
  animation: particleFloat linear infinite;
}

@keyframes particleFloat {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(80px) translateX(20px);
    opacity: 0;
  }
}

.nav-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo-icon {
  width: 32px;
  height: 32px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 4px;
  transition: all 0.3s ease;
}

.logo-icon:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.logo-icon svg {
  width: 24px;
  height: 24px;
}

.system-title {
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #ffffff 0%, #e0f0ff 50%, #ffffff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.nav-right {
  display: flex;
  gap: 12px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  overflow: hidden;
}

.nav-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.nav-btn:hover::before {
  left: 100%;
}

.nav-btn svg {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
}

.nav-btn:hover svg {
  transform: scale(1.1);
}

.map-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.side-panel {
  position: absolute;
  top: 72px;
  right: 16px;
  width: 320px;
  max-height: calc(100vh - 90px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 150;
  overflow-y: hidden;
  padding-right: 4px;
}

.side-panel:hover {
  overflow-y: auto;
}

.side-panel::-webkit-scrollbar {
  width: 6px;
}

.side-panel::-webkit-scrollbar-track {
  background: transparent;
}

.side-panel::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.side-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.function-card {
  background-color: rgba(255, 255, 255, 0.85);
  border: none;
  border-radius: 12px;
  padding: 18px;
  backdrop-filter: blur(8px);
  box-sizing: border-box;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.function-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  background-color: rgba(255, 255, 255, 0.92);
}

.module-title {
  font-size: 16px;
  font-weight: bold;
  color: #222222;
  margin: 0 0 16px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.input-group {
  margin-bottom: 14px;
  box-sizing: border-box;
}

.input-label {
  display: block;
  font-size: 13px;
  color: #F27C22;
  margin-bottom: 6px;
}

.range-input {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.input-box {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  color: #444444;
  outline: none;
  box-sizing: border-box;
  max-width: calc(50% - 10px);
}

.input-box::placeholder {
  color: #AAAAAA;
}

.input-box:focus {
  border-color: #94B8E0;
}

.range-separator {
  color: #444444;
  font-weight: bold;
  flex-shrink: 0;
}

.result-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.result-text {
  font-size: 13px;
  color: #444444;
  margin: 0;
  margin-bottom: 10px;
  word-break: break-all;
  max-width: 100%;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.action-row {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.action-btn {
  padding: 6px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.8);
  color: #444444;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 1);
}

.action-btn.small {
  padding: 4px 10px;
  font-size: 12px;
}

.draw-section {
  margin-bottom: 14px;
}

.draw-btn {
  padding: 8px 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.8);
  color: #444444;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 6px;
  width: 100%;
  box-sizing: border-box;
}

.draw-btn:hover {
  background-color: rgba(255, 255, 255, 1);
}

.draw-hint {
  font-size: 11px;
  color: #339933;
  margin: 0;
}

.warning-area {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.warning-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  flex: 1;
}

.draw-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warning-status.not-drawn {
  background-color: rgba(255, 215, 0, 0.2);
  justify-content: center;
}

.warning-status.not-drawn .status-icon {
  color: #FFD700;
}

.warning-status.not-drawn .status-text {
  color: #8B8000;
}

.warning-status.compliant {
  background-color: rgba(76, 175, 80, 0.15);
}

.warning-status.compliant .status-icon {
  color: #4CAF50;
}

.warning-status.compliant .status-text {
  color: #222222;
}

.warning-status.warning {
  background-color: rgba(229, 57, 53, 0.15);
}

.warning-status.warning .status-icon {
  color: #E53935;
}

.warning-status.drawing {
  background-color: rgba(148, 184, 224, 0.2);
}

.warning-status.drawing .status-icon {
  color: #6496C8;
}

.warning-status.drawing .status-text {
  color: #444444;
}

.warning-status.input-height {
  background-color: rgba(156, 39, 176, 0.15);
}

.warning-status.input-height .status-icon {
  color: #9C27B0;
}

.warning-status.input-height .status-text {
  color: #7B1FA2;
}

.warning-status.no-fly-zone {
  background-color: rgba(229, 57, 53, 0.2);
  border-color: rgba(229, 57, 53, 0.5);
}

.warning-status.no-fly-zone .status-icon {
  color: #E53935;
}

.warning-status.no-fly-zone .status-text {
  color: #C62828;
}

.warning-status.checking {
  background-color: rgba(255, 152, 0, 0.15);
}

.warning-status.checking .status-icon {
  color: #FF9800;
}

.warning-status.checking .status-text {
  color: #E65100;
}

.warning-status.warning .status-text {
  color: #E53935;
}

.status-icon {
  font-size: 16px;
  font-weight: bold;
}

.status-text {
  font-size: 13px;
  font-weight: bold;
}

.layer-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.layer-section {
  background-color: rgba(255, 255, 255, 0.7);
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  backdrop-filter: blur(4px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.layer-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  background-color: rgba(255, 255, 255, 0.85);
}

.layer-section.orange-bg {
  background-color: rgba(242, 124, 34, 0.1);
}

.layer-section.blue-bg {
  background-color: rgba(148, 184, 224, 0.15);
}

.layer-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #444444;
  cursor: pointer;
}

.layer-checkbox input {
  width: 14px;
  height: 14px;
}

.stats-card {
  background-color: rgba(232, 248, 245, 0.75);
  border: none;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  backdrop-filter: blur(4px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  background-color: rgba(232, 248, 245, 0.9);
}

.stats-label {
  font-size: 12px;
  color: #444444;
  margin-bottom: 6px;
}

.stats-value {
  font-size: 20px;
  font-weight: bold;
  color: #00897B;
}

.footer-note {
  background-color: rgba(255, 255, 255, 0.6);
  padding: 10px 14px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.footer-note p {
  font-size: 11px;
  color: #777777;
  margin: 0;
  text-align: center;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-container {
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 420px;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-title-area {
  flex: 1;
}

.modal-header h2 {
  font-size: 22px;
  font-weight: bold;
  color: #222222;
  margin: 0 0 4px 0;
}

.modal-subtitle {
  font-size: 13px;
  color: #999999;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.05);
  color: #666666;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: #333333;
}

.modal-body {
  padding: 24px;
}

.login-form, .register-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  color: #999999;
  pointer-events: none;
}

.modal-input {
  width: 100%;
  padding: 12px 12px 12px 42px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  color: #333333;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.modal-input:focus {
  border-color: #94B8E0;
}

.modal-input::placeholder {
  color: #cccccc;
}

.eye-btn {
  position: absolute;
  right: 12px;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #999999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.eye-btn svg {
  width: 18px;
  height: 18px;
}

.eye-btn:hover {
  color: #666666;
}

.input-error {
  font-size: 12px;
  color: #e53935;
  margin-top: 2px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666666;
  cursor: pointer;
}

.checkbox-label input {
  width: 14px;
  height: 14px;
}

.forgot-link {
  font-size: 13px;
  color: #0066ff;
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.form-error {
  font-size: 12px;
  color: #e53935;
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #94B8E0 0%, #6496C8 100%);
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(148, 184, 224, 0.4);
}

.submit-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.toggle-link {
  text-align: center;
  font-size: 13px;
  color: #666666;
  margin: 0;
}

.toggle-link a {
  text-decoration: none;
}

.code-row {
  display: flex;
  gap: 10px;
}

.code-input {
  flex: 1;
}

.code-btn {
  padding: 12px 16px;
  border: 1px solid #94B8E0;
  border-radius: 10px;
  background-color: #ffffff;
  color: #94B8E0;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.code-btn:hover:not(:disabled) {
  background-color: #f0f7ff;
}

.code-btn:disabled {
  background-color: #f5f5f5;
  color: #999999;
  cursor: not-allowed;
}

.password-strength {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.strength-text {
  font-size: 12px;
  color: #666666;
}

.strength-bar {
  display: flex;
  gap: 4px;
}

.strength-block {
  flex: 1;
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.strength-block.active {
  background-color: #94B8E0;
}

.strength-block:nth-child(1).active { background-color: #e53935; }
.strength-block:nth-child(2).active { background-color: #ff9800; }
.strength-block:nth-child(3).active { background-color: #ffc107; }
.strength-block:nth-child(4).active { background-color: #8bc34a; }
.strength-block:nth-child(5).active { background-color: #4caf50; }

.terms-checkbox {
  font-size: 12px;
  color: #666666;
}

.terms-checkbox a {
  color: #0066ff;
  text-decoration: none;
}

.terms-checkbox a:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .modal-container {
    width: 95%;
    margin: 0 10px;
  }
  
  .modal-header {
    padding: 20px 16px 12px;
  }
  
  .modal-body {
    padding: 20px 16px;
  }
}
</style>