<template>
  <div class="contacts">
    <div class="toolbar">
      <el-select v-model="selectedAccount" placeholder="选择账号" @change="fetchContacts">
        <el-option
          v-for="item in accounts"
          :key="item.account"
          :label="item.account"
          :value="item.account"
        />
      </el-select>
      <el-button type="primary" @click="fetchContacts">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <el-table :data="contacts" border v-loading="loading">
      <el-table-column prop="name" label="名称" min-width="150" />
      <el-table-column prop="phone" label="手机号" width="150" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'online' ? 'success' : 'info'">
            {{ row.status === 'online' ? '在线' : '离线' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'

const accounts = ref([])
const contacts = ref([])
const selectedAccount = ref('')
const loading = ref(false)

const fetchAccounts = async () => {
  try {
    const res = await whatsapp.getAccounts()
    if (res.code === 0) {
      accounts.value = res.data || []
      if (accounts.value.length > 0 && !selectedAccount.value) {
        selectedAccount.value = accounts.value[0].account
        fetchContacts()
      }
    }
  } catch (error) {
    // ignore
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
      contacts.value = res.data?.data || []
    }
  } catch (error) {
    ElMessage.error('获取联系人失败')
  } finally {
    loading.value = false
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
  align-items: center;
}
</style>
