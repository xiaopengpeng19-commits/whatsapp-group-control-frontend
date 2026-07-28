<template>
  <div class="contacts">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <!-- 搜索框 -->
        <el-input v-model="searchKeyword" placeholder="搜索账号" clearable prefix-icon="Search" style="width:200px"
          @input="filterAccounts" />

        <!-- 分组快速筛选 -->
        <el-button-group>
          <el-button :type="filterGroup === '' ? 'primary' : ''" size="small"
            @click="filterGroup = ''; filterAccounts()">
            全部
          </el-button>
          <el-button v-for="g in groupList" :key="g" :type="filterGroup === g ? 'primary' : ''" size="small"
            @click="filterGroup = g; filterAccounts()">
            {{ g }}
          </el-button>
        </el-button-group>

        <el-button type="primary" size="small" @click="showAddDialog = true">
          <el-icon>
            <Plus />
          </el-icon> 添加联系人
        </el-button>
        <el-button type="success" size="small" @click="showBatchDialog = true">
          <el-icon>
            <DocumentAdd />
          </el-icon> 批量导入
        </el-button>
        <el-button size="small" @click="fetchAccounts">
          <el-icon>
            <Refresh />
          </el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 账号列表（表格形式） -->
    <el-table :data="filteredAccounts" border v-loading="loading" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="45" />
      <el-table-column prop="account" label="账号" width="150" />
      <el-table-column prop="group" label="分组" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.group ? 'primary' : 'info'">
            {{ row.group || '未分组' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="nickname" label="昵称" min-width="100" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="viewContacts(row.account)">
            查看联系人
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 已选账号信息 -->
    <div style="margin-top:10px;display:flex;gap:10px;align-items:center;">
      <span style="color:#999;font-size:13px;">已选: {{ selectedAccounts.length }} 个账号</span>
      <el-button size="small" type="primary" :disabled="selectedAccounts.length === 0" @click="viewSelectedContacts">
        查看联系人
      </el-button>
      <el-button size="small" type="warning" plain :disabled="selectedAccounts.length === 0"
        @click="exportSelectedContacts">
        导出联系人
      </el-button>
    </div>

    <!-- 联系人列表 -->
    <el-card style="margin-top:20px;" v-if="selectedAccount">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>
            联系人 - {{ selectedAccount }}
            <el-tag size="small" type="info" style="margin-left:8px;">
              {{ contacts.length }} 个
            </el-tag>
          </span>
          <el-button size="small" @click="selectedAccount = null; contacts = []">
            关闭
          </el-button>
        </div>
      </template>

      <el-table :data="contacts" border v-loading="contactsLoading">
        <el-table-column label="名称" min-width="150">
          <template #default="{ row }">
            {{ getDisplayName(row) }}
          </template>
        </el-table-column>
        <el-table-column label="手机号" width="150">
          <template #default="{ row }">
            {{ getDisplayPhone(row) }}
          </template>
        </el-table-column>
        <el-table-column label="JID" min-width="200">
          <template #default="{ row }">
            {{ row.peerId || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.updatedAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加联系人对话框（保持不变） -->
    <el-dialog v-model="showAddDialog" title="添加联系人" width="500px">
      <!-- ... 原有内容 ... -->
    </el-dialog>

    <!-- 批量导入对话框（保持不变） -->
    <el-dialog v-model="showBatchDialog" title="批量导入联系人" width="600px">
      <!-- ... 原有内容 ... -->
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, DocumentAdd, Refresh, Search } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import dayjs from 'dayjs'

const accounts = ref([])
const filteredAccounts = ref([])
const contacts = ref([])
const selectedAccount = ref(null)
const loading = ref(false)
const contactsLoading = ref(false)
const searchKeyword = ref('')
const filterGroup = ref('')
const selectedAccounts = ref([])

// ... 状态映射、工具函数、数据获取 ...
// ... 原有 add/delete 逻辑保持不变 ...
</script>