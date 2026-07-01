# 城市低空三维白模可视化与分析系统

## 项目概述

本项目是一个城市建筑三维白模可视化与分析平台，基于 Vue 3 + Cesium 实现建筑三维展示、低空选址筛选、飞行区域碰撞预警等功能。系统支持用户认证、数据筛选、分层设色和多语言切换等交互功能。

## 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端展示层                               │
│  Vue 3 + Cesium + Vite                                         │
│  • 三维建筑可视化（白模展示、建筑高度分级着色）                          │
│  • 低空选址筛选（高度/面积范围筛选）                            │
│  • 飞行区域碰撞预警（绘制范围、碰撞检测）                        │
│  • 用户认证（登录/注册/验证码）                                 │
│  • 多语言切换（中文/英文）                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP API
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        后端服务层                               │
│  Node.js + Express + PostgreSQL + Redis                        │
│  • 用户认证（登录/注册/邮箱验证码）                              │
│  • 建筑数据查询（分页、筛选）                                    │
│  • 禁飞区数据管理                                               │
│  • 低空选址筛选API                                              │
│  • Redis缓存（验证码存储）                                       │
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
│  • 置信度检查                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
LAbuilding/
├── README.md              # 项目总览说明
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── components/    # Vue组件
│   │   │   └── CesiumScene.vue  # Cesium三维场景组件
│   │   ├── router/        # 路由配置
│   │   │   └── index.js
│   │   ├── utils/         # 工具函数
│   │   │   └── request.js # HTTP请求封装
│   │   ├── App.vue        # 主应用组件
│   │   ├── main.js        # 入口文件
│   │   └── style.css      # 全局样式
│   ├── public/data/       # 前端静态数据
│   │   └── la_clipped_sample.geojson
│   ├── index.html         # HTML入口
│   ├── package.json
│   ├── vite.config.js     # Vite配置
│   └── .gitignore
├── backend/               # 后端服务
│   ├── routes/            # API路由
│   │   ├── auth.js        # 用户认证（登录/注册/验证码）
│   │   ├── public-buildings.js # 公开建筑数据接口
│   │   ├── buildings.js   # 建筑数据接口（需认证）
│   │   ├── nofly.js       # 禁飞区数据管理
│   │   ├── takeoff.js     # 低空选址筛选
│   │   ├── uav.js         # 无人机服务
│   │   ├── userdata.js    # 用户数据管理
│   │   └── admin.js       # 管理员功能
│   ├── middleware/        # 中间件
│   │   ├── auth.js        # JWT认证中间件
│   │   └── roleGuard.js   # 角色权限守卫
│   ├── utils/             # 工具模块
│   │   ├── db.js          # 数据库连接（PostgreSQL）
│   │   ├── mail.js        # 邮件发送（验证码）
│   │   └── redis.js       # Redis缓存
│   ├── config/            # 配置文件
│   │   └── db.js          # 数据库配置
│   ├── scripts/           # 数据库脚本
│   │   ├── run-migration.js   # 数据库迁移
│   │   ├── import-geojson.js  # GeoJSON数据导入
│   │   ├── import-geom.js     # 几何数据导入
│   │   ├── create-user-tables.sql # 用户表创建
│   │   └── check-userdata.js  # 用户数据检查
│   ├── server.js          # 服务器入口
│   ├── package.json
│   ├── .env.example       # 环境变量示例
│   └── .gitignore
├── building/              # 建筑白模数据
│   ├── LA_building.geojson
│   ├── LA_building.shp
│   ├── LA_building.csv
│   ├── la_clipped.geojson
│   ├── la_clipped_with_area.geojson
│   ├── la_height_filled.geojson
│   └── 数据说明.md
├── no_fly_zone/           # 无人机禁飞区数据
│   ├── 无人机禁飞区_CGS_WGS84.geojson
│   ├── 无人机禁飞区_CGS_WGS84.shp
│   ├── 无人机禁飞区_CGS_WGS84.csv
│   └── 数据说明.md
└── scripts/               # Python数据处理脚本
    ├── convert_to_geojson.py   # 数据格式转换
    ├── clip_la_data.py         # 区域裁剪
    ├── calculate_area.py       # 面积计算
    ├── fill_heights.py         # 高度填充
    ├── check_confidence.py     # 置信度检查
    ├── check_result.py         # 结果检查
    ├── quadkey_calculator.py   # QuadKey计算
    └── 脚本说明.md
