<template>
  <div class="groups">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <!-- 账号筛选 -->
        <el-select v-model="filterAccount" placeholder="全部账号" clearable @change="fetchGroups" style="width:180px">
          <el-option label="全部账号" value="" />
          <el-option
            v-for="acc in accountList"
            :key="acc"
            :label="acc"
            :value="acc"
          />
        </el-select>

        <!-- 状态筛选 -->
        <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="fetchGroups" style="width:120px">
          <el-option label="全部" value="" />
          <el-option label="活跃" value="active" />
          <el-option label="已退出" value="left" />
        </el-select>

        <el-button type="primary" @click="showSyncDialog = true">
          <el-icon><Refresh /></el-icon> 同步群组
        </el-button>
        <el-button @click="fetchGroups">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom:20px;">
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:#ecf5ff;display:flex;align-items:center;justify-content:center;color:#409eff;font-size:24px;">
              <el-icon><Connection /></el-icon>
            </div>
            <div>
              <div style="font-size:24px;font-weight:600;color:#333;">{{ total }}</div>
              <div style="color:#999;font-size:14px;">总群组</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:#f0f9eb;display:flex;align-items:center;justify-content:center;color:#67c23a;font-size:24px;">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div>
              <div style="font-size:24px;font-weight:600;color:#333;">{{ activeCount }}</div>
              <div style="color:#999;font-size:14px;">活跃群组</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:#fef0f0;display:flex;align-items:center;justify-content:center;color:#f56c6c;font-size:24px;">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div>
              <div style="font-size:24px;font-weight:600;color:#333;">{{ leftCount }}</div>
              <div style="color:#999;font-size:14px;">已退出</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;border-radius:12px;background:#fdf6ec;display:flex;align-items:center;justify-content:center;color:#e6a23c;font-size:24px;">
              <el-icon><User /></el-icon>
            </div>
            <div>
              <div style="font-size:24px;font-weight:600;color:#333;">{{ accountCount }}</div>
              <div style="color:#999;font-size:14px;">涉及账号</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 群组列表 -->
    <el-table :data="groups" v-loading="loading" border stripe>
      <el-table-column prop="groupId" label="群ID" min-width="200" show-overflow-tooltip />
      <el-table-column prop="account" label="所属账号" width="140" />
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
      <el-table-column label="操作" width="100" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" type="danger" plain @click="handleDelete(row)">
            删除
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
        @size-change="fetchGroups"
        @current-change="fetchGroups"
      />
    </div>

    <!-- 同步对话框 -->
    <el-dialog v-model="showSyncDialog" title="同步群组" width="500px" :close-on-click-modal="false">
      <el-form :model="syncForm" label-width="80px">
        <el-form-item label="选择账号" required>
          <el-select v-model="syncForm.account" placeholder="请选择要同步的账号" style="width:100%">
            <el-option
              v-for="acc in accountList"
              :key="acc"
              :label="acc"
              :value="acc"
            />
          </el-select>
          <div style="font-size:12px;color:#999;margin-top:4px;">
            从 WhatsApp 实时拉取该账号的所有群组
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSyncDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSyncConfirm" :loading="syncing">
          {{ syncing ? '同步中...' : '同步' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Connection, CircleCheck, CircleClose, User } from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'

const groups = ref([])
const accountList = ref([])
const loading = ref(false)
const syncing = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filterAccount = ref('')
const filterStatus = ref('')
const showSyncDialog = ref(false)

const syncForm = reactive({
  account: ''
})

const activeCount = computed(() => {
  return groups.value.filter(g => g.status === 'active').length
})

const leftCount = computed(() => {
  return groups.value.filter(g => g.status === 'left').length
})

const accountCount = computed(() => {
  const accs = new Set(groups.value.map(g => g.account))
  return accs.size
})

const fetchAccountList = async () => {
  try {
    const res = await api.get('/groups/accounts')
    if (res.code === 0) {
      accountList.value = res.data || []
    }
  } catch (error) {
    // ignore
  }
}

const fetchGroups = async () => {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterAccount.value) params.account = filterAccount.value
    if (filterStatus.value) params.status = filterStatus.value
    const res = await api.get('/groups/list', { params })
    if (res.code === 0) {
      groups.value = res.data.data || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取群组列表失败')
  } finally {
    loading.value = false
  }
}

const handleSyncConfirm = async () => {
  if (!syncForm.account) {
    ElMessage.warning('请选择账号')
    return
  }
  syncing.value = true
  try {
    const res = await api.post('/groups/sync', null, {
      params: { account: syncForm.account }
    })
    if (res.code === 0) {
      ElMessage.success(`账号 ${syncForm.account} 同步成功`)
      showSyncDialog.value = false
      fetchGroups()
      fetchAccountList()
    }
  } catch (error) {
    ElMessage.error('同步失败: ' + (error.message || ''))
  } finally {
    syncing.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除群组 "${row.subject || row.groupId}" 的记录吗？`, '提示', { type: 'warning' })
    const res = await api.delete(`/groups/${row.id}/delete`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchGroups()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  fetchAccountList()
  fetchGroups()
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

.groups .el-card {
  border-radius: 12px;
}
</style>