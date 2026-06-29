<template>
  <div>
    <h2>账号管理</h2>
    <el-button type="primary">添加账号</el-button>
    <el-table :data="[]" style="margin-top:20px">
      <el-table-column prop="account" label="账号" />
      <el-table-column prop="status" label="状态" />
      <el-table-column label="操作">
        <template>
          <el-button size="small" type="primary">上线</el-button>
          <el-button size="small" type="danger">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
