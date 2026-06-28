-- 用户表和查询记录表
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- 查询记录表 (userdata)
CREATE TABLE IF NOT EXISTS userdata (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  query_type VARCHAR(50) NOT NULL,
  query_params TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  result_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_userdata_user_id ON userdata(user_id);
CREATE INDEX IF NOT EXISTS idx_userdata_query_type ON userdata(query_type);
CREATE INDEX IF NOT EXISTS idx_userdata_created_at ON userdata(created_at);

-- 插入测试用户 (密码: 123456，实际应用中应该加密存储)
INSERT INTO users (username, password, email, role) VALUES 
  ('admin', 'admin123', 'admin@example.com', 'admin'),
  ('planner', 'planner123', 'planner@example.com', 'planner'),
  ('dispatcher', 'dispatcher123', 'dispatcher@example.com', 'dispatcher'),
  ('regulator', 'regulator123', 'regulator@example.com', 'regulator')
ON CONFLICT (username) DO NOTHING;