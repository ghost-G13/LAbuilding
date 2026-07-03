<script setup>
import { onMounted, onBeforeUnmount, ref, watch, defineExpose, computed } from 'vue'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

const props = defineProps({
  currentLanguage: {
    type: String,
    default: 'zh-CN'
  },
  currentFontSize: {
    type: String,
    default: 'medium'
  },
  currentTheme: {
    type: String,
    default: 'light'
  }
})

const i18n = {
  'zh-CN': {
    legendTitle: '建筑高度分级',
    hintBottom: '鼠标左键拖拽：旋转视角 ｜ 滚轮：缩放 ｜ 右键拖拽：平移',
    height: '高度',
    area: '面积',
    m2: 'm²',
    loading: '建筑白模：正在从服务器获取数据...',
    loaded: '建筑白模：已加载 {count} 栋建筑',
    loadedFromServer: '建筑白模：已加载 {count} 栋建筑（来自服务器）',
    loadingFailed: '建筑白模：加载失败，请检查服务器连接',
    fetching: '建筑白模：已获取 {loaded}/{total} 栋建筑',
    drawingMode: '绘制模式：点击地图添加顶点，右键结束绘制，Ctrl+Z撤销'
  },
  'en': {
    legendTitle: 'Height Levels',
    hintBottom: 'Left drag: Rotate ｜ Scroll: Zoom ｜ Right drag: Pan',
    height: 'Height',
    area: 'Area',
    m2: 'm²',
    loading: 'Building Model: Loading data from server...',
    loaded: 'Building Model: {count} buildings loaded',
    loadedFromServer: 'Building Model: {count} buildings loaded (from server)',
    loadingFailed: 'Building Model: Load failed, please check server connection',
    fetching: 'Building Model: {loaded}/{total} buildings fetched',
    drawingMode: 'Drawing Mode: Click map to add points, Right-click to finish, Ctrl+Z to undo'
  }
}

const t = computed(() => i18n[props.currentLanguage] || i18n['zh-CN'])

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
let API_PREFIX = BASE_URL
if (!BASE_URL.includes('/api')) {
  API_PREFIX = `${BASE_URL}/api`
}
const BUILDING_API_URL = `${API_PREFIX}/public/buildings`
const NO_FLY_ZONE_API_URL = `${API_PREFIX}/nofly/zones`

const cesiumContainer = ref(null)
const buildingLoadingText = ref('建筑白模：正在从服务器获取数据...')
const buildingCount = ref(0)
const showLegend = ref(false)
const buildingTotal = ref(0)

let viewer = null
let buildingDataSources = []
let noFlyZoneDataSource = null
let colorMode = 'uniform'
let drawingHandler = null
let drawnPolygon = null
let drawingHistory = []
let pointEntities = []

let currentColorState = 'uniform'
let colorUpdateTimer = null
let filterBlinkTimer = null

const HEIGHT_LEVELS = [
  { min: 0, max: 5, color: Cesium.Color.fromCssColorString('rgba(65, 105, 225, 0.95)'), name: 'height_0_5' },
  { min: 5, max: 10, color: Cesium.Color.fromCssColorString('rgba(135, 206, 250, 0.95)'), name: 'height_5_10' },
  { min: 10, max: 15, color: Cesium.Color.fromCssColorString('rgba(0, 206, 209, 0.95)'), name: 'height_10_15' },
  { min: 15, max: 20, color: Cesium.Color.fromCssColorString('rgba(50, 205, 50, 0.95)'), name: 'height_15_20' },
  { min: 20, max: 25, color: Cesium.Color.fromCssColorString('rgba(255, 215, 0, 0.95)'), name: 'height_20_25' },
  { min: 25, max: 30, color: Cesium.Color.fromCssColorString('rgba(255, 165, 0, 0.95)'), name: 'height_25_30' },
  { min: 30, max: 500, color: Cesium.Color.fromCssColorString('rgba(255, 0, 0, 0.95)'), name: 'height_30_plus' }
]

