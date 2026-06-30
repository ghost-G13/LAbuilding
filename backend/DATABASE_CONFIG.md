# 数据库配置说明

## 当前连接配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 数据库地址 | `localhost` | 本地 PostgreSQL 服务 |
| 端口 | `5432` | PostgreSQL 默认端口 |
| 数据库名 | `la_build_db` | 项目专用数据库 |
| 用户名 | `postgres` | 默认超级用户 |
| 密码 | `your_password_here` | 请在 `.env` 文件中填写实际密码 |

> **安全提示**：真实密码保存在 `backend/.env` 文件中，该文件已被 `.gitignore` 排除，不会上传到 GitHub。

## 环境变量配置

1. 复制示例文件：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=la_build_db
DB_USER=postgres
DB_PASSWORD=your_password_here
```

3. 将 `your_password_here` 替换为你的 PostgreSQL 实际密码。

## 数据库初始化步骤

### 1. 创建数据库

在 pgAdmin4 查询工具或 psql 中执行：

```sql
CREATE DATABASE la_build_db;
\c la_build_db;
CREATE EXTENSION postgis;
```

### 2. 创建用户表和查询记录表

```bash
node scripts/run-migration.js
```

或手动执行 SQL 脚本：

```bash
psql -U postgres -d la_build_db -f scripts/create-user-tables.sql
```

### 3. 导入建筑与禁飞区数据

```bash
node scripts/import-geojson.js
```

> 需要提前将建筑白模 GeoJSON 和禁飞区 GeoJSON 文件放入项目对应目录。

## 连接验证

启动后端服务：

```bash
node server.js
```

如果控制台输出 `Server running on port 3000` 且没有数据库连接错误，说明配置正确。

## 安全规范

- `.env` 文件**不得**提交到 Git 仓库
- 生产环境应使用独立数据库账号，避免使用 `postgres` 超级用户
- 数据库密码建议定期更换
