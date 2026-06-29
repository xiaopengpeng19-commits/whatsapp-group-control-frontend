<template>
  <div>
    <h2>消息管理</h2>
    <el-table :data="[]" style="margin-top:20px">
      <el-table-column prop="content" label="内容" />
      <el-table-column prop="status" label="状态" />
      <el-table-column prop="time" label="时间" />
    </el-table>
  </div>
</template>
