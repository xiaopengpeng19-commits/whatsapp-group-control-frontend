<template>
    <div class="pairing-code">
        <el-card>
            <template #header>
                <span>🔑 生成配对码</span>
            </template>

            <el-form :model="form" label-width="100px">
                <el-form-item label="手机号" required>
                    <el-input v-model="form.account" placeholder="请输入手机号" style="width:300px" />
                </el-form-item>
                <el-form-item label="代理IP">
                    <el-input v-model="form.proxy" placeholder="请输入代理IP（可选，格式: socks5://user:pass@ip:port）"
                        style="width:500px" />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleGenerate" :loading="generating">
                        <el-icon>
                            <Key />
                        </el-icon> 生成配对码
                    </el-button>
                    <el-button @click="resetForm">
                        <el-icon>
                            <Refresh />
                        </el-icon> 重置
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <!-- 结果显示 -->
        <el-card style="margin-top:20px" v-if="result">
            <template #header>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span>生成结果</span>
                    <el-button size="small" type="primary" @click="copyResult">
                        <el-icon>
                            <CopyDocument />
                        </el-icon> 复制
                    </el-button>
                </div>
            </template>

            <el-descriptions :column="2" border>
                <el-descriptions-item label="手机号">{{ result.account || '-' }}</el-descriptions-item>
                <el-descriptions-item label="代理IP">{{ result.proxy || '-' }}</el-descriptions-item>
                <el-descriptions-item label="配对码" :span="2">
                    <div
                        style="font-family:monospace;font-size:16px;font-weight:bold;color:#409eff;word-break:break-all;">
                        {{ result.pairingCode || result.pairCode || '生成失败' }}
                    </div>
                </el-descriptions-item>
                <el-descriptions-item label="状态" :span="2">
                    <el-tag :type="result.success ? 'success' : 'danger'" size="large">
                        {{ result.success ? '✅ 成功' : '❌ 失败' }}
                    </el-tag>
                    <span v-if="result.message" style="margin-left:10px;color:#999;">
                        {{ result.message }}
                    </span>
                </el-descriptions-item>
                <el-descriptions-item label="生成时间" :span="2">
                    {{ formatTime(result.createdAt) }}
                </el-descriptions-item>
            </el-descriptions>
        </el-card>

        <!-- 历史记录 -->
        <el-card style="margin-top:20px">
            <template #header>
                <span>📋 生成历史</span>
            </template>

            <el-table :data="history" v-loading="historyLoading" border>
                <el-table-column prop="account" label="手机号" width="150" />
                <el-table-column prop="proxy" label="代理IP" min-width="200" show-overflow-tooltip />
                <el-table-column label="配对码" min-width="200">
                    <template #default="{ row }">
                        <span style="font-family:monospace;font-size:13px;word-break:break-all;">
                            {{ row.pairingCode || row.pairCode || '-' }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                    <template #default="{ row }">
                        <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                            {{ row.success ? '成功' : '失败' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="生成时间" width="170">
                    <template #default="{ row }">
                        {{ formatTime(row.createdAt) }}
                    </template>
                </el-table-column>
            </el-table>

            <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                <el-pagination v-model:current-page="historyPage" v-model:page-size="historyPageSize"
                    :page-sizes="[10, 20, 50]" :total="historyTotal" layout="total, sizes, prev, pager, next" small
                    @size-change="fetchHistory" @current-change="fetchHistory" />
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, Refresh, CopyDocument } from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'

const form = reactive({
    account: '',
    proxy: ''
})

const generating = ref(false)
const result = ref(null)

// 历史记录
const history = ref([])
const historyLoading = ref(false)
const historyTotal = ref(0)
const historyPage = ref(1)
const historyPageSize = ref(20)

const formatTime = (time) => {
    return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const handleGenerate = async () => {
    if (!form.account) {
        ElMessage.warning('请输入手机号')
        return
    }

    generating.value = true
    result.value = null

    try {
        const res = await api.post(`/whatsapp/accounts/${form.account}/request-pairing`, {
            proxy: form.proxy || ''
        })

        // ✅ 兼容两种格式
        const isSuccess = res.code === 0 || res.status === 200

        if (isSuccess) {
            const data = res.data || res
            result.value = {
                account: form.account,
                proxy: form.proxy || '-',
                pairingCode: data.pairingCode || data.data || '生成成功',
                success: true,
                message: res.message || '',
                createdAt: new Date().toISOString()
            }
            ElMessage.success('配对码生成成功')
            fetchHistory()
        } else {
            result.value = {
                account: form.account,
                proxy: form.proxy || '-',
                pairingCode: '',
                success: false,
                message: res.message || '生成失败',
                createdAt: new Date().toISOString()
            }
            ElMessage.error(res.message || '生成失败')
        }
    } catch (error) {
        ElMessage.error('生成失败: ' + (error.message || ''))
        result.value = {
            account: form.account,
            proxy: form.proxy || '-',
            pairingCode: '',
            success: false,
            message: error.message || '请求失败',
            createdAt: new Date().toISOString()
        }
    } finally {
        generating.value = false
    }
}

const resetForm = () => {
    form.account = ''
    form.proxy = ''
    result.value = null
}

const copyResult = () => {
    if (!result.value || !result.value.pairingCode) {
        ElMessage.warning('没有可复制的内容')
        return
    }
    navigator.clipboard.writeText(result.value.pairingCode).then(() => {
        ElMessage.success('已复制配对码')
    }).catch(() => {
        // 降级方案
        const input = document.createElement('input')
        input.value = result.value.pairingCode
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        ElMessage.success('已复制配对码')
    })
}

const fetchHistory = async () => {
    historyLoading.value = true
    try {
        // 这里需要后端提供一个获取配对码历史记录的接口
        // 如果没有，可以暂时用空数据或去掉这个功能
        const res = await api.get('/pairing-code/history', {
            params: {
                page: historyPage.value,
                page_size: historyPageSize.value
            }
        })
        if (res.code === 0) {
            history.value = res.data.data || []
            historyTotal.value = res.data.total || 0
        }
    } catch (error) {
        // 如果接口不存在，静默失败
        console.log('历史记录接口暂未实现')
    } finally {
        historyLoading.value = false
    }
}

onMounted(() => {
    fetchHistory()
})
</script>

<style scoped>
.pairing-code {
    max-width: 100%;
}
</style>