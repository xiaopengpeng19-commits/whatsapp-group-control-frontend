<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup>
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>

<style>
:root {
  --primary: #60a5fa;
  --primary-2: #3b82f6;
  --primary-soft: rgba(96, 165, 250, 0.16);
  --bg: #0f172a;
  --surface: #172033;
  --surface-2: #1b2538;
  --text: #f8fafc;
  --text-dark: #f8fafc;
  --text-muted: #cbd5e1;
  --border: #263447;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}

body {
  min-height: 100%;
}

.el-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(2, 8, 23, 0.35);
  background: var(--surface-2);
  color: var(--text);
}

.el-button--primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  border-color: transparent;
}

.el-table,
.el-form-item__label,
.el-input__wrapper,
.el-select .el-select__wrapper,
.el-textarea__inner,
.el-dropdown-menu {
  background: var(--surface) !important;
  color: var(--text) !important;
}
</style>
