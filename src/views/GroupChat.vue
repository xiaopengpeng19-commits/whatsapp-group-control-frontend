<template>
    <div class="group-chat">
        <!-- 工具栏 -->
        <div class="toolbar">
            <el-button type="primary" @click="showCreateDialog = true">
                <el-icon>
                    <Plus />
                </el-icon> 创建群聊任务
            </el-button>
            <el-button @click="fetchTasks">
                <el-icon>
                    <Refresh />
                </el-icon> 刷新
            </el-button>
            <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="fetchTasks"
                style="width:130px;margin-left:10px">
                <el-option label="全部" value="" />
                <el-option label="待执行" value="pending" />
                <el-option label="执行中" value="running" />
                <el-option label="已暂停" value="paused" />
                <el-option label="已完成" value="completed" />
                <el-option label="已停止" value="stopped" />
            </el-select>
        </div>

        <!-- 任务列表 -->
        <el-table :data="tasks" v-loading="loading" border>
            <el-table-column prop="name" label="任务名称" width="140" />
            <el-table-column label="群组" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">
                    <span style="font-size:12px;font-family:monospace;">{{ row.groupLink || row.inviteCode }}</span>
                </template>
            </el-table-column>
            <el-table-column label="发消息分组" width="140">
                <template #default="{ row }">
                    <el-tag v-for="g in row.senderGroups" :key="g" size="small" type="success" style="margin:2px;">
                        {{ g }}
                    </el-tag>
                    <span v-if="!row.senderGroups || row.senderGroups.length === 0" style="color:#999;">-</span>
                </template>
            </el-table-column>
            <el-table-column label="静默分组" width="140">
                <template #default="{ row }">
                    <el-tag v-for="g in row.silentGroups" :key="g" size="small" type="info" style="margin:2px;">
                        {{ g }}
                    </el-tag>
                    <span v-if="!row.silentGroups || row.silentGroups.length === 0" style="color:#999;">-</span>
                </template>
            </el-table-column>
            <el-table-column label="进群间隔" width="80" align="center">
                <template #default="{ row }">{{ row.joinInterval || 30 }}s</template>
            </el-table-column>
            <el-table-column label="发消息间隔" width="90" align="center">
                <template #default="{ row }">{{ row.sendInterval || 60 }}s</template>
            </el-table-column>
            <el-table-column label="已进群" width="70" align="center">
                <template #default="{ row }">{{ row.joinedAccounts?.length || 0 }}</template>
            </el-table-column>
            <el-table-column label="已发送" width="70" align="center">
                <template #default="{ row }">{{ row.totalSent || 0 }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
                <template #default="{ row }">
                    <el-tag :type="getStatusType(row.status)" size="small">
                        {{ getStatusLabel(row.status) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="150">
                <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="260" fixed="right">
                <template #default="{ row }">
                    <el-button size="small" type="primary" @click="showTaskDetail(row)">详情</el-button>
                    <el-button v-if="row.status === 'pending' || row.status === 'paused'" size="small" type="success"
                        @click="handleStart(row)">启动</el-button>
                    <el-button v-if="row.status === 'running'" size="small" type="warning"
                        @click="handlePause(row)">暂停</el-button>
                    <el-button size="small" type="danger" plain @click="handleDelete(row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div style="margin-top:20px;display:flex;justify-content:flex-end">
            <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]"
                :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="fetchTasks"
                @current-change="fetchTasks" />
        </div>

        <!-- ========================================== -->
        <!-- 创建任务对话框 -->
        <!-- ========================================== -->
        <el-dialog v-model="showCreateDialog" title="创建群聊任务" width="700px" :close-on-click-modal="false">
            <el-form :model="createForm" label-width="120px" label-position="right">
                <!-- 基本信息 -->
                <div class="form-section">
                    <div class="section-title"><span class="section-line"></span>基本信息</div>
                    <el-form-item label="任务名称" required>
                        <el-input v-model="createForm.name" placeholder="请输入任务名称" size="large" />
                    </el-form-item>
                    <el-form-item label="群组链接" required>
                        <el-input v-model="createForm.groupLink" placeholder="粘贴群组邀请链接" size="large" />
                        <div class="form-tip">支持格式: https://chat.whatsapp.com/xxx 或直接粘贴邀请码</div>
                    </el-form-item>
                    <el-form-item label="消息语言">
                        <el-radio-group v-model="createForm.language" size="large">
                            <el-radio-button value="zh">中文</el-radio-button>
                            <el-radio-button value="en">English</el-radio-button>
                            <el-radio-button value="pt">Português</el-radio-button>
                        </el-radio-group>
                        <div class="form-tip">群聊消息将从对应语言的消息池中随机选取</div>
                    </el-form-item>
                </div>

                <!-- 账号分组 -->
                <div class="form-section">
                    <div class="section-title"><span class="section-line"></span>账号分组</div>
                    <el-form-item label="发消息分组">
                        <el-select v-model="createForm.senderGroups" multiple placeholder="选择发消息的分组" style="width:100%"
                            size="large">
                            <el-option v-for="item in accountGroups" :key="item.name"
                                :label="item.name + ' (' + item.count + '个)'" :value="item.name" />
                        </el-select>
                        <div class="form-tip">这些账号会加入群组并发送消息</div>
                    </el-form-item>
                    <el-form-item label="静默分组">
                        <el-select v-model="createForm.silentGroups" multiple placeholder="选择静默的分组" style="width:100%"
                            size="large">
                            <el-option v-for="item in accountGroups" :key="item.name"
                                :label="item.name + ' (' + item.count + '个)'" :value="item.name" />
                        </el-select>
                        <div class="form-tip">这些账号只加入群组，不发送消息</div>
                    </el-form-item>
                </div>

                <!-- 间隔设置 -->
                <div class="form-section">
                    <div class="section-title"><span class="section-line"></span>间隔设置</div>
                    <el-form-item label="进群间隔">
                        <el-input-number v-model="createForm.joinInterval" :min="1" :max="999" size="large"
                            style="width:130px;" />
                        <span style="margin-left:8px;color:#86909c;">秒</span>
                        <div class="form-tip">每个账号进群的时间间隔</div>
                    </el-form-item>
                    <el-form-item label="发消息间隔">
                        <el-input-number v-model="createForm.sendInterval" :min="1" :max="999" size="large"
                            style="width:130px;" />
                        <span style="margin-left:8px;color:#86909c;">秒</span>
                        <div class="form-tip">每条消息发送的时间间隔</div>
                    </el-form-item>
                </div>

                <!-- 休息时间 -->
                <div class="form-section">
                    <div class="section-title"><span class="section-line"></span>休息时间</div>
                    <el-form-item label="休息时段">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <el-time-picker v-model="createForm.restStart" format="HH:mm" placeholder="开始时间"
                                size="large" style="width:150px;" />
                            <span>~</span>
                            <el-time-picker v-model="createForm.restEnd" format="HH:mm" placeholder="结束时间" size="large"
                                style="width:150px;" />
                        </div>
                        <div class="form-tip">休息时段内不发送消息（如 01:00 ~ 08:00）</div>
                    </el-form-item>
                </div>

                
            </el-form>

            <template #footer>
                <el-button @click="showCreateDialog = false" size="large">取消</el-button>
                <el-button type="primary" @click="handleCreate" :loading="creating" size="large">
                    {{ creating ? '创建中...' : '创建任务' }}
                </el-button>
            </template>
        </el-dialog>

        <!-- ========================================== -->
        <!-- 任务详情对话框 -->
        <!-- ========================================== -->
        <el-dialog v-model="showDetailDialog" :title="'群聊任务 - ' + (detailTask?.name || '')" width="900px"
            :close-on-click-modal="false">
            <div v-if="detailTask" v-loading="detailLoading">
                <!-- 基本信息 -->
                <el-descriptions :column="3" border size="small">
                    <el-descriptions-item label="任务名称">{{ detailTask.name }}</el-descriptions-item>
                    <el-descriptions-item label="状态">
                        <el-tag :type="getStatusType(detailTask.status)" size="small">{{
                            getStatusLabel(detailTask.status)
                        }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="群组链接">
                        <span style="font-size:12px;word-break:break-all;">{{ detailTask.groupLink ||
                            detailTask.inviteCode
                        }}</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="进群间隔">{{ detailTask.joinInterval || 30 }}秒</el-descriptions-item>
                    <el-descriptions-item label="发消息间隔">{{ detailTask.sendInterval || 60 }}秒</el-descriptions-item>
                    <el-descriptions-item label="休息时段">
                        {{ detailTask.restStart || '-' }} ~ {{ detailTask.restEnd || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="已进群">{{ detailTask.joinedAccounts?.length || 0
                    }}</el-descriptions-item>
                    <el-descriptions-item label="已发送">{{ detailTask.totalSent || 0 }}</el-descriptions-item>
                    <el-descriptions-item label="创建时间">{{ formatTime(detailTask.createdAt) }}</el-descriptions-item>
                </el-descriptions>

                <!-- 已进群账号 -->
                <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-weight:bold;font-size:13px;">已进群账号 ({{ detailTask.joinedAccounts?.length || 0
                        }})</span>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#f5f7fa;border-radius:4px;">
                        <el-tag v-for="acc in detailTask.joinedAccounts" :key="acc" size="small" type="success"
                            style="margin:2px;">
                            {{ acc }}
                        </el-tag>
                        <span v-if="!detailTask.joinedAccounts || detailTask.joinedAccounts.length === 0"
                            style="color:#999;font-size:13px;">暂无账号进群</span>
                    </div>
                </div>

                <!-- 进群失败账号 -->
                <div style="margin-top:12px;" v-if="failedAccountCount > 0">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-weight:bold;font-size:13px;">进群失败 ({{ failedAccountCount }})</span>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#f5f7fa;border-radius:4px;">
                        <el-tag v-for="(retry, acc) in failedAccountList" :key="acc" size="small" type="danger"
                            style="margin:2px;">
                            {{ acc }} (重试 {{ retry }}/3)
                        </el-tag>
                    </div>
                </div>

                <!-- 消息记录 -->
                <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-weight:bold;font-size:13px;">消息记录 ({{ messageTotal }})</span>
                    </div>
                    <el-table :data="detailMessages" border size="small" max-height="300">
                        <el-table-column prop="account" label="账号" width="150" />
                        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
                        <el-table-column prop="status" label="状态" width="100">
                            <template #default="{ row }">
                                <el-tag :type="getMsgStatusType(row.status)" size="small">{{
                                    getMsgStatusLabel(row.status) }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="sentAt" label="发送时间" width="170">
                            <template #default="{ row }">{{ formatTime(row.sentAt) }}</template>
                        </el-table-column>
                    </el-table>
                    <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                        <el-pagination v-model:current-page="msgPage" v-model:page-size="msgPageSize"
                            :page-sizes="[10, 20, 50]" :total="messageTotal" layout="total, sizes, prev, pager, next"
                            small @size-change="fetchMessages" @current-change="fetchMessages" />
                    </div>
                </div>
            </div>
            <template #footer>
                <el-button @click="showDetailDialog = false">关闭</el-button>
                <el-button type="primary" @click="refreshDetail">刷新</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import groupChatApi from '@/api/groupChat'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const tasks = ref([])
const accountGroups = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const creating = ref(false)

// ============ 创建表单 ============
const showCreateDialog = ref(false)
const createForm = reactive({
    name: '',
    groupLink: '',
    senderGroups: [],
    silentGroups: [],
    joinInterval: 30,
    sendInterval: 60,
    restStart: '',
    restEnd: '',
    language: 'pt'  // ✅ 默认葡萄牙语
})

// ============ 详情 ============
const showDetailDialog = ref(false)
const detailTask = ref(null)
const detailLoading = ref(false)
const detailMessages = ref([])
const messageTotal = ref(0)
const msgPage = ref(1)
const msgPageSize = ref(20)
const detailTimer = ref(null)

// ============ 计算属性 ============
const failedAccountCount = computed(() => {
    if (!detailTask.value?.failedAccounts) return 0
    return Object.keys(detailTask.value.failedAccounts).filter(k => !k.endsWith('_time')).length
})

const failedAccountList = computed(() => {
    if (!detailTask.value?.failedAccounts) return {}
    const result = {}
    for (const [key, value] of Object.entries(detailTask.value.failedAccounts)) {
        if (!key.endsWith('_time')) {
            result[key] = value
        }
    }
    return result
})

// ============ 状态映射 ============
const statusMap = {
    pending: '待执行',
    running: '执行中',
    paused: '已暂停',
    completed: '已完成',
    stopped: '已停止'
}
const statusTypeMap = {
    pending: 'info',
    running: 'warning',
    paused: 'warning',
    completed: 'success',
    stopped: 'danger'
}
const getStatusLabel = (s) => statusMap[s] || s
const getStatusType = (s) => statusTypeMap[s] || 'info'

const msgStatusMap = { sent: '已发送', delivered: '已送达', read: '已读', failed: '失败' }
const msgStatusTypeMap = { sent: 'info', delivered: 'success', read: 'success', failed: 'danger' }
const getMsgStatusLabel = (s) => msgStatusMap[s] || s
const getMsgStatusType = (s) => msgStatusTypeMap[s] || 'info'

const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'

// ============ 数据获取 ============
const fetchAccountGroups = async () => {
    try {
        const res = await api.get('/whatsapp/accounts/groups')
        if (res.code === 0) accountGroups.value = res.data || []
    } catch (error) { }
}

const fetchTasks = async () => {
    loading.value = true
    try {
        const params = { page: page.value, page_size: pageSize.value }
        if (filterStatus.value) params.status = filterStatus.value
        const res = await groupChatApi.getTasks(params)
        if (res.code === 0) {
            tasks.value = res.data.data || []
            total.value = res.data.total || 0
        }
    } catch (error) {
        ElMessage.error('获取任务列表失败')
    } finally {
        loading.value = false
    }
}

// ============ 创建任务 ============
const handleCreate = async () => {
    if (!createForm.name) { ElMessage.warning('请输入任务名称'); return }
    if (!createForm.groupLink) { ElMessage.warning('请输入群组链接'); return }
    if (createForm.senderGroups.length === 0 && createForm.silentGroups.length === 0) {
        ElMessage.warning('请至少选择一个分组')
        return
    }
    if (createForm.messages.length === 0) { ElMessage.warning('请至少添加一条消息'); return }

    creating.value = true
    try {
        const data = {
            ...createForm,
            restStart: createForm.restStart ? dayjs(createForm.restStart).format('HH:mm') : '',
            restEnd: createForm.restEnd ? dayjs(createForm.restEnd).format('HH:mm') : '',
        }
        const res = await groupChatApi.createTask(data)
        if (res.code === 0) {
            ElMessage.success('任务创建成功')
            showCreateDialog.value = false
            createForm.name = ''
            createForm.groupLink = ''
            createForm.senderGroups = []
            createForm.silentGroups = []
            createForm.messages = ['Hello!', 'Hi there!', 'Good morning!']
            fetchTasks()
        }
    } catch (error) {
        ElMessage.error('创建失败: ' + (error.message || ''))
    } finally {
        creating.value = false
    }
}

// ============ 任务操作 ============
const handleStart = async (row) => {
    try {
        await ElMessageBox.confirm('确定要启动任务 "' + row.name + '" 吗？', '提示', { type: 'info' })
        const res = await groupChatApi.startTask(row.id)
        if (res.code === 0) { ElMessage.success('任务已启动'); fetchTasks() }
    } catch (error) {
        if (error !== 'cancel') ElMessage.error('启动失败')
    }
}

const handlePause = async (row) => {
    try {
        await ElMessageBox.confirm('确定要暂停任务 "' + row.name + '" 吗？', '提示', { type: 'warning' })
        const res = await groupChatApi.pauseTask(row.id)
        if (res.code === 0) { ElMessage.success('任务已暂停'); fetchTasks() }
    } catch (error) {
        if (error !== 'cancel') ElMessage.error('暂停失败')
    }
}

const handleDelete = async (row) => {
    try {
        await ElMessageBox.confirm('确定要删除任务 "' + row.name + '" 吗？', '提示', { type: 'warning' })
        const res = await groupChatApi.deleteTask(row.id)
        if (res.code === 0) { ElMessage.success('删除成功'); fetchTasks() }
    } catch (error) {
        if (error !== 'cancel') ElMessage.error('删除失败')
    }
}

// ============ 任务详情 ============
const fetchMessages = async () => {
    if (!detailTask.value) return
    try {
        const res = await api.get('/group-chat/tasks/' + detailTask.value.id, {
            params: { page: msgPage.value, page_size: msgPageSize.value }
        })
        if (res.code === 0) {
            detailMessages.value = res.data.messages || []
            messageTotal.value = res.data.total || 0
        }
    } catch (error) { }
}

const showTaskDetail = async (row) => {
    showDetailDialog.value = true
    detailLoading.value = true
    detailTask.value = row
    msgPage.value = 1

    try {
        const res = await api.get('/group-chat/tasks/' + row.id)
        if (res.code === 0) {
            detailTask.value = res.data.task
            detailMessages.value = res.data.messages || []
            messageTotal.value = res.data.total || 0
        }
    } catch (error) {
        ElMessage.error('获取任务详情失败')
    } finally {
        detailLoading.value = false
    }

    if (detailTimer.value) clearInterval(detailTimer.value)
    detailTimer.value = setInterval(() => {
        if (showDetailDialog.value && detailTask.value) {
            refreshDetail()
        }
    }, 5000)
}

const refreshDetail = async () => {
    if (!detailTask.value) return
    try {
        const res = await api.get('/group-chat/tasks/' + detailTask.value.id, {
            params: { page: msgPage.value, page_size: msgPageSize.value }
        })
        if (res.code === 0) {
            detailTask.value = res.data.task
            detailMessages.value = res.data.messages || []
            messageTotal.value = res.data.total || 0
        }
    } catch (error) { }
}

// ============ 生命周期 ============
onMounted(() => {
    fetchAccountGroups()
    fetchTasks()
})

onBeforeUnmount(() => {
    if (detailTimer.value) clearInterval(detailTimer.value)
})
</script>

<style scoped>
.toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 8px;
}

.form-section {
    margin-bottom: 24px;
}

.section-title {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    color: #1d2129;
    margin-bottom: 16px;
}

.section-line {
    display: inline-block;
    width: 3px;
    height: 16px;
    background: #409eff;
    border-radius: 2px;
    margin-right: 10px;
}

.form-tip {
    font-size: 12px;
    color: #86909c;
    margin-top: 4px;
    line-height: 1.5;
}
</style>