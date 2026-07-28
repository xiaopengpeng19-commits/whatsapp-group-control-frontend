
<template>
  <div class="messages">
    <!-- 发送消息 -->
    <el-card>
      <template #header>
        <span>📤 发送消息</span>
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

    <!-- 快捷跳转到消息记录 -->
    <el-card style="margin-top:20px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#999">查看所有消息记录</span>
        <el-button type="primary" plain @click="$router.push('/message-history')">
          <el-icon><Document /></el-icon> 进入消息记录
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Promotion, Document } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import { useRouter } from 'vue-router'

const router = useRouter()
const accounts = ref([])
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
      let data = res.data?.data || res.data || []
      if (!Array.isArray(data)) data = []
      accounts.value = data
      if (accounts.value.length > 0 && !sendForm.account) {
        sendForm.account = accounts.value[0].account
      }
    }
  } catch (error) {
    console.error('获取账号失败:', error)
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
        if (sendForm.linkTitle) {
          linkData.title = sendForm.linkTitle
        }
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

onMounted(() => {
  fetchAccounts()
})
</script>

<style scoped>
.messages {
  max-width: 100%;
}
</style>
