<script setup>
import { onMounted, onBeforeUnmount, ref, defineExpose } from 'vue'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { getBuildings, getNoFlyZones, queryBuildingByPoint } from '../utils/request'

const cesiumContainer = ref(null)
const buildingLoadingText = ref('建筑白模：正在从后端加载数据...')
const buildingCount = ref(0)
const showLegend = ref(true)

let viewer = null
let buildingDataSource = null
let noFlyZoneDataSource = null
let loadedPages = new Set()
let colorMode = 'height'
let drawingHandler = null
let drawnPolygon = null
let drawingHistory = []
let pointEntities = []

function getEntityHeight(entity) {
  if (!entity.polygon) return 10
  const p = entity.properties
  if (!p) return 10
  
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

async function loadBuildingWhiteModel() {
  try {
    buildingDataSource = new Cesium.CustomDataSource('buildings')
    viewer.dataSources.add(buildingDataSource)

    const pageSize = 5000
    let currentPage = 1
    let totalCount = 0
    let loadedCount = 0

    buildingLoadingText.value = `建筑白模：正在加载第 ${currentPage} 页...`

    async function loadPage(page) {
      if (loadedPages.has(page)) return

      const data = await getBuildings({ page, pageSize })
      
      if (data.code !== 0) {
        console.error('加载建筑数据失败:', data.message)
        return
      }

      loadedPages.add(page)
      const features = data.data?.features || []
      totalCount = data.pagination?.total || 0

      for (const feature of features) {
        const geometry = feature.geometry
        const properties = feature.properties

        if (!geometry || geometry.type !== 'Polygon') continue

        const coordinates = geometry.coordinates[0] || geometry.coordinates
        if (!coordinates || !Array.isArray(coordinates)) continue

        const positions = coordinates.map(coord => {
          return Cesium.Cartesian3.fromDegrees(coord[0], coord[1], 0)
        })

        const height = properties?.height || 10
        const color = colorMode === 'height' ? getHeightColor(height) : Cesium.Color.fromCssColorString('rgba(200, 200, 200, 0.75)')

        const entity = buildingDataSource.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(positions),
            height: 0,
            extrudedHeight: height,
            closeTop: true,
            closeBottom: true,
            outline: false,
            material: color
          },
          properties: new Cesium.PropertyBag(properties)
        })

        loadedCount++
      }

      buildingCount.value = loadedCount
      buildingLoadingText.value = `建筑白模：已加载 ${loadedCount}/${totalCount} 栋建筑`

      if (loadedCount < totalCount) {
        setTimeout(() => loadPage(currentPage + 1), 100)
        currentPage++
      } else {
        buildingLoadingText.value = `建筑白模：已加载 ${loadedCount} 栋建筑`
        
        try {
          await viewer.flyTo(buildingDataSource, {
            duration: 2,
            maximumHeight: 18000
          })
        } catch (e) {
          console.warn('飞向建筑数据范围失败，保留默认视角', e)
        }
        
        setupBuildingClickHandler()
        detectPropertyFields()
      }
    }

    await loadPage(1)
  } catch (error) {
    console.error('加载建筑白模失败：', error)
    buildingLoadingText.value = '建筑白模：加载失败，请检查网络连接'
  }
}

async function loadNoFlyZone() {
  if (noFlyZoneDataSource) return
  try {
    noFlyZoneDataSource = new Cesium.CustomDataSource('noFlyZones')
    
    const data = await getNoFlyZones()
    
    if (data.code !== 0) {
      console.error('加载禁飞区数据失败:', data.message)
      return
    }

    const features = data.data?.features || []
    
    for (const feature of features) {
      const geometry = feature.geometry
      const properties = feature.properties

      if (!geometry || geometry.type !== 'Polygon') continue

      const coordinates = geometry.coordinates[0] || geometry.coordinates
      if (!coordinates || !Array.isArray(coordinates)) continue

      const positions = coordinates.map(coord => {
        return Cesium.Cartesian3.fromDegrees(coord[0], coord[1], 0)
      })

      const heightMeters = properties?.height_meters || 100

      noFlyZoneDataSource.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          height: 0,
          extrudedHeight: heightMeters,
          material: Cesium.Color.fromCssColorString('rgba(229, 57, 53, 0.4)'),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('rgba(229, 57, 53, 0.8)')
        },
        properties: new Cesium.PropertyBag(properties)
      })
    }

    noFlyZoneDataSource.show = false
    viewer.dataSources.add(noFlyZoneDataSource)
    console.log('禁飞区数据加载成功，共', features.length, '个区域')
  } catch (error) {
    console.error('加载禁飞区数据失败：', error)
  }
}

