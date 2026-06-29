const express = require("express");
const cors = require("cors");
const buildingRoutes = require("./routes/buildings");
const takeoffRoutes = require("./routes/takeoff");
const uavRoutes = require("./routes/uav");
const noflyRoutes = require("./routes/nofly");
const authRoutes = require("./routes/auth");
const userdataRoutes = require("./routes/userdata");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

app.use("/api/buildings", buildingRoutes);
app.use("/api/build", takeoffRoutes);
app.use("/api/uav", uavRoutes);
app.use("/api/nofly", noflyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/userdata", userdataRoutes);

app.get("/", (req, res) => {
  res.json({ message: "建筑属性查询服务运行中" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
