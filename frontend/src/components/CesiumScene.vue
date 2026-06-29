<script setup>
import { onMounted, onBeforeUnmount, ref, defineExpose } from 'vue'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

const BUILDING_GEOJSON_URL = '/data/la_height_filled.geojson'
const NO_FLY_ZONE_URL = '/data/no_fly_zone.geojson'

const cesiumContainer = ref(null)
const buildingLoadingText = ref(`建筑白模：正在加载 ${BUILDING_GEOJSON_URL}`)
const buildingCount = ref(0)
const showLegend = ref(true)

let viewer = null
let buildingDataSource = null
let noFlyZoneDataSource = null
let colorMode = 'height'

function getEntityHeight(entity) {
  if (!entity.polygon) return 10
  const p = entity.properties
  if (!p) return 10
  const heightFields = ['height', 'building_height', 'Height', 'HEIGHT', 'buildingheight']
  for (const field of heightFields) {
    if (p[field] !== undefined && p[field] !== null) {
      const h = Number(p[field])
      if (!isNaN(h) && h > 1) {
        return h
      }
    }
  }
  return 10
}

function getHeightColor(height) {
  if (height <= 5) {
    return Cesium.Color.fromCssColorString('rgba(65, 105, 225, 0.75)')
  } else if (height <= 10) {
    return Cesium.Color.fromCssColorString('rgba(135, 206, 250, 0.75)')
  } else if (height <= 15) {
    return Cesium.Color.fromCssColorString('rgba(0, 206, 209, 0.75)')
  } else if (height <= 20) {
    return Cesium.Color.fromCssColorString('rgba(50, 205, 50, 0.75)')
  } else if (height <= 25) {
    return Cesium.Color.fromCssColorString('rgba(255, 215, 0, 0.78)')
  } else if (height <= 30) {
    return Cesium.Color.fromCssColorString('rgba(255, 165, 0, 0.8)')
  } else {
    return Cesium.Color.fromCssColorString('rgba(255, 0, 0, 0.85)')
  }
}

async function loadBuildingWhiteModel() {
  try {
    buildingDataSource = await Cesium.GeoJsonDataSource.load(BUILDING_GEOJSON_URL)
    viewer.dataSources.add(buildingDataSource)

    let count = 0
    for (const entity of buildingDataSource.entities.values) {
      if (!entity.polygon) continue

      const height = getEntityHeight(entity)
      const color = colorMode === 'height' ? getHeightColor(height) : Cesium.Color.fromCssColorString('rgba(200, 200, 200, 0.75)')

      entity.polygon.height = 0
      entity.polygon.extrudedHeight = height
      entity.polygon.closeTop = true
      entity.polygon.closeBottom = true
      entity.polygon.outline = false
      entity.polygon.material = color

      count++
    }

    buildingCount.value = count
    buildingLoadingText.value = `建筑白模：已加载 ${count} 栋建筑`

    console.log('建筑数据加载成功：')
    console.log('- 数据路径：', BUILDING_GEOJSON_URL)
    console.log('- 建筑 entity 数量：', count)
    console.log('- 前 5 个 entity 的 properties：')
    let entityIndex = 0
    for (const entity of buildingDataSource.entities.values) {
      if (entity.polygon && entityIndex < 5) {
        console.log(`  Entity ${entityIndex}:`, entity.properties)
        entityIndex++
      }
    }

    try {
      await viewer.flyTo(buildingDataSource, {
        duration: 2,
        maximumHeight: 18000
      })
    } catch (e) {
      console.warn('飞向建筑数据范围失败，保留默认视角', e)
    }
  } catch (error) {
    console.error('加载建筑白模失败：', error)
    buildingLoadingText.value = `建筑白模：加载失败，请检查 ${BUILDING_GEOJSON_URL}`
  }
}

async function loadNoFlyZone() {
  if (noFlyZoneDataSource) return
  try {
    noFlyZoneDataSource = await Cesium.GeoJsonDataSource.load(NO_FLY_ZONE_URL)
    noFlyZoneDataSource.show = false
    for (const entity of noFlyZoneDataSource.entities.values) {
      if (entity.polygon) {
        entity.polygon.height = 0
        entity.polygon.extrudedHeight = 100
        entity.polygon.material = Cesium.Color.fromCssColorString('rgba(229, 57, 53, 0.4)')
        entity.polygon.outline = true
        entity.polygon.outlineColor = Cesium.Color.fromCssColorString('rgba(229, 57, 53, 0.8)')
      }
    }
    viewer.dataSources.add(noFlyZoneDataSource)
    console.log('禁飞区数据加载成功')
  } catch (error) {
    console.error('加载禁飞区数据失败：', error)
  }
}

