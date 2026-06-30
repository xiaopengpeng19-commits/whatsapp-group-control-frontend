
<template>
  <div class="messages">
    <!-- 发送消息 -->
    <el-card>
      <template #header>
        <span>发送消息</span>
      </template>
      <el-form :model="sendForm" label-width="100px">
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
            <el-radio-button value="link">链接</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 文本消息 -->
        <template v-if="sendForm.type === 'text'">
          <el-form-item label="内容">
            <el-input
              v-model="sendForm.content"
              type="textarea"
              :rows="3"
              placeholder="请输入消息内容"
            />
          </el-form-item>
        </template>

        <!-- 图片消息 -->
        <template v-if="sendForm.type === 'image'">
          <el-form-item label="图片URL">
            <el-input v-model="sendForm.media" placeholder="请输入图片URL（Base64或URL）" />
          </el-form-item>
          <el-form-item label="图片描述">
            <el-input v-model="sendForm.caption" placeholder="请输入图片描述（可选）" />
          </el-form-item>
        </template>

        <!-- 链接消息 -->
        <template v-if="sendForm.type === 'link'">
          <el-form-item label="链接标题">
            <el-input v-model="sendForm.linkTitle" placeholder="请输入链接标题（可选）" />
          </el-form-item>
          <el-form-item label="链接描述">
            <el-input v-model="sendForm.linkBody" type="textarea" :rows="2" placeholder="请输入链接描述" />
          </el-form-item>
          <el-form-item label="链接地址">
            <el-input v-model="sendForm.linkUrl" placeholder="请输入链接URL" />
          </el-form-item>
          <el-form-item label="图片URL">
            <el-input v-model="sendForm.linkImage" placeholder="请输入预览图片URL（可选）" />
          </el-form-item>
          <el-form-item label="底部文字">
            <el-input v-model="sendForm.linkFooter" placeholder="请输入底部文字（可选）" />
          </el-form-item>
          <el-form-item label="按钮文字">
            <el-input v-model="sendForm.linkButton" placeholder="请输入按钮文字（可选，默认：查看详情）" />
          </el-form-item>
        </template>

        <el-form-item>
          <el-button type="primary" @click="handleSend" :loading="sending">
            <el-icon><Promotion /></el-icon> 发送
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 消息记录 -->
    <el-card style="margin-top:20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>消息记录</span>
          <el-button size="small" @click="fetchMessages">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </template>
      <el-table :data="messages" border v-loading="loading">
        <el-table-column prop="account" label="账号" width="120" />
        <el-table-column prop="to" label="对方" width="120" />
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
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
import { Promotion, Refresh } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import dayjs from 'dayjs'

const accounts = ref([])
const messages = ref([])
const loading = ref(false)
const sending = ref(false)

const sendForm = reactive({
  account: '',
  to: '',
  type: 'text',
  content: '',
  media: '',
  caption: '',
  linkTitle: '',
  linkBody: '',
  linkUrl: '',
  linkImage: '',
  linkFooter: '',
  linkButton: ''
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
  if (!sendForm.account) {
    ElMessage.warning('请选择账号')
    return
  }
  if (!sendForm.to) {
    ElMessage.warning('请输入对方号码')
    return
  }

  sending.value = true
  try {
    let res

    switch (sendForm.type) {
      case 'text':
        if (!sendForm.content) {
          ElMessage.warning('请输入消息内容')
          sending.value = false
          return
        }
        res = await whatsapp.sendMessage({
          account: sendForm.account,
          to: sendForm.to,
          type: 'text',
          content: sendForm.content
        })
        break

      case 'image':
        if (!sendForm.media) {
          ElMessage.warning('请输入图片URL')
          sending.value = false
          return
        }
        res = await whatsapp.sendMessage({
          account: sendForm.account,
          to: sendForm.to,
          type: 'image',
          media: sendForm.media,
          caption: sendForm.caption || '图片'
        })
        break

      case 'link':
        if (!sendForm.linkUrl) {
          ElMessage.warning('请输入链接地址')
          sending.value = false
          return
        }
        if (!sendForm.linkBody) {
          ElMessage.warning('请输入链接描述')
          sending.value = false
          return
        }
        // 构建链接数据，只传有值的字段
        const linkData = {
          account: sendForm.account,
          to: sendForm.to,
          body: sendForm.linkBody,
          imageUrl: sendForm.linkImage || '',
          button: {
            name: 'cta_url',
            display_text: sendForm.linkButton || '查看详情',
            url: sendForm.linkUrl
          }
        }
        // title 有值才添加
        if (sendForm.linkTitle) {
          linkData.title = sendForm.linkTitle
        }
        // footer 有值才添加
        if (sendForm.linkFooter) {
          linkData.footer = sendForm.linkFooter
        }
        res = await whatsapp.sendLinkMessage(linkData)
        break

      default:
        ElMessage.warning('不支持的消息类型')
        sending.value = false
        return
    }

    if (res.code === 0) {
      ElMessage.success('发送成功')
      resetForm()
      fetchMessages()
    } else {
      ElMessage.error(res.message || '发送失败')
    }
  } catch (error) {
    ElMessage.error('发送失败: ' + (error.message || ''))
  } finally {
    sending.value = false
  }
}

const resetForm = () => {
  sendForm.content = ''
  sendForm.media = ''
  sendForm.caption = ''
  sendForm.linkTitle = ''
  sendForm.linkBody = ''
  sendForm.linkUrl = ''
  sendForm.linkImage = ''
  sendForm.linkFooter = ''
  sendForm.linkButton = ''
}

const getTypeTag = (type) => {
  const map = { text: 'info', image: 'success', link: 'warning', video: 'danger' }
  return map[type] || ''
}

const getTypeLabel = (type) => {
  const map = { text: '文本', image: '图片', link: '链接', video: '视频' }
  return map[type] || type
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

<style scoped>
.messages {
  max-width: 100%;
}
</style>
