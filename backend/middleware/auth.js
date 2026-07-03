const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authMiddleware = (req, res, next) => {
  const whitelist = ["/api/auth/captcha", "/api/auth/send-code", "/api/auth/login", "/api/auth/register"];
  if (whitelist.includes(req.path)) {
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      code: 401,
      message: "请先登录",
    });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      code: 401,
      message: "登录已过期，请重新登录",
    });
  }

  req.user = {
    id: decoded.userId,
    role: decoded.role,
  };
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
};