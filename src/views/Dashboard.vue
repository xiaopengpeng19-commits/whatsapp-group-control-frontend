<template>
  <div>
    <h2>仪表盘</h2>
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <h3>总账号</h3>
            <p style="font-size:32px;color:#409eff">0</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <h3>在线账号</h3>
            <p style="font-size:32px;color:#67c23a">0</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <h3>今日消息</h3>
            <p style="font-size:32px;color:#e6a23c">0</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <h3>总用户</h3>
            <p style="font-size:32px;color:#909399">0</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
