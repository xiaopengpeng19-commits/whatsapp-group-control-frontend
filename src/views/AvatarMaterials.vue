<!-- frontend/src/views/AvatarMaterials.vue -->

<template>
    <div class="avatar-materials">
        <!-- 工具栏 -->
        <div class="toolbar">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <el-button type="primary" @click="showUploadDialog = true">
                    <el-icon>
                        <Upload />
                    </el-icon> 上传头像
                </el-button>
                <el-select v-model="filterGroup" placeholder="全部分组" clearable @change="fetchList" style="width:150px">
                    <el-option label="全部分组" value="" />
                    <el-option v-for="item in groups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
                        :value="item.name" />
                </el-select>
                <el-button @click="fetchList">
                    <el-icon>
                        <Refresh />
                    </el-icon> 刷新
                </el-button>
                <span style="color:#999;font-size:13px;margin-left:auto;">共 {{ total }} 个头像</span>
            </div>
        </div>

        <!-- 分组统计 -->
        <el-card style="margin-bottom:20px;">
            <template #header><span>分组统计</span></template>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
                <div v-for="item in groups" :key="item.name" class="group-stat">
                    <el-tag size="large">{{ item.name }}: {{ item.count }} 个</el-tag>
                </div>
            </div>
        </el-card>

        <!-- 头像列表 -->
        <el-row :gutter="16">
            <el-col :span="4" v-for="item in list" :key="item.id" style="margin-bottom:16px;">
                <el-card :body-style="{ padding: '10px' }" class="avatar-card">
                    <div class="avatar-preview">
                        <img :src="item.fileUrl" :alt="item.name" @error="handleImageError" />
                    </div>
                    <div class="avatar-info">
                        <div class="avatar-name" :title="item.name">{{ item.name.substring(0, 15) }}</div>
                        <div class="avatar-meta">
                            <el-tag size="small" type="info">{{ item.group || '未分组' }}</el-tag>
                            <span style="font-size:11px;color:#999;margin-left:4px;">使用 {{ item.usedCount || 0 }}
                                次</span>
                        </div>
                    </div>
                    <div style="margin-top:6px;display:flex;gap:4px;">
                        <el-button size="small" type="danger" plain @click="handleDelete(item.id)">删除</el-button>
                        <el-button size="small" type="primary" plain @click="copyUrl(item.fileUrl)">复制URL</el-button>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <!-- 分页 -->
        <div style="margin-top:20px;display:flex;justify-content:flex-end;">
            <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[12, 24, 48, 96]"
                :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="fetchList"
                @current-change="fetchList" />
        </div>

        <!-- 上传对话框 -->
        <el-dialog v-model="showUploadDialog" title="上传头像" width="600px" :close-on-click-modal="false">
            <el-form :model="uploadForm" label-width="80px">
                <el-form-item label="分组">
                    <el-input v-model="uploadForm.group" placeholder="请输入分组名称（默认：默认分组）" />
                </el-form-item>
                <el-form-item label="选择图片">
                    <el-upload ref="uploadRef" :auto-upload="false" multiple accept="image/*" :limit="20"
                        :on-change="handleFileChange" :on-remove="handleFileRemove">
                        <el-button type="primary" plain>
                            <el-icon>
                                <FolderOpened />
                            </el-icon> 选择图片（可多选）
                        </el-button>
                        <template #tip>
                            <div style="font-size:12px;color:#999;margin-top:4px;">
                                支持 JPG/PNG，自动压缩为 640x640 JPG，不超过 2MB/张，可一次选择多张
                            </div>
                        </template>
                    </el-upload>
                </el-form-item>
                <el-form-item v-if="previewUrls.length > 0" label="已选图片">
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        <div v-for="(url, index) in previewUrls" :key="index"
                            style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #e4e7ed;">
                            <img :src="url" style="width:100%;height:100%;object-fit:cover;" />
                            <el-button size="small" type="danger" circle
                                style="position:absolute;top:-4px;right:-4px;width:20px;height:20px;padding:0;"
                                @click="removePreview(index)">
                                <el-icon>
                                    <Close />
                                </el-icon>
                            </el-button>
                        </div>
                    </div>
                    <div style="font-size:12px;color:#999;margin-top:4px;">
                        共 {{ previewUrls.length }} 张图片
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showUploadDialog = false">取消</el-button>
                <el-button type="primary" @click="handleUpload" :loading="uploading">
                    {{ uploading ? '上传中...' : '确定上传' }}
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Refresh, FolderOpened, Close } from '@element-plus/icons-vue'
import api from '@/api'

