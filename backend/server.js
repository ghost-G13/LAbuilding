const express = require("express");
const cors = require("cors");
const buildingRoutes = require("./routes/buildings");
const takeoffRoutes = require("./routes/takeoff");
const uavRoutes = require("./routes/uav");
const noflyRoutes = require("./routes/nofly");
const authRoutes = require("./routes/auth");
const userdataRoutes = require("./routes/userdata");
const adminRoutes = require("./routes/admin");
const { authMiddleware } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

app.use("/api/auth", authRoutes);

const publicBuildingRoutes = require("./routes/public-buildings");
app.use("/api/public", publicBuildingRoutes);
app.use("/api/nofly", noflyRoutes);

app.use(authMiddleware);

app.use("/api/buildings", buildingRoutes);
app.use("/api/build", takeoffRoutes);
app.use("/api/uav", uavRoutes);
app.use("/api/nofly", noflyRoutes);
app.use("/api/userdata", userdataRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "建筑属性查询服务运行中" });
});

module.exports = app;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    console.error("Server error:", err);
  });
}