<template>
    <div class="ws-groups">
        <!-- 工具栏 -->
        <div class="toolbar">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;width:100%;">
                <el-button type="primary" @click="showImportDialog = true">
                    <el-icon>
                        <Upload />
                    </el-icon> 导入群组
                </el-button>
                <el-button type="success" @click="showBatchJoinDialog = true" :disabled="batchTaskRunning">
                    <el-icon>
                        <Promotion />
                    </el-icon> 批量入群
                </el-button>
                <el-button type="warning" plain @click="showBatchUpdateDialog = true"
                    :disabled="selectedIds.length === 0">
                    <el-icon>
                        <Edit />
                    </el-icon> 批量修改 ({{ selectedIds.length }})
                </el-button>
                <el-button type="danger" plain @click="handleBatchDelete" :disabled="selectedIds.length === 0">
                    <el-icon>
                        <Delete />
                    </el-icon> 批量删除
                </el-button>
                <el-button @click="fetchGroups">
                    <el-icon>
                        <Refresh />
                    </el-icon> 刷新
                </el-button>

                <div style="margin-left:auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <el-select v-model="filterExists" placeholder="全部状态" clearable @change="fetchGroups"
                        style="width:120px">
                        <el-option label="全部" value="" />
                        <el-option label="存在" value="true" />
                        <el-option label="不存在" value="false" />
                    </el-select>
                    <el-input-number v-model="filterMessageCount" :min="0" placeholder="消息数" controls-position="right"
                        style="width:140px" />
                    <el-button size="default" type="primary" @click="fetchGroups">
                        <el-icon>
                            <Search />
                        </el-icon> 筛选
                    </el-button>
                    <el-button size="default" @click="resetFilter">重置</el-button>
                    <el-input v-model="searchKeyword" placeholder="搜索群链接" clearable prefix-icon="Search"
                        style="width:180px" @input="fetchGroups" />
                </div>
            </div>
        </div>

        <!-- 批量入群进度卡片 -->
        <el-card v-if="batchTask" style="margin-bottom:20px;border-color:#409eff;">
            <template #header>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span>
                        <el-icon v-if="batchTaskRunning">
                            <Loading />
                        </el-icon>
                        <el-icon v-else>
                            <Check />
                        </el-icon>
                        批量入群任务
                        <el-tag :type="batchTaskStatusType" size="small" style="margin-left:10px;">
                            {{ batchTaskStatusLabel }}
                        </el-tag>
                    </span>
                    <div>
                        <el-button v-if="batchTaskRunning" type="danger" size="small" plain @click="handleCancelTask"
                            :loading="cancelling">
                            取消任务
                        </el-button>
                        <el-button size="small" @click="fetchTaskStatus">刷新</el-button>
                    </div>
                </div>
            </template>

            <div>
                <!-- 进度信息 -->
                <el-row :gutter="20">
                    <el-col :span="6">
                        <div style="text-align:center;padding:10px 0;">
                            <div style="font-size:20px;color:#409eff;">{{ batchTask.total || 0 }}</div>
                            <div style="color:#999;font-size:13px;">总群组</div>
                        </div>
                    </el-col>
                    <el-col :span="6">
                        <div style="text-align:center;padding:10px 0;">
                            <div style="font-size:20px;color:#67c23a;">{{ batchTask.success || 0 }}</div>
                            <div style="color:#999;font-size:13px;">成功</div>
                        </div>
                    </el-col>
                    <el-col :span="6">
                        <div style="text-align:center;padding:10px 0;">
                            <div style="font-size:20px;color:#f56c6c;">{{ batchTask.failed || 0 }}</div>
                            <div style="color:#999;font-size:13px;">失败</div>
                        </div>
                    </el-col>
                    <el-col :span="6">
                        <div style="text-align:center;padding:10px 0;">
                            <div style="font-size:20px;color:#e6a23c;">{{ batchTask.current || 0 }}</div>
                            <div style="color:#999;font-size:13px;">已处理</div>
                        </div>
                    </el-col>
                </el-row>

                <!-- 进度条 -->
                <el-progress :percentage="batchProgress" :color="batchProgressColor" :stroke-width="18"
                    :text-inside="true" :status="batchProgressStatus" />

                <!-- 当前处理 -->
                <div
                    style="margin-top:10px;color:#666;font-size:13px;display:flex;justify-content:space-between;flex-wrap:wrap;">
                    <span>
                        当前处理:
                        <el-tag size="small" type="info">{{ batchTask.currentGroup || '等待中...' }}</el-tag>
                    </span>
                    <span style="color:#999;">
                        开始时间: {{ formatTime(batchTask.startedAt) }}
                        <span v-if="batchTask.updatedAt" style="margin-left:15px;">
                            更新: {{ formatTime(batchTask.updatedAt) }}
                        </span>
                    </span>
                </div>

                <!-- 消息 -->
                <div style="margin-top:8px;color:#999;font-size:12px;">
                    {{ batchTask.message || '处理中...' }}
                </div>
            </div>
        </el-card>

        <!-- 统计卡片 -->
        <el-row :gutter="20" style="margin-bottom:20px">
            <el-col :span="6">
                <el-card>
                    <div style="text-align:center">
                        <div style="font-size:24px;color:#409eff">{{ stats.total || 0 }}</div>
                        <div style="color:#999;font-size:14px">总群组</div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card>
                    <div style="text-align:center">
                        <div style="font-size:24px;color:#67c23a">{{ stats.exists || 0 }}</div>
                        <div style="color:#999;font-size:14px">存在</div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card>
                    <div style="text-align:center">
                        <div style="font-size:24px;color:#909399">{{ stats.not_exists || 0 }}</div>
                        <div style="color:#999;font-size:14px">不存在</div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card>
                    <div style="text-align:center">
                        <div style="font-size:24px;color:#e6a23c">{{ pendingCount || 0 }}</div>
                        <div style="color:#999;font-size:14px">待处理</div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <!-- 群组列表 -->
        <el-table :data="groups" v-loading="loading" border @selection-change="handleSelectionChange" row-key="id">
            <el-table-column type="selection" width="40" />
            <el-table-column prop="inviteCode" label="群链接" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">
                    <span style="font-size:12px;font-family:monospace;">{{ row.inviteCode }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="groupJID" label="群组JID" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">
                    <span v-if="row.groupJID" style="font-size:12px;font-family:monospace;">{{ row.groupJID }}</span>
                    <span v-else style="color:#999;">-</span>
                </template>
            </el-table-column>
            <el-table-column prop="isExists" label="是否存在" width="80" align="center">
                <template #default="{ row }">
                    <el-tag :type="row.isExists ? 'success' : 'danger'" size="small">
                        {{ row.isExists ? '是' : '否' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="memberCount" label="成员数" width="70" align="center">
                <template #default="{ row }">
                    {{ row.memberCount || '-' }}
                </template>
            </el-table-column>
            <el-table-column prop="messageCount" label="消息数" width="70" align="center">
                <template #default="{ row }">
                    {{ row.messageCount || 0 }}
                </template>
            </el-table-column>
            <el-table-column prop="joinSuccess" label="入群成功" width="80" align="center">
                <template #default="{ row }">
                    <el-tag type="success" size="small">{{ row.joinSuccess || 0 }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="joinFailed" label="入群失败" width="80" align="center">
                <template #default="{ row }">
                    <el-tag type="danger" size="small">{{ row.joinFailed || 0 }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="canSpeak" label="任意发言" width="80" align="center">
                <template #default="{ row }">
                    <el-tag :type="row.canSpeak ? 'success' : 'info'" size="small">
                        {{ row.canSpeak ? '是' : '否' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="canJoin" label="任意加入" width="80" align="center">
                <template #default="{ row }">
                    <el-tag :type="row.canJoin ? 'success' : 'info'" size="small">
                        {{ row.canJoin ? '是' : '否' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="importedAt" label="导入时间" width="150">
                <template #default="{ row }">
                    {{ formatTime(row.importedAt) }}
                </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                    <el-button size="small" type="primary" plain @click="editGroup(row)">编辑</el-button>
                    <el-button size="small" type="danger" plain @click="handleDelete(row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div style="margin-top:20px;display:flex;justify-content:flex-end">
            <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
                :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="fetchGroups"
                @current-change="fetchGroups" />
        </div>

        <!-- ========================================== -->
        <!-- 导入群组对话框 -->
        <!-- ========================================== -->
        <el-dialog v-model="showImportDialog" title="导入群组" width="650px">
            <el-form :model="importForm" label-width="100px">
                <el-form-item label="上传文件">
                    <el-upload ref="uploadRef" :auto-upload="false" accept=".xlsx,.xls,.csv,.txt" :limit="1"
                        :on-change="handleFileChange" :on-remove="handleFileRemove" :on-exceed="handleExceed">
                        <el-button type="primary" plain>
                            <el-icon>
                                <FolderOpened />
                            </el-icon> 选择文件（.xlsx / .xls / .csv / .txt）
                        </el-button>
                        <template #tip>
                            <div style="font-size:12px;color:#999;margin-top:4px;">
                                支持 Excel 或文本文件，自动提取所有 WhatsApp 群链接
                            </div>
                        </template>
                    </el-upload>
                </el-form-item>
                <el-form-item v-if="importForm.fileName" label="已选文件">
                    <el-tag size="large">{{ importForm.fileName }}</el-tag>
                    <el-button type="danger" link @click="handleFileRemove">移除</el-button>
                </el-form-item>
                <el-form-item label="或手动输入">
                    <el-input v-model="importForm.linksText" type="textarea" :rows="5"
                        placeholder="每行一个群链接，如：&#10;https://chat.whatsapp.com/xxx&#10;JQRNmDAMcTkILZI8yBWKkm" />
                </el-form-item>
                <el-form-item v-if="parsedCount > 0" label="识别结果">
                    <el-tag type="success">成功识别 {{ parsedCount }} 个群组链接</el-tag>
                    <el-button type="primary" link @click="showParsedLinks = !showParsedLinks">
                        {{ showParsedLinks ? '收起' : '查看详情' }}
                    </el-button>
                    <div v-if="showParsedLinks"
                        style="margin-top:8px;max-height:150px;overflow-y:auto;background:#f5f7fa;padding:8px;border-radius:4px;">
                        <div v-for="(link, idx) in parsedLinksPreview" :key="idx"
                            style="font-size:12px;font-family:monospace;padding:2px 0;border-bottom:1px solid #e4e7ed;">
                            {{ link }}
                        </div>
                        <div v-if="parsedLinksPreview.length === 0 && parsedCount > 0"
                            style="color:#999;font-size:12px;">
                            点击"查看详情"展开列表
                        </div>
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showImportDialog = false">取消</el-button>
                <el-button type="primary" @click="handleImport" :loading="importing">
                    {{ importing ? '导入中...' : '导入' }}
                </el-button>
            </template>
        </el-dialog>

        <!-- ========================================== -->
        <!-- 批量入群对话框 -->
        <!-- ========================================== -->
        <el-dialog v-model="showBatchJoinDialog" title="批量入群" width="550px" :close-on-click-modal="false">
            <el-form :model="batchJoinForm" label-width="140px">
                <el-form-item label="账号分组" required>
                    <el-select v-model="batchJoinForm.accountGroup" placeholder="选择账号分组" style="width:100%">
                        <el-option v-for="item in accountGroups" :key="item.name"
                            :label="item.name + ' (' + item.count + '个)'" :value="item.name" />
                    </el-select>
                </el-form-item>
                <el-form-item label="入群模式">
                    <el-radio-group v-model="batchJoinForm.mode">
                        <el-radio-button value="pending">待处理群</el-radio-button>
                        <el-radio-button value="active">活跃群</el-radio-button>
                    </el-radio-group>
                    <div style="font-size:12px;color:#999;margin-top:4px;">
                        待处理群：优先处理 group_jid为空 且 join_failed=0 的群
                    </div>
                </el-form-item>
                <el-form-item label="活跃阈值" v-if="batchJoinForm.mode === 'active'">
                    <el-input-number v-model="batchJoinForm.threshold" :min="1" :max="9999" style="width:100%" />
                    <div style="font-size:12px;color:#999;margin-top:4px;">仅入群消息数大于此值的群</div>
                </el-form-item>
                <el-form-item label="最大处理数量">
                    <el-input-number v-model="batchJoinForm.maxCount" :min="1" :max="999" style="width:100%" />
                    <div style="font-size:12px;color:#999;margin-top:4px;">单次最多处理的群数量</div>
                </el-form-item>
                <el-form-item v-if="batchTaskRunning" label="⚠️ 提示">
                    <el-alert type="warning" :closable="false" show-icon>
                        <template #title>当前有批量入群任务正在执行，请等待完成后再试</template>
                    </el-alert>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showBatchJoinDialog = false">取消</el-button>
                <el-button type="primary" @click="handleBatchJoin" :loading="batchJoining" :disabled="batchTaskRunning">
                    {{ batchTaskRunning ? '任务执行中...' : '执行入群' }}
                </el-button>
            </template>
        </el-dialog>

        <!-- ========================================== -->
        <!-- 批量修改对话框 -->
        <!-- ========================================== -->
        <el-dialog v-model="showBatchUpdateDialog" title="批量修改" width="450px">
            <el-form :model="batchUpdateForm" label-width="140px">
                <el-form-item label="选中群组">
                    <span>{{ selectedIds.length }} 个群组</span>
                </el-form-item>
                <el-form-item label="任意成员发言">
                    <el-switch v-model="batchUpdateForm.canSpeak" active-text="是" inactive-text="否" />
                </el-form-item>
                <el-form-item label="任意加入">
                    <el-switch v-model="batchUpdateForm.canJoin" active-text="是" inactive-text="否" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showBatchUpdateDialog = false">取消</el-button>
                <el-button type="primary" @click="handleBatchUpdate" :loading="batchUpdating">确定</el-button>
            </template>
        </el-dialog>

        <!-- ========================================== -->
        <!-- 编辑群组对话框 -->
        <!-- ========================================== -->
        <el-dialog v-model="showEditDialog" title="编辑群组" width="500px">
            <el-form :model="editForm" label-width="120px">
                <el-form-item label="群链接">
                    <span style="font-family:monospace;">{{ editForm.inviteCode }}</span>
                </el-form-item>
                <el-form-item label="群组JID">
                    <el-input v-model="editForm.groupJID" placeholder="例如: 120363360712291040@g.us" />
                </el-form-item>
                <el-form-item label="是否存在">
                    <el-switch v-model="editForm.isExists" active-text="是" inactive-text="否" />
                </el-form-item>
                <el-form-item label="入群成功次数">
                    <el-input-number v-model="editForm.joinSuccess" :min="0" style="width:100%" />
                </el-form-item>
                <el-form-item label="入群失败次数">
                    <el-input-number v-model="editForm.joinFailed" :min="0" style="width:100%" />
                </el-form-item>
                <el-form-item label="成员数量">
                    <el-input-number v-model="editForm.memberCount" :min="0" style="width:100%" />
                </el-form-item>
                <el-form-item label="消息数量">
                    <el-input-number v-model="editForm.messageCount" :min="0" style="width:100%" />
                </el-form-item>
                <el-form-item label="任意成员发言">
                    <el-switch v-model="editForm.canSpeak" active-text="是" inactive-text="否" />
                </el-form-item>
                <el-form-item label="任意加入">
                    <el-switch v-model="editForm.canJoin" active-text="是" inactive-text="否" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showEditDialog = false">取消</el-button>
                <el-button type="primary" @click="handleEdit" :loading="editing">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    Upload,
    Promotion,
    Edit,
    Delete,
    Refresh,
    Search,
    FolderOpened,
    Loading,
    Check
} from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

// ============ 状态 ============
const groups = ref([])
const accountGroups = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const filterExists = ref('')
const filterMessageCount = ref(0)
const selectedIds = ref([])
const stats = ref({ total: 0, exists: 0, not_exists: 0 })
const pendingCount = ref(0)

// ============ 导入 ============
const showImportDialog = ref(false)
const importing = ref(false)
const uploadRef = ref(null)
const importForm = reactive({
    linksText: '',
    fileName: '',
    fileData: null
})
const parsedCount = ref(0)
const showParsedLinks = ref(false)
const parsedLinksPreview = ref([])

// ============ 批量入群 ============
const showBatchJoinDialog = ref(false)
const batchJoining = ref(false)
const batchJoinForm = reactive({
    accountGroup: '',
    mode: 'pending',
    threshold: 10,
    maxCount: 100
})

// ============ 批量入群任务状态 ============
const batchTask = ref(null)
const batchTaskRunning = ref(false)
const cancelling = ref(false)
let statusPollingTimer = null

// ============ 批量修改 ============
const showBatchUpdateDialog = ref(false)
const batchUpdating = ref(false)
const batchUpdateForm = reactive({
    canSpeak: false,
    canJoin: false
})

// ============ 编辑 ============
const showEditDialog = ref(false)
const editing = ref(false)
const editForm = reactive({
    id: '',
    inviteCode: '',
    groupJID: '',
    isExists: true,
    joinSuccess: 0,
    joinFailed: 0,
    memberCount: 0,
    messageCount: 0,
    canSpeak: false,
    canJoin: false
})

// ============ 计算属性 ============
const batchProgress = computed(() => {
    if (!batchTask.value || !batchTask.value.total || batchTask.value.total === 0) return 0
    const processed = (batchTask.value.success || 0) + (batchTask.value.failed || 0)
    return Math.round((processed / batchTask.value.total) * 100)
})

const batchProgressColor = computed(() => {
    const p = batchProgress.value
    if (p === 100) return '#67c23a'
    if (p > 50) return '#409eff'
    return '#e6a23c'
})

const batchProgressStatus = computed(() => {
    if (!batchTask.value) return ''
    if (batchTask.value.status === 'completed') return 'success'
    if (batchTask.value.status === 'failed' || batchTask.value.status === 'cancelled') return 'exception'
    return ''
})

const batchTaskStatusLabel = computed(() => {
    if (!batchTask.value) return '未知'
    const map = {
        pending: '等待中',
        running: '执行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消'
    }
    return map[batchTask.value.status] || batchTask.value.status
})

const batchTaskStatusType = computed(() => {
    if (!batchTask.value) return 'info'
    const map = {
        pending: 'info',
        running: 'warning',
        completed: 'success',
        failed: 'danger',
        cancelled: 'info'
    }
    return map[batchTask.value.status] || 'info'
})

// ============ 工具函数 ============
const formatTime = (time) => {
    return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
}

// ==========================================
// 提取 WhatsApp 群链接
// ==========================================
const extractWhatsAppLinks = (content) => {
    const allLinks = new Set()

    const fullLinkRegex = /https?:\/\/chat\.whatsapp\.com\/([a-zA-Z0-9_-]{20,})/gi
    const codeRegex = /([a-zA-Z0-9_-]{20,})/g

    const lines = content.split(/\r?\n/).filter(line => line.trim())

    for (const line of lines) {
        let match
        while ((match = fullLinkRegex.exec(line)) !== null) {
            const fullUrl = match[0]
            const code = match[1]
            allLinks.add(fullUrl)
            allLinks.add(code)
        }

        if (line.includes('chat.whatsapp.com') && !line.match(fullLinkRegex)) {
            const parts = line.split('chat.whatsapp.com/')
            for (let i = 1; i < parts.length; i++) {
                const code = parts[i].split(/[\s,;\t"']/)[0]
                if (code && code.length >= 20) {
                    allLinks.add(code)
                }
            }
        }

        if (line.includes('<br>')) {
            const brParts = line.split('<br>')
            for (const part of brParts) {
                const trimmed = part.trim()
                if (trimmed.includes('chat.whatsapp.com')) {
                    const code = trimmed.split('chat.whatsapp.com/')[1]?.split(/[\s,;]/)[0]
                    if (code && code.length >= 20) {
                        allLinks.add(code)
                    }
                }
                const codeMatch = trimmed.match(codeRegex)
                if (codeMatch) {
                    for (const c of codeMatch) {
                        if (c.length >= 20) {
                            allLinks.add(c)
                        }
                    }
                }
            }
        }

        const codeMatches = line.match(codeRegex)
        if (codeMatches) {
            for (const c of codeMatches) {
                if (c.length >= 20 && !/^\d+$/.test(c)) {
                    allLinks.add(c)
                }
            }
        }
    }

    return Array.from(allLinks)
}

// ==========================================
// 文件导入处理
// ==========================================
const handleFileChange = (file) => {
    importForm.fileName = file.name
    importForm.fileData = file.raw

    const reader = new FileReader()
    reader.onload = (e) => {
        let content = e.target.result
        let links = []

        if (file.name.match(/\.(xlsx|xls)$/i)) {
            try {
                const workbook = XLSX.read(content, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

                for (const row of jsonData) {
                    if (!row || row.length === 0) continue
                    for (const cell of row) {
                        if (cell && typeof cell === 'string') {
                            if (cell.includes('chat.whatsapp.com')) {
                                const codes = extractWhatsAppLinks(cell)
                                links.push(...codes)
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Excel 解析失败:', error)
                content = new TextDecoder().decode(content)
                links = extractWhatsAppLinks(content)
            }
        } else {
            links = extractWhatsAppLinks(content)
        }

        const uniqueLinks = [...new Set(links)].filter(l => l && l.length >= 20)
        parsedCount.value = uniqueLinks.length
        parsedLinksPreview.value = uniqueLinks.slice(0, 50)

        if (uniqueLinks.length > 0) {
            ElMessage.success(`成功识别 ${uniqueLinks.length} 个群组链接`)
            importForm.linksText = uniqueLinks.join('\n')
        } else {
            ElMessage.warning('未能从文件中识别到 WhatsApp 群链接，请检查格式')
        }
    }

    if (file.name.match(/\.(xlsx|xls)$/i)) {
        reader.readAsArrayBuffer(file.raw)
    } else {
        reader.readAsText(file.raw)
    }
}

const handleFileRemove = () => {
    importForm.fileName = ''
    importForm.fileData = null
    parsedCount.value = 0
    parsedLinksPreview.value = []
    showParsedLinks.value = false
    uploadRef.value?.clearFiles()
}

const handleExceed = () => {
    ElMessage.warning('一次只能上传一个文件')
}

// ==========================================
// 导入
// ==========================================
const handleImport = async () => {
    let allLinks = []

    if (importForm.linksText.trim()) {
        const textLinks = importForm.linksText.split('\n')
            .map(line => line.trim())
            .filter(line => line)
        allLinks.push(...textLinks)
    }

    if (importForm.fileData && allLinks.length === 0) {
        const content = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = reject
            if (importForm.fileData.name.match(/\.(xlsx|xls)$/i)) {
                reader.readAsArrayBuffer(importForm.fileData)
            } else {
                reader.readAsText(importForm.fileData)
            }
        })
        const links = extractWhatsAppLinks(content)
        allLinks.push(...links)
    }

    allLinks = [...new Set(allLinks)]
        .filter(l => l && l.length >= 20)
        .map(l => {
            if (l.includes('chat.whatsapp.com/')) {
                return l.split('chat.whatsapp.com/')[1]?.split(/[\s,;]/)[0] || l
            }
            return l
        })
        .filter(l => l && l.length >= 20)

    if (allLinks.length === 0) {
        ElMessage.warning('未提取到任何群链接，请检查文件格式')
        return
    }

    importing.value = true
    try {
        const batchSize = 100
        let totalSuccess = 0
        let totalDuplicate = 0

        for (let i = 0; i < allLinks.length; i += batchSize) {
            const batch = allLinks.slice(i, i + batchSize)
            const res = await api.post('/ws-groups/import', { inviteCodes: batch })
            if (res.code === 0) {
                totalSuccess += res.data.success || 0
                totalDuplicate += res.data.duplicate || 0
            }
        }

        ElMessage.success(`导入完成：成功 ${totalSuccess} 个，重复 ${totalDuplicate} 个，共 ${allLinks.length} 个`)
        showImportDialog.value = false
        importForm.linksText = ''
        importForm.fileName = ''
        importForm.fileData = null
        parsedCount.value = 0
        parsedLinksPreview.value = []
        showParsedLinks.value = false
        uploadRef.value?.clearFiles()
        fetchGroups()
    } catch (error) {
        ElMessage.error('导入失败: ' + (error.message || ''))
    } finally {
        importing.value = false
    }
}

// ==========================================
// 批量入群任务状态
// ==========================================
const fetchTaskStatus = async () => {
    try {
        const res = await api.get('/ws-groups/batch-join/status')
        if (res.code === 0) {
            const data = res.data
            batchTaskRunning.value = data.running || false
            batchTask.value = data.task || null
        }
    } catch (error) {
        console.error('获取任务状态失败:', error)
    }
}

// ==========================================
// 取消批量入群任务
// ==========================================
const handleCancelTask = async () => {
    try {
        await ElMessageBox.confirm('确定要取消当前批量入群任务吗？', '提示', { type: 'warning' })
        cancelling.value = true
        const res = await api.post('/ws-groups/batch-join/cancel')
        if (res.code === 0) {
            ElMessage.success('任务已取消')
            await fetchTaskStatus()
            if (statusPollingTimer) {
                clearInterval(statusPollingTimer)
                statusPollingTimer = null
            }
        }
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('取消失败: ' + (error.message || ''))
        }
    } finally {
        cancelling.value = false
    }
}

// ==========================================
// 轮询任务状态
// ==========================================
const startPolling = () => {
    if (statusPollingTimer) {
        clearInterval(statusPollingTimer)
    }
    statusPollingTimer = setInterval(async () => {
        await fetchTaskStatus()
        if (!batchTaskRunning.value && batchTask.value) {
            const status = batchTask.value.status
            if (status === 'completed' || status === 'failed' || status === 'cancelled') {
                clearInterval(statusPollingTimer)
                statusPollingTimer = null
                fetchGroups()
                if (status === 'completed') {
                    ElMessage.success('批量入群任务已完成')
                } else if (status === 'failed') {
                    ElMessage.error('批量入群任务失败: ' + (batchTask.value.message || ''))
                } else if (status === 'cancelled') {
                    ElMessage.info('批量入群任务已取消')
                }
            }
        }
    }, 2000)
}

// ==========================================
// 批量入群
// ==========================================
const handleBatchJoin = async () => {
    if (!batchJoinForm.accountGroup) {
        ElMessage.warning('请选择账号分组')
        return
    }
    if (batchJoinForm.mode === 'active' && batchJoinForm.threshold < 1) {
        ElMessage.warning('活跃阈值至少为1')
        return
    }

    if (batchTaskRunning.value) {
        ElMessage.warning('已有批量入群任务正在执行，请等待完成')
        return
    }

    batchJoining.value = true
    try {
        const res = await api.post('/ws-groups/batch-join', {
            accountGroup: batchJoinForm.accountGroup,
            mode: batchJoinForm.mode,
            threshold: batchJoinForm.threshold,
            maxCount: batchJoinForm.maxCount
        })
        if (res.code === 0) {
            ElMessage.success(res.data.message || '批量入群任务已启动')
            showBatchJoinDialog.value = false
            await fetchTaskStatus()
            startPolling()
        }
    } catch (error) {
        ElMessage.error('启动失败: ' + (error.message || ''))
    } finally {
        batchJoining.value = false
    }
}

// ==========================================
// 数据获取
// ==========================================
const fetchAccountGroups = async () => {
    try {
        const res = await api.get('/whatsapp/accounts/groups')
        if (res.code === 0) {
            accountGroups.value = res.data || []
        }
    } catch (error) { }
}

const fetchGroups = async () => {
    loading.value = true
    try {
        const params = {
            page: page.value,
            page_size: pageSize.value
        }
        if (filterExists.value !== '') {
            params.is_exists = filterExists.value
        }
        if (filterMessageCount.value > 0) {
            params.message_count_gt = filterMessageCount.value
        }
        if (searchKeyword.value) {
            params.keyword = searchKeyword.value
        }
        const res = await api.get('/ws-groups/list', { params })
        if (res.code === 0) {
            groups.value = res.data.data || []
            total.value = res.data.total || 0
            stats.value = res.data.stats || { total: 0, exists: 0, not_exists: 0 }
            stats.value.total = total.value
            pendingCount.value = groups.value.filter(g => g.isExists && !g.groupJID && g.joinFailed === 0).length
        }
    } catch (error) {
        ElMessage.error('获取群组列表失败')
    } finally {
        loading.value = false
    }
}

const resetFilter = () => {
    filterExists.value = ''
    filterMessageCount.value = 0
    searchKeyword.value = ''
    fetchGroups()
}

// ==========================================
// 选中
// ==========================================
const handleSelectionChange = (selection) => {
    selectedIds.value = selection.map(item => item.id)
}

// ==========================================
// 批量修改
// ==========================================
const handleBatchUpdate = async () => {
    if (selectedIds.value.length === 0) {
        ElMessage.warning('请选择群组')
        return
    }

    batchUpdating.value = true
    try {
        const res = await api.post('/ws-groups/batch-update', {
            ids: selectedIds.value,
            canSpeak: batchUpdateForm.canSpeak,
            canJoin: batchUpdateForm.canJoin
        })
        if (res.code === 0) {
            ElMessage.success(`成功更新 ${res.data.updated} 个群组`)
            showBatchUpdateDialog.value = false
            fetchGroups()
        }
    } catch (error) {
        ElMessage.error('更新失败: ' + (error.message || ''))
    } finally {
        batchUpdating.value = false
    }
}

// ==========================================
// 编辑
// ==========================================
const editGroup = (row) => {
    editForm.id = row.id
    editForm.inviteCode = row.inviteCode
    editForm.groupJID = row.groupJID || ''
    editForm.isExists = row.isExists || false
    editForm.joinSuccess = row.joinSuccess || 0
    editForm.joinFailed = row.joinFailed || 0
    editForm.memberCount = row.memberCount || 0
    editForm.messageCount = row.messageCount || 0
    editForm.canSpeak = row.canSpeak || false
    editForm.canJoin = row.canJoin || false
    showEditDialog.value = true
}

const handleEdit = async () => {
    editing.value = true
    try {
        const res = await api.put(`/ws-groups/${editForm.id}`, {
            canSpeak: editForm.canSpeak,
            canJoin: editForm.canJoin
        })
        if (res.code === 0) {
            ElMessage.success('更新成功')
            showEditDialog.value = false
            fetchGroups()
        }
    } catch (error) {
        ElMessage.error('更新失败: ' + (error.message || ''))
    } finally {
        editing.value = false
    }
}

// ==========================================
// 删除
// ==========================================
const handleDelete = async (row) => {
    try {
        await ElMessageBox.confirm(`确定要删除群组 ${row.inviteCode} 吗？`, '提示', { type: 'warning' })
        const res = await api.delete(`/ws-groups/${row.id}`)
        if (res.code === 0) {
            ElMessage.success('删除成功')
            fetchGroups()
        }
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('删除失败')
        }
    }
}

const handleBatchDelete = async () => {
    if (selectedIds.value.length === 0) {
        ElMessage.warning('请选择群组')
        return
    }
    try {
        await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 个群组吗？`, '提示', { type: 'warning' })
        const res = await api.post('/ws-groups/batch-delete', { ids: selectedIds.value })
        if (res.code === 0) {
            ElMessage.success(`成功删除 ${res.data.deleted} 个群组`)
            selectedIds.value = []
            fetchGroups()
        }
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('删除失败')
        }
    }
}

// ==========================================
// 生命周期
// ==========================================
onMounted(() => {
    fetchAccountGroups()
    fetchGroups()
    fetchTaskStatus()
    if (batchTaskRunning.value) {
        startPolling()
    }
})

onBeforeUnmount(() => {
    if (statusPollingTimer) {
        clearInterval(statusPollingTimer)
        statusPollingTimer = null
    }
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
</style>