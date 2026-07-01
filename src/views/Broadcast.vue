<template>
  <div class="broadcast">
    <!-- 创建任务按钮 -->
    <div class="toolbar">
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon> 创建群发任务
      </el-button>
      <el-button @click="fetchTasks">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
      <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="fetchTasks" style="width:120px;margin-left:10px">
        <el-option label="全部" value="" />
        <el-option label="待执行" value="pending" />
        <el-option label="执行中" value="running" />
        <el-option label="已完成" value="completed" />
        <el-option label="已暂停" value="paused" />
        <el-option label="失败" value="failed" />
      </el-select>
    </div>

    <!-- 任务列表 -->
    <el-table :data="tasks" v-loading="loading" border>
      <el-table-column prop="name" label="任务名称" width="150" />
      <el-table-column prop="accountGroup" label="账号分组" width="120" />
      <el-table-column prop="targetGroup" label="目标分组" width="120" />
      <el-table-column prop="messageType" label="消息类型" width="80">
        <template #default="{ row }">
          <el-tag :type="row.messageType === 'text' ? 'info' : 'warning'" size="small">
            {{ row.messageType === 'text' ? '文本' : '链接' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="totalTargets" label="总数" width="70" />
      <el-table-column label="进度" width="200">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px;">
            <el-progress 
              :percentage="getProgress(row)" 
              :color="getProgressColor(row)"
              :stroke-width="8"
              style="flex:1"
            />
            <span style="font-size:12px;color:#999;white-space:nowrap;">
              {{ row.sentCount }}/{{ row.totalTargets }}
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="showTaskDetail(row)">
            详情
          </el-button>
          <el-button 
            v-if="row.status === 'pending' || row.status === 'paused'"
            size="small" 
            type="success" 
            @click="handleStart(row)"
          >
            执行
          </el-button>
          <el-button 
            v-if="row.status === 'running'"
            size="small" 
            type="warning" 
            @click="handlePause(row)"
          >
            暂停
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top:20px;display:flex;justify-content:flex-end">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchTasks"
        @current-change="fetchTasks"
      />
    </div>

    <!-- 创建任务对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建群发任务" width="650px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="140px" ref="createFormRef">
        <el-form-item label="任务名称" required>
          <el-input v-model="createForm.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="账号分组" required>
          <el-select v-model="createForm.accountGroup" placeholder="选择账号分组" style="width:100%">
            <el-option
              v-for="item in accountGroups"
              :key="item.name"
              :label="item.name + ' (' + item.count + '个)'"
              :value="item.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标分组" required>
          <el-select v-model="createForm.targetGroup" placeholder="选择目标分组" style="width:100%">
            <el-option
              v-for="item in targetGroups"
              :key="item.name"
              :label="item.name + ' (' + item.count + '个)'"
              :value="item.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="单账号发送数量">
          <el-input-number v-model="createForm.perAccountLimit" :min="1" :max="100" style="width:100%" />
          <span style="color:#999;font-size:12px;margin-left:8px;">每个账号发送的目标数</span>
        </el-form-item>
        <el-form-item label="并发数量">
          <el-input-number v-model="createForm.concurrencyLimit" :min="1" :max="20" style="width:100%" />
          <span style="color:#999;font-size:12px;margin-left:8px;">同时执行的账号数</span>
        </el-form-item>
        <el-form-item label="消息类型" required>
          <el-radio-group v-model="createForm.messageType">
            <el-radio-button value="text">文本</el-radio-button>
            <el-radio-button value="link">链接</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="createForm.messageType === 'text'" label="消息内容" required>
          <el-input
            v-model="createForm.messageContent"
            type="textarea"
            :rows="3"
            placeholder="请输入消息内容"
          />
        </el-form-item>
        <template v-if="createForm.messageType === 'link'">
          <el-form-item label="链接标题" required>
            <el-input v-model="createForm.linkTitle" placeholder="请输入链接标题" />
          </el-form-item>
          <el-form-item label="链接描述" required>
            <el-input v-model="createForm.linkBody" type="textarea" :rows="2" placeholder="请输入链接描述" />
          </el-form-item>
          <el-form-item label="链接地址" required>
            <el-input v-model="createForm.linkUrl" placeholder="请输入链接URL" />
          </el-form-item>
          <el-form-item label="图片URL">
            <el-input v-model="createForm.linkImage" placeholder="请输入图片URL（可选）" />
          </el-form-item>
          <el-form-item label="按钮文字">
            <el-input v-model="createForm.linkButton" placeholder="请输入按钮文字（可选）" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">创建</el-button>
      </template>
    </el-dialog>

    <!-- 任务详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="任务详情" width="800px">
      <div v-if="detailTask">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="任务名称">{{ detailTask.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(detailTask.status)" size="small">
              {{ getStatusLabel(detailTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="消息类型">
            {{ detailTask.messageType === 'text' ? '文本' : '链接' }}
          </el-descriptions-item>
          <el-descriptions-item label="账号分组">{{ detailTask.accountGroup }}</el-descriptions-item>
          <el-descriptions-item label="目标分组">{{ detailTask.targetGroup }}</el-descriptions-item>
          <el-descriptions-item label="并发数">{{ detailTask.concurrencyLimit }}</el-descriptions-item>
          <el-descriptions-item label="总数">{{ detailTask.totalTargets }}</el-descriptions-item>
          <el-descriptions-item label="已发送">{{ detailTask.sentCount }}</el-descriptions-item>
          <el-descriptions-item label="已送达">{{ detailTask.deliveredCount }}</el-descriptions-item>
          <el-descriptions-item label="已读">{{ detailTask.readCount }}</el-descriptions-item>
          <el-descriptions-item label="失败">{{ detailTask.failedCount }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(detailTask.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span style="font-weight:bold;">子任务列表</span>
            <el-select v-model="subFilterStatus" placeholder="全部状态" clearable @change="fetchSubTasks" style="width:120px">
              <el-option label="全部" value="" />
              <el-option label="待执行" value="pending" />
              <el-option label="已发送" value="sent" />
              <el-option label="已送达" value="delivered" />
              <el-option label="已读" value="read" />
              <el-option label="失败" value="failed" />
            </el-select>
          </div>
          <el-table :data="subTasks" v-loading="subLoading" border size="small">
            <el-table-column prop="account" label="账号" width="130" />
            <el-table-column prop="targetPhone" label="目标号码" width="130" />
            <el-table-column prop="targetName" label="目标名称" width="100" />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="getSubStatusType(row.status)" size="small">
                  {{ getSubStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="errorMsg" label="错误信息" min-width="150" show-overflow-tooltip />
            <el-table-column prop="sentAt" label="发送时间" width="150">
              <template #default="{ row }">
                {{ formatTime(row.sentAt) }}
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top:10px;display:flex;justify-content:flex-end">
            <el-pagination
              v-model:current-page="subPage"
              v-model:page-size="subPageSize"
              :page-sizes="[10, 20, 50]"
              :total="subTotal"
              layout="total, sizes, prev, pager, next"
              small
              @size-change="fetchSubTasks"
              @current-change="fetchSubTasks"
            />
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'

const tasks = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')

const accountGroups = ref([])
const targetGroups = ref([])

const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref()

const createForm = reactive({
  name: '',
  accountGroup: '',
  targetGroup: '',
  perAccountLimit: 10,
  concurrencyLimit: 2,
  messageType: 'text',
  messageContent: '',
  linkTitle: '',
  linkBody: '',
  linkUrl: '',
  linkImage: '',
  linkButton: '查看详情'
})

const showDetailDialog = ref(false)
const detailTask = ref(null)
const subTasks = ref([])
const subLoading = ref(false)
const subTotal = ref(0)
const subPage = ref(1)
const subPageSize = ref(20)
const subFilterStatus = ref('')

const getStatusType = (status) => {
  const map = {
    pending: 'info',
    running: 'warning',
    completed: 'success',
    paused: 'warning',
    failed: 'danger'
  }
  return map[status] || 'info'
}

const getStatusLabel = (status) => {
  const map = {
    pending: '待执行',
    running: '执行中',
    completed: '已完成',
    paused: '已暂停',
    failed: '失败'
  }
  return map[status] || status
}

const getProgress = (row) => {
  if (row.totalTargets === 0) return 0
  return Math.round((row.sentCount / row.totalTargets) * 100)
}

const getProgressColor = (row) => {
  const p = getProgress(row)
  if (p === 100) return '#67c23a'
  if (p > 50) return '#409eff'
  return '#e6a23c'
}

const getSubStatusType = (status) => {
  const map = {
    pending: 'info',
    sent: 'warning',
    delivered: 'success',
    read: 'success',
    failed: 'danger'
  }
  return map[status] || 'info'
}

const getSubStatusLabel = (status) => {
  const map = {
    pending: '待执行',
    sent: '已发送',
    delivered: '已送达',
    read: '已读',
    failed: '失败'
  }
  return map[status] || status
}

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
}

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

const fetchTargetGroups = async () => {
  try {
    const res = await api.get('/target/accounts/groups')
    if (res.code === 0) {
      targetGroups.value = res.data || []
    }
  } catch (error) {
    // ignore
  }
}

const fetchTasks = async () => {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await api.get('/broadcast/tasks', { params })
    if (res.code === 0) {
      tasks.value = res.data.data || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取任务列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  // 简单校验
  if (!createForm.name) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (!createForm.accountGroup) {
    ElMessage.warning('请选择账号分组')
    return
  }
  if (!createForm.targetGroup) {
    ElMessage.warning('请选择目标分组')
    return
  }
  if (createForm.messageType === 'text' && !createForm.messageContent) {
    ElMessage.warning('请输入消息内容')
    return
  }
  if (createForm.messageType === 'link' && !createForm.linkUrl) {
    ElMessage.warning('请输入链接地址')
    return
  }

  creating.value = true
  try {
    const res = await api.post('/broadcast/tasks', createForm)
    if (res.code === 0) {
      ElMessage.success(`任务创建成功，已分配 ${res.data.sub_task_count} 个子任务`)
      showCreateDialog.value = false
      createForm.name = ''
      createForm.messageContent = ''
      fetchTasks()
    }
  } catch (error) {
    ElMessage.error('创建失败: ' + (error.message || ''))
  } finally {
    creating.value = false
  }
}

const showTaskDetail = async (row) => {
  showDetailDialog.value = true
  detailTask.value = row
  subPage.value = 1
  await fetchSubTasks()
}

const fetchSubTasks = async () => {
  if (!detailTask.value) return
  subLoading.value = true
  try {
    const params = {
      page: subPage.value,
      page_size: subPageSize.value
    }
    if (subFilterStatus.value) params.status = subFilterStatus.value
    const res = await api.get(`/broadcast/tasks/${detailTask.value.id}/subtasks`, { params })
    if (res.code === 0) {
      subTasks.value = res.data.data || []
      subTotal.value = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取子任务失败')
  } finally {
    subLoading.value = false
  }
}

const handleStart = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要执行任务 "${row.name}" 吗？`, '提示', { type: 'info' })
    const res = await api.post(`/broadcast/tasks/${row.id}/start`)
    if (res.code === 0) {
      ElMessage.success('任务已启动')
      fetchTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('启动失败')
    }
  }
}

const handlePause = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要暂停任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res = await api.post(`/broadcast/tasks/${row.id}/pause`)
    if (res.code === 0) {
      ElMessage.success('任务已暂停')
      fetchTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('暂停失败')
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res = await api.delete(`/broadcast/tasks/${row.id}`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchAccountGroups()
  fetchTargetGroups()
  fetchTasks()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