function getEntityHeight(entity) {
  if (!entity.polygon) return 10
  const p = entity.properties
  if (!p) return 10
  
  if (p.real_height !== undefined && p.real_height !== null) {
    const h = Number(p.real_height)
    if (!isNaN(h) && h > 1) {
      return h
    }
  }
  
  if (heightField) {
    const h = Number(p[heightField])
    if (!isNaN(h) && h > 1) {
      return h
    }
  }
  
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

async function loadBuildingWhiteModel(params = {}) {
  try {
    buildingLoadingText.value = t.value.loading
    
    const { minHeight = 0, maxHeight = 500, minArea = 0, maxArea = 100000 } = params
    const pageSize = 2000
    let currentPage = 1
    let totalLoaded = 0
    
    const groupedFeatures = HEIGHT_LEVELS.map(() => [])
    
    const urlParams = new URLSearchParams({
      minHeight,
      maxHeight,
      minArea,
      maxArea,
      page: currentPage,
      pageSize
    })
    
    let response = await fetch(`${BUILDING_API_URL}?${urlParams.toString()}`)
    let result = await response.json()

    if (result.code !== 0) {
      throw new Error(result.message || '获取建筑数据失败')
    }

    buildingTotal.value = result.total
    
    clearBuildingDataSources()
    buildingDataSources = []
    
    while (currentPage <= Math.ceil(result.total / pageSize)) {
      const features = result.data?.features || []
      
      for (const feature of features) {
        const height = parseFloat(feature.properties?.height) || 10
        const levelIndex = HEIGHT_LEVELS.findIndex(l => height >= l.min && height < l.max)
        if (levelIndex >= 0) {
          groupedFeatures[levelIndex].push(feature)
        }
      }
      
      totalLoaded += features.length
      buildingCount.value = totalLoaded
      buildingLoadingText.value = t.value.fetching.replace('{loaded}', totalLoaded).replace('{total}', result.total)
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      currentPage++
      if (currentPage <= Math.ceil(result.total / pageSize)) {
        urlParams.set('page', currentPage)
        response = await fetch(`${BUILDING_API_URL}?${urlParams.toString()}`)
        result = await response.json()
        
        if (result.code !== 0) {
          break
        }
      }
    }
    
    for (let i = 0; i < HEIGHT_LEVELS.length; i++) {
      const features = groupedFeatures[i]
      if (features.length === 0) continue
      
      const level = HEIGHT_LEVELS[i]
      
      const ds = new Cesium.CustomDataSource(level.name)
      viewer.dataSources.add(ds)
      buildingDataSources.push(ds)
      
      const geoJsonData = {
        type: 'FeatureCollection',
        features: features
      }
      
      const tempDataSource = await Cesium.GeoJsonDataSource.load(geoJsonData)
      
      const color = colorMode === 'height' ? level.color : Cesium.Color.fromCssColorString('rgba(200, 200, 200, 1.0)')
      
      for (const entity of tempDataSource.entities.values) {
        if (!entity.polygon) continue
        
        const realHeight = parseFloat(entity.properties?.height) || 10
        const displayHeight = realHeight * 12
        
        entity.polygon.height = 0
        entity.polygon.extrudedHeight = displayHeight
        entity.polygon.closeTop = true
        entity.polygon.closeBottom = true
        entity.polygon.outline = false
        entity.polygon.material = color
        
        if (!entity.properties._propertyNames.includes('real_height')) {
          entity.properties.real_height = realHeight
        }
        
        ds.entities.add(entity)
      }
    }
    
    buildingLoadingText.value = t.value.loadedFromServer.replace('{count}', totalLoaded)

    try {
      if (buildingDataSources.length > 0) {
        await viewer.flyTo(buildingDataSources[0], {
          duration: 2,
          maximumHeight: 18000
        })
      }
    } catch (e) {
      console.warn('飞向建筑数据范围失败，保留默认视角', e)
    }
    
    setupBuildingClickHandler()
    detectPropertyFields()
  } catch (error) {
    console.error('加载建筑白模失败：', error)
    buildingLoadingText.value = t.value.loadingFailed
  }
}

function clearBuildingDataSources() {
  for (const ds of buildingDataSources) {
    viewer.dataSources.remove(ds)
  }
  buildingDataSources = []
  originalColors.clear()
  filteredBuildings = []
  collisionBuildings = []
}



async function loadNoFlyZone() {
  if (noFlyZoneDataSource) {
    viewer.dataSources.add(noFlyZoneDataSource)
    return
  }
  try {
    const langParam = props.currentLanguage === 'en' ? 'en' : 'zh'
    const response = await fetch(`${NO_FLY_ZONE_API_URL}?lang=${langParam}`)
    const result = await response.json()

    if (result.code !== 0) {
      throw new Error(result.message || '获取禁飞区数据失败')
    }

    const geojsonData = result.data
    noFlyZoneDataSource = await Cesium.GeoJsonDataSource.load(geojsonData)
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
    console.log('禁飞区数据加载成功（来自服务器）')
  } catch (error) {
    console.error('加载禁飞区数据失败：', error)
  }
}

function applyColors(state, params = {}) {
  if (buildingDataSources.length === 0) return
  
  currentColorState = state
  
  if (colorUpdateTimer) {
    cancelAnimationFrame(colorUpdateTimer)
    colorUpdateTimer = null
  }
  
  if (filterBlinkTimer) {
    clearInterval(filterBlinkTimer)
    filterBlinkTimer = null
  }
  
  switch (state) {
    case 'height':
      setColorLayerByLevel(true)
      break
    case 'uniform':
      setColorLayerByLevel(false)
      break
    case 'filter':
      applyFilterColors(params)
      break
    case 'collision':
      applyCollisionColors(params)
      break
    default:
      setColorLayerByLevel(false)
  }
}

function applyFilterColors(params) {
  const { minHeight, maxHeight, minArea } = params
  const highlightColor = Cesium.Color.fromCssColorString('rgba(255, 235, 59, 0.8)')
  const highlightOutline = Cesium.Color.fromCssColorString('#FFEB3B')
  
  const allEntities = []
  for (const ds of buildingDataSources) {
    for (const entity of ds.entities.values) {
      if (entity.polygon) {
        allEntities.push(entity)
      }
    }
  }
  
  const total = allEntities.length
  let index = 0
  
  function updateBatch() {
    const startTime = performance.now()
    
    while (index < total && (performance.now() - startTime) < 10) {
      const entity = allEntities[index]
      
      const p = entity.properties
      let height = 10
      let area = 0
      
      if (p) {
        if (heightField) {
          height = Number(p[heightField])
          if (isNaN(height) || height <= 1) height = 10
        }
        if (areaField) {
          area = Number(p[areaField])
          if (isNaN(area)) area = 0
        }
      }
      
      if (height >= minHeight && height <= maxHeight && area >= minArea) {
        if (!originalColors.has(entity)) {
          originalColors.set(entity, entity.polygon.material)
        }
        
        entity.polygon.material = highlightColor
        entity.polygon.outline = true
        entity.polygon.outlineColor = highlightOutline
        entity.polygon.outlineWidth = 2
      }
      
      index++
    }
    
    if (index < total) {
      requestAnimationFrame(updateBatch)
    } else {
      startFilterBlinking(filteredBuildings)
      console.log('筛选高亮完成，共高亮', filteredBuildings.length, '个建筑')
    }
  }
  
  updateBatch()
}

function applyCollisionColors(params) {
  const { collisionMinHeight } = params
  const collisionColor = Cesium.Color.fromCssColorString('rgba(255, 0, 0, 0.9)')
  const collisionOutline = Cesium.Color.fromCssColorString('#FF0000')
  
  for (const ds of buildingDataSources) {
    for (const entity of ds.entities.values) {
      if (!entity.polygon) continue
      
      const height = getEntityHeight(entity)
      
      if (height >= collisionMinHeight) {
        if (!originalColors.has(entity)) {
          originalColors.set(entity, entity.polygon.material)
        }
        
        entity.polygon.material = collisionColor
        entity.polygon.outline = true
        entity.polygon.outlineColor = collisionOutline
        entity.polygon.outlineWidth = 3
      }
    }
  }
  
  console.log('碰撞检测高亮完成')
}

function startFilterBlinking(entities) {
  if (filterBlinkTimer) {
    clearInterval(filterBlinkTimer)
  }
  
  let isBright = true
  filterBlinkTimer = setInterval(() => {
    isBright = !isBright
    const color = isBright 
      ? Cesium.Color.fromCssColorString('rgba(255, 235, 59, 0.9)')
      : Cesium.Color.fromCssColorString('rgba(255, 235, 59, 0.4)')
    
    for (const entity of entities) {
      if (entity.polygon) {
        entity.polygon.material = color
      }
    }
  }, 500)
}

let lastFilterParams = {}

function setColorLayer(enabled) {
  colorMode = enabled ? 'height' : 'uniform'
  showLegend.value = enabled
  
  applyColors(enabled ? 'height' : 'uniform')
}

function setColorLayerByLevel(enabled) {
  colorMode = enabled ? 'height' : 'uniform'
  showLegend.value = enabled
  
  const targetColorMode = enabled ? 'height' : 'uniform'
  
  for (let i = 0; i < buildingDataSources.length; i++) {
    const ds = buildingDataSources[i]
    const levelIndex = HEIGHT_LEVELS.findIndex(l => l.name === ds.name)
    
    let targetColor
    if (targetColorMode === 'height' && levelIndex >= 0) {
      targetColor = HEIGHT_LEVELS[levelIndex].color
    } else {
      targetColor = Cesium.Color.fromCssColorString('rgba(200, 200, 200, 1.0)')
    }
    
    for (const entity of ds.entities.values) {
      if (entity.polygon) {
        entity.polygon.material = targetColor
      }
    }
  }
  
  console.log('分层设色切换完成，共更新', buildingDataSources.length, '个DataSource')
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

function startDrawing() {
  if (!viewer) return
  
  if (drawnPolygon) {
    viewer.entities.remove(drawnPolygon)
    drawnPolygon = null
  }
  
  if (drawingHandler) {
    drawingHandler.destroy()
  }
  
  drawingHistory = []
  
  drawingHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  
  const positions = []
  pointEntities = []
  let tempEntity = null
  
  drawingHandler.setInputAction((click) => {
    const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid)
    if (cartesian) {
      drawingHistory.push({
        positions: [...positions],
        pointEntities: [...pointEntities]
      })
      
      positions.push(cartesian)
      
      const pointEntity = viewer.entities.add({
        position: cartesian,
        point: {
          pixelSize: 8,
          color: Cesium.Color.fromCssColorString('#34d399'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2
        }
      })
      pointEntities.push(pointEntity)
      
      if (positions.length >= 2) {
        if (tempEntity) {
          viewer.entities.remove(tempEntity)
        }
        tempEntity = viewer.entities.add({
          polyline: {
            positions: [...positions],
            width: 2,
            material: Cesium.Color.YELLOW
          }
        })
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  
  drawingHandler.setInputAction((click) => {
    if (positions.length >= 3) {
      positions.push(positions[0])
      
      if (tempEntity) {
        viewer.entities.remove(tempEntity)
      }
      
      pointEntities.forEach(pe => viewer.entities.remove(pe))
      
      drawnPolygon = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: Cesium.Color.fromCssColorString('rgba(0, 255, 255, 0.5)'),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#0066CC'),
          outlineWidth: 3
        }
      })
      
      if (drawingHandler) {
        drawingHandler.destroy()
        drawingHandler = null
      }
      
      drawnPolygonPositions = [...positions]
      
      console.log('绘制完成，多边形顶点数:', positions.length)
      
      if (window.onDrawComplete) {
        window.onDrawComplete(positions)
      }
    }
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  
  document.addEventListener('keydown', handleKeyDown)
  
  buildingLoadingText.value = t.value.drawingMode
}

function handleKeyDown(e) {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault()
    undoDrawing()
  }
}

function undoDrawing() {
  if (!drawingHandler || drawingHistory.length === 0) return
  
  const history = drawingHistory.pop()
  const newPositions = history.positions
  const newPointEntities = history.pointEntities
  
  pointEntities.forEach(pe => viewer.entities.remove(pe))
  pointEntities.length = 0
  
  const existingPolyline = viewer.entities.values.find(e => e.polyline)
  if (existingPolyline) {
    viewer.entities.remove(existingPolyline)
  }
  
  newPointEntities.forEach(pe => {
    pointEntities.push(viewer.entities.add({
      position: pe.position.getValue(Cesium.JulianDate.now()),
      point: {
        pixelSize: 8,
        color: Cesium.Color.fromCssColorString('#34d399'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      }
    }))
  })
  
  if (newPositions.length >= 2) {
    viewer.entities.add({
      polyline: {
        positions: [...newPositions],
        width: 2,
        material: Cesium.Color.YELLOW
      }
    })
  }
  
  positions.length = 0
  positions.push(...newPositions)
  
  console.log('撤销后顶点数:', positions.length)
}

function clearDrawing() {
  if (drawnPolygon) {
    viewer.entities.remove(drawnPolygon)
    drawnPolygon = null
  }
  if (drawingHandler) {
    drawingHandler.destroy()
    drawingHandler = null
  }
  pointEntities.forEach(pe => viewer.entities.remove(pe))
  pointEntities = []
  clearCollisionHighlight()
  drawingHistory = []
  drawnPolygonPositions = []
  document.removeEventListener('keydown', handleKeyDown)
  buildingLoadingText.value = t.value.loaded.replace('{count}', buildingCount.value)
}

let originalColors = new Map()
let filteredBuildings = []
let heightField = null
let areaField = null
let selectedBuilding = null
let selectedLabel = null
let buildingClickHandler = null
let drawnPolygonPositions = []
let collisionBuildings = []
let selectedNoFlyZone = null
let selectedNoFlyZoneLabel = null

function detectPropertyFields() {
  if (heightField && areaField) return
  
  for (const ds of buildingDataSources) {
    for (const entity of ds.entities.values) {
      const p = entity.properties || {}
      
      if (!heightField) {
        const hFields = ['height', 'building_height', 'Height', 'HEIGHT', 'buildingheight']
        for (const f of hFields) {
          if (p[f] !== undefined && p[f] !== null) {
            heightField = f
            break
          }
        }
      }
      
      if (!areaField) {
        const aFields = ['area', 'area_m2', 'AREA', 'Area', 'building_area', 'area_m']
        for (const f of aFields) {
          if (p[f] !== undefined && p[f] !== null) {
            areaField = f
            break
          }
        }
      }
      
      if (heightField && areaField) return
    }
  }
}

function getEntityArea(entity) {
  if (!entity.polygon) return 0
  const p = entity.properties
  if (!p) return 0
  
  if (p.area !== undefined && p.area !== null) {
    const num = Number(p.area)
    return isNaN(num) ? 0 : num
  }
  
  if (areaField) {
    const val = p[areaField]
    if (val !== undefined && val !== null) {
      const num = Number(val)
      return isNaN(num) ? 0 : num
    }
  }
  
  const areaFields = ['area_m2', 'AREA', 'Area', 'building_area', 'area_m']
  for (const field of areaFields) {
    const val = p[field]
    if (val !== undefined && val !== null) {
      const num = Number(val)
      return isNaN(num) ? 0 : num
    }
  }
  return 0
}

let filterCallback = null

function filterBuildings(minHeight, maxHeight, minArea, maxArea) {
  if (buildingDataSources.length === 0) {
    if (filterCallback) filterCallback({ count: 0, data: [] })
    return { count: 0, data: [] }
  }
  
  detectPropertyFields()
  
  lastFilterParams = { minHeight, maxHeight, minArea }
  filteredBuildings = []
  const resultData = []
  
  for (const ds of buildingDataSources) {
    for (const entity of ds.entities.values) {
      if (!entity.polygon) continue
      
      const p = entity.properties
      let height = 10
      let area = 0
      
      if (p) {
        if (heightField) {
          height = Number(p[heightField])
          if (isNaN(height) || height <= 1) height = 10
        }
        if (areaField) {
          area = Number(p[areaField])
          if (isNaN(area)) area = 0
        }
      }
      
      if (height >= minHeight && height <= maxHeight && area >= minArea) {
        filteredBuildings.push(entity)
        resultData.push({
          height: height,
          area: area,
          id: entity.id
        })
      }
    }
  }
  
  applyColors('filter', { minHeight, maxHeight, minArea })
  
  if (filterCallback) {
    filterCallback({ count: resultData.length, data: resultData })
  }
  
  return { count: resultData.length, data: resultData }
}

function pointInPolygon(point, polygonPoints) {
  let inside = false
  const n = polygonPoints.length
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygonPoints[i].x, yi = polygonPoints[i].y
    const xj = polygonPoints[j].x, yj = polygonPoints[j].y
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  
  return inside
}

function getPolygonCentroid(positions) {
  let x = 0, y = 0, z = 0
  const n = positions.length
  
  for (const pos of positions) {
    x += pos.x
    y += pos.y
    z += pos.z
  }
  
  return {
    x: x / n,
    y: y / n,
    z: z / n
  }
}

let collisionCallback = null

function clearCollisionHighlight() {
  collisionBuildings.forEach(entity => {
    if (originalColors.has(entity)) {
      entity.polygon.material = originalColors.get(entity)
      entity.polygon.outline = false
    }
  })
  collisionBuildings = []
}

function isInNoFlyZone() {
  if (!noFlyZoneDataSource || drawnPolygonPositions.length < 3) return false
  
  const polygonPoints = drawnPolygonPositions.map(p => ({
    x: p.x,
    y: p.y
  }))
  
  for (const entity of noFlyZoneDataSource.entities.values) {
    if (!entity.polygon) continue
    
    const hierarchy = entity.polygon.hierarchy.getValue()
    if (!hierarchy || !hierarchy.positions || hierarchy.positions.length === 0) continue
    
    const noFlyPoints = hierarchy.positions.map(p => ({
      x: p.x,
      y: p.y
    }))
    
    for (const point of polygonPoints) {
      if (pointInPolygon(point, noFlyPoints)) {
        return true
      }
    }
    
    for (const point of noFlyPoints) {
      if (pointInPolygon(point, polygonPoints)) {
        return true
      }
    }
  }
  
  return false
}

function checkRouteCollision(minHeight, maxHeight) {
  if (buildingDataSources.length === 0 || drawnPolygonPositions.length < 3) {
    if (collisionCallback) collisionCallback({ compliant: true, count: 0, details: [] })
    return { compliant: true, count: 0, details: [] }
  }
  
  if (isInNoFlyZone()) {
    if (collisionCallback) collisionCallback({ compliant: false, count: -1, details: [], inNoFlyZone: true })
    return { compliant: false, count: -1, details: [], inNoFlyZone: true }
  }
  
  clearCollisionHighlight()
  
  const polygonPoints = drawnPolygonPositions.map(p => ({
    x: p.x,
    y: p.y
  }))
  
  let collisionCount = 0
  const collisionDetails = []
  const collisionEntities = []
  
  for (const ds of buildingDataSources) {
    for (const entity of ds.entities.values) {
      if (!entity.polygon || !entity.show) continue
      
      const polygon = entity.polygon
      const hierarchy = polygon.hierarchy.getValue()
      
      if (!hierarchy || !hierarchy.positions || hierarchy.positions.length === 0) continue
      
      const buildingHeight = getEntityHeight(entity)
      
      if (buildingHeight >= minHeight) {
        const centroid = getPolygonCentroid(hierarchy.positions)
        
        if (pointInPolygon(centroid, polygonPoints)) {
          collisionCount++
          collisionDetails.push({
            id: entity.id,
            height: buildingHeight,
            minFlightHeight: minHeight
          })
          collisionEntities.push(entity)
        }
      }
    }
  }
  
  const collisionColor = Cesium.Color.fromCssColorString('rgba(255, 0, 0, 0.9)')
  const collisionOutline = Cesium.Color.fromCssColorString('#FF0000')
  
  collisionBuildings = []
  
  collisionEntities.forEach(entity => {
    if (!originalColors.has(entity)) {
      originalColors.set(entity, entity.polygon.material)
    }
    
    entity.polygon.material = collisionColor
    entity.polygon.outline = true
    entity.polygon.outlineColor = collisionOutline
    entity.polygon.outlineWidth = 3
    
    collisionBuildings.push(entity)
  })
  
  const result = {
    compliant: collisionCount === 0,
    count: collisionCount,
    details: collisionDetails
  }
  
  if (collisionCallback) {
    collisionCallback(result)
  }
  
  return result
}

function resetBuildingColors() {
  if (filterBlinkTimer) {
    clearInterval(filterBlinkTimer)
    filterBlinkTimer = null
  }
  
  filteredBuildings = []
  collisionBuildings = []
  
  originalColors.forEach((color, entity) => {
    if (entity.polygon) {
      entity.polygon.material = color
      entity.polygon.outline = false
      entity.polygon.outlineWidth = 1
    }
  })
  originalColors.clear()
  
  clearBuildingSelection()
  console.log('清除筛选完成')
}

function clearBuildingSelection() {
  if (selectedBuilding) {
    if (originalColors.has(selectedBuilding)) {
      selectedBuilding.polygon.material = originalColors.get(selectedBuilding)
      selectedBuilding.polygon.outline = false
    }
    selectedBuilding = null
  }
  
  if (selectedLabel) {
    viewer.entities.remove(selectedLabel)
    selectedLabel = null
  }
  
  if (selectedNoFlyZone) {
    selectedNoFlyZone.polygon.material = Cesium.Color.fromCssColorString('rgba(229, 57, 53, 0.4)')
    selectedNoFlyZone.polygon.outlineColor = Cesium.Color.fromCssColorString('rgba(229, 57, 53, 0.8)')
    selectedNoFlyZone = null
  }
  
  if (selectedNoFlyZoneLabel) {
    viewer.entities.remove(selectedNoFlyZoneLabel)
    selectedNoFlyZoneLabel = null
  }
}

function setupBuildingClickHandler() {
  buildingClickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  
  buildingClickHandler.setInputAction(function(click) {
    const pickedObject = viewer.scene.pick(click.position)
    
    if (!pickedObject || !pickedObject.id || !pickedObject.id.polygon) {
      clearBuildingSelection()
      return
    }
    
    const entity = pickedObject.id
    
    clearBuildingSelection()
    
    if (noFlyZoneDataSource && noFlyZoneDataSource.entities.contains(entity)) {
      selectedNoFlyZone = entity
      
      const highlightColor = Cesium.Color.fromCssColorString('rgba(255, 193, 7, 0.6)')
      const highlightOutline = Cesium.Color.fromCssColorString('#FFC107')
      
      selectedNoFlyZone.polygon.material = highlightColor
      selectedNoFlyZone.polygon.outlineColor = highlightOutline
      selectedNoFlyZone.polygon.outlineWidth = 4
      
      const name = entity.properties?.zone_name?.getValue() || (props.currentLanguage === 'en' ? 'Unnamed No-Fly Zone' : '未命名禁飞区')
      const area = Number(entity.properties?.area?.getValue()) || getEntityArea(entity)
      const rawNote = entity.properties?.note?.getValue() || ''
      
      let note = ''
      if (rawNote) {
        const parts = rawNote.split(' | ')
        if (parts.length === 2) {
          note = props.currentLanguage === 'en' ? parts[0] : parts[1]
        } else {
          note = rawNote
        }
      }
      
      const wrapText = (text, maxLength) => {
        if (!text) return ''
        const result = []
        let currentLine = ''
        const words = text.split('')
        for (const char of words) {
          if ((currentLine + char).length > maxLength) {
            result.push(currentLine)
            currentLine = char
          } else {
            currentLine += char
          }
        }
        if (currentLine) result.push(currentLine)
        return result.join('\n')
      }
      
      const noteLabel = props.currentLanguage === 'en' ? 'Note:' : '标注:'
      const areaLabel = props.currentLanguage === 'en' ? 'Area:' : '面积:'
      const wrappedNote = note ? `${noteLabel}\n${wrapText(note, 15)}` : ''
      
      const hierarchy = entity.polygon.hierarchy.getValue()
      const center = getPolygonCentroid(hierarchy.positions)
      const cartographic = Cesium.Cartographic.fromCartesian(center)
      const longitude = Cesium.Math.toDegrees(cartographic.longitude)
      const latitude = Cesium.Math.toDegrees(cartographic.latitude)
      
      selectedNoFlyZoneLabel = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 60),
        label: {
          text: `${name}\n${areaLabel} ${area.toFixed(1)}km²${wrappedNote ? `\n${wrappedNote}` : ''}`,
          font: '10pt sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(0, -80),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)'),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      })
      
      return
    }
    
    let isBuilding = false
    for (const ds of buildingDataSources) {
      if (ds.entities.contains(entity)) {
        isBuilding = true
        break
      }
    }
    if (!isBuilding) {
      return
    }
    
    selectedBuilding = entity
    
    if (!originalColors.has(selectedBuilding)) {
      originalColors.set(selectedBuilding, selectedBuilding.polygon.material)
    }
    
    const selectColor = Cesium.Color.fromCssColorString('rgba(255, 69, 0, 0.9)')
    selectedBuilding.polygon.material = selectColor
    selectedBuilding.polygon.outline = true
    selectedBuilding.polygon.outlineColor = Cesium.Color.fromCssColorString('#FF4500')
    selectedBuilding.polygon.outlineWidth = 3
    
    const height = getEntityHeight(entity)
    const area = getEntityArea(entity)
    
    const position = entity.polygon.hierarchy._value.positions[0]
    const cartographic = Cesium.Cartographic.fromCartesian(position)
    const longitude = Cesium.Math.toDegrees(cartographic.longitude)
    const latitude = Cesium.Math.toDegrees(cartographic.latitude)
    const elevation = cartographic.height + height / 2
    
    selectedLabel = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude, elevation),
      label: {
        text: `高度: ${height.toFixed(1)}m\n面积: ${area.toFixed(1)}m²`,
        font: '14pt sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)'),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })
    
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function clearBuildingClickHandler() {
  if (buildingClickHandler) {
    buildingClickHandler.destroy()
    buildingClickHandler = null
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
    sceneMode: Cesium.SceneMode.SCENE3D
  })

  viewer.cesiumWidget.creditContainer.style.display = 'none'

  const osmProvider = new Cesium.OpenStreetMapImageryProvider({
    url: 'https://tile.openstreetmap.org/'
  })
  
  viewer.scene.imageryLayers.removeAll()
  const osmLayer = viewer.scene.imageryLayers.addImageryProvider(osmProvider)
  
  const satelliteProvider = new Cesium.UrlTemplateImageryProvider({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maximumLevel: 19,
    enablePickFeatures: false
  })
  
  const satelliteLayer = viewer.scene.imageryLayers.addImageryProvider(satelliteProvider)
  satelliteLayer.show = false
  
  window.osmLayer = osmLayer
  window.satelliteLayer = satelliteLayer

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
  window.setColorLayerByLevel = setColorLayerByLevel
  window.setNoFlyZoneLayer = setNoFlyZoneLayer
  window.startDrawing = startDrawing
  window.clearDrawing = clearDrawing
  window.filterBuildings = filterBuildings
  window.resetBuildingColors = resetBuildingColors
  window.checkRouteCollision = checkRouteCollision
  window.isDrawingInNoFlyZone = isInNoFlyZone
  Object.defineProperty(window, 'collisionCallback', {
    get: () => collisionCallback,
    set: (val) => { collisionCallback = val }
  })
  Object.defineProperty(window, 'filterCallback', {
    get: () => filterCallback,
    set: (val) => { filterCallback = val }
  })
}

watch(() => props.currentLanguage, async () => {
  if (buildingCount.value > 0) {
    buildingLoadingText.value = t.value.loaded.replace('{count}', buildingCount.value)
  }
  if (noFlyZoneDataSource) {
    viewer.dataSources.remove(noFlyZoneDataSource)
    noFlyZoneDataSource = null
    await loadNoFlyZone()
  }
})

onMounted(() => {
  initCesiumViewer()
  loadBuildingWhiteModel()
})

onBeforeUnmount(() => {
  clearBuildingSelection()
  clearBuildingClickHandler()
  
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

    <div class="legend" v-show="showLegend" :class="currentFontSize">
      <div class="legend-title">{{ t.legendTitle }}</div>
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

    <div class="hint-container" :class="currentFontSize">
      <div class="hint">{{ buildingLoadingText }}</div>
      <div class="hint-bottom">{{ t.hintBottom }}</div>
    </div>
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

.hint-container {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 100;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hint {
  color: #333333;
  font-size: 14px;
  font-weight: 500;
}

.hint-bottom {
  color: #333333;
  font-size: 14px;
  font-weight: 500;
}

.small .legend-title,
.small .hint,
.small .hint-bottom {
  font-size: 12px;
}

.small .legend-item {
  font-size: 11px;
  margin-bottom: 4px;
}

[data-theme="dark"] .hint-container {
  background: rgba(0, 0, 0, 0.6);
}

[data-theme="dark"] .hint,
[data-theme="dark"] .hint-bottom {
  color: #ffffff;
}

.large .legend-title,
.large .hint,
.large .hint-bottom {
  font-size: 16px;
}

.large .legend-item {
  font-size: 14px;
  margin-bottom: 8px;
}

.large .legend-color {
  width: 24px;
  height: 16px;
}
</style>