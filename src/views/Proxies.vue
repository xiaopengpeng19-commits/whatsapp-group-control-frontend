<template>
  <div class="proxies">
    <!-- 工具栏 -->
    <el-card>
      <div class="toolbar">
        <div>
          <el-button type="primary" @click="showAddDialog = true">
            <el-icon><Plus /></el-icon> 添加代理
          </el-button>
          <el-button type="success" @click="showBatchDialog = true">
            <el-icon><DocumentAdd /></el-icon> 批量导入
          </el-button>
          <el-button type="danger" :disabled="selectedIds.length === 0" @click="handleBatchDelete">
            <el-icon><Delete /></el-icon> 批量删除
          </el-button>
          <el-button @click="fetchProxies">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
        <div>
          <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="fetchProxies" style="width:120px">
            <el-option label="全部" value="" />
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 统计 -->
    <el-row :gutter="20" style="margin-top:20px">
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <div style="font-size:24px;color:#409eff">{{ stats.total }}</div>
            <div style="color:#999;font-size:14px">总代理</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <div style="font-size:24px;color:#67c23a">{{ stats.active }}</div>
            <div style="color:#999;font-size:14px">启用</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <div style="font-size:24px;color:#909399">{{ stats.inactive }}</div>
            <div style="color:#999;font-size:14px">停用</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div style="text-align:center">
            <div style="font-size:24px;color:#e6a23c">{{ totalUsed }}</div>
            <div style="color:#999;font-size:14px">总使用次数</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 代理列表 -->
    <el-card style="margin-top:20px">
      <el-table 
        :data="proxies" 
        border 
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="proxyType" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.proxyType === 'socks5' ? 'warning' : 'primary'" size="small">
              {{ row.proxyType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="host" label="IP" width="140" />
        <el-table-column prop="port" label="端口" width="80" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="proxyUrl" label="代理地址" min-width="250" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="usedCount" label="使用次数" width="90" />
        <el-table-column prop="createdAt" label="添加时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'active' ? '停用' : '启用' }}
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
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchProxies"
          @current-change="fetchProxies"
        />
      </div>
    </el-card>

    <!-- 添加代理对话框 -->
    <el-dialog v-model="showAddDialog" title="添加代理" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="代理地址">
          <el-input 
            v-model="addForm.proxyUrl" 
            placeholder="socks5://user:pass@ip:port 或 http://user:pass@ip:port"
          />
        </el-form-item>
        <el-form-item>
          <span style="color:#999;font-size:12px">
            支持格式: socks5://user:pass@ip:port 或 http://user:pass@ip:port
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showBatchDialog" title="批量导入代理" width="600px">
      <el-form :model="batchForm" label-width="80px">
        <el-form-item label="代理列表">
          <el-input
            v-model="batchForm.proxiesText"
            type="textarea"
            :rows="10"
            placeholder="每行一个代理，格式: socks5://user:pass@ip:port"
          />
        </el-form-item>
        <el-form-item>
          <span style="color:#999;font-size:12px">
            示例:<br>
            socks5://user1:pass1@1.2.3.4:1080<br>
            http://user2:pass2@5.6.7.8:8080<br>
            socks5://user3:pass3@9.10.11.12:1080
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchAdd">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, DocumentAdd, Delete, Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import api from '@/api'

const proxies = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const selectedIds = ref([])

const showAddDialog = ref(false)
const showBatchDialog = ref(false)

const addForm = reactive({
  proxyUrl: ''
})

const batchForm = reactive({
  proxiesText: ''
})

const stats = computed(() => {
  const data = proxies.value
  return {
    total: data.length,
    active: data.filter(p => p.status === 'active').length,
    inactive: data.filter(p => p.status === 'inactive').length
  }
})

const totalUsed = computed(() => {
  return proxies.value.reduce((sum, p) => sum + (p.usedCount || 0), 0)
})

const fetchProxies = async () => {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await api.get('/proxies/list', { params })
    if (res.code === 0) {
      proxies.value = res.data.data || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取代理列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = async () => {
  if (!addForm.proxyUrl) {
    ElMessage.warning('请输入代理地址')
    return
  }
  try {
    const res = await api.post('/proxies/add', { proxyUrl: addForm.proxyUrl })
    if (res.code === 0) {
      ElMessage.success('添加成功')
      showAddDialog.value = false
      addForm.proxyUrl = ''
      fetchProxies()
    }
  } catch (error) {
    ElMessage.error('添加失败: ' + (error.message || ''))
  }
}

const handleBatchAdd = async () => {
  const lines = batchForm.proxiesText.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    ElMessage.warning('请输入至少一个代理')
    return
  }
  try {
    const res = await api.post('/proxies/batch/add', { proxies: lines })
    if (res.code === 0) {
      const result = res.data
      if (result.errors && result.errors.length > 0) {
        ElMessage.warning('成功导入 ' + result.success_count + '/' + result.total + ' 个，失败: ' + result.errors.join('; '))
      } else {
        ElMessage.success('成功导入 ' + result.success_count + ' 个代理')
      }
      showBatchDialog.value = false
      batchForm.proxiesText = ''
      fetchProxies()
    }
  } catch (error) {
    ElMessage.error('批量导入失败: ' + (error.message || ''))
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除代理 ' + row.host + ':' + row.port + ' 吗？', '提示', { type: 'warning' })
    const res = await api.delete('/proxies/' + row.id + '/delete')
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchProxies()
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
    await ElMessageBox.confirm('确定要删除选中的 ' + selectedIds.value.length + ' 个代理吗？', '提示', { type: 'warning' })
    const res = await api.post('/proxies/batch/delete', { ids: selectedIds.value })
    if (res.code === 0) {
      ElMessage.success('成功删除 ' + res.data.deleted_count + ' 个代理')
      selectedIds.value = []
      fetchProxies()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const handleToggleStatus = async (row) => {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  try {
    const res = await api.put('/proxies/' + row.id + '/status', { status: newStatus })
    if (res.code === 0) {
      ElMessage.success(newStatus === 'active' ? '已启用' : '已停用')
      fetchProxies()
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item.id)
}

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
}

onMounted(() => {
  fetchProxies()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
