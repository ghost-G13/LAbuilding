const ROLE_LEVELS = {
  admin: 99,
  regulator: 50,
  dispatcher: 40,
  planner: 30,
  user: 10,
};

const requireRole = (roleName) => {
  const minLevel = ROLE_LEVELS[roleName] || 0;

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        code: 401,
        message: "请先登录",
      });
    }

    const userLevel = ROLE_LEVELS[req.user.role] || 0;

    if (userLevel < minLevel) {
      return res.status(403).json({
        code: 403,
        message: `无权限访问，需要 ${roleName} 及以上角色`,
      });
    }

    next();
  };
};

module.exports = {
  ROLE_LEVELS,
  requireRole,
};