function setColorLayer(enabled) {
  colorMode = enabled ? 'height' : 'uniform'
  showLegend.value = enabled
  
  if (!buildingDataSource) return
  
  const entities = buildingDataSource.entities.values
  const batchSize = 500
  let index = 0
  
  function updateBatch() {
    const end = Math.min(index + batchSize, entities.length)
    for (; index < end; index++) {
      const entity = entities[index]
      if (entity.polygon) {
        const height = getEntityHeight(entity)
        const color = enabled ? getHeightColor(height) : Cesium.Color.fromCssColorString('rgba(200, 200, 200, 0.3)')
        entity.polygon.material = color
      }
    }
    
    if (index < entities.length) {
      requestAnimationFrame(updateBatch)
    } else {
      console.log('分层设色切换完成，共更新', entities.length, '个实体')
    }
  }
  
  requestAnimationFrame(updateBatch)
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
          material: Cesium.Color.fromCssColorString('rgba(52, 211, 153, 0.4)'),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#34d399'),
          outlineWidth: 2
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
  
  buildingLoadingText.value = '绘制模式：点击地图添加顶点，右键结束绘制，Ctrl+Z撤销'
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
  drawingHistory = []
  drawnPolygonPositions = []
  document.removeEventListener('keydown', handleKeyDown)
  buildingLoadingText.value = '建筑白模：已加载 ' + buildingCount.value + ' 栋建筑'
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
  
  const entities = buildingDataSource.entities.values
  for (const entity of entities) {
    if (!entity.polygon || !entity.properties) continue
    
    const p = entity.properties
    
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
    
    if (heightField && areaField) break
  }
}

