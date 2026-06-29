<script setup>
import { ref, watch, onMounted } from 'vue'

const flightHeightMin = ref('')
const flightHeightMax = ref('')
const areaMin = ref('')
const areaMax = ref('')

const collisionHeightMin = ref('')
const collisionHeightMax = ref('')
const warningStatus = ref('compliant')
const isDrawn = ref(false)

const noFlyZoneLayer = ref(false)
const colorLayer = ref(true)

const noFlyZoneArea = ref('1,256.8 公顷')

const exportResults = () => {
  alert('结果导出功能已触发')
}

const drawRange = () => {
  isDrawn.value = true
  alert('请在地图上绘制分析范围')
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

onMounted(() => {
  if (window.setColorLayer) {
    window.setColorLayer(colorLayer.value)
  }
  if (window.setNoFlyZoneLayer) {
    window.setNoFlyZoneLayer(noFlyZoneLayer.value)
  }
})
</script>

<template>
  <div class="app-container">
    <header class="top-nav">
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
        <button class="nav-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Setting</span>
        </button>
        <button class="nav-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Login</span>
        </button>
      </div>
    </header>
    
    <div class="map-container">
      <router-view />
    </div>
    
    <div class="side-panel" @mouseenter="handlePanelEnter" @mouseleave="handlePanelLeave" @wheel="handlePanelScroll">
      <div class="function-card">
        <h2 class="module-title">01 起降点分析</h2>
        
        <div class="input-group">
          <label class="input-label">输入飞行高度</label>
          <div class="range-input">
            <input type="text" v-model="flightHeightMin" class="input-box" placeholder="最小值">
            <span class="range-separator">-</span>
            <input type="text" v-model="flightHeightMax" class="input-box" placeholder="最大值">
          </div>
        </div>
        
        <div class="input-group">
          <label class="input-label">输入面积条件</label>
          <div class="range-input">
            <input type="text" v-model="areaMin" class="input-box" placeholder="最小值">
            <span class="range-separator">-</span>
            <input type="text" v-model="areaMax" class="input-box" placeholder="最大值">
          </div>
        </div>
        
        <div class="result-area">
          <p class="result-text">已筛选出符合条件的起降点位</p>
          <button class="action-btn" @click="exportResults">导出结果</button>
        </div>
      </div>
      
      <div class="function-card">
        <h2 class="module-title">02 航线碰撞预警</h2>
        
        <div class="draw-section">
          <button class="draw-btn" @click="drawRange">绘制范围</button>
          <p class="draw-hint">提示：点击按钮后在地图上绘制多边形区域</p>
        </div>
        
        <div class="input-group">
          <label class="input-label">飞行高度区间</label>
          <div class="range-input">
            <input type="text" v-model="collisionHeightMin" class="input-box" placeholder="最小值">
            <span class="range-separator">-</span>
            <input type="text" v-model="collisionHeightMax" class="input-box" placeholder="最大值">
          </div>
        </div>
        
        <div class="warning-area">
          <div class="warning-status" :class="{ 'not-drawn': !isDrawn, 'compliant': isDrawn && warningStatus === 'compliant', 'warning': isDrawn && warningStatus === 'warning' }">
            <span class="status-icon">{{ !isDrawn ? '📋' : (warningStatus === 'compliant' ? '✓' : '⚠') }}</span>
            <span class="status-text">{{ !isDrawn ? '请绘制' : (warningStatus === 'compliant' ? '合规' : '碰撞告警') }}</span>
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
  background: linear-gradient(135deg, rgba(148, 184, 224, 0.95) 0%, rgba(100, 150, 200, 0.95) 100%);
  z-index: 200;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
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
}

.logo-icon svg {
  width: 24px;
  height: 24px;
}

.system-title {
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  letter-spacing: 1px;
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
  background-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
}

.nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-btn svg {
  width: 16px;
  height: 16px;
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
}

.warning-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
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
</style>