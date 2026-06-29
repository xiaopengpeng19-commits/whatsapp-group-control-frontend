<template>
  <div class="messages">
    <el-card>
      <template #header>
        <span>发送消息</span>
      </template>
      <el-form :model="sendForm" label-width="80px">
        <el-form-item label="账号">
          <el-select v-model="sendForm.account" placeholder="选择账号">
            <el-option
              v-for="item in accounts"
              :key="item.account"
              :label="item.account"
              :value="item.account"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="对方号码">
          <el-input v-model="sendForm.to" placeholder="请输入对方手机号" />
        </el-form-item>
        <el-form-item label="消息类型">
          <el-radio-group v-model="sendForm.type">
            <el-radio-button value="text">文本</el-radio-button>
            <el-radio-button value="image">图片</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="sendForm.content"
            type="textarea"
            :rows="3"
            placeholder="请输入消息内容"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSend">发送</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top:20px">
      <template #header>
        <span>消息记录</span>
      </template>
      <el-table :data="messages" border>
        <el-table-column prop="account" label="账号" width="120" />
        <el-table-column prop="to" label="对方" width="120" />
        <el-table-column prop="content" label="内容" min-width="200" />
        <el-table-column prop="type" label="类型" width="80" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sentAt" label="时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.sentAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { whatsapp } from '@/api'
import dayjs from 'dayjs'

const accounts = ref([])
const messages = ref([])
const loading = ref(false)

const sendForm = reactive({
  account: '',
  to: '',
  type: 'text',
  content: ''
})

const fetchAccounts = async () => {
  try {
    const res = await whatsapp.getAccounts()
    if (res.code === 0) {
      accounts.value = res.data || []
      if (accounts.value.length > 0 && !sendForm.account) {
        sendForm.account = accounts.value[0].account
      }
    }
  } catch (error) {
    // ignore
  }
}

const fetchMessages = async () => {
  loading.value = true
  try {
    const res = await whatsapp.getMessages({ account: sendForm.account, page: 1, page_size: 50 })
    if (res.code === 0) {
      messages.value = res.data?.data || []
    }
  } catch (error) {
    // ignore
  } finally {
    loading.value = false
  }
}

const handleSend = async () => {
  if (!sendForm.account || !sendForm.to || !sendForm.content) {
    ElMessage.warning('请完整填写信息')
    return
  }
  try {
    const res = await whatsapp.sendMessage(sendForm)
    if (res.code === 0) {
      ElMessage.success('发送成功')
      sendForm.content = ''
      fetchMessages()
    }
  } catch (error) {
    ElMessage.error('发送失败')
  }
}

const getStatusType = (status) => {
  const map = { sent: '', delivered: 'success', read: 'success', failed: 'danger' }
  return map[status] || ''
}

const getStatusLabel = (status) => {
  const map = { sent: '已发送', delivered: '已送达', read: '已读', failed: '失败' }
  return map[status] || status
}

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
}

onMounted(() => {
  fetchAccounts()
  fetchMessages()
})
</script>
