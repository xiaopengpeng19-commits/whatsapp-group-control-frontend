<template>
  <div class="contacts">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;width:100%;">
        <!-- 搜索框 -->
        <el-input v-model="searchKeyword" placeholder="搜索账号" clearable prefix-icon="Search" style="width:200px"
          @input="filterAccounts" />

        <!-- 分组快速筛选 -->
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <el-button :type="filterGroup === '' ? 'primary' : ''" size="small"
            @click="filterGroup = ''; filterAccounts()">
            全部
          </el-button>
          <el-button v-for="g in groupList" :key="g" :type="filterGroup === g ? 'primary' : ''" size="small"
            @click="filterGroup = g; filterAccounts()">
            {{ g }}
          </el-button>
        </div>

        <div style="margin-left:auto;display:flex;gap:6px;">
          <el-button size="small" @click="fetchAccounts">
            <el-icon>
              <Refresh />
            </el-icon> 刷新
          </el-button>
        </div>
      </div>
    </div>

    <!-- 账号列表 -->
    <el-table :data="filteredAccounts" border v-loading="loading" @selection-change="handleSelectionChange"
      max-height="300">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="account" label="账号" width="150" />
      <el-table-column prop="group" label="分组" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.group ? 'primary' : 'info'">
            {{ row.group || '未分组' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="500">
        <template #default="{ row }">
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <el-button size="small" type="primary" @click="viewContacts(row.account)">
              查看联系人
            </el-button>
            <el-button size="small" type="success" @click="openAddContact(row.account)">
              添加联系人
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 已选信息 -->
    <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <el-input v-model="searchAccount" placeholder="输入账号" clearable style="width:180px" size="default"
        @keyup.enter="viewAccountContacts" />
      <el-button size="default" type="primary" @click="viewAccountContacts">
        查看联系人
      </el-button>
      <span style="color:#999;font-size:13px;" v-if="currentViewAccount">
        当前账号: <span style="color:#333;font-weight:500;">{{ currentViewAccount }}</span>
      </span>
      <span style="color:#999;font-size:13px;" v-if="contacts.length > 0">
        联系人总数: <span style="color:#333;font-weight:500;">{{ contacts.length }}</span>
      </span>
    </div>

    <!-- 联系人列表 -->
    <el-table :data="contacts" border v-loading="contactsLoading" max-height="400">
      <el-table-column prop="phone" label="手机号" width="150">
        <template #default="{ row }">
          {{ getDisplayPhone(row) }}
        </template>
      </el-table-column>
      <el-table-column label="名称" min-width="150">
        <template #default="{ row }">
          {{ getDisplayName(row) }}
        </template>
      </el-table-column>
      <el-table-column label="JID" min-width="200">
        <template #default="{ row }">
          {{ row.peerId || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加联系人对话框 -->
    <el-dialog v-model="showAddDialog" title="添加联系人" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="账号" required>
          <el-select v-model="addForm.account" placeholder="选择账号" style="width:100%">
            <el-option v-for="item in accounts" :key="item.account" :label="item.account" :value="item.account" />
          </el-select>
        </el-form-item>
        <el-form-item label="JID" required>
          <el-input v-model="addForm.jid" placeholder="例如: 85292487693@s.whatsapp.net" />
          <div style="font-size:12px;color:#999;margin-top:4px;">
            格式: 手机号@s.whatsapp.net 或 LID
          </div>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="addForm.phone" placeholder="可选，用于显示" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="addForm.name" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showBatchDialog" title="批量导入联系人" width="600px">
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="账号" required>
          <el-select v-model="batchForm.account" placeholder="选择账号" style="width:100%">
            <el-option v-for="item in accounts" :key="item.account" :label="item.account" :value="item.account" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人列表">
          <el-input v-model="batchForm.contactsText" type="textarea" :rows="10" placeholder="每行一个，格式: JID, 手机号, 昵称" />
          <div style="font-size:12px;color:#999;margin-top:4px;">
            示例:<br>
            85292487693@s.whatsapp.net, 85292487693, 张三<br>
            85292487694@s.whatsapp.net, 85292487694, 李四
          </div>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, DocumentAdd, Refresh } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const accounts = ref([])
const filteredAccounts = ref([])
const contacts = ref([])
const loading = ref(false)
const contactsLoading = ref(false)
const searchKeyword = ref('')
const filterGroup = ref('')
const selectedAccounts = ref([])
const selectedAccount = ref(null)

const showAddDialog = ref(false)
const showBatchDialog = ref(false)
const searchAccount = ref('')
const currentViewAccount = ref('')

// ============ 添加表单 ============
const openAddContact = (account) => {
  addForm.account = account
  addForm.jid = ''
  addForm.phone = ''
  addForm.name = ''
  showAddDialog.value = true
}
const addForm = reactive({
  account: '',
  jid: '',
  phone: '',
  name: ''
})

// ============ 批量表单 ============
const batchForm = reactive({
  account: '',
  contactsText: ''
})

// ============ 分组列表 ============
const groupList = computed(() => {
  const groups = new Set()
  accounts.value.forEach(a => {
    if (a.group) groups.add(a.group)
  })
  return Array.from(groups)
})

// ============ 状态映射 ============
const statusMap = {
  'online': '在线',
  'normal': '在线',
  'logging': '登录中',
  'offline': '离线',
  'banned': '封禁',
  'expired': '过期'
}

const statusTypeMap = {
  'online': 'success',
  'normal': 'success',
  'logging': 'warning',
  'offline': 'info',
  'banned': 'danger',
  'expired': 'danger'
}

const getStatusText = (status) => statusMap[status] || status || '未知'
const getStatusType = (status) => statusTypeMap[status] || 'info'

// ============ 工具函数 ============
const cleanPhone = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[\s+\-()]/g, '')
}

const getPhoneFromJid = (jid) => {
  if (!jid) return ''
  return jid.split('@')[0]
}

const getDisplayName = (row) => {
  if (row.peerName) {
    const name = String(row.peerName)
    if (name.includes('@')) return getPhoneFromJid(name)
    return cleanPhone(name)
  }
  if (row.peerId) return getPhoneFromJid(row.peerId)
  return row.phone || '-'
}

const getDisplayPhone = (row) => {
  if (row.peerPhone) return cleanPhone(String(row.peerPhone))
  if (row.peerId) return getPhoneFromJid(row.peerId)
  return row.phone || '-'
}

const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

// ============ 数据获取 ============
const fetchAccounts = async () => {
  loading.value = true
  try {
    const res = await whatsapp.getAccounts()
    if (res.code === 0) {
      let data = res.data
      if (data && data.data && Array.isArray(data.data)) {
        data = data.data
      }
      accounts.value = data || []
      filterAccounts()
    }
  } catch (error) {
    console.error('获取账号失败:', error)
    ElMessage.warning('获取账号列表失败')
  } finally {
    loading.value = false
  }
}

const filterAccounts = () => {
  let list = [...accounts.value]
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(a => a.account.includes(kw))
  }
  if (filterGroup.value) {
    list = list.filter(a => a.group === filterGroup.value)
  }
  filteredAccounts.value = list
}

