<template>
  <div class="groups">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索账号或群组"
          clearable
          prefix-icon="Search"
          style="width:220px"
          @input="handleSearch"
        />

        <!-- 分组筛选 -->
        <el-select v-model="filterGroup" placeholder="全部分组" clearable @change="fetchAccounts" style="width:150px">
          <el-option label="全部分组" value="" />
          <el-option
            v-for="item in accountGroups"
            :key="item.name"
            :label="item.name + ' (' + item.count + '个)'"
            :value="item.name"
          />
        </el-select>

        <el-button type="primary" @click="syncAllAccounts">
          <el-icon><Refresh /></el-icon> 同步全部
        </el-button>
        <el-button @click="fetchAccounts">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 账号列表 -->
    <el-table
      :data="filteredAccounts"
      v-loading="loading"
      border
      stripe
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column prop="account" label="账号" width="150" />
      <el-table-column prop="group" label="分组" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="row.group ? 'primary' : 'info'">
            {{ row.group || '未分组' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="群组数" width="80" align="center">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ getGroupCount(row.account) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="nickname" label="昵称" min-width="100" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="viewGroups(row.account)">
            群组
          </el-button>
          <el-button size="small" type="success" plain @click="syncAccount(row.account)">
            同步
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top:20px;display:flex;justify-content:flex-end;">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchAccounts"
        @current-change="fetchAccounts"
      />
    </div>

    <!-- ========================================== -->
    <!-- 群组列表对话框 -->
    <!-- ========================================== -->
    <el-dialog
      v-model="showGroupsDialog"
      :title="`群组列表 - ${selectedAccount}`"
      width="800px"
      :close-on-click-modal="false"
      @close="closeGroups"
    >
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="color:#999;font-size:13px;">
          共 {{ groupList.length }} 个群组
          <el-tag v-if="groupList.filter(g => g.status === 'active').length > 0" type="success" size="small" style="margin-left:8px;">
            活跃 {{ groupList.filter(g => g.status === 'active').length }}
          </el-tag>
          <el-tag v-if="groupList.filter(g => g.status === 'left').length > 0" type="info" size="small" style="margin-left:4px;">
            已退出 {{ groupList.filter(g => g.status === 'left').length }}
          </el-tag>
        </span>
        <el-button size="small" type="primary" @click="syncAccount(selectedAccount)" :loading="syncing">
          <el-icon><Refresh /></el-icon> 同步
        </el-button>
      </div>

      <el-table :data="groupList" border v-loading="groupLoading" max-height="450">
        <el-table-column prop="groupId" label="群ID" min-width="200" show-overflow-tooltip />
        <el-table-column prop="subject" label="群名称" min-width="150">
          <template #default="{ row }">
            <span v-if="row.subject">{{ row.subject }}</span>
            <span v-else style="color:#999;">未命名</span>
          </template>
        </el-table-column>
        <el-table-column prop="participants" label="成员数" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '🟢 活跃' : '⚪ 已退出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="owner" label="群主" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.owner">{{ row.owner }}</span>
            <span v-else style="color:#999;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="添加时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button size="small" type="danger" plain @click="deleteGroup(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const accounts = ref([])
const filteredAccounts = ref([])
const groupList = ref([])
const groupCache = ref({})
const accountGroups = ref([])
const loading = ref(false)
const groupLoading = ref(false)
const syncing = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const selectedAccount = ref('')
const showGroupsDialog = ref(false)
const searchKeyword = ref('')
const filterGroup = ref('')

// ============ 状态映射 ============
const statusMap = {
  'online': '在线',
  'normal': '在线',
  'logging': '登录中',
  'offline': '离线',
  'banned': '封禁',
  'expired': '过期'
}

const statusTypeMap = {
  'online': 'success',
  'normal': 'success',
  'logging': 'warning',
  'offline': 'info',
  'banned': 'danger',
  'expired': 'danger'
}

const getStatusText = (status) => statusMap[status] || status || '未知'
const getStatusType = (status) => statusTypeMap[status] || 'info'

// ============ 工具函数 ============
const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const getGroupCount = (account) => {
  return groupCache.value[account]?.length || 0
}

// ============ 数据获取 ============
const fetchAccountGroups = async () => {
  try {
    const res = await api.get('/whatsapp/accounts/groups')
    if (res.code === 0) {
      accountGroups.value = res.data || []
    }
  } catch (error) {
    // ignore
  }
}

const fetchAccounts = async () => {
  loading.value = true
  try {
    const res = await whatsapp.getAccounts()
    if (res.code === 0) {
      let data = res.data
      if (data && data.data && Array.isArray(data.data)) {
        data = data.data
      }
      accounts.value = data || []
      applyFilters()
      total.value = filteredAccounts.value.length
    }
  } catch (error) {
    ElMessage.error('获取账号列表失败')
  } finally {
    loading.value = false
  }
}

// ============ 筛选 ============
const applyFilters = () => {
  let list = [...accounts.value]
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(a => a.account.includes(kw))
  }
  if (filterGroup.value) {
    list = list.filter(a => a.group === filterGroup.value)
  }
  filteredAccounts.value = list
}

const handleSearch = () => {
  page.value = 1
  applyFilters()
  total.value = filteredAccounts.value.length
}

// ============ 群组操作 ============
const fetchGroups = async (account) => {
  groupLoading.value = true
  try {
    const res = await api.get('/groups/list', {
      params: { account, page: 1, page_size: 1000 }
    })
    if (res.code === 0) {
      const data = res.data.data || []
      groupList.value = data
      groupCache.value[account] = data
    }
  } catch (error) {
    ElMessage.error('获取群组列表失败')
  } finally {
    groupLoading.value = false
  }
}

const viewGroups = (account) => {
  selectedAccount.value = account
  showGroupsDialog.value = true
  if (groupCache.value[account]) {
    groupList.value = groupCache.value[account]
    fetchGroups(account)
  } else {
    fetchGroups(account)
  }
}

const closeGroups = () => {
  selectedAccount.value = ''
  groupList.value = []
}

const syncAccount = async (account) => {
  syncing.value = true
  try {
    const res = await api.post('/groups/sync', null, {
      params: { account }
    })
    if (res.code === 0) {
      ElMessage.success(`账号 ${account} 同步成功`)
      await fetchGroups(account)
      fetchAccounts()
    }
  } catch (error) {
    ElMessage.error('同步失败: ' + (error.message || ''))
  } finally {
    syncing.value = false
  }
}

const syncAllAccounts = async () => {
  syncing.value = true
  try {
    const accountsToSync = filteredAccounts.value.map(a => a.account)
    let successCount = 0
    for (const acc of accountsToSync) {
      const res = await api.post('/groups/sync', null, { params: { account: acc } })
      if (res.code === 0) successCount++
    }
    ElMessage.success(`同步完成: ${successCount}/${accountsToSync.length} 个账号`)
    fetchAccounts()
    if (selectedAccount.value) {
      fetchGroups(selectedAccount.value)
    }
  } catch (error) {
    ElMessage.error('同步失败: ' + (error.message || ''))
  } finally {
    syncing.value = false
  }
}

const deleteGroup = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除群组 "${row.subject || row.groupId}" 的记录吗？`,
      '提示',
      { type: 'warning' }
    )
    const res = await api.delete(`/groups/${row.id}/delete`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchGroups(selectedAccount.value)
      fetchAccounts()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// ============ 选中 ============
const handleSelectionChange = (selection) => {
  // 预留批量操作
}

// ============ 生命周期 ============
onMounted(() => {
  fetchAccountGroups()
  fetchAccounts()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
</style>