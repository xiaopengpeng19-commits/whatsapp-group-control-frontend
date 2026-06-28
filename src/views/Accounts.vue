<!-- frontend/src/views/Accounts.vue -->
<template>
  <div class="accounts">
    <div class="toolbar">
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon> 添加账号
      </el-button>
      <el-button @click="refresh">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <el-table :data="accountStore.accounts" v-loading="accountStore.loading">
      <el-table-column prop="account" label="账号" width="150" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'online' ? 'success' : 'info'">
            {{ row.status === 'online' ? '在线' : '离线' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isLogin" label="登录状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.isLogin ? 'success' : 'danger'">
            {{ row.isLogin ? '已登录' : '未登录' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== 'online'" size="small" type="primary" @click="handleOnline(row.account)">
            上线
          </el-button>
          <el-button v-else size="small" type="warning" @click="handleOffline(row.account)">
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
    <el-dialog v-model="showAddDialog" title="添加WhatsApp账号" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="账号">
          <el-input v-model="addForm.account" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="addForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="代理">
          <el-input v-model="addForm.proxy" placeholder="HTTP代理地址（可选）" />
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
        <p class="qr-tip">请使用WhatsApp扫描二维码登录</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Loading } from '@element-plus/icons-vue'
import { useAccountStore } from '@/stores/account'
import { whatsapp } from '@/api'

const accountStore = useAccountStore()
const showAddDialog = ref(false)
const showQRDialog = ref(false)
const qrCode = ref('')
const currentAccount = ref('')

const addForm = reactive({
  account: '',
  nickname: '',
  proxy: ''
})

const refresh = async () => {
  await accountStore.fetchAccounts()
  ElMessage.success('刷新成功')
}

const handleAdd = async () => {
  if (!addForm.account) {
    ElMessage.warning('请输入账号')
    return
  }
  const res = await accountStore.addAccount(addForm)
  if (res.code === 0) {
    ElMessage.success('添加成功')
    showAddDialog.value = false
    addForm.account = ''
    addForm.nickname = ''
    addForm.proxy = ''
  }
}

const handleDelete = async (account) => {
  try {
    await ElMessageBox.confirm(`确定要删除账号 ${account} 吗？`, '提示', {
      type: 'warning'
    })
    const res = await accountStore.deleteAccount(account)
    if (res.code === 0) {
      ElMessage.success('删除成功')
    }
  } catch {
    // cancelled
  }
}

const handleOnline = async (account) => {
  const res = await accountStore.online(account)
  if (res.code === 0) {
    ElMessage.success('上线成功')
  }
}

const handleOffline = async (account) => {
  const res = await accountStore.offline(account)
  if (res.code === 0) {
    ElMessage.success('下线成功')
  }
}

const showQRCode = async (account) => {
  currentAccount.value = account
  showQRDialog.value = true
  qrCode.value = ''
  
  try {
    const res = await whatsapp.getQRCode({ account })
    if (res.code === 0 && res.data.qrcode) {
      qrCode.value = `data:image/png;base64,${res.data.qrcode}`
    } else {
      ElMessage.warning('二维码生成中，请稍后重试')
    }
  } catch {
    ElMessage.error('获取二维码失败')
  }
}

onMounted(() => {
  accountStore.fetchAccounts()
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
  width: 250px;
  height: 250px;
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