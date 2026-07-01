<template>
  <div class="users">
    <div class="toolbar">
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon> 添加用户
      </el-button>
      <el-button @click="fetchUsers">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <el-table :data="users" v-loading="loading" border>
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="email" label="邮箱" width="200" />
      <el-table-column prop="phone" label="手机号" width="150" />
      <el-table-column prop="role" label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 1 ? 'danger' : row.role === 2 ? 'warning' : 'info'" size="small">
            {{ getRoleLabel(row.role) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="lastLoginAt" label="最后登录" width="170">
        <template #default="{ row }">
          {{ formatTime(row.lastLoginAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" plain @click="openEditDialog(row)">
            编辑
          </el-button>
          <el-button 
            size="small" 
            :type="row.status === 1 ? 'warning' : 'success'"
            plain
            @click="handleToggleStatus(row)"
          >
            {{ row.status === 1 ? '禁用' : '启用' }}
          </el-button>
          <el-button 
            size="small" 
            type="danger" 
            plain
            :disabled="row.role === 1 && isCurrentUser(row)"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top:20px;display:flex;justify-content:flex-end">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchUsers"
        @current-change="fetchUsers"
      />
    </div>

    <!-- 添加用户对话框 -->
    <el-dialog v-model="showAddDialog" title="添加用户" width="500px">
      <el-form :model="addForm" label-width="80px" ref="addFormRef" :rules="addRules">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="addForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="addForm.password" type="password" placeholder="请输入密码（至少6位）" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="addForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="addForm.phone" placeholder="请输入手机号（可选）" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="addForm.role" placeholder="请选择角色" style="width:100%">
            <el-option label="管理员" :value="1" />
            <el-option label="经理" :value="2" />
            <el-option label="操作员" :value="3" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd" :loading="addLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="showEditDialogVisible" title="编辑用户" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="editForm.username" disabled />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" placeholder="请选择角色" style="width:100%">
            <el-option label="管理员" :value="1" />
            <el-option label="经理" :value="2" />
            <el-option label="操作员" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="editForm.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
        <el-form-item label="重置密码">
          <el-input v-model="editForm.newPassword" type="password" placeholder="留空则不修改密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEdit" :loading="editLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { user } from '@/api'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'

const authStore = useAuthStore()
const users = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const showAddDialog = ref(false)
const showEditDialogVisible = ref(false)
const addLoading = ref(false)
const editLoading = ref(false)
const addFormRef = ref()

const addForm = reactive({
  username: '',
  password: '',
  email: '',
  phone: '',
  role: 3
})

const editForm = reactive({
  id: '',
  username: '',
  email: '',
  phone: '',
  role: 3,
  status: 1,
  newPassword: ''
})

const addRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }],
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const getRoleLabel = (role) => {
  const map = { 1: '管理员', 2: '经理', 3: '操作员' }
  return map[role] || '未知'
}

const isCurrentUser = (row) => {
  return row.id === authStore.userInfo?.id
}

const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await user.list({ page: page.value, page_size: pageSize.value })
    if (res.code === 0) {
      users.value = res.data.data || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = async () => {
  const valid = await addFormRef.value?.validate().catch(() => false)
  if (!valid) return

  addLoading.value = true
  try {
    const res = await user.create(addForm)
    if (res.code === 0) {
      ElMessage.success('添加用户成功')
      showAddDialog.value = false
      addForm.username = ''
      addForm.password = ''
      addForm.email = ''
      addForm.phone = ''
      addForm.role = 3
      fetchUsers()
    }
  } catch (error) {
    ElMessage.error('添加失败: ' + (error.message || ''))
  } finally {
    addLoading.value = false
  }
}

const openEditDialog = (row) => {
  editForm.id = row.id
  editForm.username = row.username
  editForm.email = row.email || ''
  editForm.phone = row.phone || ''
  editForm.role = row.role
  editForm.status = row.status
  editForm.newPassword = ''
  showEditDialogVisible.value = true
}

const handleEdit = async () => {
  editLoading.value = true
  try {
    const data = {
      email: editForm.email,
      phone: editForm.phone,
      role: editForm.role,
      status: editForm.status
    }
    if (editForm.newPassword) {
      data.password = editForm.newPassword
    }
    const res = await user.update(editForm.id, data)
    if (res.code === 0) {
      ElMessage.success('更新用户成功')
      showEditDialogVisible.value = false
      fetchUsers()
    }
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.message || ''))
  } finally {
    editLoading.value = false
  }
}

const handleToggleStatus = async (row) => {
  const newStatus = row.status === 1 ? 0 : 1
  const action = newStatus === 1 ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定要${action}用户 "${row.username}" 吗？`, '提示', { type: 'warning' })
    const res = await user.update(row.id, { status: newStatus })
    if (res.code === 0) {
      ElMessage.success(`${action}成功`)
      fetchUsers()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`${action}失败`)
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${row.username}" 吗？此操作不可恢复！`, '提示', { type: 'error' })
    const res = await user.delete(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchUsers()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}
</style>
