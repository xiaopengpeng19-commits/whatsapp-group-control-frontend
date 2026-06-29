<template>
  <el-container class="layout-container">
    <el-header class="header">
      <h2>WhatsApp 群控系统</h2>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<style scoped>
.layout-container {
  height: 100vh;
}
.header {
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0 20px;
}
</style>
