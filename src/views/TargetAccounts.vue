<template>
  <div class="target-accounts">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon>
            <Plus />
          </el-icon> 添加目标
        </el-button>
        <el-button type="success" @click="showBatchDialog = true">
          <el-icon>
            <DocumentAdd />
          </el-icon> 批量导入
        </el-button>
        <el-button type="warning" plain @click="showBatchGroupDialog = true">
          <el-icon>
            <Folder />
          </el-icon> 批量修改分组
        </el-button>
        <el-button type="danger" :disabled="selectedIds.length === 0" @click="handleBatchDelete">
          <el-icon>
            <Delete />
          </el-icon> 批量删除
        </el-button>
        <el-button type="warning" plain @click="handleExport" :loading="exporting">
          <el-icon>
            <Download />
          </el-icon> 导出
        </el-button>
        <el-button @click="fetchAccounts">
          <el-icon>
            <Refresh />
          </el-icon> 刷新
        </el-button>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <el-select v-model="filterGroup" placeholder="全部分组" clearable @change="fetchAccounts" style="width:140px">
          <el-option v-for="item in groups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
            :value="item.name" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="fetchAccounts" style="width:120px">
          <el-option label="全部" value="" />
          <el-option label="初始化" value="initial" />
          <el-option label="已使用" value="used" />
          <el-option label="已发送" value="sent" />
          <el-option label="已送达" value="delivered" />
          <el-option label="已读" value="read" />
          <el-option label="已回复" value="replied" />
        </el-select>
      </div>
    </div>

    <!-- 状态统计卡片 -->
    <el-row :gutter="20" style="margin-bottom:20px">
      <el-col :span="4" v-for="item in statusStats" :key="item.name">
        <el-card>
          <div style="text-align:center">
            <div style="font-size:24px;color:#409eff">{{ item.count }}</div>
            <div style="color:#999;font-size:14px">{{ getTargetStatusText(item.name) }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 分组统计 -->
    <el-card style="margin-bottom:20px">
      <template #header>
        <span>分组统计</span>
      </template>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div v-for="item in groups" :key="item.name" class="group-stat">
          <el-tag size="large">
            {{ item.name }}: {{ item.count }} 个
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 表格 -->
    <el-table :data="accounts" v-loading="loading" border @selection-change="handleSelectionChange" row-key="id">
      <el-table-column type="selection" width="55" />
      <el-table-column prop="phone" label="目标号码" width="150" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="group" label="分组" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="row.group ? 'primary' : 'info'">
            {{ row.group || '未分组' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getTargetStatusType(row.status)" size="small">
            {{ getTargetStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="usedCount" label="使用次数" width="90" />
      <el-table-column prop="lastUsedAt" label="最后使用" width="170">
        <template #default="{ row }">
          {{ formatTime(row.lastUsedAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="添加时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" plain @click="showEditGroup(row)">
            改分组
          </el-button>
          <el-button size="small" type="success" plain @click="showEditStatus(row)">
            改状态
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top:20px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
        :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="fetchAccounts"
        @current-change="fetchAccounts" />
    </div>

    <!-- ========================================== -->
    <!-- 添加对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showAddDialog" title="添加目标账号" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="手机号" required>
          <el-input v-model="addForm.phone" placeholder="请输入目标手机号" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="addForm.nickname" placeholder="请输入昵称（可选）" />
        </el-form-item>
        <el-form-item label="分组">
          <el-input v-model="addForm.group" placeholder="请输入分组名称（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 批量导入对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showBatchDialog" title="批量导入目标账号" width="600px">
      <el-form :model="batchForm" label-width="80px">
        <el-form-item label="分组">
          <el-input v-model="batchForm.group" placeholder="请输入分组名称（可选）" />
        </el-form-item>
        <el-form-item label="目标列表" required>
          <el-input v-model="batchForm.phonesText" type="textarea" :rows="8" placeholder="每行一个手机号" />
        </el-form-item>
        <el-form-item>
          <span style="color:#999;font-size:12px">
            示例:<br>
            8612345678901<br>
            8612345678902<br>
            8612345678903
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchAdd">导入</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 修改分组对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showEditGroupDialog" title="修改分组" width="400px">
      <el-form :model="editGroupForm" label-width="80px">
        <el-form-item label="目标">
          <span>{{ editGroupForm.phone }}</span>
        </el-form-item>
        <el-form-item label="分组">
          <el-input v-model="editGroupForm.group" placeholder="请输入新分组名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleEditGroup">确定</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 批量修改分组对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showBatchGroupDialog" title="批量修改分组" width="400px">
      <el-form :model="batchGroupForm" label-width="80px">
        <el-form-item label="选中数量">
          <span>{{ selectedIds.length }} 个目标</span>
        </el-form-item>
        <el-form-item label="新分组">
          <el-input v-model="batchGroupForm.group" placeholder="请输入分组名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchGroup">确定</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 修改状态对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showEditStatusDialog" title="修改状态" width="400px">
      <el-form :model="editStatusForm" label-width="80px">
        <el-form-item label="目标">
          <span>{{ editStatusForm.phone }}</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editStatusForm.status" placeholder="请选择状态" style="width:100%">
            <el-option label="初始化" value="initial" />
            <el-option label="已使用" value="used" />
            <el-option label="已发送" value="sent" />
            <el-option label="已送达" value="delivered" />
            <el-option label="已读" value="read" />
            <el-option label="已回复" value="replied" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="handleEditStatus">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, DocumentAdd, Folder, Delete, Refresh, Download } from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const accounts = ref([])
const groups = ref([])
const statusStats = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterGroup = ref('')
const filterStatus = ref('')
const selectedIds = ref([])
const exporting = ref(false)

// ============ 对话框显示 ============
const showAddDialog = ref(false)
const showBatchDialog = ref(false)
const showEditGroupDialog = ref(false)
const showBatchGroupDialog = ref(false)
const showEditStatusDialog = ref(false)

// ============ 表单 ============
const addForm = reactive({
  phone: '',
  nickname: '',
  group: ''
})

const batchForm = reactive({
  phonesText: '',
  group: ''
})

const editGroupForm = reactive({
  id: '',
  phone: '',
  group: ''
})

const batchGroupForm = reactive({
  group: ''
})

const editStatusForm = reactive({
  id: '',
  phone: '',
  status: ''
})

// ============ 状态映射 ============
const targetStatusMap = {
  'initial': '初始化',
  'used': '已使用',
  'sent': '已发送',
  'delivered': '已送达',
  'read': '已读',
  'replied': '已回复'
}

const targetStatusTypeMap = {
  'initial': 'info',
  'used': 'primary',
  'sent': 'warning',
  'delivered': 'success',
  'read': 'success',
  'replied': 'success'
}

const getTargetStatusText = (status) => {
  return targetStatusMap[status] || status
}

const getTargetStatusType = (status) => {
  return targetStatusTypeMap[status] || 'info'
}

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
}

// ============ 数据获取 ============
const fetchGroups = async () => {
  try {
    const res = await api.get('/target/accounts/groups')
    if (res.code === 0) {
      groups.value = res.data || []
    }
  } catch (error) {
    // ignore
  }
}

const fetchStatusStats = async () => {
  try {
    const res = await api.get('/target/accounts/status/stats')
    if (res.code === 0) {
      statusStats.value = res.data || []
    }
  } catch (error) {
    // ignore
  }
}

const fetchAccounts = async () => {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterGroup.value) params.group = filterGroup.value
    if (filterStatus.value) params.status = filterStatus.value
    const res = await api.get('/target/accounts/list', { params })
    if (res.code === 0) {
      accounts.value = res.data.data || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取目标账号列表失败')
  } finally {
    loading.value = false
  }
}

// ============ 导出 ============
const handleExport = async () => {
  exporting.value = true
  try {
    const params = {}
    if (filterGroup.value) params.group = filterGroup.value
    if (filterStatus.value) params.status = filterStatus.value

    const res = await api.get('/target/accounts/export', { params })
    if (res.code === 0) {
      const data = res.data
      const phones = data.phones || []

      if (phones.length === 0) {
        ElMessage.warning('没有符合条件的号码可导出')
        return
      }

      const statusLabel = getTargetStatusText(filterStatus.value) || '全部'
      const groupLabel = filterGroup.value || '全部分组'
      const filename = `目标账号_${groupLabel}_${statusLabel}_${Date.now()}.txt`

      const content = phones.join('\n')
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      ElMessage.success(`已导出 ${phones.length} 个号码`)
    }
  } catch (error) {
    ElMessage.error('导出失败: ' + (error.message || ''))
  } finally {
    exporting.value = false
  }
}

// ============ 添加 ============
const handleAdd = async () => {
  if (!addForm.phone) {
    ElMessage.warning('请输入手机号')
    return
  }
  try {
    const res = await api.post('/target/accounts/add', addForm)
    if (res.code === 0) {
      ElMessage.success('添加成功')
      showAddDialog.value = false
      addForm.phone = ''
      addForm.nickname = ''
      addForm.group = ''
      fetchAccounts()
      fetchGroups()
      fetchStatusStats()
    }
  } catch (error) {
    ElMessage.error('添加失败: ' + (error.message || ''))
  }
}

// ============ 批量导入 ============
const handleBatchAdd = async () => {
  const lines = batchForm.phonesText.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    ElMessage.warning('请输入至少一个手机号')
    return
  }
  try {
    const res = await api.post('/target/accounts/batch/add', {
      accounts: lines,
      group: batchForm.group
    })
    if (res.code === 0) {
      const result = res.data
      let msg = `成功导入 ${result.success_count} 个`
      if (result.duplicate_count > 0) {
        msg += `，跳过 ${result.duplicate_count} 个重复`
      }
      if (result.errors && result.errors.length > 0) {
        msg += `，失败: ${result.errors.join('; ')}`
      }
      ElMessage.success(msg)
      showBatchDialog.value = false
      batchForm.phonesText = ''
      batchForm.group = ''
      fetchAccounts()
      fetchGroups()
      fetchStatusStats()
    }
  } catch (error) {
    ElMessage.error('批量导入失败: ' + (error.message || ''))
  }
}

// ============ 删除 ============
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除目标 ${row.phone} 吗？`, '提示', { type: 'warning' })
    const res = await api.delete(`/target/accounts/${row.id}/delete`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchAccounts()
      fetchGroups()
      fetchStatusStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 个目标吗？`, '提示', { type: 'warning' })
    const res = await api.post('/target/accounts/batch/delete', { ids: selectedIds.value })
    if (res.code === 0) {
      ElMessage.success(`成功删除 ${res.data.deleted_count} 个`)
      selectedIds.value = []
      fetchAccounts()
      fetchGroups()
      fetchStatusStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

// ============ 修改分组 ============
const showEditGroup = (row) => {
  editGroupForm.id = row.id
  editGroupForm.phone = row.phone
  editGroupForm.group = row.group || ''
  showEditGroupDialog.value = true
}

const handleEditGroup = async () => {
  try {
    const res = await api.put(`/target/accounts/${editGroupForm.id}/group`, {
      group: editGroupForm.group
    })
    if (res.code === 0) {
      ElMessage.success('分组更新成功')
      showEditGroupDialog.value = false
      fetchAccounts()
      fetchGroups()
    }
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.message || ''))
  }
}

// ============ 批量修改分组 ============
const handleBatchGroup = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择目标')
    return
  }
  if (!batchGroupForm.group) {
    ElMessage.warning('请输入分组名称')
    return
  }
  try {
    const res = await api.post('/target/accounts/batch/group', {
      ids: selectedIds.value,
      group: batchGroupForm.group
    })
    if (res.code === 0) {
      ElMessage.success(`成功更新 ${res.data.success_count} 个目标的分组`)
      showBatchGroupDialog.value = false
      batchGroupForm.group = ''
      selectedIds.value = []
      fetchAccounts()
      fetchGroups()
    }
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.message || ''))
  }
}

// ============ 修改状态 ============
const showEditStatus = (row) => {
  editStatusForm.id = row.id
  editStatusForm.phone = row.phone
  editStatusForm.status = row.status || 'initial'
  showEditStatusDialog.value = true
}

const handleEditStatus = async () => {
  try {
    const res = await api.put(`/target/accounts/${editStatusForm.id}/status`, {
      status: editStatusForm.status
    })
    if (res.code === 0) {
      ElMessage.success('状态更新成功')
      showEditStatusDialog.value = false
      fetchAccounts()
      fetchStatusStats()
    }
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.message || ''))
  }
}

// ============ 选中处理 ============
const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item.id)
}

// ============ 生命周期 ============
onMounted(() => {
  fetchGroups()
  fetchStatusStats()
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

.group-stat {
  padding: 4px 0;
}
</style>