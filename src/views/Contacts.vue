<template>
  <div class="contacts">
    <div class="toolbar">
      <el-select v-model="selectedAccount" placeholder="选择账号" @change="fetchContacts" style="width:180px">
        <el-option v-for="item in accounts" :key="item.account" :label="item.account" :value="item.account" />
      </el-select>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon>
          <Plus />
        </el-icon> 添加联系人
      </el-button>
      <el-button type="success" @click="showBatchDialog = true">
        <el-icon>
          <DocumentAdd />
        </el-icon> 批量导入
      </el-button>
      <el-button @click="fetchContacts">
        <el-icon>
          <Refresh />
        </el-icon> 刷新
      </el-button>
    </div>

    <el-table :data="contacts" border v-loading="loading">
      <el-table-column label="名称" min-width="150">
        <template #default="{ row }">
          {{ getDisplayName(row) }}
        </template>
      </el-table-column>
      <el-table-column label="手机号" width="150">
        <template #default="{ row }">
          {{ getDisplayPhone(row) }}
        </template>
      </el-table-column>
      <el-table-column label="JID" min-width="200">
        <template #default="{ row }">
          {{ row.peerId || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.updatedAt) }}
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加联系人对话框 -->
    <el-dialog v-model="showAddDialog" title="添加联系人" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="账号">
          <el-select v-model="addForm.account" placeholder="选择账号" style="width:100%">
            <el-option v-for="item in accounts" :key="item.account" :label="item.account" :value="item.account" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="addForm.phone" placeholder="请输入对方手机号" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="addForm.name" placeholder="请输入昵称（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showBatchDialog" title="批量导入联系人" width="600px">
      <el-form :model="batchForm" label-width="80px">
        <el-form-item label="账号">
          <el-select v-model="batchForm.account" placeholder="选择账号" style="width:100%">
            <el-option v-for="item in accounts" :key="item.account" :label="item.account" :value="item.account" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人列表">
          <el-input v-model="batchForm.contactsText" type="textarea" :rows="8" placeholder="每行一个联系人，格式: 手机号, 昵称" />
        </el-form-item>
        <el-form-item>
          <span style="color:#999;font-size:12px">
            示例:<br>
            8612345678901, 张三<br>
            8612345678902, 李四
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, DocumentAdd, Refresh } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import dayjs from 'dayjs'

const accounts = ref([])
const contacts = ref([])
const selectedAccount = ref('')
const loading = ref(false)

const showAddDialog = ref(false)
const showBatchDialog = ref(false)

const addForm = ref({
  account: '',
  phone: '',
  name: ''
})

const batchForm = ref({
  account: '',
  contactsText: ''
})

// 清理手机号：移除 +、空格、- 等
const cleanPhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[\s+\-()]/g, '')
}

// 提取手机号（只保留数字）
const extractPhone = (value) => {
  if (!value) return ''
  return String(value).replace(/\D/g, '')
}

// 从 JID 提取手机号
const getPhoneFromJid = (jid) => {
  if (!jid) return ''
  return jid.split('@')[0]
}

// 获取显示名称
const getDisplayName = (row) => {
  // 优先使用 peerName
  if (row.peerName) {
    const name = String(row.peerName)
    // 如果包含 @，说明是 JID，提取手机号
    if (name.includes('@')) {
      return getPhoneFromJid(name)
    }
    // 清理特殊字符
    return cleanPhone(name)
  }
  // 从 peerId 提取
  if (row.peerId) {
    return getPhoneFromJid(row.peerId)
  }
  return row.phone || '-'
}

// 获取显示手机号
const getDisplayPhone = (row) => {
  // 优先使用 peerPhone
  if (row.peerPhone) {
    return cleanPhone(String(row.peerPhone))
  }
  // 从 peerId 提取
  if (row.peerId) {
    return getPhoneFromJid(row.peerId)
  }
  return row.phone || '-'
}

const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

const fetchAccounts = async () => {
  try {
    const res = await api.get('/whatsapp/accounts/list', { params: { page: 1, page_size: 1000 } })
    if (res.code === 0) {
      let data = res.data
      if (data && data.data && Array.isArray(data.data)) {
        data = data.data
      }
      accounts.value = data || []
      if (accounts.value.length > 0 && !selectedAccount.value) {
        selectedAccount.value = accounts.value[0].account
        fetchContacts()
      }
    }
  } catch (error) {
    ElMessage.error('获取账号列表失败')
  }
}

const fetchContacts = async () => {
  if (!selectedAccount.value) {
    ElMessage.warning('请选择账号')
    return
  }
  loading.value = true
  try {
    const res = await whatsapp.getContacts({ account: selectedAccount.value })
    if (res.code === 0) {
      contacts.value = res.data?.contacts || []
    }
  } catch (error) {
    ElMessage.error('获取联系人失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = async () => {
  if (!addForm.value.account || !addForm.value.phone) {
    ElMessage.warning('请完整填写信息')
    return
  }
  try {
    const res = await whatsapp.addContact(addForm.value)
    if (res.code === 0) {
      ElMessage.success('添加成功')
      showAddDialog.value = false
      addForm.value = { account: '', phone: '', name: '' }
      fetchContacts()
    }
  } catch (error) {
    ElMessage.error('添加失败: ' + (error.message || ''))
  }
}

const handleBatchAdd = async () => {
  if (!batchForm.value.account) {
    ElMessage.warning('请选择账号')
    return
  }
  const lines = batchForm.value.contactsText.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    ElMessage.warning('请输入至少一个联系人')
    return
  }
  const contactsList = lines.map(line => {
    const parts = line.split(',').map(s => s.trim())
    return { phone: parts[0], name: parts[1] || parts[0] }
  })
  try {
    const res = await whatsapp.batchAddContacts({
      account: batchForm.value.account,
      contacts: contactsList
    })
    if (res.code === 0) {
      const summary = res.data?.summary || {}
      ElMessage.success(`成功添加 ${summary.success || 0} 个联系人，失败 ${summary.failed || 0} 个`)
      showBatchDialog.value = false
      batchForm.value = { account: '', contactsText: '' }
      fetchContacts()
    }
  } catch (error) {
    ElMessage.error('批量导入失败: ' + (error.message || ''))
  }
}

onMounted(() => {
  fetchAccounts()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
</style>