function getEntityArea(entity) {
  if (!entity.polygon) return 0
  const p = entity.properties
  if (!p) return 0
  
  if (areaField) {
    const val = p[areaField]
    if (val !== undefined && val !== null) {
      const num = Number(val)
      return isNaN(num) ? 0 : num
    }
  }
  
  const areaFields = ['area', 'area_m2', 'AREA', 'Area', 'building_area', 'area_m']
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
  if (!buildingDataSource) {
    if (filterCallback) filterCallback({ count: 0, data: [] })
    return { count: 0, data: [] }
  }
  
  detectPropertyFields()
  
  filteredBuildings = []
  
  const highlightColor = Cesium.Color.fromCssColorString('rgba(0, 255, 128, 0.8)')
  const highlightOutline = Cesium.Color.fromCssColorString('#00FF80')
  const dimColor = Cesium.Color.fromCssColorString('rgba(200, 200, 200, 0.3)')
  
  const entities = buildingDataSource.entities.values
  const entityArray = []
  
  for (const entity of entities) {
    if (entity.polygon) {
      entityArray.push(entity)
    }
  }
  
  const total = entityArray.length
  let index = 0
  const resultData = []
  const highlightList = []
  const dimList = []
  
  function processBatch() {
    const batchSize = 5000
    const end = Math.min(index + batchSize, total)
    
    for (; index < end; index++) {
      const entity = entityArray[index]
      
      if (!originalColors.has(entity)) {
        originalColors.set(entity, entity.polygon.material)
      }
      
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
        highlightList.push(entity)
        resultData.push({
          height: height,
          area: area,
          id: entity.id
        })
      } else {
        dimList.push(entity)
      }
    }
    
    if (index < total) {
      setTimeout(processBatch, 0)
    } else {
      if (filterCallback) {
        filterCallback({ count: resultData.length, data: resultData })
      }
      
      function applyColors() {
        const colorBatchSize = 2000
        let colorIndex = 0
        
        function applyColorBatch() {
          const colorEnd = Math.min(colorIndex + colorBatchSize, highlightList.length)
          for (; colorIndex < colorEnd; colorIndex++) {
            const e = highlightList[colorIndex]
            e.polygon.material = highlightColor
            e.polygon.outline = true
            e.polygon.outlineColor = highlightOutline
            e.polygon.outlineWidth = 2
          }
          
          if (colorIndex < highlightList.length) {
            requestAnimationFrame(applyColorBatch)
          } else {
            let dimIndex = 0
            function applyDimBatch() {
              const dimEnd = Math.min(dimIndex + colorBatchSize, dimList.length)
              for (; dimIndex < dimEnd; dimIndex++) {
                const e = dimList[dimIndex]
                e.polygon.material = dimColor
                e.polygon.outline = false
              }
              if (dimIndex < dimList.length) {
                requestAnimationFrame(applyDimBatch)
              }
            }
            applyDimBatch()
          }
        }
        
        applyColorBatch()
      }
      
      setTimeout(applyColors, 0)
    }
  }
  
  processBatch()
  
  return { count: 0, data: [] }
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
  if (!buildingDataSource || drawnPolygonPositions.length < 3) {
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
  
  const boundingSphere = Cesium.BoundingSphere.fromPoints(drawnPolygonPositions)
  
  const entities = buildingDataSource.entities.values
  const entityArray = []
  
  for (const entity of entities) {
    if (entity.polygon) {
      entityArray.push(entity)
    }
  }
  
  const total = entityArray.length
  let index = 0
  let collisionCount = 0
  const collisionDetails = []
  const collisionEntities = []
  
  function processBatch() {
    const batchSize = 5000
    const end = Math.min(index + batchSize, total)
    
    for (; index < end; index++) {
      const entity = entityArray[index]
      
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
    
    if (index < total) {
      setTimeout(processBatch, 0)
    } else {
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
    }
  }
  
  processBatch()
  
  return { compliant: true, count: 0, details: [] }
}

function resetBuildingColors() {
  if (!buildingDataSource) return
  
  const entities = buildingDataSource.entities.values
  for (const entity of entities) {
    if (!entity.polygon) continue
    
    if (originalColors.has(entity)) {
      entity.polygon.material = originalColors.get(entity)
      entity.polygon.outline = false
    }
  }
  
  filteredBuildings = []
  collisionBuildings = []
  
  clearBuildingSelection()
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
      
      const name = entity.properties?.zone_name?.getValue() || '未命名禁飞区'
      const area = getEntityArea(entity)
      const note = entity.properties?.note?.getValue() || ''
      
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
      
      const wrappedName = wrapText(name, 12)
      const wrappedNote = note ? `标注:\n${wrapText(note, 15)}` : ''
      
      const hierarchy = entity.polygon.hierarchy.getValue()
      const center = getPolygonCentroid(hierarchy.positions)
      const cartographic = Cesium.Cartographic.fromCartesian(center)
      const longitude = Cesium.Math.toDegrees(cartographic.longitude)
      const latitude = Cesium.Math.toDegrees(cartographic.latitude)
      
      selectedNoFlyZoneLabel = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 60),
        label: {
          text: `${wrappedName}\n面积: ${area.toFixed(1)}m²${wrappedNote ? `\n${wrappedNote}` : ''}`,
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
    
    if (!buildingDataSource || !buildingDataSource.entities.contains(entity)) {
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
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)')
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
  window.startDrawing = startDrawing
  window.clearDrawing = clearDrawing
  window.filterBuildings = filterBuildings
  window.resetBuildingColors = resetBuildingColors
  window.checkRouteCollision = checkRouteCollision
  Object.defineProperty(window, 'collisionCallback', {
    get: () => collisionCallback,
    set: (val) => { collisionCallback = val }
  })
}

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