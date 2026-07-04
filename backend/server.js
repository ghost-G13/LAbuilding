try {
  require("dotenv").config();
} catch (e) {
  console.log("dotenv not available, using environment variables");
}

const requiredEnvVars = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missingVars.join(", ")}`);
  console.error("Please create a .env file in the backend directory with all required variables.");
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your-strong-secret-key-change-in-production") {
  console.warn("WARNING: JWT_SECRET is not set or using default value. Please set a secure secret in .env for production.");
}

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

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

app.use("/api/auth", authRoutes);

const publicBuildingRoutes = require("./routes/public-buildings");
app.use("/api/public", publicBuildingRoutes);

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

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
});