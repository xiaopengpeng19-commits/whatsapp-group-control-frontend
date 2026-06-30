<template>
  <div class="accounts">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon> 添加账号
        </el-button>
        <el-button type="warning" plain @click="showBatchGroupDialog = true">
          <el-icon><Folder /></el-icon> 批量修改分组
        </el-button>
        <el-button @click="fetchAccounts">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <el-select v-model="filterGroup" placeholder="全部分组" clearable @change="fetchAccounts" style="width:160px">
          <el-option label="全部分组" value="" />
          <el-option
            v-for="item in accountGroups"
            :key="item.name"
            :label="item.name + ' (' + item.count + '个)'"
            :value="item.name"
          />
        </el-select>
      </div>
    </div>

    <!-- 分组统计 -->
    <el-card style="margin-bottom:20px">
      <template #header>
        <span>账号分组统计</span>
      </template>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div v-for="item in accountGroups" :key="item.name" class="group-stat">
          <el-tag size="large">
            {{ item.name }}: {{ item.count }} 个
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 账号列表 -->
    <el-table :data="accounts" v-loading="loading" border>
      <el-table-column type="selection" width="55" />
      <el-table-column prop="account" label="账号" width="150" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="group" label="账号分组" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="row.group ? 'primary' : 'info'">
            {{ row.group || '未分组' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="proxyGroup" label="代理分组" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="row.proxyGroup ? 'primary' : 'info'">
            {{ row.proxyGroup || '未分配' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="proxy" label="代理IP" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.proxy" style="font-size:12px;font-family:monospace;">
            {{ row.proxy }}
          </span>
          <span v-else style="color:#999;font-size:12px;">未分配</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'online' ? 'success' : 'info'" size="small">
            {{ row.status === 'online' ? '在线' : '离线' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isLogin" label="登录" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isLogin ? 'success' : 'danger'" size="small">
            {{ row.isLogin ? '已登录' : '未登录' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="380" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status !== 'online'"
            size="small"
            type="primary"
            @click="handleOnline(row.account)"
          >
            上线
          </el-button>
          <el-button
            v-else
            size="small"
            type="warning"
            @click="handleOffline(row.account)"
          >
            下线
          </el-button>
          <el-button size="small" type="info" @click="showQRCode(row)">
            二维码
          </el-button>
          <el-button size="small" type="primary" plain @click="showEditGroup(row)">
            改分组
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row.account)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加账号对话框 -->
    <el-dialog v-model="showAddDialog" title="添加账号" width="500px">
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="手机号">
          <el-input v-model="addForm.account" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="addForm.nickname" placeholder="请输入昵称（可选）" />
        </el-form-item>
        <el-form-item label="账号分组">
          <el-input v-model="addForm.group" placeholder="请输入分组名称（可选）" />
        </el-form-item>
        <el-form-item label="代理分组">
          <el-select v-model="addForm.proxyGroup" placeholder="选择代理分组（可选）" clearable style="width:100%">
            <el-option
              v-for="item in proxyGroups"
              :key="item.name"
              :label="item.name + ' (' + item.count + '个)'"
              :value="item.name"
            />
          </el-select>
          <div style="font-size:12px;color:#999;margin-top:4px;">
            选择后自动分配该分组中使用最少的代理IP
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 修改分组对话框 -->
    <el-dialog v-model="showEditGroupDialog" title="修改分组" width="400px">
      <el-form :model="editGroupForm" label-width="80px">
        <el-form-item label="账号">
          <span>{{ editGroupForm.account }}</span>
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

    <!-- 批量修改分组对话框 -->
    <el-dialog v-model="showBatchGroupDialog" title="批量修改分组" width="400px">
      <el-form :model="batchGroupForm" label-width="80px">
        <el-form-item label="选中数量">
          <span>{{ selectedAccounts.length }} 个账号</span>
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

    <!-- 二维码对话框 -->
    <el-dialog v-model="showQRDialog" title="扫码登录" width="450px" :close-on-click-modal="false">
      <div class="qr-container" v-loading="qrLoading">
        <div v-if="qrCode" class="qr-image-wrapper">
          <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrCode)" alt="二维码" />
          <p class="qr-tip">请使用 WhatsApp 扫描二维码登录</p>
        </div>
        <div v-else-if="!qrLoading" class="qr-empty">
          <el-icon :size="48"><Picture /></el-icon>
          <p>暂无二维码</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Folder, Picture } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import api from '@/api'

const accounts = ref([])
const accountGroups = ref([])
const proxyGroups = ref([])
const loading = ref(false)
const qrLoading = ref(false)
const selectedAccounts = ref([])

const showAddDialog = ref(false)
const showEditGroupDialog = ref(false)
const showBatchGroupDialog = ref(false)
const showQRDialog = ref(false)

const filterGroup = ref('')
const qrCode = ref('')

const addForm = reactive({
  account: '',
  nickname: '',
  group: '',
  proxyGroup: ''
})

const editGroupForm = reactive({
  account: '',
  group: ''
})

const batchGroupForm = reactive({
  group: ''
})

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

const fetchProxyGroups = async () => {
  try {
    const res = await api.get('/proxies/groups')
    if (res.code === 0) {
      proxyGroups.value = res.data || []
    }
  } catch (error) {
    // ignore
  }
}

const fetchAccounts = async () => {
  loading.value = true
  try {
    let params = {}
    if (filterGroup.value) {
      params.group = filterGroup.value
    }
    const res = await api.get('/whatsapp/accounts/list', { params })
    if (res.code === 0) {
      accounts.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('获取账号列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = async () => {
  if (!addForm.account) {
    ElMessage.warning('请输入手机号')
    return
  }
  try {
    const res = await whatsapp.addAccount({
      account: addForm.account,
      nickname: addForm.nickname,
      group: addForm.group,
      proxyGroup: addForm.proxyGroup
    })
    if (res.code === 0) {
      const msg = res.data.proxy ? '已分配代理: ' + res.data.proxy : '未分配代理'
      ElMessage.success('添加成功，' + msg)
      showAddDialog.value = false
      addForm.account = ''
      addForm.nickname = ''
      addForm.group = ''
      addForm.proxyGroup = ''
      fetchAccounts()
      fetchAccountGroups()
    }
  } catch (error) {
    ElMessage.error('添加失败: ' + (error.message || ''))
  }
}

const handleDelete = async (account) => {
  try {
    await ElMessageBox.confirm(`确定要删除账号 ${account} 吗？`, '提示', {
      type: 'warning'
    })
    const res = await whatsapp.deleteAccount(account)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchAccounts()
      fetchAccountGroups()
    }
  } catch {
    // cancelled
  }
}

const handleOnline = async (account) => {
  try {
    const res = await whatsapp.online(account)
    if (res.code === 0) {
      ElMessage.success('上线成功')
      fetchAccounts()
    }
  } catch (error) {
    ElMessage.error('上线失败')
  }
}

const handleOffline = async (account) => {
  try {
    const res = await whatsapp.offline(account)
    if (res.code === 0) {
      ElMessage.success('下线成功')
      fetchAccounts()
    }
  } catch (error) {
    ElMessage.error('下线失败')
  }
}

const showQRCode = async (row) => {
  showQRDialog.value = true
  qrCode.value = ''
  qrLoading.value = true

  try {
    const res = await whatsapp.getQRCodeLogin(row.account, {
      proxy: row.proxy || '',
      callbackurl: ''
    })

    if (res.code === 0 && res.data?.qrCode) {
      qrCode.value = res.data.qrCode
    } else {
      ElMessage.warning('二维码生成中，请稍后重试')
    }
  } catch (error) {
    ElMessage.error('获取二维码失败: ' + (error.message || ''))
  } finally {
    qrLoading.value = false
  }
}

const showEditGroup = (row) => {
  editGroupForm.account = row.account
  editGroupForm.group = row.group || ''
  showEditGroupDialog.value = true
}

const handleEditGroup = async () => {
  try {
    const res = await api.put('/whatsapp/accounts/' + editGroupForm.account + '/group', {
      group: editGroupForm.group
    })
    if (res.code === 0) {
      ElMessage.success('分组更新成功')
      showEditGroupDialog.value = false
      fetchAccounts()
      fetchAccountGroups()
    }
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.message || ''))
  }
}

const handleBatchGroup = async () => {
  if (selectedAccounts.value.length === 0) {
    ElMessage.warning('请先选择账号')
    return
  }
  if (!batchGroupForm.group) {
    ElMessage.warning('请输入分组名称')
    return
  }
  try {
    const res = await api.post('/whatsapp/accounts/batch/group', {
      accounts: selectedAccounts.value,
      group: batchGroupForm.group
    })
    if (res.code === 0) {
      ElMessage.success('成功更新 ' + res.data.success_count + ' 个账号的分组')
      showBatchGroupDialog.value = false
      batchGroupForm.group = ''
      selectedAccounts.value = []
      fetchAccounts()
      fetchAccountGroups()
    }
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.message || ''))
  }
}

const handleSelectionChange = (selection) => {
  selectedAccounts.value = selection.map(item => item.account)
}

onMounted(() => {
  fetchAccountGroups()
  fetchProxyGroups()
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
.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 250px;
  padding: 20px 0;
}
.qr-image-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.qr-container img {
  width: 250px;
  height: 250px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
}
.qr-tip {
  color: #999;
  font-size: 14px;
}
.qr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #999;
}
.qr-empty .el-icon {
  font-size: 48px;
}
</style>
