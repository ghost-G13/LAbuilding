<template>
  <div id="app">
    <nav class="nav">
      <router-link to="/buildings">建筑起降点分析</router-link>
      <router-link to="/uav">航线碰撞预警</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background: #fff;
}

#app {
  min-height: 100vh;
}

.nav {
  display: flex;
  gap: 20px;
  padding: 15px 20px;
  background: #343a40;
}

.nav a {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background 0.3s;
}

.nav a:hover {
  background: #495057;
}

.nav a.router-link-active {
  background: #007bff;
}
</style>
