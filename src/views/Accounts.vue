<template>
  <div class="accounts">
    <div class="toolbar">
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon> 添加账号
      </el-button>
      <el-button @click="fetchAccounts">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <el-table :data="accounts" v-loading="loading" border>
      <el-table-column prop="account" label="账号" width="150" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="proxyGroup" label="代理分组" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="row.proxyGroup ? 'primary' : 'info'">
            {{ row.proxyGroup || '未分配' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="proxy" label="代理IP" min-width="250" show-overflow-tooltip>
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
      <el-table-column label="操作" width="320" fixed="right">
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
          <el-button size="small" type="info" @click="showQRCode(row.account)">
            二维码
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

    <!-- 二维码对话框 -->
    <el-dialog v-model="showQRDialog" title="扫码登录" width="400px">
      <div class="qr-container">
        <img v-if="qrCode" :src="qrCode" alt="二维码" />
        <div v-else class="qr-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <p class="qr-tip">请使用 WhatsApp 扫描二维码</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Loading } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import api from '@/api'

const accounts = ref([])
const proxyGroups = ref([])
const loading = ref(false)
const qrLoading = ref(false)
const showAddDialog = ref(false)
const showQRDialog = ref(false)
const qrCode = ref('')

const addForm = reactive({
  account: '',
  nickname: '',
  proxyGroup: ''
})

const fetchAccounts = async () => {
  loading.value = true
  try {
    const res = await whatsapp.getAccounts()
    if (res.code === 0) {
      accounts.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('获取账号列表失败')
  } finally {
    loading.value = false
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

const handleAdd = async () => {
  if (!addForm.account) {
    ElMessage.warning('请输入手机号')
    return
  }
  try {
    const res = await whatsapp.addAccount({
      account: addForm.account,
      nickname: addForm.nickname,
      proxyGroup: addForm.proxyGroup
    })
    if (res.code === 0) {
      const msg = res.data.proxy ? '已分配代理: ' + res.data.proxy : '未分配代理'
      ElMessage.success('添加成功，' + msg)
      showAddDialog.value = false
      addForm.account = ''
      addForm.nickname = ''
      addForm.proxyGroup = ''
      fetchAccounts()
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
    // ✅ 正确：调用新接口，传入 proxy
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

onMounted(() => {
  fetchAccounts()
  fetchProxyGroups()
})
</script>

<style scoped>
.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
}
.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}
.qr-container img {
  width: 200px;
  height: 200px;
}
.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #999;
}
.qr-tip {
  color: #999;
  font-size: 14px;
}
</style>
