const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");
const redis = require("../utils/redis");
const { generateToken } = require("../middleware/auth");
const svgCaptcha = require("svg-captcha");

const generateCode = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, "0");
};

const isEmail = (str) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
};

const isPhone = (str) => {
  return /^1[3-9]\d{9}$/.test(str);
};

router.post("/send-code", async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        code: 400,
        message: "请输入手机号或邮箱",
      });
    }

    const isEmailAddr = isEmail(identifier);
    const isPhoneNum = isPhone(identifier);

    if (!isEmailAddr && !isPhoneNum) {
      return res.status(400).json({
        code: 400,
        message: "请输入正确的手机号或邮箱",
      });
    }

    const rateLimitKey = `sms:limit:${identifier}`;
    const lastSent = await redis.get(rateLimitKey);

    if (lastSent) {
      const remaining = 60 - Math.floor((Date.now() - parseInt(lastSent)) / 1000);
      return res.status(429).json({
        code: 429,
        message: `请${remaining}秒后再试`,
      });
    }

    const code = generateCode(6);
    const codeKey = `sms:code:${identifier}`;
    await redis.set(codeKey, code, 300);
    await redis.set(rateLimitKey, Date.now().toString(), 60);

    console.log(`[验证码] ${identifier}: ${code}`);

    res.json({
      code: 0,
      message: "验证码发送成功",
      data: {
        identifier,
        expires_in: 300,
      },
    });
  } catch (error) {
    console.error("Send code error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/captcha", async (req, res) => {
  try {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: "0oO1iIlL",
      noise: 2,
      width: 120,
      height: 40,
    });

    const captchaKey = `captcha:${Date.now()}`;
    await redis.set(captchaKey, captcha.text.toLowerCase(), 120);

    res.type("svg");
    res.send({
      code: 0,
      message: "success",
      data: {
        image: captcha.data,
        captcha_key: captchaKey,
        expires_in: 120,
      },
    });
  } catch (error) {
    console.error("Captcha error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { username, password, identifier, code, role } = req.body;

    if (!username || !password || !identifier || !code) {
      return res.status(400).json({
        code: 400,
        message: "请填写完整信息",
      });
    }

    const codeKey = `sms:code:${identifier}`;
    const storedCode = await redis.get(codeKey);

    if (!storedCode) {
      return res.status(400).json({
        code: 400,
        message: "验证码已过期，请重新获取",
      });
    }

    if (storedCode !== code) {
      return res.status(400).json({
        code: 400,
        message: "验证码错误",
      });
    }

    await redis.del(codeKey);

    const existingUser = await query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        code: 400,
        message: "用户名已存在",
      });
    }

    const isEmailAddr = isEmail(identifier);
    let insertParams;
    let insertSql;

    if (isEmailAddr) {
      insertSql = "INSERT INTO users (username, password, email, email_verified, role) VALUES ($1, $2, $3, true, $4) RETURNING id, username, email, phone, role, created_at";
      insertParams = [username, password, identifier, role || "user"];
    } else {
      insertSql = "INSERT INTO users (username, password, phone, phone_verified, role) VALUES ($1, $2, $3, true, $4) RETURNING id, username, email, phone, role, created_at";
      insertParams = [username, password, identifier, role || "user"];
    }

    const result = await query(insertSql, insertParams);

    res.json({
      code: 0,
      message: "注册成功",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password, captcha_key, captcha_code } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: "用户名和密码不能为空",
      });
    }

    if (!captcha_key || !captcha_code) {
      return res.status(400).json({
        code: 400,
        message: "请输入图形验证码",
      });
    }

    const storedCaptcha = await redis.get(captcha_key);

    if (!storedCaptcha) {
      return res.status(400).json({
        code: 400,
        message: "验证码已过期，请重新获取",
      });
    }

    if (storedCaptcha !== captcha_code.toLowerCase()) {
      return res.status(400).json({
        code: 400,
        message: "验证码错误",
      });
    }

    await redis.del(captcha_key);

    const result = await query(
      "SELECT id, username, email, phone, role, created_at FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        code: 401,
        message: "用户名或密码错误",
      });
    }

    await query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [result.rows[0].id]
    );

    const token = generateToken(result.rows[0].id, result.rows[0].role);

    res.json({
      code: 0,
      message: "登录成功",
      data: {
        ...result.rows[0],
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/info/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      "SELECT id, username, email, phone, role, email_verified, phone_verified, created_at, last_login FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "用户不存在",
      });
    }

    res.json({
      code: 0,
      message: "success",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get user info error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

module.exports = router;