function setColorLayer(enabled) {
  colorMode = enabled ? 'height' : 'uniform'
  showLegend.value = enabled
  
  if (buildingDataSource) {
    for (const entity of buildingDataSource.entities.values) {
      if (entity.polygon) {
        const height = getEntityHeight(entity)
        const color = enabled ? getHeightColor(height) : Cesium.Color.fromCssColorString('rgba(200, 200, 200, 0.75)')
        entity.polygon.material = color
      }
    }
  }
}

function setNoFlyZoneLayer(enabled) {
  if (!noFlyZoneDataSource) {
    loadNoFlyZone().then(() => {
      if (noFlyZoneDataSource) {
        noFlyZoneDataSource.show = enabled
      }
    })
  } else {
    noFlyZoneDataSource.show = enabled
  }
}

function initCesiumViewer() {
  viewer = new Cesium.Viewer(cesiumContainer.value, {
    animation: false,
    timeline: false,
    fullscreenButton: false,
    homeButton: false,
    geocoder: false,
    baseLayerPicker: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: true,
    sceneMode: Cesium.SceneMode.SCENE3D,
    baseLayer: new Cesium.ImageryLayer(
      new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
      })
    )
  })

  viewer.cesiumWidget.creditContainer.style.display = 'none'

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-118.2437, 34.0522, 18000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-55),
      roll: 0,
    },
  })

  viewer.scene.screenSpaceCameraController.enableRotate = true
  viewer.scene.screenSpaceCameraController.enableZoom = true
  viewer.scene.screenSpaceCameraController.enablePan = true
  viewer.scene.screenSpaceCameraController.enableTilt = true
  viewer.scene.screenSpaceCameraController.enableLook = true

  window.cesiumViewer = viewer
  window.setColorLayer = setColorLayer
  window.setNoFlyZoneLayer = setNoFlyZoneLayer
}

onMounted(() => {
  initCesiumViewer()
  loadBuildingWhiteModel()
})

onBeforeUnmount(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})

defineExpose({
  setColorLayer,
  setNoFlyZoneLayer
})
</script>

<template>
  <div class="cesium-wrapper">
    <div ref="cesiumContainer" class="cesium-container"></div>

    <div class="legend" v-show="showLegend">
      <div class="legend-title">建筑高度分级</div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(65, 105, 225, 0.75)"></span>
        <span>0-5m</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(135, 206, 250, 0.75)"></span>
        <span>5-10m</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(0, 206, 209, 0.75)"></span>
        <span>10-15m</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(50, 205, 50, 0.75)"></span>
        <span>15-20m</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(255, 215, 0, 0.78)"></span>
        <span>20-25m</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(255, 165, 0, 0.8)"></span>
        <span>25-30m</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(255, 0, 0, 0.85)"></span>
        <span>&gt;30m</span>
      </div>
    </div>

    <div class="hint">{{ buildingLoadingText }}</div>
    <div class="hint-bottom">鼠标左键拖拽：旋转视角 ｜ 滚轮：缩放 ｜ 右键拖拽：平移</div>
  </div>
</template>

<style scoped>
.cesium-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.cesium-container {
  width: 100%;
  height: 100%;
}

.legend {
  position: absolute;
  top: 80px;
  left: 20px;
  background: rgba(0, 0, 0, 0.6);
  padding: 12px 16px;
  border-radius: 6px;
  z-index: 10;
  pointer-events: none;
}

.legend-title {
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  color: #ffffff;
  font-size: 12px;
  margin-bottom: 6px;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.legend-color {
  display: inline-block;
  width: 20px;
  height: 14px;
  margin-right: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.hint {
  position: absolute;
  bottom: 40px;
  left: 20px;
  color: #ffffff;
  font-size: 14px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  z-index: 10;
  pointer-events: none;
}

.hint-bottom {
  position: absolute;
  bottom: 20px;
  left: 20px;
  color: #ffffff;
  font-size: 14px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  z-index: 10;
  pointer-events: none;
}
</style>