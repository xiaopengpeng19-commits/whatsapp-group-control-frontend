<template>
  <div class="check-whatsapp">
    <el-card>
      <template #header>
        <span>📱 批量检查 WhatsApp 注册状态</span>
      </template>
      
      <el-form :model="form" label-width="100px">
        <el-form-item label="账号">
          <el-select v-model="form.accountId" placeholder="选择账号" style="width:300px">
            <el-option
              v-for="item in accounts"
              :key="item.account"
              :label="item.account"
              :value="item.account"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号列表">
          <el-input
            v-model="form.phonesText"
            type="textarea"
            :rows="10"
            placeholder="每行一个手机号"
            style="width:500px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCheck" :loading="checking">
            <el-icon><Search /></el-icon> 检查
          </el-button>
          <el-button @click="clearResults">
            <el-icon><Delete /></el-icon> 清空结果
          </el-button>
          <el-button @click="loadSample">
            <el-icon><Document /></el-icon> 加载示例
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 结果统计 -->
    <el-card style="margin-top:20px" v-if="resultData.total > 0">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>检查结果</span>
          <span>
            <el-tag type="success">已注册: {{ resultData.registeredCount }}</el-tag>
            <el-tag type="danger" style="margin-left:10px">未注册: {{ resultData.unregisteredCount }}</el-tag>
            <el-tag type="info" style="margin-left:10px">总计: {{ resultData.total }}</el-tag>
          </span>
        </div>
      </template>

      <!-- 已注册列表 -->
      <el-card v-if="resultData.registered.length > 0" shadow="never" style="margin-bottom:15px">
        <template #header>
          <span style="color:#67c23a;font-weight:bold;">✅ 已注册 ({{ resultData.registered.length }})</span>
        </template>
        <div class="phone-tags">
          <el-tag
            v-for="phone in resultData.registered"
            :key="phone"
            type="success"
            size="large"
            style="margin:4px;cursor:pointer;"
            @click="copyPhone(phone)"
          >
            {{ phone }}
            <el-icon style="margin-left:4px;"><CopyDocument /></el-icon>
          </el-tag>
        </div>
      </el-card>

      <!-- 未注册列表 -->
      <el-card v-if="resultData.unregistered.length > 0" shadow="never">
        <template #header>
          <span style="color:#f56c6c;font-weight:bold;">❌ 未注册 ({{ resultData.unregistered.length }})</span>
        </template>
        <div class="phone-tags">
          <el-tag
            v-for="phone in resultData.unregistered"
            :key="phone"
            type="danger"
            size="large"
            style="margin:4px;"
          >
            {{ phone }}
          </el-tag>
        </div>
      </el-card>

      <!-- 导出按钮 -->
      <div style="margin-top:15px;display:flex;gap:10px;">
        <el-button type="success" plain @click="exportList('registered')">
          <el-icon><Download /></el-icon> 导出已注册号码
        </el-button>
        <el-button type="danger" plain @click="exportList('unregistered')">
          <el-icon><Download /></el-icon> 导出未注册号码
        </el-button>
        <el-button type="primary" plain @click="exportList('all')">
          <el-icon><Download /></el-icon> 导出全部
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Delete, Document, Download, CopyDocument } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import api from '@/api'

const accounts = ref([])
const checking = ref(false)
const resultData = reactive({
  registered: [],
  unregistered: [],
  total: 0,
  registeredCount: 0,
  unregisteredCount: 0
})

const form = reactive({
  accountId: '',
  phonesText: ''
})

const fetchAccounts = async () => {
  try {
    const res = await whatsapp.getAccounts()
    if (res.code === 0) {
      accounts.value = res.data || []
      if (accounts.value.length > 0 && !form.accountId) {
        form.accountId = accounts.value[0].account
      }
    }
  } catch (error) {
    // ignore
  }
}

const handleCheck = async () => {
  if (!form.accountId) {
    ElMessage.warning('请选择账号')
    return
  }
  
  const phones = form.phonesText.split('\n')
    .map(p => p.trim())
    .filter(p => p !== '')

  if (phones.length === 0) {
    ElMessage.warning('请输入至少一个手机号')
    return
  }

  checking.value = true
  try {
    const res = await api.post('/whatsapp/check/onwhatsapp', {
      accountId: form.accountId,
      phones: phones
    })
    
    console.log('API返回:', res)
    
    if (res.code === 0 && res.data) {
      resultData.registered = res.data.registered || []
      resultData.unregistered = res.data.unregistered || []
      resultData.total = res.data.total || 0
      resultData.registeredCount = resultData.registered.length
      resultData.unregisteredCount = resultData.unregistered.length
      ElMessage.success(`检查完成，已注册 ${resultData.registeredCount} 个，未注册 ${resultData.unregisteredCount} 个`)
    } else {
      ElMessage.error(res.message || '检查失败')
    }
  } catch (error) {
    console.error('检查失败:', error)
    ElMessage.error('检查失败: ' + (error.message || ''))
  } finally {
    checking.value = false
  }
}

const clearResults = () => {
  resultData.registered = []
  resultData.unregistered = []
  resultData.total = 0
  resultData.registeredCount = 0
  resultData.unregisteredCount = 0
}

const loadSample = () => {
  form.phonesText = `5586998381743
5591985334646
5573982131296
5514981093166
5547996983550
5541998740475
5528999586639
5541999545270
5577999344027
5549999650463`
}

const copyPhone = (phone) => {
  if (!phone) return
  navigator.clipboard.writeText(phone).then(() => {
    ElMessage.success('已复制: ' + phone)
  }).catch(() => {
    const input = document.createElement('input')
    input.value = phone
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('已复制: ' + phone)
  })
}

const exportList = (type) => {
  let phones = []
  let filename = ''
  
  if (type === 'registered') {
    phones = resultData.registered
    filename = 'registered_phones.txt'
  } else if (type === 'unregistered') {
    phones = resultData.unregistered
    filename = 'unregistered_phones.txt'
  } else {
    phones = [...resultData.registered, ...resultData.unregistered]
    filename = 'all_phones.txt'
  }
  
  if (phones.length === 0) {
    ElMessage.warning('没有号码可导出')
    return
  }
  
  const text = phones.join('\n')
  downloadFile(text, filename)
  ElMessage.success(`已导出 ${phones.length} 个号码`)
}

const downloadFile = (content, filename) => {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  fetchAccounts()
})
</script>

<style scoped>
.check-whatsapp {
  max-width: 900px;
}
.phone-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.phone-tags .el-tag {
  cursor: default;
}
.phone-tags .el-tag[type="success"] {
  cursor: pointer;
}
.phone-tags .el-tag[type="success"]:hover {
  opacity: 0.8;
}
</style>
