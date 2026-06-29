<template>
  <div>
    <h2>用户管理</h2>
    <el-button type="primary">添加用户</el-button>
    <el-table :data="[]" style="margin-top:20px">
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="role" label="角色" />
      <el-table-column prop="status" label="状态" />
    </el-table>
  </div>
</template>