```

## 功能特性

### 前端功能

| 功能模块 | 说明 |
|----------|------|
| 三维可视化 | Cesium地球展示，建筑高度分层设色，白模渲染 |
| 低空选址筛选 | 高度/面积范围筛选，结果统计与导出 |
| 飞行区域碰撞预警 | 绘制飞行范围，检测与建筑碰撞 |
| 用户认证 | 登录/注册，邮箱验证码，图片验证码，密码强度检测 |
| 数据筛选 | 按高度/面积范围筛选建筑，高亮显示结果 |
| 禁飞区图层 | 显示无人机禁飞区域，点选显示名称、面积（km²）、标注，支持中英文切换 |
| 相机漫游 | 页面加载时自动漫游到数据区域 |
| 多语言切换 | 中文/英文界面切换 |
| 页面交互 | 鼠标左键旋转、滚轮缩放、右键平移 |

### 后端API

| 路由模块 | 说明 | 是否需要认证 |
|----------|------|-------------|
| `/api/auth/login` | 用户登录 | 否 |
| `/api/auth/register` | 用户注册 | 否 |
| `/api/auth/send-code` | 发送邮箱验证码 | 否 |
| `/api/auth/captcha` | 获取图片验证码 | 否 |
| `/api/public/buildings` | 公开建筑数据查询 | 否 |
| `/api/public/nofly-zones` | 公开禁飞区数据 | 否 |
| `/api/nofly/zones` | 禁飞区数据查询（支持多语言） | 否 |
| `/api/buildings` | 建筑数据查询 | 是 |
| `/api/nofly` | 禁飞区数据管理 | 是 |
| `/api/build` | 低空选址筛选 | 是 |
| `/api/uav` | 无人机相关服务 | 是 |
| `/api/userdata` | 用户数据管理 | 是 |
| `/api/admin` | 管理员功能 | 是（管理员权限） |

## 数据说明

### 建筑数据

- **来源**：Microsoft GlobalMLBuildingFootprints
- **范围**：洛杉矶市中心（76,634个建筑）
- **坐标系**：WGS84 (EPSG:4326)
- **字段**：id、bid、height、confidence、area_m2、geom

### 禁飞区数据

- **数量**：32个禁飞区域
- **字段**：bid、zone_id、zone_name、restrict、note、flight_cei、height_met、area、geom
- **多语言支持**：note字段支持中英文对照（格式：英文 | 中文），restrict和zone_category字段支持中英文翻译
- **面积单位**：km²

## 快速开始

### 前置条件

- Node.js ≥ 22.18.0 或 ≥ 24.12.0
- Python ≥ 3.8
- PostgreSQL ≥ 13.0
- Redis ≥ 6.0

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
# 编辑 .env 配置数据库和Redis
npm start
```

后端服务将在 `http://localhost:3000` 启动。

### 环境变量配置

后端环境变量配置（.env文件）：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=la_build_db
DB_USER=postgres
DB_PASSWORD=your_password_here
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
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
| Express | ^5.2.1 |
| PostgreSQL (pg) | ^8.22.0 |
| Redis | ^4.6.0 |
| JWT (jsonwebtoken) | ^9.0.3 |
| Nodemailer | ^9.0.2 |
| bcryptjs | ^3.0.3 |
| svg-captcha | ^1.4.0 |

## 浏览器支持

| 浏览器 | 版本要求 |
|--------|----------|
| Chrome | ≥ 90 |
| Firefox | ≥ 88 |
| Safari | ≥ 14 |
| Edge | ≥ 90 |

## 许可证

MIT License