<template>
  <div class="templates">
    <div class="toolbar" style="margin-bottom: 20px;">
      <el-button type="primary" @click="openDialog()">新增模板</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border>
      <el-table-column prop="name" label="模板名称" width="150" />
      <el-table-column prop="title" label="链接标题" width="200" show-overflow-tooltip />
      <el-table-column prop="body" label="链接正文" min-width="200" show-overflow-tooltip />
      <el-table-column prop="url" label="链接地址" min-width="200" show-overflow-tooltip />
      <el-table-column prop="button" label="按钮文字" width="100" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="form.id ? '编辑模板' : '新增模板'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="form.name" placeholder="例如: 官网推广" />
        </el-form-item>
        <el-form-item label="链接标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="链接正文" required>
          <el-input v-model="form.body" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="链接地址" required>
          <el-input v-model="form.url" />
        </el-form-item>
        <el-form-item label="图片URL">
          <el-input v-model="form.image" />
        </el-form-item>
        <el-form-item label="底部文字">
          <el-input v-model="form.footer" />
        </el-form-item>
        <el-form-item label="按钮文字">
          <el-input v-model="form.button" placeholder="默认: 查看详情" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

const list = ref([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)

const form = reactive({
  id: '', name: '', title: '', body: '', url: '', image: '', footer: '', button: ''
})

const fetchList = async () => {
  loading.value = true
  try {
    const res = await api.get('/message-templates')
    if (res.code === 0) list.value = res.data
  } finally {
    loading.value = false
  }
}

const openDialog = (row) => {
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, { id: '', name: '', title: '', body: '', url: '', image: '', footer: '', button: '' })
  }
  showDialog.value = true
}

const handleSave = async () => {
  if (!form.name || !form.url) return ElMessage.warning('名称和链接不能为空')
  saving.value = true
  try {
    const payload = { ...form }
    delete payload.id
    const res = form.id
      ? await api.put(`/message-templates/${form.id}`, payload)
      : await api.post('/message-templates', payload)
    if (res.code === 0) {
      ElMessage.success('保存成功')
      showDialog.value = false
      fetchList()
    }
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除该模板吗？', '提示', { type: 'warning' })
    const res = await api.delete(`/message-templates/${row.id}`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchList()
    }
  } catch (e) {}
}

onMounted(fetchList)
</script>