// ============ 状态 ============
const list = ref([])
const groups = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(24)
const filterGroup = ref('')
const loading = ref(false)
const uploading = ref(false)

const showUploadDialog = ref(false)
const uploadRef = ref(null)
const uploadFiles = ref([])
const previewUrls = ref([])
const uploadForm = reactive({ group: '' })

// ============ 数据获取 ============
const fetchList = async () => {
    loading.value = true
    try {
        const params = { page: page.value, page_size: pageSize.value }
        if (filterGroup.value) params.group = filterGroup.value
        const res = await api.get('/avatar-materials/list', { params })
        if (res.code === 0) {
            list.value = res.data.data || []
            total.value = res.data.total || 0
        }
    } catch (error) {
        ElMessage.error('获取列表失败')
    } finally {
        loading.value = false
    }
}

const fetchGroups = async () => {
    try {
        const res = await api.get('/avatar-materials/groups')
        if (res.code === 0) {
            groups.value = res.data || []
        }
    } catch (error) { }
}

// ============ 文件处理 ============
const handleFileChange = (file) => {
    uploadFiles.value.push(file.raw)
    previewUrls.value.push(URL.createObjectURL(file.raw))
}

const handleFileRemove = (file) => {
    const index = uploadFiles.value.findIndex(f => f.uid === file.uid)
    if (index !== -1) {
        uploadFiles.value.splice(index, 1)
        previewUrls.value.splice(index, 1)
    }
}

const removePreview = (index) => {
    uploadFiles.value.splice(index, 1)
    previewUrls.value.splice(index, 1)
}

// ============ 上传 ============
const handleUpload = async () => {
    if (uploadFiles.value.length === 0) {
        ElMessage.warning('请选择图片')
        return
    }

    uploading.value = true
    let successCount = 0
    let failCount = 0

    try {
        const group = uploadForm.group || '默认分组'

        for (const file of uploadFiles.value) {
            try {
                if (file.size > 2 * 1024 * 1024) {
                    ElMessage.warning(`${file.name} 超过 2MB，跳过`)
                    failCount++
                    continue
                }

                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = (e) => resolve(e.target.result)
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })

                const res = await api.post('/avatar-materials/upload', {
                    base64Content: base64,
                    group: group
                })

                if (res.code === 0) {
                    successCount++
                } else {
                    failCount++
                }
            } catch (err) {
                failCount++
            }
        }

        if (successCount > 0) {
            ElMessage.success(`上传完成：成功 ${successCount} 张${failCount > 0 ? `，失败 ${failCount} 张` : ''}`)
            showUploadDialog.value = false
            uploadFiles.value = []
            previewUrls.value = []
            uploadForm.group = ''
            uploadRef.value?.clearFiles()
            fetchList()
            fetchGroups()
        } else {
            ElMessage.error('上传失败，请检查图片格式')
        }
    } catch (error) {
        ElMessage.error('上传失败: ' + (error.message || ''))
    } finally {
        uploading.value = false
    }
}

// ============ 删除 ============
const handleDelete = async (id) => {
    try {
        await ElMessageBox.confirm('确定要删除该头像吗？', '提示', { type: 'warning' })
        const res = await api.delete(`/avatar-materials/${id}/delete`)
        if (res.code === 0) {
            ElMessage.success('删除成功')
            fetchList()
            fetchGroups()
        }
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('删除失败')
        }
    }
}

// ============ 复制 URL ============
const copyUrl = (url) => {
    if (!url) {
        ElMessage.warning('没有可复制的内容')
        return
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            ElMessage.success('已复制 URL')
        }).catch(() => {
            fallbackCopy(url)
        })
    } else {
        fallbackCopy(url)
    }
}

const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
        document.execCommand('copy')
        ElMessage.success('已复制 URL')
    } catch (err) {
        ElMessage.error('复制失败，请手动复制')
    }
    document.body.removeChild(textarea)
}

// ============ 图片加载失败占位 ============
const handleImageError = (e) => {
    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="50" y="110" font-size="14" fill="%23999"%3E图片加载失败%3C/text%3E%3C/svg%3E'
}

// ============ 生命周期 ============
onMounted(() => {
    fetchGroups()
    fetchList()
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

.avatar-card {
    transition: transform 0.2s;
}

.avatar-card:hover {
    transform: translateY(-4px);
}

.avatar-preview {
    width: 100%;
    padding-top: 100%;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    background: #f5f7fa;
}

.avatar-preview img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-info {
    margin-top: 8px;
}

.avatar-name {
    font-size: 12px;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.avatar-meta {
    display: flex;
    align-items: center;
    margin-top: 4px;
}
</style>