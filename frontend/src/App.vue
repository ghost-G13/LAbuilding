<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { login, register, sendCode, getCaptcha } from './utils/request'

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

const noFlyZoneArea = computed(() => `1,256.8 ${t.value.hectare}`)

const showLoginModal = ref(false)
const isRegisterMode = ref(false)
const isLoggedIn = ref(false)
const loggedInUser = ref(null)
const showUserMenu = ref(false)

const loginForm = ref({
  account: '',
  password: '',
  captcha: '',
  rememberAccount: false
})

const captchaImage = ref('')
const captchaKey = ref('')

const registerForm = ref({
  username: '',
  email: '',
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
  const texts = {
    'zh-CN': ['', '弱', '中', '中', '强', '强'],
    'en': ['', 'Weak', 'Medium', 'Medium', 'Strong', 'Strong']
  }
  return { level: Math.min(level, 5), text: texts[currentLanguage.value][level] || texts['zh-CN'][level] }
})

const canLogin = computed(() => {
  return loginForm.value.account.trim() && loginForm.value.password.trim() && loginForm.value.captcha.trim()
})

const canRegister = computed(() => {
  const f = registerForm.value
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)
  return f.username.trim() && 
         f.email.trim() && 
         isEmailValid && 
         f.code.length === 6 && 
         f.password.length >= 6 && 
         f.password === f.confirmPassword && 
         f.agreeTerms
})

const refreshCaptcha = async () => {
  try {
    const data = await getCaptcha()
    if (data.code === 0) {
      captchaImage.value = data.data.image
      captchaKey.value = data.data.captcha_key
    }
  } catch (error) {
    console.error('获取验证码失败:', error)
  }
}

const handleLogin = async () => {
  if (!canLogin.value) return
  isLoginLoading.value = true
  loginError.value = ''
  
  try {
    console.log('登录参数:', {
      username: loginForm.value.account,
      password: loginForm.value.password,
      captcha_key: captchaKey.value,
      captcha_code: loginForm.value.captcha
    })
    
    const data = await login({
      username: loginForm.value.account,
      password: loginForm.value.password,
      captcha_key: captchaKey.value,
      captcha_code: loginForm.value.captcha
    })
    
    console.log('登录响应:', data)
    
    if (data.code === 0) {
      isLoggedIn.value = true
      loggedInUser.value = data.data.username
      
      localStorage.setItem('user', JSON.stringify({
        token: data.data.token,
        user: data.data.username,
        id: data.data.id,
        role: data.data.role
      }))
      
      closeLogin()
      alert(t.value.loginSuccess || 'Login successful!')
    } else {
      loginError.value = data.message || (t.value.loginFailed || 'Login failed')
      refreshCaptcha()
    }
  } catch (error) {
    console.error('登录异常:', error)
    loginError.value = error.message || (t.value.loginRetry || 'Login failed, please try again later')
    refreshCaptcha()
  }
  
  isLoginLoading.value = false
}

const handleRegister = async () => {
  if (!canRegister.value) return
  isRegisterLoading.value = true
  registerError.value = ''
  
  try {
    const data = await register({
      email: registerForm.value.email.trim(),
      code: registerForm.value.code,
      password: registerForm.value.password,
      username: registerForm.value.username
    })
    
    if (data.code === 0) {
      isRegisterMode.value = false
      alert(t.value.registerSuccess || 'Registration successful! Please login')
    } else {
      registerError.value = data.message
    }
  } catch (error) {
    registerError.value = t.value.registerRetry || 'Registration failed, please try again later'
  }
  
  isRegisterLoading.value = false
}

const closeLogin = () => {
  showLoginModal.value = false
  loginError.value = ''
  registerError.value = ''
}

