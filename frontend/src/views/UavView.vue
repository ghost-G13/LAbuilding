<template>
  <div class="container">
    <h1>航线碰撞预警检测</h1>

    <div class="form">
      <div class="form-group">
        <label>最高飞行高度 (m)</label>
        <input v-model="form.maxAltitude" type="number" placeholder="如: 120" />
      </div>

      <div class="form-group">
        <label>航线坐标 (每行一对: 经度,纬度)</label>
        <textarea
          v-model="routeInput"
          rows="4"
          placeholder="-118.4,33.85&#10;-118.3,33.9&#10;-118.2,33.95"
        ></textarea>
      </div>

      <button @click="checkRoute" class="btn-primary">检测航线</button>
    </div>

    <div v-if="result" class="result">
      <div :class="result.data.has_risk ? 'risk-alert' : 'safe-alert'">
        {{ result.data.has_risk ? "检测到风险！" : "航线安全" }}
        <p class="note">{{ result.data.note }}</p>
      </div>

      <div class="risk-details" v-if="result.data.has_risk">
        <div v-if="result.data.risks.building_collision.length > 0" class="risk-item">
          <h3>建筑碰撞风险 ({{ result.data.risks.building_collision.length }})</h3>
          <ul>
            <li v-for="b in result.data.risks.building_collision" :key="b.id">
              建筑 {{ b.bid }} - 高度 {{ b.height }}m > 限制 {{ b.max_altitude }}m
            </li>
          </ul>
        </div>

        <div v-if="result.data.risks.nofly_zone.length > 0" class="risk-item">
          <h3>禁飞区侵入 ({{ result.data.risks.nofly_zone.length }})</h3>
          <ul>
            <li v-for="n in result.data.risks.nofly_zone" :key="n.bid">
              {{ n.zone_name }} - {{ n.restriction }}
            </li>
          </ul>
        </div>

        <div v-if="result.data.risks.boundary_violation" class="risk-item">
          <h3>边界越界</h3>
          <p>航线超出指定的飞行范围</p>
        </div>
      </div>

      <div class="route-info">
        <h3>航线信息</h3>
        <p>最大高度: {{ result.data.max_altitude }}m</p>
        <p>坐标点: {{ result.data.route.coordinates.length }} 个</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { uavApi } from "../api/index";

const form = reactive({
  maxAltitude: 120,
});

const routeInput = ref("-118.4,33.85\n-118.3,33.9\n-118.2,33.95");
const result = ref(null);

const checkRoute = async () => {
  try {
    const coordinates = routeInput.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => {
        const [lon, lat] = line.split(",").map(Number);
        return [lon, lat];
      });

    if (coordinates.length < 2) {
      alert("请输入至少两个坐标点");
      return;
    }

    const data = {
      route: {
        type: "LineString",
        coordinates,
      },
      maxAltitude: form.maxAltitude,
    };

    const response = await uavApi.routeCheck(data);
    if (response.data.code === 0) {
      result.value = response.data;
    }
  } catch (error) {
    console.error("航线检测失败:", error);
    alert("检测失败，请检查后端服务是否运行");
  }
};
</script>

<style scoped>
.container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.form {
  margin-bottom: 20px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.btn-primary {
  padding: 10px 30px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #0056b3;
}

.result {
  margin-top: 20px;
}

.risk-alert {
  padding: 20px;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  margin-bottom: 20px;
}

.risk-alert h2 {
  color: #856404;
  margin: 0 0 10px 0;
}

.safe-alert {
  padding: 20px;
  background: #d4edda;
  border: 2px solid #28a745;
  border-radius: 8px;
  margin-bottom: 20px;
}

.safe-alert h2 {
  color: #155724;
  margin: 0 0 10px 0;
}

.note {
  margin: 10px 0 0 0;
  color: #666;
}

.risk-details {
  margin-bottom: 20px;
}

.risk-item {
  padding: 15px;
  background: #f8f9fa;
  border-left: 4px solid #dc3545;
  margin-bottom: 10px;
}

.risk-item h3 {
  margin: 0 0 10px 0;
  color: #dc3545;
}

.risk-item ul {
  margin: 0;
  padding-left: 20px;
}

.risk-item li {
  margin-bottom: 5px;
}

.route-info {
  padding: 15px;
  background: #e9ecef;
  border-radius: 8px;
}

.route-info h3 {
  margin: 0 0 10px 0;
}

.route-info p {
  margin: 5px 0;
}
</style>
