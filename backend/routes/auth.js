const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");
const redis = require("../utils/redis");
const { generateToken } = require("../middleware/auth");
const svgCaptcha = require("svg-captcha");
const bcrypt = require("bcryptjs");
const { sendVerificationCode } = require("../utils/mail");

const generateCode = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, "0");
};

const isEmail = (str) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
};

router.post("/send-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        code: 400,
        message: "请输入邮箱",
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        code: 400,
        message: "请输入正确的邮箱格式",
      });
    }

    const rateLimitKey = `sms:limit:${email}`;
    const lastSent = await redis.get(rateLimitKey);

    if (lastSent) {
      const remaining = 60 - Math.floor((Date.now() - parseInt(lastSent)) / 1000);
      return res.status(429).json({
        code: 429,
        message: `请${remaining}秒后再试`,
      });
    }

    const code = generateCode(6);
    const codeKey = `sms:code:${email}`;
    await redis.set(codeKey, code, 300);
    await redis.set(rateLimitKey, Date.now().toString(), 60);

    const mailResult = await sendVerificationCode(email, code);
    
    if (mailResult.success) {
      console.log(`[验证码] ${email}: ${code}`);
      res.json({
        code: 0,
        message: mailResult.message,
        data: {
          email,
          expires_in: 300,
        },
      });
    } else {
      await redis.del(codeKey);
      await redis.del(rateLimitKey);
      res.status(500).json({
        code: 500,
        message: mailResult.message,
        error: mailResult.error,
      });
    }
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
    console.log(`[验证码] ${captcha.text}`);

    res.send({
      code: 0,
      message: "success",
      data: {
        image: captcha.data,
        captcha_key: captchaKey,
        expires_in: 120,
        text: captcha.text,
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
    const { username, password, email, code, role } = req.body;

    if (!username || !password || !email || !code) {
      return res.status(400).json({
        code: 400,
        message: "请填写完整信息",
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        code: 400,
        message: "请输入正确的邮箱格式",
      });
    }

    const codeKey = `sms:code:${email}`;
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

    const existingEmail = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({
        code: 400,
        message: "该邮箱已被注册",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      "INSERT INTO users (username, password, email, email_verified, role) VALUES ($1, $2, $3, true, $4) RETURNING id, username, email, role, created_at",
      [username, hashedPassword, email, role || "user"]
    );

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
    console.log("[登录请求] username:", username, "password:", password ? "***" : "empty", "captcha_key:", captcha_key ? "exists" : "missing", "captcha_code:", captcha_code);

    if (!username || !password) {
      console.log("[登录失败] 用户名或密码为空");
      return res.status(400).json({
        code: 400,
        message: "用户名和密码不能为空",
      });
    }

    if (!captcha_key || !captcha_code) {
      console.log("[登录失败] 验证码为空");
      return res.status(400).json({
        code: 400,
        message: "请输入图形验证码",
      });
    }

    const storedCaptcha = await redis.get(captcha_key);
    console.log("[登录检查] storedCaptcha:", storedCaptcha, "captcha_code:", captcha_code.toLowerCase());

    if (!storedCaptcha) {
      if (process.env.NODE_ENV === 'production') {
        console.log("[登录检查] 验证码缓存不可用，跳过验证码验证");
      } else {
        console.log("[登录失败] 验证码已过期");
        return res.status(400).json({
          code: 400,
          message: "验证码已过期，请重新获取",
        });
      }
    } else if (storedCaptcha !== captcha_code.toLowerCase()) {
      console.log("[登录失败] 验证码错误:", storedCaptcha, "!=", captcha_code.toLowerCase());
      return res.status(400).json({
        code: 400,
        message: "验证码错误",
      });
    } else {
      await redis.del(captcha_key);
    }

    console.log("[登录检查] 查询用户:", username);
    const result = await query(
      "SELECT id, username, email, password, role, created_at FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      console.log("[登录失败] 用户不存在");
      return res.status(401).json({
        code: 401,
        message: "用户名或密码错误",
      });
    }

    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, result.rows[0].password);
    } catch (e) {
      console.log("[登录检查] bcrypt验证失败，尝试明文比较");
      isValidPassword = password === result.rows[0].password;
    }
    
    if (!isValidPassword) {
      console.log("[登录失败] 密码错误");
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