const handleLogout = () => {
  isLoggedIn.value = false
  loggedInUser.value = null
  showUserMenu.value = false
  localStorage.removeItem('user')
  alert(t.value.loggedOut || 'Logged out successfully')
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

const getCode = async () => {
  const email = registerForm.value.email.trim()
  
  if (!email) {
    registerError.value = t.value.email || 'Please enter email'
    return
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    registerError.value = t.value.email || 'Please enter valid email format'
    return
  }
  
  try {
    const data = await sendCode({ email })
    
    if (data.code === 0) {
      codeCountdown.value = 60
      const timer = setInterval(() => {
        codeCountdown.value--
        if (codeCountdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    } else {
      registerError.value = data.message
    }
  } catch (error) {
    registerError.value = t.value.sendCodeFailed || 'Failed to send verification code'
  }
}

const showSettings = ref(false)
const currentLanguage = ref('zh-CN')
const currentTheme = ref('light')
const currentFontSize = ref('medium')

const i18n = {
  'zh-CN': {
    title: '城市低空三维白模可视化与分析系统',
    settings: '设置',
    login: '登录',
    logout: '退出登录',
    takeoffAnalysis: '01 起降点分析',
    flightHeight: '输入飞行高度(m)',
    minHeight: '最小值',
    maxHeight: '最大值',
    area: '输入面积要求(m²)',
    minArea: '最低面积',
    maxArea: '最大面积',
    inputComplete: '请输入以上相关信息！',
    clickFilter: '输入完成，请点击筛选',
    filtering: '筛选中...',
    filteredResult: '已筛选出符合条件的起降点位：共',
    clearFilter: '清除筛选',
    filter: '筛选',
    exportResults: '导出结果',
    collisionWarning: '02 航线碰撞预警',
    drawRange: '绘制范围',
    drawing: '绘制中…',
    drawHint: '提示：点击按钮后在地图上绘制多边形区域',
    collisionHeight: '飞行高度区间(m)',
    checkCollision: '检测碰撞',
    compliant: '安全合规',
    warning: '存在碰撞风险',
    danger: '高度危险',
    noFlyZone: '禁飞区图层',
    colorLayer: '分层设色图层',
    statsTitle: '统计信息',
    buildingCount: '建筑数量',
    noFlyZoneArea: '禁飞区面积',
    total: '个',
    export: '导出',
    newUserRegister: '新用户注册',
    loginAccount: '账号登录',
    registerHint: '已有账号可返回登录',
    loginHint: '未注册账号可切换前往注册',
    account: '请输入手机号/用户名',
    password: '请输入登录密码',
    captcha: '请输入验证码',
    getCaptcha: '获取验证码',
    username: '请输入用户名',
    email: '请输入邮箱地址',
    code: '请输入验证码',
    setPassword: '请设置登录密码',
    confirmPassword: '请确认登录密码',
    agreeTerms: '我已阅读并同意',
    privacyPolicy: '用户协议与隐私政策',
    register: '完成注册',
    login: '登录',
    backToLogin: '返回登录',
    registerLoading: '注册中...',
    loginLoading: '登录中...',
    language: '语言',
    theme: '主题',
    fontSize: '字号',
    default: '默认',
    simplifiedChinese: '简体中文',
    english: 'English',
    lightMode: '日间模式',
    darkMode: '夜间模式',
    small: '小号',
    medium: '中号',
    large: '大号',
    apply: '应用',
    cancel: '取消',
    passwordStrength: '密码强度：',
    weak: '弱',
    medium: '中',
    strong: '强',
    notLoggedIn: '您尚未登录，请前往登录/注册',
    loginSuccess: '登录成功！',
    loginFailed: '登录失败',
    loginRetry: '登录失败，请稍后重试',
    registerSuccess: '注册成功！请登录',
    registerRetry: '注册失败，请稍后重试',
    loggedOut: '已退出登录',
    sendCodeFailed: '发送验证码失败',
    passwordMismatch: '两次密码不一致',
    rememberAccount: '记住账号',
    forgotPassword: '忘记密码？',
    resend: '重新发送',
    legend: '图例',
    legendLow: '低层建筑',
    legendMid: '中层建筑',
    legendHigh: '高层建筑',
    legendSuper: '超高层建筑',
    coordinateRange: '经纬度范围',
    hectare: '公顷',
    pleaseDraw: '请绘制',
    warningNoFlyZone: '警告：在禁飞区内！'
  },
  'en': {
    title: 'Urban Low-Altitude 3D Building Visualization & Analysis System',
    settings: 'Settings',
    login: 'Login',
    logout: 'Logout',
    takeoffAnalysis: '01 Takeoff Point Analysis',
    flightHeight: 'Flight Height (m)',
    minHeight: 'Min',
    maxHeight: 'Max',
    area: 'Area Requirement (m²)',
    minArea: 'Min Area',
    maxArea: 'Max Area',
    inputComplete: 'Please enter all required information!',
    clickFilter: 'Input complete, click to filter',
    filtering: 'Filtering...',
    filteredResult: 'Filtered takeoff points:',
    clearFilter: 'Clear Filter',
    filter: 'Filter',
    exportResults: 'Export Results',
    collisionWarning: '02 Route Collision Warning',
    drawRange: 'Draw Range',
    drawing: 'Drawing...',
    drawHint: 'Hint: Click and draw polygon on the map',
    collisionHeight: 'Flight Height Range (m)',
    checkCollision: 'Check Collision',
    compliant: 'Compliant',
    warning: 'Collision Risk',
    danger: 'Highly Dangerous',
    noFlyZone: 'No-Fly Zone Layer',
    colorLayer: 'Color-coded Layer',
    statsTitle: 'Statistics',
    buildingCount: 'Building Count',
    noFlyZoneArea: 'No-Fly Zone Area',
    total: '',
    export: 'Export',
    newUserRegister: 'New User Registration',
    loginAccount: 'Account Login',
    registerHint: 'Already have an account? Back to login',
    loginHint: 'No account? Switch to register',
    account: 'Enter phone/username',
    password: 'Enter login password',
    captcha: 'Enter verification code',
    getCaptcha: 'Get Code',
    username: 'Enter username',
    email: 'Enter email address',
    code: 'Enter verification code',
    setPassword: 'Set login password',
    confirmPassword: 'Confirm login password',
    agreeTerms: 'I agree to',
    privacyPolicy: 'User Agreement & Privacy Policy',
    register: 'Complete Registration',
    login: 'Login',
    backToLogin: 'Back to Login',
    registerLoading: 'Registering...',
    loginLoading: 'Logging in...',
    language: 'Language',
    theme: 'Theme',
    fontSize: 'Font Size',
    default: 'Default',
    simplifiedChinese: 'Simplified Chinese',
    english: 'English',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    apply: 'Apply',
    cancel: 'Cancel',
    passwordStrength: 'Password Strength: ',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    notLoggedIn: 'You are not logged in, please go to login/register',
    loginSuccess: 'Login successful!',
    loginFailed: 'Login failed',
    loginRetry: 'Login failed, please try again later',
    registerSuccess: 'Registration successful! Please login',
    registerRetry: 'Registration failed, please try again later',
    loggedOut: 'Logged out successfully',
    sendCodeFailed: 'Failed to send verification code',
    passwordMismatch: 'Passwords do not match',
    rememberAccount: 'Remember Account',
    forgotPassword: 'Forgot Password?',
    resend: 'Resend',
    legend: 'Legend',
    legendLow: 'Low-rise',
    legendMid: 'Mid-rise',
    legendHigh: 'High-rise',
    legendSuper: 'Super High-rise',
    coordinateRange: 'Coord Range',
    hectare: 'ha',
    pleaseDraw: 'Please Draw',
    warningNoFlyZone: 'Warning: In No-Fly Zone!'
  }
}

const t = computed(() => i18n[currentLanguage.value] || i18n['zh-CN'])

const languageOptions = [
  { value: 'zh-CN', label: '简体中文', enLabel: 'Simplified Chinese' },
  { value: 'en', label: 'English', enLabel: 'English' }
]

const themeOptions = [
  { value: 'light', label: '日间模式' },
  { value: 'dark', label: '夜间模式' }
]

const fontSizeOptions = [
  { value: 'small', label: '小号' },
  { value: 'medium', label: '中号' },
  { value: 'large', label: '大号' }
]

const checkLogin = () => {
  if (!isLoggedIn.value) {
    alert(t.value.notLoggedIn || 'You are not logged in, please go to login/register')
    showLoginModal.value = true
  } else {
    showSettings.value = true
  }
}

const closeSettings = () => {
  showSettings.value = false
}

const handleLoginClick = () => {
  if (!isLoggedIn.value) {
    showLoginModal.value = true
  } else {
    showUserMenu.value = !showUserMenu.value
  }
}

const applySettings = () => {
  document.documentElement.setAttribute('data-theme', currentTheme.value)
  document.documentElement.setAttribute('data-font-size', currentFontSize.value)
  
  const appContainer = document.querySelector('.app-container')
  if (appContainer) {
    appContainer.setAttribute('data-lang', currentLanguage.value)
  }
  
  closeSettings()
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
  
  const header = currentLanguage.value === 'en' ? 'ID,Height(m),Area(m²)\n' : 'ID,高度(m),面积(m²)\n'
  let csv = header
  filteredData.value.forEach(item => {
    csv += `${item.id},${item.height},${item.area}\n`
  })
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  const filename = currentLanguage.value === 'en' ? `Takeoff_Analysis_Results_${new Date().toISOString().slice(0, 10)}.csv` : `起降点分析结果_${new Date().toISOString().slice(0, 10)}.csv`
  link.setAttribute('download', filename)
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
  
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser)
      if (userData.token) {
        isLoggedIn.value = true
        loggedInUser.value = userData.user
        console.log('自动登录成功:', userData.user)
      }
    } catch (e) {
      localStorage.removeItem('user')
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
          <span class="system-title">{{ t.title }}</span>
        </div>
        <div class="nav-right">
          <button class="nav-btn" @click="checkLogin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>{{ t.settings }}</span>
          </button>
          <div class="user-menu-container">
            <button class="nav-btn" @click="handleLoginClick">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>{{ isLoggedIn ? loggedInUser : t.login }}</span>
            </button>
            <div v-if="isLoggedIn && showUserMenu" class="user-dropdown">
              <button class="dropdown-item" @click="handleLogout">{{ t.logout }}</button>
            </div>
          </div>
        </div>
      </div>
    </header>
    
    <div class="map-container">
      <router-view v-slot="{ Component }">
        <component :is="Component" :currentLanguage="currentLanguage" :currentFontSize="currentFontSize" :currentTheme="currentTheme" />
      </router-view>
    </div>
    
    <div class="side-panel" @mouseenter="handlePanelEnter" @mouseleave="handlePanelLeave" @wheel="handlePanelScroll">
      <div class="function-card">
        <h2 class="module-title">{{ t.takeoffAnalysis }}</h2>
        
        <div class="input-group">
          <label class="input-label">{{ t.flightHeight }}</label>
          <div class="range-input">
            <input type="text" v-model="flightHeightMin" class="input-box" :placeholder="t.minHeight">
          <span class="range-separator">-</span>
          <input type="text" v-model="flightHeightMax" class="input-box" :placeholder="t.maxHeight">
          </div>
        </div>
        
        <div class="input-group">
          <label class="input-label">{{ t.area }}</label>
          <div class="range-input">
            <input type="text" v-model="areaMin" class="input-box" :placeholder="t.minArea">
          </div>
        </div>
        
        <div class="result-area">
          <p class="result-text" v-if="!isInputComplete">{{ t.inputComplete }}</p>
          <p class="result-text" v-else-if="!hasFiltered">{{ t.clickFilter }}</p>
          <p class="result-text" v-else-if="filteredCount === -1">{{ t.filtering }}</p>
          <p class="result-text" v-else>{{ t.filteredResult }} <span>{{ filteredCount }}</span> {{ t.total }}</p>
          <div class="result-actions">
            <div class="action-row">
              <button class="action-btn" @click="clearFilter" :disabled="!hasFiltered">{{ t.clearFilter }}</button>
              <button class="action-btn" @click="filterTakeoffPoints" :disabled="!isInputComplete">{{ t.filter }}</button>
            </div>
            <div class="action-row">
              <button class="action-btn" @click="exportResults" :disabled="!hasFiltered">{{ t.exportResults }}</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="function-card">
        <h2 class="module-title">{{ t.collisionWarning }}</h2>
        
        <div class="draw-section">
          <button class="draw-btn" @click="drawRange">{{ isDrawing ? t.drawing : t.drawRange }}</button>
          <p class="draw-hint">{{ t.drawHint }}</p>
        </div>
        
        <div class="input-group">
          <label class="input-label">{{ t.collisionHeight }}</label>
          <div class="range-input">
            <input type="text" v-model="collisionHeightMin" class="input-box" :placeholder="t.minHeight" @blur="validateCollisionHeight">
          <span class="range-separator">-</span>
          <input type="text" v-model="collisionHeightMax" class="input-box" :placeholder="t.maxHeight" @blur="validateCollisionHeight">
          </div>
        </div>
        
        <div class="result-area">
          <button class="action-btn" @click="checkCollision" :disabled="!isDrawn || !collisionHeightMin || !collisionHeightMax || isCheckingCollision">
            {{ isCheckingCollision ? t.filtering : t.checkCollision }}
          </button>
        </div>
        
        <div class="warning-area">
          <div class="warning-status" :class="{ 'not-drawn': !isDrawn && !isDrawing, 'compliant': isDrawn && !isCheckingCollision && warningStatus === 'compliant', 'warning': isDrawn && !isCheckingCollision && warningStatus === 'warning', 'no-fly-zone': isDrawn && !isCheckingCollision && warningStatus === 'no_fly_zone', 'input-height': isDrawn && !isCheckingCollision && warningStatus === 'input_height', 'drawing': isDrawing, 'checking': isCheckingCollision }">
            <span class="status-icon">{{ isCheckingCollision ? '🔍' : (isDrawing ? '✏️' : (!isDrawn ? '📋' : (warningStatus === 'input_height' ? '📝' : (warningStatus === 'no_fly_zone' ? '🚫' : (warningStatus === 'compliant' ? '✓' : '⚠'))))) }}</span>
            <span class="status-text">{{ isCheckingCollision ? t.filtering : (isDrawing ? t.drawing : (!isDrawn ? t.pleaseDraw : (warningStatus === 'input_height' ? t.inputComplete : (warningStatus === 'no_fly_zone' ? t.warningNoFlyZone : (warningStatus === 'compliant' ? t.compliant : t.warning))))) }}</span>
          </div>
          <div class="draw-actions" v-if="isDrawn">
            <button class="action-btn small" @click="drawRange">{{ t.drawRange }}</button>
            <button class="action-btn small" @click="clearDraw">{{ t.clearFilter }}</button>
          </div>
        </div>
      </div>
      
      <div class="layer-control">
        <div class="layer-section orange-bg">
          <label class="layer-checkbox">
            <input type="checkbox" v-model="noFlyZoneLayer">
            <span>{{ t.noFlyZone }}</span>
          </label>
        </div>
        <div class="layer-section blue-bg">
          <label class="layer-checkbox">
            <input type="checkbox" v-model="colorLayer">
            <span>{{ t.colorLayer }}</span>
          </label>
        </div>
      </div>
      
      <div class="stats-card">
        <div class="stats-label">{{ t.noFlyZoneArea }}</div>
        <div class="stats-value">{{ noFlyZoneArea }}</div>
      </div>
      
      <div class="footer-note">
        <p>{{ t.coordinateRange }}：{{ currentLanguage === 'en' ? 'Lon 116.00° - 116.50°, Lat 39.70° - 40.10°' : 'E 116.00° - 116.50°, N 39.70° - 40.10°' }}</p>
      </div>
    </div>
    
    <div v-if="showLoginModal" class="modal-overlay" @click.self="closeLogin">
      <div class="modal-container">
        <div class="modal-header">
          <div class="modal-title-area">
            <h2>{{ isRegisterMode ? t.newUserRegister : t.loginAccount }}</h2>
            <p class="modal-subtitle">{{ isRegisterMode ? t.registerHint : t.loginHint }}</p>
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
                <input type="text" v-model="loginForm.account" :placeholder="t.account" class="modal-input" @keyup.enter="handleLogin">
              </div>
              <span v-if="!loginForm.account.trim()" class="input-error">{{ t.account }}</span>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input :type="showPassword ? 'text' : 'password'" v-model="loginForm.password" :placeholder="t.password" class="modal-input" @keyup.enter="handleLogin">
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
              <span v-if="!loginForm.password.trim()" class="input-error">{{ t.password }}</span>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper captcha-wrapper">
                <input type="text" v-model="loginForm.captcha" :placeholder="t.captcha" class="modal-input captcha-input" @keyup.enter="handleLogin">
                <div v-if="captchaImage" class="captcha-img" v-html="captchaImage" @click="refreshCaptcha"></div>
                <button v-else class="captcha-btn" @click="refreshCaptcha">{{ t.getCaptcha }}</button>
              </div>
              <span v-if="!loginForm.captcha.trim()" class="input-error">{{ t.captcha }}</span>
            </div>
            
            <div class="form-options">
              <label class="checkbox-label">
                <input type="checkbox" v-model="loginForm.rememberAccount">
                <span>{{ t.rememberAccount || 'Remember Account' }}</span>
              </label>
              <a href="#" class="forgot-link">{{ t.forgotPassword || 'Forgot Password?' }}</a>
            </div>
            
            <span v-if="loginError" class="form-error">{{ loginError }}</span>
            
            <button type="submit" class="submit-btn" :disabled="!canLogin || isLoginLoading">
              <span v-if="isLoginLoading">{{ t.loginLoading }}</span>
              <span v-else>{{ t.login }}</span>
            </button>
            
            <p class="toggle-link">
              {{ t.loginHint }} <a href="#" @click.prevent="toggleRegister"><span style="color: #0066ff">{{ t.register }}</span></a>
            </p>
          </form>
          
          <form v-else @submit.prevent="handleRegister" class="register-form">
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input type="text" v-model="registerForm.username" :placeholder="t.username" class="modal-input" @keyup.enter="handleRegister">
              </div>
              <span v-if="!registerForm.username.trim()" class="input-error">{{ t.username }}</span>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input type="email" v-model="registerForm.email" :placeholder="t.email" class="modal-input" @keyup.enter="handleRegister">
              </div>
              <span v-if="registerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)" class="input-error">{{ t.email }}</span>
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
                  <input type="text" v-model="registerForm.code" :placeholder="t.code" class="modal-input" maxlength="6" @keyup.enter="handleRegister">
                </div>
                <button type="button" class="code-btn" :disabled="codeCountdown > 0 || !registerForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)" @click="getCode">
                  {{ codeCountdown > 0 ? `${t.resend || 'Resend'} (${codeCountdown}s)` : t.getCaptcha }}
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input :type="showRegisterPassword ? 'text' : 'password'" v-model="registerForm.password" :placeholder="t.setPassword" class="modal-input" @keyup.enter="handleRegister">
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
                <span class="strength-text">{{ t.passwordStrength }}{{ passwordStrength.text }}</span>
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
                <input :type="showRegisterConfirmPassword ? 'text' : 'password'" v-model="registerForm.confirmPassword" :placeholder="t.confirmPassword" class="modal-input" @keyup.enter="handleRegister">
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
              <span v-if="registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword" class="input-error">{{ t.passwordMismatch || 'Passwords do not match' }}</span>
            </div>
            
            <label class="checkbox-label terms-checkbox">
              <input type="checkbox" v-model="registerForm.agreeTerms">
              <span>{{ t.agreeTerms }}<a href="#">{{ t.privacyPolicy }}</a></span>
            </label>
            
            <span v-if="registerError" class="form-error">{{ registerError }}</span>
            
            <button type="submit" class="submit-btn" :disabled="!canRegister || isRegisterLoading">
              <span v-if="isRegisterLoading">{{ t.registerLoading }}</span>
              <span v-else>{{ t.register }}</span>
            </button>
            
            <p class="toggle-link">
              {{ t.registerHint }} <a href="#" @click.prevent="toggleRegister"><span style="color: #0066ff">{{ t.backToLogin }}</span></a>
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
  
  <div v-if="showSettings" class="modal-overlay" @click.self="closeSettings">
    <div class="settings-modal">
      <div class="settings-header">
        <h2 class="settings-title">{{ t.settings }}</h2>
        <button class="modal-close" @click="closeSettings">×</button>
      </div>
      <div class="settings-body">
        <div class="settings-item">
          <label class="settings-label">{{ t.language }}</label>
          <div class="settings-options">
            <button 
              v-for="lang in languageOptions" 
              :key="lang.value"
              class="settings-option"
              :class="{ active: currentLanguage === lang.value }"
              @click="currentLanguage = lang.value"
            >
              {{ currentLanguage === 'en' ? lang.enLabel : lang.label }}
            </button>
          </div>
        </div>
        <div class="settings-item">
          <label class="settings-label">{{ t.theme }}</label>
          <div class="settings-options">
            <button 
              v-for="theme in themeOptions" 
              :key="theme.value"
              class="settings-option"
              :class="{ active: currentTheme === theme.value }"
              @click="currentTheme = theme.value"
            >
              {{ theme.value === 'light' ? t.lightMode : t.darkMode }}
            </button>
          </div>
        </div>
        <div class="settings-item">
          <label class="settings-label">{{ t.fontSize }}</label>
          <div class="settings-options">
            <button 
              v-for="size in fontSizeOptions" 
              :key="size.value"
              class="settings-option"
              :class="{ active: currentFontSize === size.value }"
              @click="currentFontSize = size.value"
            >
              {{ size.value === 'small' ? t.small : size.value === 'medium' ? t.medium : t.large }}
            </button>
          </div>
        </div>
      </div>
      <div class="settings-footer">
        <button class="settings-btn apply-btn" @click="applySettings">{{ t.apply }}</button>
        <button class="settings-btn cancel-btn" @click="closeSettings">{{ t.cancel }}</button>
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
  z-index: 9998;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
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

.user-menu-container {
  position: relative;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  min-width: 140px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  z-index: 9999;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  width: 100%;
  padding: 14px 20px;
  border: none;
  background: none;
  color: #ff4444;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-item:hover {
  background-color: rgba(255, 68, 68, 0.1);
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
  flex-direction: column;
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

.captcha-wrapper {
  gap: 10px;
}

.captcha-input {
  flex: 1;
  padding: 12px;
}

.captcha-img {
  width: 120px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-btn {
  padding: 0 20px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 14px;
  cursor: pointer;
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

.settings-modal {
  background-color: #ffffff;
  border-radius: 12px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.settings-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.settings-body {
  padding: 24px;
}

.settings-item {
  margin-bottom: 24px;
}

.settings-item:last-child {
  margin-bottom: 0;
}

.settings-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  margin-bottom: 12px;
}

.settings-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.settings-option {
  padding: 10px 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-option:hover {
  border-color: #00897B;
  color: #00897B;
}

.settings-option.active {
  background-color: #00897B;
  border-color: #00897B;
  color: #fff;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #eee;
}

.settings-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-btn.apply-btn {
  background-color: #00897B;
  color: #fff;
}

.settings-btn.apply-btn:hover {
  background-color: #007064;
}

.settings-btn.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.settings-btn.cancel-btn:hover {
  background-color: #eee;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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
  
  .settings-modal {
    width: 95%;
  }
  
  .settings-options {
    flex-direction: column;
  }
  
  .settings-option {
    width: 100%;
    text-align: center;
  }
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #242424;
  --bg-card: #2d2d2d;
  --bg-hover: #3d3d3d;
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --text-muted: #888888;
  --border-color: #444444;
  --accent-color: #00897B;
  --accent-light: #00a693;
}

[data-theme="light"] {
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --bg-card: rgba(255, 255, 255, 0.85);
  --bg-hover: rgba(0, 137, 123, 0.1);
  --text-primary: #2c3e50;
  --text-secondary: #5a6c7d;
  --text-muted: #8a9ab0;
  --border-color: #e8eef4;
  --accent-color: #00897B;
  --accent-light: #00a693;
}

[data-font-size="small"] {
  font-size: 12px;
}

[data-font-size="medium"] {
  font-size: 14px;
}

[data-font-size="large"] {
  font-size: 16px;
}

[data-font-size="small"] .nav-btn span,
[data-font-size="small"] .system-title {
  font-size: 14px;
}

[data-font-size="large"] .nav-btn span,
[data-font-size="large"] .system-title {
  font-size: 18px;
}

[data-font-size="small"] .function-card,
[data-font-size="small"] .layer-control,
[data-font-size="small"] .stats-card {
  padding: 12px;
}

[data-font-size="large"] .function-card,
[data-font-size="large"] .layer-control,
[data-font-size="large"] .stats-card {
  padding: 20px;
}

[data-font-size="small"] .module-title {
  font-size: 14px;
}

[data-font-size="large"] .module-title {
  font-size: 18px;
}

[data-font-size="small"] .input-box,
[data-font-size="small"] .action-btn,
[data-font-size="small"] .draw-btn {
  font-size: 12px;
  padding: 6px 12px;
}

[data-font-size="large"] .input-box,
[data-font-size="large"] .action-btn,
[data-font-size="large"] .draw-btn {
  font-size: 16px;
  padding: 10px 20px;
}

[data-theme="dark"] .top-nav {
  background: linear-gradient(90deg, rgba(26, 26, 26, 0.98) 0%, rgba(30, 30, 30, 0.98) 50%, rgba(36, 36, 36, 0.98) 100%);
}

[data-theme="dark"] .top-nav .logo-icon {
  color: #cccccc;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .top-nav .logo-icon svg {
  color: #cccccc;
}

[data-theme="dark"] .system-title {
  color: #cccccc;
  background: none;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: #cccccc;
  text-shadow: none;
}

[data-theme="dark"] .nav-btn {
  color: #cccccc;
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .nav-btn svg {
  color: #cccccc;
}

[data-theme="dark"] .header-right .nav-btn {
  background-color: #333333;
  border: 1px solid #444444;
  color: #e0e0e0;
}

[data-theme="dark"] .header-right .nav-btn:hover {
  background-color: #444444;
}

[data-theme="dark"] .header-right svg {
  color: #e0e0e0;
}

[data-theme="dark"] .side-panel {
  background-color: transparent;
}

[data-theme="dark"] .function-card {
  background-color: rgba(45, 45, 45, 0.95);
  border-color: #444444;
}

[data-theme="dark"] .module-title {
  color: #ffffff;
  border-bottom-color: #444444;
}

[data-theme="dark"] .input-label {
  color: #cccccc;
}

[data-theme="dark"] .input-box {
  background-color: #333333;
  border-color: #444444;
  color: #ffffff;
}

[data-theme="dark"] .input-box::placeholder {
  color: #666666;
}

[data-theme="dark"] .action-btn {
  background-color: #333333;
  color: #e0e0e0;
  border-color: #444444;
}

[data-theme="dark"] .action-btn:hover {
  background-color: #444444;
}

[data-theme="dark"] .action-btn:disabled {
  background-color: #2a2a2a;
  color: #666666;
  border-color: #333333;
}

[data-theme="dark"] .draw-btn {
  background-color: #b8860b;
  color: #1a1a1a;
  border-color: #d4a574;
}

[data-theme="dark"] .result-text {
  color: #ffffff;
}

[data-theme="dark"] .result-text span {
  color: #00a693;
}

[data-theme="dark"] .result-text .warning-text {
  color: #cc7722;
}

[data-theme="dark"] .layer-section {
  background-color: rgba(45, 45, 45, 0.8);
}

[data-theme="dark"] .layer-checkbox {
  color: #cccccc;
}

[data-theme="dark"] .stats-card {
  background-color: rgba(45, 45, 45, 0.95);
}

[data-theme="dark"] .stats-item {
  color: #cccccc;
}

[data-theme="dark"] .stats-value {
  color: #ffffff;
}

[data-theme="dark"] .user-dropdown {
  background-color: rgba(29, 29, 29, 0.98);
  border-color: #444444;
}

[data-theme="dark"] .dropdown-item {
  color: #ff6b6b;
}

[data-theme="dark"] .dropdown-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .modal-container,
[data-theme="dark"] .settings-modal {
  background-color: #2d2d2d;
}

[data-theme="dark"] .modal-header h2,
[data-theme="dark"] .settings-title {
  color: #ffffff;
}

[data-theme="dark"] .modal-subtitle {
  color: #888888;
}

[data-theme="dark"] .modal-input {
  background-color: #333333;
  border-color: #444444;
  color: #ffffff;
}

[data-theme="dark"] .modal-input::placeholder {
  color: #666666;
}

[data-theme="dark"] .input-error {
  color: #ff6b6b;
}

[data-theme="dark"] .submit-btn {
  background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-light) 100%);
}

[data-theme="dark"] .code-btn {
  background-color: #333333;
  border-color: #00897B;
  color: #00a693;
}

[data-theme="dark"] .code-btn:hover:not(:disabled) {
  background-color: #444444;
}

[data-theme="dark"] .code-btn:disabled {
  background-color: #2a2a2a;
  color: #666666;
  border-color: #333333;
}

[data-theme="dark"] .toggle-link {
  color: #888888;
}

[data-theme="dark"] .toggle-link a {
  color: #00a693;
}

[data-theme="dark"] .settings-option {
  background-color: #333333;
  border-color: #444444;
  color: #cccccc;
}

[data-theme="dark"] .settings-option:hover {
  border-color: #00897B;
  color: #00a693;
}

[data-theme="dark"] .settings-option.active {
  background-color: #00897B;
  border-color: #00897B;
  color: #fff;
}

[data-theme="dark"] .status-bar {
  background-color: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .status-bar span {
  color: #cccccc;
}

[data-theme="dark"] .settings-btn {
  background-color: #333333;
  border-color: #444444;
  color: #cccccc;
}

[data-theme="dark"] .settings-btn:hover {
  background-color: #444444;
}

[data-theme="dark"] .settings-btn.apply-btn {
  background-color: #00897B;
  border-color: #00897B;
  color: #ffffff;
}

[data-theme="dark"] .settings-btn.apply-btn:hover {
  background-color: #00a693;
}

[data-theme="dark"] .footer {
  background-color: rgba(29, 29, 29, 0.9);
}

[data-theme="dark"] .footer-text {
  color: #888888;
}

[data-theme="dark"] .loading-overlay {
  background-color: rgba(26, 26, 26, 0.8);
}

[data-theme="dark"] .loading-text {
  color: #cccccc;
}

[data-theme="dark"] .settings-btn.cancel-btn {
  background-color: #333333;
  color: #cccccc;
}

[data-theme="dark"] .settings-btn.cancel-btn:hover {
  background-color: #444444;
}

[data-theme="dark"] .user-dropdown {
  background: rgba(45, 45, 45, 0.98);
  border-color: #555555;
}

[data-theme="dark"] .dropdown-item {
  color: #ff4444;
}

[data-theme="dark"] .dropdown-item:hover {
  background-color: rgba(255, 68, 68, 0.15);
}

[data-theme="dark"] .hint,
[data-theme="dark"] .hint-bottom {
  color: #cccccc;
}

.lang-en .zh-text {
  display: none;
}

.lang-zh .en-text {
  display: none;
}

[data-lang="en"] .zh-text {
  display: none;
}

[data-lang="en"] .en-text {
  display: inline;
}

[data-lang="default"] .en-text {
  display: none;
}
</style>