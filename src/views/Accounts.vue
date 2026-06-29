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
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'online' ? 'success' : 'info'">
            {{ row.status === 'online' ? '🟢 在线' : '⚪ 离线' }}
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
      <el-table-column label="操作" width="350" fixed="right">
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
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="手机号">
          <el-input v-model="addForm.account" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="addForm.nickname" placeholder="请输入昵称" />
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

const accounts = ref([])
const loading = ref(false)
const showAddDialog = ref(false)
const showQRDialog = ref(false)
const qrCode = ref('')

const addForm = reactive({
  account: '',
  nickname: ''
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

const handleAdd = async () => {
  if (!addForm.account) {
    ElMessage.warning('请输入手机号')
    return
  }
  try {
    const res = await whatsapp.addAccount(addForm)
    if (res.code === 0) {
      ElMessage.success('添加成功')
      showAddDialog.value = false
      addForm.account = ''
      addForm.nickname = ''
      fetchAccounts()
    }
  } catch (error) {
    ElMessage.error('添加失败')
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

const showQRCode = async (account) => {
  showQRDialog.value = true
  qrCode.value = ''
  try {
    const res = await whatsapp.getQRCode({ account })
    if (res.code === 0 && res.data?.qrcode) {
      qrCode.value = `data:image/png;base64,${res.data.qrcode}`
    } else {
      ElMessage.warning('二维码生成中，请稍后重试')
    }
  } catch (error) {
    ElMessage.error('获取二维码失败')
  }
}

onMounted(() => {
  fetchAccounts()
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