const fetchContacts = async (account) => {
  if (!account) {
    ElMessage.warning('请选择账号')
    return
  }
  contactsLoading.value = true
  try {
    const res = await whatsapp.getContacts({ account })
    if (res.code === 0) {
      const rawContacts = res.data?.contacts || []
      contacts.value = rawContacts
        .filter(c => c.peerId && !c.peerId.startsWith('0@'))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  } catch (error) {
    ElMessage.error('获取联系人失败')
  } finally {
    contactsLoading.value = false
  }
}

const viewContacts = (account) => {
  searchAccount.value = account
  currentViewAccount.value = account
  fetchContacts(account)
}

const viewAccountContacts = () => {
  if (!searchAccount.value) {
    ElMessage.warning('请输入账号')
    return
  }
  currentViewAccount.value = searchAccount.value
  fetchContacts(searchAccount.value)
}

const handleSelectionChange = (selection) => {
  selectedAccounts.value = selection.map(item => item.account)
}

// ============ 添加联系人 ============
const handleAdd = async () => {
  if (!addForm.account) {
    ElMessage.warning('请选择账号')
    return
  }
  if (!addForm.jid) {
    ElMessage.warning('请输入 JID')
    return
  }

  try {
    const res = await whatsapp.addContact({
      account: addForm.account,
      jid: addForm.jid,
      phone: addForm.phone || addForm.jid.split('@')[0],
      name: addForm.name || addForm.phone || addForm.jid.split('@')[0]
    })
    if (res.code === 0) {
      ElMessage.success('添加成功')
      showAddDialog.value = false
      addForm.account = ''
      addForm.jid = ''
      addForm.phone = ''
      addForm.name = ''
      if (selectedAccount.value) fetchContacts(selectedAccount.value)
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (error) {
    ElMessage.error('添加失败: ' + (error.message || ''))
  }
}

// ============ 批量导入 ============
const handleBatchAdd = async () => {
  if (!batchForm.account) {
    ElMessage.warning('请选择账号')
    return
  }
  const lines = batchForm.contactsText.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    ElMessage.warning('请输入至少一个联系人')
    return
  }

  const contactsList = lines.map(line => {
    const parts = line.split(',').map(s => s.trim())
    return {
      jid: parts[0],
      phone: parts[1] || parts[0].split('@')[0],
      name: parts[2] || parts[1] || parts[0].split('@')[0]
    }
  })

  const invalid = contactsList.filter(c => !c.jid)
  if (invalid.length > 0) {
    ElMessage.warning('部分联系人缺少 JID，请检查格式')
    return
  }

  try {
    const res = await whatsapp.batchAddContacts({
      account: batchForm.account,
      contacts: contactsList
    })
    if (res.code === 0) {
      const result = res.data || {}
      let msg = `成功添加 ${result.success || 0} 个`
      if (result.skipped) {
        msg += `，跳过 ${result.skipped} 个（缺少 JID）`
      }
      ElMessage.success(msg)
      showBatchDialog.value = false
      batchForm.contactsText = ''
      if (selectedAccount.value) fetchContacts(selectedAccount.value)
    } else {
      ElMessage.error(res.message || '批量导入失败')
    }
  } catch (error) {
    ElMessage.error('批量导入失败: ' + (error.message || ''))
  }
}

// ============ 生命周期 ============
onMounted(() => {
  fetchAccounts()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
</style>