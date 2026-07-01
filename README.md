# 城市建筑三维白模浏览与查询系统

## 项目概述

本项目是一个城市建筑三维白模可视化与分析平台，基于 Vue 3 + Cesium 实现建筑三维展示、起降点分析、航线碰撞预警等功能。系统支持用户认证、数据筛选和分层设色等交互功能。

## 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端展示层                               │
│  Vue 3 + Cesium + Vite                                         │
│  • 三维建筑可视化（白模展示、分层设色）                          │
│  • 起降点分析（高度/面积范围筛选）                               │
│  • 航线碰撞预警（绘制范围、碰撞检测）                            │
│  • 用户认证（登录/注册/验证码）                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP API
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        后端服务层                               │
│  Node.js + Express + PostgreSQL                                │
│  • 用户认证（登录/注册/邮箱验证码）                              │
│  • 建筑数据查询（分页、筛选）                                    │
│  • 禁飞区数据管理                                               │
│  • 起降点分析API                                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │ 数据导入
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据处理层                               │
│  Python 脚本                                                   │
│  • 原始数据下载与转换                                           │
│  • 区域裁剪                                                     │
│  • 面积计算                                                     │
│  • 高度填充（空间插值）                                         │
└─────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
LAbuilding/
├── README.md              # 项目总览说明
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── components/    # Vue组件（CesiumScene.vue）
│   │   ├── router/        # 路由配置
│   │   ├── utils/         # 工具函数（request.js）
│   │   ├── App.vue        # 主应用组件
│   │   ├── main.js        # 入口文件
│   │   └── style.css      # 全局样式
│   ├── public/data/       # 前端静态数据
│   ├── package.json
│   └── vite.config.js
├── backend/               # 后端服务
│   ├── routes/            # API路由
│   │   ├── auth.js        # 用户认证
│   │   ├── buildings.js   # 建筑数据（需认证）
│   │   ├── public-buildings.js # 建筑数据（公开）
│   │   ├── nofly.js       # 禁飞区数据
│   │   ├── takeoff.js     # 起降点分析
│   │   ├── uav.js         # 无人机服务
│   │   ├── userdata.js    # 用户数据管理
│   │   └── admin.js       # 管理员功能
│   ├── middleware/        # 中间件（auth.js、roleGuard.js）
│   ├── utils/             # 工具（db.js、mail.js、redis.js）
│   ├── config/            # 配置文件（db.js）
│   ├── scripts/           # 数据库脚本
│   ├── server.js          # 服务器入口
│   ├── package.json
│   └── .env.example       # 环境变量示例
├── building/              # 建筑白模数据
│   ├── LA_building.geojson/.shp/.csv
│   ├── la_clipped.geojson
│   ├── la_height_filled.geojson
│   └── 数据说明.md
├── no_fly_zone/           # 无人机禁飞区数据
│   ├── 无人机禁飞区_CGS_WGS84.geojson/.shp/.csv
│   └── 数据说明.md
└── scripts/               # Python数据处理脚本
    ├── convert_to_geojson.py
    ├── clip_la_data.py
    ├── calculate_area.py
    ├── fill_heights.py
    └── 脚本说明.md
```

## 功能特性

### 前端功能

| 功能模块 | 说明 |
|----------|------|
| 三维可视化 | Cesium地球展示，建筑高度分层设色，白模渲染 |
| 起降点分析 | 高度/面积范围筛选，结果统计与导出 |
| 航线碰撞预警 | 绘制飞行范围，检测与建筑碰撞 |
| 用户认证 | 登录/注册，邮箱验证码，密码强度检测 |
| 数据筛选 | 按高度/面积范围筛选建筑，高亮显示结果 |
| 禁飞区图层 | 显示无人机禁飞区域 |
| 相机漫游 | 页面加载时自动漫游到数据区域 |

### 后端API

| 路由模块 | 说明 |
|----------|------|
| `/api/auth` | 用户登录、注册、验证码、邮箱验证 |
| `/api/public/buildings` | 公开建筑数据查询（分页、筛选） |
| `/api/buildings` | 建筑数据查询（需认证） |
| `/api/nofly` | 禁飞区数据管理 |
| `/api/takeoff` | 起降点分析服务 |
| `/api/uav` | 无人机相关服务 |
| `/api/userdata` | 用户数据管理 |
| `/api/admin` | 管理员功能 |

## 数据说明

### 建筑数据

- **来源**：Microsoft GlobalMLBuildingFootprints
- **范围**：洛杉矶市中心（76,634个建筑）
- **坐标系**：WGS84 (EPSG:4326)
- **字段**：bid、height、confidence、area_m2

### 禁飞区数据

- **数量**：32个禁飞区域
- **字段**：zone_id、zone_name、restrict、height_met、Area

## 快速开始

### 前置条件

- Node.js ≥ 22.18.0 或 ≥ 24.12.0
- Python ≥ 3.8
- PostgreSQL ≥ 13.0

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端服务将在 `http://localhost:5173` 启动。

### 启动后端

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 配置数据库
npm start
```

后端服务将在 `http://localhost:3000` 启动。

### 数据库配置

后端使用 PostgreSQL 数据库，环境变量配置如下：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=la_build_db
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 数据处理（首次部署）

```bash
# 1. 转换原始数据格式
python scripts/convert_to_geojson.py

# 2. 裁剪研究区域
python scripts/clip_la_data.py

# 3. 计算建筑占地面积
python scripts/calculate_area.py

# 4. 填充缺失高度值
python scripts/fill_heights.py

# 5. 导入数据库
node backend/scripts/run-migration.js
node backend/scripts/import-geojson.js
```

## 技术栈版本

| 技术 | 版本 |
|------|------|
| Vue | ^3.5.38 |
| Vite | ^8.0.16 |
| Cesium | ^1.142.0 |
| Vue Router | ^4.6.4 |
| Pinia | ^3.0.4 |
| Express | ^5.2.1 |
| PostgreSQL (pg) | ^8.22.0 |
| JWT | ^9.0.3 |
| Nodemailer | ^9.0.2 |

## 浏览器支持

| 浏览器 | 版本要求 |
|--------|----------|
| Chrome | ≥ 90 |
| Firefox | ≥ 88 |
| Safari | ≥ 14 |
| Edge | ≥ 90 |

## 许可证

MIT License