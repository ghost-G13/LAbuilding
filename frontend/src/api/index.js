import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

export const buildingApi = {
  takeoffFilter: (params) => api.get("/build/takeoff-filter", { params }),
};

export const uavApi = {
  routeCheck: (data) => api.post("/uav/route-check", data),
};

export default api;
