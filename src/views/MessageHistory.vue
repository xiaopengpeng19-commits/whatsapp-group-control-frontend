<template>
  <div class="message-history">
    <el-card>
      <el-form :model="filterForm" inline>
        <!-- ✅ 账号改为输入框 -->
        <el-form-item label="账号">
          <el-input v-model="filterForm.account" placeholder="请输入账号" clearable style="width:200px"
            @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="对方号码">
          <el-input v-model="filterForm.to" placeholder="输入对方号码" clearable @keyup.enter="handleSearch"
            style="width:160px" />
        </el-form-item>
        <el-form-item label="消息类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable @change="handleSearch" style="width:120px">
            <el-option label="文本" value="text" />
            <el-option label="图片" value="image" />
            <el-option label="链接" value="link" />
            <el-option label="视频" value="video" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable @change="handleSearch"
            style="width:120px">
            <el-option label="已发送" value="sent" />
            <el-option label="已送达" value="delivered" />
            <el-option label="已读" value="read" />
            <el-option label="已接收" value="received" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon>
              <Search />
            </el-icon> 搜索
          </el-button>
          <el-button @click="resetFilter">
            <el-icon>
              <RefreshRight />
            </el-icon> 重置
          </el-button>
          <el-button @click="fetchMessages">
            <el-icon>
              <Refresh />
            </el-icon> 刷新
          </el-button>
          <el-button type="danger" plain :disabled="selectedIds.length === 0" @click="handleBatchDelete">
            <el-icon>
              <Delete />
            </el-icon> 批量删除
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-top:20px">
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <div style="font-size:24px;color:#409eff">{{ stats.total }}</div>
            <div style="color:#999;font-size:14px">总消息</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <div style="font-size:24px;color:#67c23a">{{ stats.delivered }}</div>
            <div style="color:#999;font-size:14px">已送达</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <div style="font-size:24px;color:#409eff">{{ stats.read }}</div>
            <div style="color:#999;font-size:14px">已读</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <div style="font-size:24px;color:#f56c6c">{{ stats.failed }}</div>
            <div style="color:#999;font-size:14px">失败</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 消息列表 -->
    <el-card style="margin-top:20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>消息记录</span>
          <span style="color:#999;font-size:14px">共 {{ total }} 条记录</span>
        </div>
      </template>

      <el-table :data="messages" border v-loading="loading" stripe @selection-change="handleSelectionChange"
        size="default">
        <el-table-column type="selection" width="40" />
        <el-table-column type="index" label="#" width="45" />
        <el-table-column prop="account" label="账号" width="130" />
        <el-table-column label="发送方" width="130">
          <template #default="{ row }">
            <span style="font-size:13px;">{{ row.isOutgoing ? row.account : cleanJid(row.from) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="接收方" width="130">
          <template #default="{ row }">
            <span style="font-size:13px;">{{ row.isOutgoing ? row.to : row.account }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span style="font-size:13px;">{{ row.content || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="60" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'text' ? 'info' : row.type === 'image' ? 'success' : 'warning'" size="small">
              {{ row.type === 'text' ? '文本' : row.type === 'image' ? '图片' : '链接' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isOutgoing" label="方向" width="60" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isOutgoing ? 'primary' : 'success'" size="small">
              {{ row.isOutgoing ? '发送' : '接收' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sentAt" label="时间" width="155">
          <template #default="{ row }">
            <span style="font-size:12px;color:#666;">{{ formatTime(row.sentAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="showDetail(row)">详情</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top:20px;display:flex;justify-content:flex-end">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
          :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="fetchMessages"
          @current-change="fetchMessages" />
      </div>
    </el-card>

    <!-- 消息详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="消息详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="消息ID">{{ detailData.messageId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="账号">{{ detailData.account || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发送方">
          {{ detailData.isOutgoing ? detailData.account : cleanJid(detailData.from) }}
        </el-descriptions-item>
        <el-descriptions-item label="接收方">
          {{ detailData.isOutgoing ? detailData.to : detailData.account }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          {{ detailData.type === 'text' ? '文本' : detailData.type === 'image' ? '图片' : '链接' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ getStatusLabel(detailData.status) }}
        </el-descriptions-item>
        <el-descriptions-item label="方向">
          {{ detailData.isOutgoing ? '发送' : '接收' }}
        </el-descriptions-item>
        <el-descriptions-item label="内容" :span="2">
          <div style="word-wrap:break-word;max-height:200px;overflow-y:auto;white-space:pre-wrap">
            {{ detailData.content || '-' }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="发送时间" :span="2">
          {{ formatTime(detailData.sentAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="送达时间" :span="2">
          {{ formatTime(detailData.deliveredAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="已读时间" :span="2">
          {{ formatTime(detailData.readAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshRight, Refresh, Delete } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const messages = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const showDetailDialog = ref(false)
const detailData = ref({})
const selectedIds = ref([])

// ============ 筛选表单 ============
const filterForm = reactive({
  account: '',  // ✅ 改为字符串，不再依赖 accounts 列表
  to: '',
  type: '',
  status: ''
})

// ============ 统计 ============
const stats = computed(() => {
  const data = messages.value
  return {
    total: data.length,
    delivered: data.filter(m => m.status === 'delivered').length,
    read: data.filter(m => m.status === 'read').length,
    failed: data.filter(m => m.status === 'failed').length
  }
})

// ============ 工具函数 ============
const cleanJid = (jid) => {
  if (!jid) return ''
  return jid.split('@')[0]
}

const getStatusType = (status) => {
  const map = {
    sent: 'info',
    delivered: 'success',
    read: 'success',
    failed: 'danger',
    received: 'info'
  }
  return map[status] || ''
}

const getStatusLabel = (status) => {
  const map = {
    sent: '已发送',
    delivered: '已送达',
    read: '已读',
    failed: '失败',
    received: '已接收'
  }
  return map[status] || status
}

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
}

// ==========================================
// 数据获取
// ==========================================
const fetchMessages = async () => {
  if (!filterForm.account) {
    ElMessage.warning('请输入账号')
    return
  }

  loading.value = true
  try {
    const params = {
      account: filterForm.account,
      page: page.value,
      page_size: pageSize.value
    }
    if (filterForm.to) params.to = filterForm.to
    if (filterForm.type) params.type = filterForm.type
    if (filterForm.status) params.status = filterForm.status

    const res = await whatsapp.getMessages(params)
    if (res.code === 0) {
      messages.value = res.data?.data || []
      total.value = res.data?.total || 0
    }
  } catch (error) {
    ElMessage.error('获取消息记录失败')
  } finally {
    loading.value = false
  }
}

// ==========================================
// 搜索/重置
// ==========================================
const handleSearch = () => {
  page.value = 1
  fetchMessages()
}

const resetFilter = () => {
  filterForm.account = ''
  filterForm.to = ''
  filterForm.type = ''
  filterForm.status = ''
  page.value = 1
  messages.value = []
  total.value = 0
}

// ==========================================
// 详情/删除
// ==========================================
const showDetail = (row) => {
  detailData.value = row
  showDetailDialog.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该消息吗？', '提示', { type: 'warning' })
    const res = await whatsapp.deleteMessage(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchMessages()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// ==========================================
// 批量删除
// ==========================================
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 条消息吗？`,
      '提示',
      { type: 'warning' }
    )
    const res = await whatsapp.batchDeleteMessages({ ids: selectedIds.value })
    if (res.code === 0) {
      ElMessage.success(`成功删除 ${res.data.deleted_count} 条消息`)
      selectedIds.value = []
      fetchMessages()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item.id)
}

// ==========================================
// 生命周期
// ==========================================
onMounted(() => {
  // ✅ 不再自动加载，等待用户输入账号后点击搜索
})
</script>

<style scoped>
.message-history .el-form-item {
  margin-bottom: 0;
}
</style>