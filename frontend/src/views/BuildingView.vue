<template>
  <div class="container">
    <h1>建筑起降点分析</h1>

    <div class="filters">
      <div class="filter-group">
        <label>高度范围 (m)</label>
        <input v-model="filters.minHeight" type="number" placeholder="最小高度" />
        <span>-</span>
        <input v-model="filters.maxHeight" type="number" placeholder="最大高度" />
      </div>

      <div class="filter-group">
        <label>面积范围 (m²)</label>
        <input v-model="filters.minArea" type="number" placeholder="最小面积" />
        <span>-</span>
        <input v-model="filters.maxArea" type="number" placeholder="最大面积" />
      </div>

      <button @click="fetchBuildings" class="btn-primary">查询</button>
    </div>

    <div class="results">
      <div class="stats">
        共找到 <span class="highlight">{{ buildings.length }}</span> 个符合条件的建筑
      </div>

      <div v-if="buildings.length === 0" class="empty">
        暂无数据，请调整筛选条件
      </div>

      <table v-else class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>建筑ID</th>
            <th>高度 (m)</th>
            <th>面积 (m²)</th>
            <th>禁飞区</th>
            <th>飞行上限 (m)</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in buildings" :key="b.properties.id">
            <td>{{ b.properties.id }}</td>
            <td>{{ b.properties.bid }}</td>
            <td>{{ b.properties.height }}</td>
            <td>{{ b.properties.roof_area }}</td>
            <td>{{ b.properties.zone_name || '-' }}</td>
            <td>{{ b.properties.flight_ceil || '-' }}</td>
            <td>
              <span :class="b.properties.is_valid ? 'valid' : 'invalid'">
                {{ b.properties.is_valid ? '可用' : '不可用' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { buildingApi } from "../api/index";

const filters = reactive({
  minHeight: 0,
  maxHeight: 500,
  minArea: 50,
  maxArea: 5000,
});

const buildings = ref([]);

const fetchBuildings = async () => {
  try {
    const params = {
      minHeight: filters.minHeight,
      maxHeight: filters.maxHeight,
      minArea: filters.minArea,
      maxArea: filters.maxArea,
    };
    const response = await buildingApi.takeoffFilter(params);
    if (response.data.code === 0) {
      buildings.value = response.data.data.features;
    }
  } catch (error) {
    console.error("获取建筑数据失败:", error);
    alert("获取数据失败，请检查后端服务是否运行");
  }
};

fetchBuildings();
</script>

<style scoped>
.container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-weight: bold;
  min-width: 80px;
}

.filter-group input {
  width: 100px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn-primary {
  padding: 8px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #0056b3;
}

.results {
  margin-top: 20px;
}

.stats {
  margin-bottom: 15px;
  font-size: 14px;
}

.highlight {
  color: #007bff;
  font-weight: bold;
  font-size: 18px;
}

.empty {
  padding: 40px;
  text-align: center;
  color: #999;
  background: #f9f9f9;
  border-radius: 8px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.table th {
  background: #f5f5f5;
  font-weight: bold;
}

.valid {
  color: green;
  font-weight: bold;
}

.invalid {
  color: red;
  font-weight: bold;
}
</style>
