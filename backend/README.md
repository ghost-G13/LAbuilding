# LAbuilding Backend

建筑属性查询系统后端服务，基于 Node.js + Express + PostgreSQL + PostGIS 构建。

## 功能特性

- ✅ **点选属性查询** - 根据坐标查询建筑高度、面积、用途等属性
- ✅ **起降点分析** - 筛选合法起降屋顶
- ✅ **航线碰撞预警** - 检测建筑超高碰撞、禁飞区侵入、飞行范围越界
- ✅ **禁飞区可视化** - 叠加显示禁飞区/限飞区/适飞区
- ✅ **用户认证** - 登录/注册功能
- ✅ **查询记录** - 保存用户查询历史到数据库

## 环境要求

- Node.js >= 18.0
- PostgreSQL >= 14.0
- PostGIS >= 3.0

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/ghost-G13/LAbuilding.git
cd LAbuilding/backend
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 文件为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写数据库连接信息：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=la_build_db
DB_USER=postgres
DB_PASSWORD=your_password_here
```

> ⚠️ **注意**: `.env` 文件已加入 `.gitignore`，不会被提交到代码仓库

### 4. 初始化数据库

#### 4.1 创建数据库（首次使用）

打开 PostgreSQL 命令行或 pgAdmin，执行以下 SQL：

```sql
CREATE DATABASE la_build_db;
\c la_build_db;
CREATE EXTENSION postgis;
```

#### 4.2 创建用户表和查询记录表

```bash
node -e "const { Pool } = require('pg'); const fs = require('fs'); const pool = new Pool({host:'localhost',port:5432,database:'la_build_db',user:'postgres',password:'你的密码'}); async function run() { const sql = fs.readFileSync('./scripts/create-user-tables.sql', 'utf8'); await pool.query(sql); console.log('Tables created successfully'); pool.end(); } run().catch(e => { console.error(e.message); pool.end(); });"
```

#### 4.3 导入建筑数据（可选）

```bash
node scripts/import-geojson.js
```

> ⚠️ **注意**: 需要准备建筑白模和禁飞区的 GeoJSON 文件放在 `data/` 目录下

### 5. 启动服务

```bash
node server.js
```

服务启动后访问：http://localhost:3000

## API 接口

| 模块 | 接口 | 方法 | 描述 |
|------|------|------|------|
| 认证 | `/api/auth/login` | POST | 用户登录 |
| 认证 | `/api/auth/register` | POST | 用户注册 |
| 认证 | `/api/auth/info/:userId` | GET | 获取用户信息 |
| 查询记录 | `/api/userdata/save` | POST | 保存查询记录 |
| 查询记录 | `/api/userdata/list/:userId` | GET | 获取查询历史 |
| 查询记录 | `/api/userdata/detail/:recordId` | GET | 获取记录详情 |
| 查询记录 | `/api/userdata/delete/:recordId` | DELETE | 删除记录 |
| 建筑 | `/api/buildings/point-query` | GET | 点选建筑查询 |
| 建筑 | `/api/buildings` | GET | 获取建筑列表 |
| 建筑 | `/api/buildings/:bid` | GET | 获取建筑详情 |
| 起降点 | `/api/build/takeoff-filter` | GET | 获取候选起降点 |
| 航线 | `/api/uav/route-check` | POST | 航线碰撞检测 |
| 禁飞区 | `/api/nofly/zones` | GET | 获取所有禁飞区 |
| 禁飞区 | `/api/nofly/:zoneId` | GET | 获取禁飞区详情 |

完整 API 文档请参考：[API_DOCUMENT.md](./API_DOCUMENT.md)

## 测试用户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| planner | planner123 | 规划师 |
| dispatcher | dispatcher123 | 调度人员 |
| regulator | regulator123 | 监管人员 |

## 项目结构

```
backend/
├── config/              # 配置文件
│   └── db.js            # 数据库连接配置
├── routes/              # 路由定义
│   ├── auth.js          # 用户认证
│   ├── buildings.js     # 建筑查询
│   ├── takeoff.js       # 起降点分析
│   ├── uav.js           # 航线碰撞预警
│   ├── nofly.js         # 禁飞区查询
│   └── userdata.js      # 查询记录
├── scripts/             # 脚本文件
│   ├── create-user-tables.sql  # 用户表创建脚本
│   ├── import-geojson.js       # GeoJSON数据导入
│   └── import-geom.js          # 几何数据导入
├── utils/               # 工具函数
│   └── db.js            # 数据库连接工具
├── .env                 # 环境变量（不提交）
├── .env.example         # 环境变量示例
├── .gitignore           # Git忽略配置
├── API_DOCUMENT.md      # API文档
├── package.json         # 依赖配置
└── server.js            # 服务入口
```

## 前端对接

### Vite 代理配置

在前端项目的 `vite.config.js` 中添加代理：

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

### 调用示例

```javascript
// 登录
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const { data: user } = await loginRes.json();

// 点选查询建筑
const queryRes = await fetch(`/api/buildings/point-query?lng=-118.208&lat=34.08`);
const building = await queryRes.json();

// 保存查询记录
await fetch('/api/userdata/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: user.id,
    query_type: 'point-query',
    query_params: { lng: -118.208, lat: 34.08 },
    result_count: 1
  })
});
```

## 常见问题

### Q: 数据库连接失败？
A: 请检查 `.env` 文件中的数据库配置是否正确，确保 PostgreSQL 服务已启动。

### Q: 点选查询返回 404？
A: 请确保坐标点落在建筑几何范围内，可以通过 pgAdmin 查询确认：
```sql
SELECT * FROM la_building WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(经度, 纬度), 4326));
```

### Q: 需要安装 dotenv？
A: 代码已做兼容处理，未安装 dotenv 时会使用环境变量或默认值。如需使用 `.env` 文件，执行：
```bash
npm install dotenv
```

## License

MIT