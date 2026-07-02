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
    <el-card style="margin-top:20px" v-if="results.length > 0">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>检查结果</span>
          <span>
            <el-tag type="success">已注册: {{ registeredCount }}</el-tag>
            <el-tag type="danger" style="margin-left:10px">未注册: {{ unregisteredCount }}</el-tag>
            <el-tag type="info" style="margin-left:10px">总计: {{ results.length }}</el-tag>
          </span>
        </div>
      </template>

      <el-table :data="results" border>
        <el-table-column prop="phone" label="手机号" width="180">
          <template #default="{ row }">
            {{ row.phone || extractPhone(row.jid) }}
          </template>
        </el-table-column>
        <el-table-column prop="jid" label="JID" width="200">
          <template #default="{ row }">
            {{ row.jid || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="exists" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.exists ? 'success' : 'danger'" size="small">
              {{ row.exists ? '✅ 已注册' : '❌ 未注册' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button 
              v-if="row.exists" 
              size="small" 
              type="primary" 
              plain
              @click="copyPhone(row.phone || extractPhone(row.jid))"
            >
              复制号码
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top:15px">
        <el-button type="success" plain @click="exportRegistered">
          <el-icon><Download /></el-icon> 导出已注册号码
        </el-button>
        <el-button type="danger" plain @click="exportUnregistered">
          <el-icon><Download /></el-icon> 导出未注册号码
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Delete, Document, Download } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import api from '@/api'

const accounts = ref([])
const results = ref([])
const checking = ref(false)

const form = reactive({
  accountId: '',
  phonesText: ''
})

const registeredCount = computed(() => {
  return results.value.filter(r => r.exists).length
})

const unregisteredCount = computed(() => {
  return results.value.filter(r => !r.exists).length
})

const extractPhone = (jid) => {
  if (!jid) return ''
  return jid.split('@')[0]
}

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
    
    if (res.code === 0) {
      // res.data 就是协议服返回的 data 数组
      results.value = res.data || []
      ElMessage.success(`检查完成，共 ${results.value.length} 个号码`)
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
  results.value = []
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
  if (!phone) {
    ElMessage.warning('没有可复制的号码')
    return
  }
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

const exportRegistered = () => {
  const phones = results.value.filter(r => r.exists).map(r => r.phone || extractPhone(r.jid))
  if (phones.length === 0) {
    ElMessage.warning('没有已注册的号码')
    return
  }
  const text = phones.join('\n')
  downloadFile(text, 'registered_phones.txt')
  ElMessage.success(`已导出 ${phones.length} 个已注册号码`)
}

const exportUnregistered = () => {
  const phones = results.value.filter(r => !r.exists).map(r => r.phone || extractPhone(r.jid))
  if (phones.length === 0) {
    ElMessage.warning('没有未注册的号码')
    return
  }
  const text = phones.join('\n')
  downloadFile(text, 'unregistered_phones.txt')
  ElMessage.success(`已导出 ${phones.length} 个未注册号码`)
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
</style>
