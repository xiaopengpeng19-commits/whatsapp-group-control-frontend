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
                <el-button type="success" @click="showBatchJoinDialog = true">
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

                <div style="margin-left:auto;display:flex;gap:10px;align-items:center;">
                    <el-select v-model="filterExists" placeholder="全部状态" clearable @change="fetchGroups"
                        style="width:120px">
                        <el-option label="全部" value="" />
                        <el-option label="存在" value="true" />
                        <el-option label="不存在" value="false" />
                    </el-select>
                    <el-input v-model="searchKeyword" placeholder="搜索群链接" clearable prefix-icon="Search"
                        style="width:180px" @input="fetchGroups" />
                </div>
            </div>
        </div>

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
                    <el-button size="small" type="primary" plain @click="editGroup(row)">
                        编辑
                    </el-button>
                    <el-button size="small" type="danger" plain @click="handleDelete(row)">
                        删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div style="margin-top:20px;display:flex;justify-content:flex-end">
            <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
                :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="fetchGroups"
                @current-change="fetchGroups" />
        </div>

        <!-- 导入群组对话框 -->
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
        <el-dialog v-model="showBatchJoinDialog" title="批量入群" width="550px">
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
            </el-form>
            <template #footer>
                <el-button @click="showBatchJoinDialog = false">取消</el-button>
                <el-button type="primary" @click="handleBatchJoin" :loading="batchJoining">
                    {{ batchJoining ? '执行中...' : '执行入群' }}
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
                <el-button type="primary" @click="handleBatchUpdate" :loading="batchUpdating">
                    确定
                </el-button>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Promotion, Edit, Delete, Refresh, Search } from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const groups = ref([])
const accountGroups = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const filterExists = ref('')
const selectedIds = ref([])
const stats = ref({ total: 0, exists: 0, not_exists: 0 })
const pendingCount = ref(0)

// ============ 导入 ============
const showImportDialog = ref(false)
const importing = ref(false)
const importForm = reactive({
    linksText: ''
})

// ============ 批量入群 ============
const showBatchJoinDialog = ref(false)
const batchJoining = ref(false)
const batchJoinForm = reactive({
    accountGroup: '',
    mode: 'pending',
    threshold: 10,
    maxCount: 100
})

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

// ============ 工具函数 ============
const formatTime = (time) => {
    return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
}

// ============ 数据获取 ============
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
        if (searchKeyword.value) {
            params.keyword = searchKeyword.value
        }
        const res = await api.get('/ws-groups/list', { params })
        if (res.code === 0) {
            groups.value = res.data.data || []
            total.value = res.data.total || 0
            stats.value = res.data.stats || { total: 0, exists: 0, not_exists: 0 }
            stats.value.total = total.value
            // 计算待处理数量（group_jid为空 且 join_failed=0 且 is_exists=true）
            pendingCount.value = groups.value.filter(g => g.isExists && !g.groupJID && g.joinFailed === 0).length
        }
    } catch (error) {
        ElMessage.error('获取群组列表失败')
    } finally {
        loading.value = false
    }
}

// ============ 选中 ============
const handleSelectionChange = (selection) => {
    selectedIds.value = selection.map(item => item.inviteCode)
}

// ============ 导入 ============
import * as XLSX from 'xlsx'

// ============ 导入 ============
const uploadRef = ref(null)
const importForm = reactive({
    linksText: '',
    fileName: '',
    fileData: null
})

// 文件选择
const handleFileChange = (file) => {
    importForm.fileName = file.name
    importForm.fileData = file.raw
}

const handleFileRemove = () => {
    importForm.fileName = ''
    importForm.fileData = null
    uploadRef.value?.clearFiles()
}

const handleExceed = () => {
    ElMessage.warning('一次只能上传一个文件')
}

// 从文件提取链接
const extractLinksFromFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

                const links = []
                for (const row of jsonData) {
                    if (!row || row.length === 0) continue
                    for (const cell of row) {
                        if (!cell) continue
                        const str = String(cell).trim()
                        // 匹配群链接或邀请码
                        if (str.includes('chat.whatsapp.com/') ||
                            str.match(/^[a-zA-Z0-9_-]{20,}$/)) {
                            links.push(str)
                        }
                    }
                }
                resolve(links)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 导入
const handleImport = async () => {
    let allLinks = []

    // 1. 从文件提取
    if (importForm.fileData) {
        try {
            const links = await extractLinksFromFile(importForm.fileData)
            allLinks.push(...links)
        } catch (error) {
            ElMessage.error('解析文件失败: ' + error.message)
            return
        }
    }

    // 2. 从文本输入提取
    if (importForm.linksText.trim()) {
        const textLinks = importForm.linksText.split('\n')
            .map(line => line.trim())
            .filter(line => line)
        allLinks.push(...textLinks)
    }

    if (allLinks.length === 0) {
        ElMessage.warning('未提取到任何群链接')
        return
    }

    // 去重
    allLinks = [...new Set(allLinks)]

    importing.value = true
    try {
        const res = await api.post('/ws-groups/import', {
            inviteCodes: allLinks
        })
        if (res.code === 0) {
            const { success, duplicate, total } = res.data
            ElMessage.success(`导入完成：成功 ${success} 个，重复 ${duplicate} 个，共 ${total} 个`)
            showImportDialog.value = false
            importForm.linksText = ''
            importForm.fileName = ''
            importForm.fileData = null
            uploadRef.value?.clearFiles()
            fetchGroups()
        }
    } catch (error) {
        ElMessage.error('导入失败: ' + (error.message || ''))
    } finally {
        importing.value = false
    }
}

// ============ 批量入群 ============
const handleBatchJoin = async () => {
    if (!batchJoinForm.accountGroup) {
        ElMessage.warning('请选择账号分组')
        return
    }
    if (batchJoinForm.mode === 'active' && batchJoinForm.threshold < 1) {
        ElMessage.warning('活跃阈值至少为1')
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
            ElMessage.success(`入群完成：成功 ${res.data.success} 个，失败 ${res.data.failed} 个`)
            showBatchJoinDialog.value = false
            fetchGroups()
        }
    } catch (error) {
        ElMessage.error('入群失败: ' + (error.message || ''))
    } finally {
        batchJoining.value = false
    }
}

// ============ 批量修改 ============
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

// ============ 编辑 ============
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

// ============ 删除 ============
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

// ============ 生命周期 ============
onMounted(() => {
    fetchAccountGroups()
    fetchGroups()
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