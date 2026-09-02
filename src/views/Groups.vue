<template>
  <div class="groups">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <el-input v-model="searchKeyword" placeholder="搜索账号" clearable prefix-icon="Search" style="width:200px"
          @input="handleSearch" />

        <el-select v-model="filterGroup" placeholder="全部分组" clearable @change="fetchAccounts" style="width:150px">
          <el-option label="全部分组" value="" />
          <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
            :value="item.name" />
        </el-select>

        <el-button type="primary" @click="syncSelectedAccounts" :disabled="selectedAccounts.length === 0"
          :loading="syncing">
          <el-icon>
            <Refresh />
          </el-icon> 同步勾选 ({{ selectedAccounts.length }})
        </el-button>
        <el-button @click="fetchAccounts">
          <el-icon>
            <Refresh />
          </el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 账号列表 -->
    <el-table :data="accounts" v-loading="loading" border stripe @selection-change="handleSelectionChange"
      row-key="account">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="account" label="账号" width="150" />
      <el-table-column prop="group" label="分组" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="row.group ? 'primary' : 'info'">
            {{ row.group || '未分组' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="群组数" width="80" align="center">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ row.groupCount || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <el-button size="small" type="primary" @click="viewGroups(row.account)">
              群组
            </el-button>
            <el-button size="small" type="success" plain @click="syncAccount(row.account)">
              同步
            </el-button>
            <el-button size="small" type="warning" plain @click="showCreateGroupDialog(row.account)">
              创建
            </el-button>
            <el-button size="small" type="success" @click="openJoinGroup(row.account)">
              加入群组
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top:20px;display:flex;justify-content:flex-end;">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
        :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="fetchAccounts"
        @current-change="fetchAccounts" />
    </div>
    <!-- 加入群组对话框 -->
    <el-dialog v-model="showJoinGroupDialog" title="通过邀请码加入群组" width="500px">
      <el-form :model="joinGroupForm" label-width="100px">
        <el-form-item label="账号">
          <span>{{ joinGroupForm.account }}</span>
        </el-form-item>
        <el-form-item label="邀请码" required>
          <el-input v-model="joinGroupForm.inviteCode" placeholder="粘贴群组邀请码" />
          <div style="font-size:12px;color:#999;margin-top:4px;">
            邀请码格式: 2EQI2DmfLkYPXAzfc...（从邀请链接中获取）
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJoinGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleJoinGroup" :loading="joining">加入</el-button>
      </template>
    </el-dialog>
    <!-- ========================================== -->
    <!-- 群组列表对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showGroupsDialog" :title="`群组列表 - ${selectedAccount}`" width="1000px"
      :close-on-click-modal="false" @close="closeGroups">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="color:#999;font-size:13px;">
          共 {{ groupList.length }} 个群组
          <el-tag v-if="groupList.filter(g => g.status === 'active').length > 0" type="success" size="small"
            style="margin-left:8px;">
            活跃 {{groupList.filter(g => g.status === 'active').length}}
          </el-tag>
          <el-tag v-if="groupList.filter(g => g.status === 'left').length > 0" type="info" size="small"
            style="margin-left:4px;">
            已退出 {{groupList.filter(g => g.status === 'left').length}}
          </el-tag>
        </span>
        <el-button size="small" type="primary" @click="syncAccount(selectedAccount)" :loading="syncing">
          <el-icon>
            <Refresh />
          </el-icon> 同步
        </el-button>
      </div>

      <el-table :data="groupList" border v-loading="groupLoading" max-height="450">
        <el-table-column prop="groupId" label="群ID" min-width="200" show-overflow-tooltip />
        <el-table-column prop="subject" label="群名称" min-width="150">
          <template #default="{ row }">
            <span v-if="row.subject">{{ row.subject }}</span>
            <span v-else style="color:#999;">未命名</span>
          </template>
        </el-table-column>
        <el-table-column prop="participants" label="成员数" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '🟢 活跃' : '⚪ 已退出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="owner" label="群主" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.owner">{{ row.owner }}</span>
            <span v-else style="color:#999;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="添加时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="info" plain @click="viewGroupDetail(row)">
              详情
            </el-button>
            <el-button v-if="row.status === 'active'" size="small" type="warning" plain @click="leaveGroup(row)">
              退出
            </el-button>
            <el-button v-if="row.status === 'active'" size="small" type="success" plain @click="getInviteLink(row)">
              邀请链接
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 群组详情弹窗 -->
    <!-- ========================================== -->
    <el-dialog v-model="showGroupDetailDialog" :title="`群组详情 - ${groupDetail?.subject || groupDetail?.groupId || ''}`"
      width="750px" :close-on-click-modal="false">
      <div v-if="groupDetail" v-loading="groupDetailLoading">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="群ID">{{ groupDetail.groupId }}</el-descriptions-item>
          <el-descriptions-item label="群名称">{{ groupDetail.subject || '未命名' }}</el-descriptions-item>
          <el-descriptions-item label="群主">{{ groupDetail.owner || '-' }}</el-descriptions-item>
          <el-descriptions-item label="成员数">{{ groupDetail.size || groupDetail.participants?.length || 0
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ groupDetail.creation ? formatTime(groupDetail.creation * 1000) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="是否社区">
            <el-tag :type="groupDetail.isCommunity ? 'warning' : 'info'" size="small">
              {{ groupDetail.isCommunity ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="全员禁言">
            <div style="display:flex;align-items:center;gap:10px;">
              <el-tag :type="groupDetail.announce ? 'danger' : 'success'" size="small">
                {{ groupDetail.announce ? '已开启' : '未开启' }}
              </el-tag>
              <el-switch v-if="isCurrentUserAdminOrOwner" v-model="groupDetail.announce" active-text="开启"
                inactive-text="关闭" @change="handleSetAnnounce" :loading="settingAnnounce" />
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="仅管理员可改群名">
            <el-tag :type="groupDetail.restrict ? 'danger' : 'success'" size="small">
              {{ groupDetail.restrict ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div style="margin-top:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-weight:bold;">成员列表</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="color:#999;font-size:13px;">
                共 {{ groupDetail.participants?.length || 0 }} 人
              </span>
              <el-button v-if="isCurrentUserAdminOrOwner" size="small" type="primary"
                @click="showAddMemberDialog = true">
                <el-icon>
                  <Plus />
                </el-icon> 添加成员
              </el-button>
            </div>
          </div>
          <el-table :data="groupDetail.participants || []" border size="small" max-height="300">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="phoneNumber" label="手机号" min-width="150">
              <template #default="{ row }">
                {{ row.phoneNumber || row.id || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="id" label="ID" min-width="180" show-overflow-tooltip />
            <el-table-column label="角色" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.admin === 'superadmin' ? 'danger' : row.admin === 'admin' ? 'warning' : 'info'"
                  size="small">
                  {{ row.admin === 'superadmin' ? '👑 群主' : row.admin === 'admin' ? '🔑 管理员' : '👤 成员' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" align="center">
              <template #default="{ row }">
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                  <template v-if="isCurrentUserAdminOrOwner && getPurePhone(row.phoneNumber) !== selectedAccount">
                    <template v-if="row.admin !== 'superadmin'">
                      <el-button v-if="row.admin !== 'admin'" size="small" type="warning" plain
                        @click="handlePromote(row)">
                        提拔
                      </el-button>
                      <el-button v-if="row.admin === 'admin'" size="small" type="danger" plain
                        @click="handleDemote(row)">
                        降级
                      </el-button>
                      <el-button size="small" type="danger" plain @click="handleRemove(row)">
                        移除
                      </el-button>
                    </template>
                    <span v-else style="color:#999;font-size:12px;">群主</span>
                  </template>
                  <span v-else-if="getPurePhone(row.phoneNumber) === selectedAccount"
                    style="color:#999;font-size:12px;">自己</span>
                  <span v-else style="color:#999;font-size:12px;">-</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="showGroupDetailDialog = false">关闭</el-button>
        <el-button type="primary" @click="syncSingleGroup" :loading="syncing">
          同步
        </el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 添加成员对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showAddMemberDialog" title="添加群成员" width="500px" :close-on-click-modal="false">
      <el-form label-width="80px">
        <el-form-item label="手机号">
          <el-input v-model="memberPhoneInput" type="textarea" :rows="6"
            placeholder="每行输入一个手机号，不带 @s.whatsapp.net 后缀" />
          <div style="font-size:12px;color:#999;margin-top:4px;">
            示例：<br>
            8613298371785<br>
            8618939797045
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddMemberDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddMembers" :loading="addingMembers">
          添加
        </el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 创建群组对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showCreateGroupDialogVisible" title="创建群组" width="550px" :close-on-click-modal="false">
      <el-form :model="createGroupForm" label-width="100px">
        <el-form-item label="所属账号">
          <span>{{ createGroupForm.account }}</span>
        </el-form-item>
        <el-form-item label="群名称" required>
          <el-input v-model="createGroupForm.subject" placeholder="请输入群名称" />
        </el-form-item>
        <el-form-item label="邀请成员">
          <el-select v-model="createGroupForm.participants" multiple placeholder="选择要邀请的账号" style="width:100%">
            <el-option v-for="item in availableAccounts" :key="item.account" :label="item.account"
              :value="item.account" />
          </el-select>
          <div style="font-size:12px;color:#999;margin-top:4px;">
            至少选择1个成员（群主自动加入）
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateGroup" :loading="creatingGroup">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const accounts = ref([])
const groupList = ref([])
const groupCache = ref({})
const accountGroups = ref([])
const loading = ref(false)
const groupLoading = ref(false)
const syncing = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const selectedAccount = ref('')
const showGroupsDialog = ref(false)
const searchKeyword = ref('')
const filterGroup = ref('')

// ============ 群组详情弹窗 ============
const showGroupDetailDialog = ref(false)
const groupDetail = ref(null)
const groupDetailLoading = ref(false)
const currentGroupRow = ref(null)

// ============ 添加成员 ============
const showAddMemberDialog = ref(false)
const memberPhoneInput = ref('')
const addingMembers = ref(false)

// ============ 创建群组 ============
const showCreateGroupDialogVisible = ref(false)
const creatingGroup = ref(false)
const createGroupForm = reactive({
  account: '',
  subject: '',
  participants: []
})

// ============ 选中账号 ============
const selectedAccounts = ref([])

// ============ 状态映射 ============
const statusMap = {
  'online': '在线',
  'normal': '在线',
  'logging': '登录中',
  'offline': '离线',
  'banned': '封禁',
  'expired': '过期'
}

const statusTypeMap = {
  'online': 'success',
  'normal': 'success',
  'logging': 'warning',
  'offline': 'info',
  'banned': 'danger',
  'expired': 'danger'
}

const getStatusText = (status) => statusMap[status] || status || '未知'
const getStatusType = (status) => statusTypeMap[status] || 'info'

// ============ 工具函数 ============
const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const getPurePhone = (phone) => {
  if (!phone) return ''
  return phone.split('@')[0]
}

// ============ 可用账号 ============
const availableAccounts = computed(() => {
  return accounts.value.filter(a => a.account !== createGroupForm.account)
})
const showJoinGroupDialog = ref(false)
const joining = ref(false)
const joinGroupForm = reactive({
  account: '',
  inviteCode: ''
})

const handleJoinGroup = async () => {
  if (!joinGroupForm.account) {
    ElMessage.warning('请选择账号')
    return
  }
  if (!joinGroupForm.inviteCode) {
    ElMessage.warning('请输入邀请码')
    return
  }

  joining.value = true
  try {
    const res = await api.post('/groups/join', {
      account: joinGroupForm.account,
      inviteCode: joinGroupForm.inviteCode
    })
    if (res.code === 0) {
      ElMessage.success('加入群组成功')
      showJoinGroupDialog.value = false
      joinGroupForm.account = ''
      joinGroupForm.inviteCode = ''
      // 刷新群组列表
      fetchGroups(selectedAccount.value)
      fetchAccounts()
    } else {
      ElMessage.error(res.message || '加入失败')
    }
  } catch (error) {
    ElMessage.error('加入群组失败: ' + (error.message || ''))
  } finally {
    joining.value = false
  }
}
// ============ 判断当前账号是否是群主或管理员 ============
const isCurrentUserAdminOrOwner = computed(() => {
  if (!groupDetail.value || !groupDetail.value.participants) return false
  const me = groupDetail.value.participants.find(
    p => p.phoneNumber && p.phoneNumber.includes(selectedAccount.value)
  )
  return me && (me.admin === 'superadmin' || me.admin === 'admin')
})

// ============ 设置全员禁言 ============
const settingAnnounce = ref(false)

const handleSetAnnounce = async (value) => {
  settingAnnounce.value = true
  try {
    const res = await api.post('/groups/set-announce', {
      account: selectedAccount.value,
      groupId: currentGroupRow.value.groupId,
      announce: value
    })
    if (res.code === 0) {
      ElMessage.success(res.message || (value ? '已开启全员禁言' : '已关闭全员禁言'))
      groupDetail.value.announce = value
      const groupIndex = groupList.value.findIndex(g => g.groupId === currentGroupRow.value.groupId)
      if (groupIndex !== -1) {
        groupList.value[groupIndex].announce = value
        groupCache.value[selectedAccount.value] = groupList.value
      }
    } else {
      groupDetail.value.announce = !value
      ElMessage.error(res.message || '设置失败')
    }
  } catch (error) {
    groupDetail.value.announce = !value
    ElMessage.error('设置失败: ' + (error.message || ''))
  } finally {
    settingAnnounce.value = false
  }
}
const openJoinGroup = (account) => {
  joinGroupForm.account = account
  joinGroupForm.inviteCode = ''
  showJoinGroupDialog.value = true
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

const fetchAccounts = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value
    }
    if (filterGroup.value) params.group = filterGroup.value
    if (searchKeyword.value) params.keyword = searchKeyword.value

    const res = await api.get('/whatsapp/accounts/list', { params })
    if (res.code === 0) {
      const result = res.data
      if (Array.isArray(result)) {
        accounts.value = result
        total.value = result.length
      } else {
        accounts.value = result.data || []
        total.value = result.total || 0
      }
    }
  } catch (error) {
    ElMessage.error('获取账号列表失败')
  } finally {
    loading.value = false
  }
}

// ============ 筛选 ============
const handleSearch = () => {
  page.value = 1
  fetchAccounts()
}

// ============ 选中账号 ============
const handleSelectionChange = (selection) => {
  selectedAccounts.value = selection.map(item => item.account)
}

// ============ 同步勾选账号 ============
const syncSelectedAccounts = async () => {
  if (selectedAccounts.value.length === 0) {
    ElMessage.warning('请先勾选要同步的账号')
    return
  }

  const onlineAccounts = selectedAccounts.value.filter(account => {
    const acc = accounts.value.find(a => a.account === account)
    return acc && (acc.status === 'online' || acc.status === 'normal')
  })

  if (onlineAccounts.length === 0) {
    ElMessage.warning('勾选的账号中没有在线账号，请先上线')
    return
  }

  if (onlineAccounts.length < selectedAccounts.value.length) {
    const offlineCount = selectedAccounts.value.length - onlineAccounts.length
    ElMessage.warning(`已过滤 ${offlineCount} 个非在线账号，将同步 ${onlineAccounts.length} 个在线账号`)
  }

  syncing.value = true
  try {
    let successCount = 0
    for (const acc of onlineAccounts) {
      const res = await api.post('/groups/sync', null, { params: { account: acc } })
      if (res.code === 0) successCount++
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    ElMessage.success(`同步完成: ${successCount}/${onlineAccounts.length} 个账号`)
    fetchAccounts()
    if (selectedAccount.value) {
      fetchGroups(selectedAccount.value)
    }
    selectedAccounts.value = []
  } catch (error) {
    ElMessage.error('同步失败: ' + (error.message || ''))
  } finally {
    syncing.value = false
  }
}

// ============ 群组操作 ============
const fetchGroups = async (account) => {
  groupLoading.value = true
  try {
    const res = await api.get('/groups/list', {
      params: { account, page: 1, page_size: 1000 }
    })
    if (res.code === 0) {
      const data = res.data.data || []
      groupList.value = data.filter(g => !g.isCommunity)
      groupCache.value[account] = groupList.value
    }
  } catch (error) {
    ElMessage.error('获取群组列表失败')
  } finally {
    groupLoading.value = false
  }
}

const viewGroups = (account) => {
  selectedAccount.value = account
  showGroupsDialog.value = true
  if (groupCache.value[account]) {
    groupList.value = groupCache.value[account]
  }
  fetchGroups(account)
}

const closeGroups = () => {
  selectedAccount.value = ''
  groupList.value = []
}

const syncAccount = async (account) => {
  const acc = accounts.value.find(a => a.account === account)
  if (!acc || (acc.status !== 'online' && acc.status !== 'normal')) {
    ElMessage.warning('账号不在线，无法同步群组')
    return
  }
  syncing.value = true
  try {
    const res = await api.post('/groups/sync', null, {
      params: { account }
    })
    if (res.code === 0) {
      ElMessage.success(`账号 ${account} 同步成功`)
      await fetchGroups(account)
      fetchAccounts()
    }
  } catch (error) {
    ElMessage.error('同步失败: ' + (error.message || ''))
  } finally {
    syncing.value = false
  }
}

// ==========================================
// 群组详情
// ==========================================

const viewGroupDetail = async (row) => {
  currentGroupRow.value = row
  showGroupDetailDialog.value = true
  groupDetailLoading.value = true
  groupDetail.value = null

  try {
    const res = await api.post('/groups/detail', {
      account: selectedAccount.value,
      groupId: row.groupId
    })
    if (res.code === 0) {
      const data = res.data
      groupDetail.value = {
        groupId: row.groupId,
        subject: data.subject || row.subject,
        owner: data.owner || row.owner,
        size: data.size || row.size,
        participants: data.participants || [],
        creation: data.creation || 0,
        isCommunity: data.isCommunity || false,
        announce: data.announce || false,
        restrict: data.restrict || false
      }

      const groupIndex = groupList.value.findIndex(g => g.groupId === row.groupId)
      if (groupIndex !== -1) {
        groupList.value[groupIndex] = {
          ...groupList.value[groupIndex],
          participants: data.size || data.participants?.length || row.participants,
          size: data.size || row.size,
          owner: data.owner || row.owner,
          announce: data.announce || false
        }
        groupCache.value[selectedAccount.value] = groupList.value
      }
    }
  } catch (error) {
    ElMessage.error('获取群组详情失败')
  } finally {
    groupDetailLoading.value = false
  }
}

const syncSingleGroup = async () => {
  if (!currentGroupRow.value) return
  syncing.value = true
  try {
    const res = await api.post('/groups/detail', {
      account: selectedAccount.value,
      groupId: currentGroupRow.value.groupId
    })
    if (res.code === 0) {
      const data = res.data
      groupDetail.value = {
        ...groupDetail.value,
        subject: data.subject || groupDetail.value.subject,
        owner: data.owner || groupDetail.value.owner,
        size: data.size || groupDetail.value.size,
        participants: data.participants || [],
        creation: data.creation || 0,
        isCommunity: data.isCommunity || false,
        announce: data.announce || false,
        restrict: data.restrict || false
      }
      ElMessage.success('同步成功')
      fetchGroups(selectedAccount.value)
    }
  } catch (error) {
    ElMessage.error('同步失败')
  } finally {
    syncing.value = false
  }
}

// ==========================================
// 群成员操作
// ==========================================

const handlePromote = async (member) => {
  try {
    await ElMessageBox.confirm(`确定要提拔 ${member.phoneNumber || member.id} 为管理员吗？`, '提示', { type: 'warning' })
    const res = await api.post('/groups/participants', {
      account: selectedAccount.value,
      groupId: currentGroupRow.value.groupId,
      participants: [member.id],
      action: 'promote'
    })
    if (res.code === 0) {
      ElMessage.success('提拔成功')
      viewGroupDetail(currentGroupRow.value)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleDemote = async (member) => {
  try {
    await ElMessageBox.confirm(`确定要降级 ${member.phoneNumber || member.id} 为普通成员吗？`, '提示', { type: 'warning' })
    const res = await api.post('/groups/participants', {
      account: selectedAccount.value,
      groupId: currentGroupRow.value.groupId,
      participants: [member.id],
      action: 'demote'
    })
    if (res.code === 0) {
      ElMessage.success('降级成功')
      viewGroupDetail(currentGroupRow.value)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleRemove = async (member) => {
  try {
    await ElMessageBox.confirm(`确定要移除 ${member.phoneNumber || member.id} 吗？`, '提示', { type: 'warning' })
    const res = await api.post('/groups/participants', {
      account: selectedAccount.value,
      groupId: currentGroupRow.value.groupId,
      participants: [member.id],
      action: 'remove'
    })
    if (res.code === 0) {
      ElMessage.success('移除成功')
      viewGroupDetail(currentGroupRow.value)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// ==========================================
// 添加成员
// ==========================================

const handleAddMembers = async () => {
  const phones = memberPhoneInput.value
    .split('\n')
    .map(p => p.trim())
    .filter(p => p !== '')

  if (phones.length === 0) {
    ElMessage.warning('请输入至少一个手机号')
    return
  }

  const participants = phones.map(p => {
    if (p.includes('@')) {
      return p
    }
    return p + '@s.whatsapp.net'
  })

  addingMembers.value = true
  try {
    const res = await api.post('/groups/participants', {
      account: selectedAccount.value,
      groupId: currentGroupRow.value.groupId,
      participants: participants,
      action: 'add'
    })
    if (res.code === 0) {
      ElMessage.success(`成功添加 ${participants.length} 个成员`)
      showAddMemberDialog.value = false
      memberPhoneInput.value = ''
      viewGroupDetail(currentGroupRow.value)
    }
  } catch (error) {
    ElMessage.error('添加成员失败: ' + (error.message || ''))
  } finally {
    addingMembers.value = false
  }
}

// ==========================================
// 群组操作
// ==========================================

const showCreateGroupDialog = (account) => {
  createGroupForm.account = account
  createGroupForm.subject = ''
  createGroupForm.participants = []
  showCreateGroupDialogVisible.value = true
}

const handleCreateGroup = async () => {
  if (!createGroupForm.subject) {
    ElMessage.warning('请输入群名称')
    return
  }
  if (createGroupForm.participants.length === 0) {
    ElMessage.warning('请至少选择1个成员')
    return
  }

  creatingGroup.value = true
  try {
    const res = await api.post('/groups/create', {
      account: createGroupForm.account,
      subject: createGroupForm.subject,
      participants: createGroupForm.participants
    })
    if (res.code === 0) {
      ElMessage.success(`群组 "${createGroupForm.subject}" 创建成功`)
      showCreateGroupDialogVisible.value = false
      fetchGroups(createGroupForm.account)
      fetchAccounts()
    }
  } catch (error) {
    ElMessage.error('创建群组失败: ' + (error.message || ''))
  } finally {
    creatingGroup.value = false
  }
}

const leaveGroup = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要退出群组 "${row.subject || row.groupId}" 吗？`,
      '提示',
      { type: 'warning' }
    )
    const res = await api.post('/groups/leave', {
      account: selectedAccount.value,
      groupId: row.groupId
    })
    if (res.code === 0) {
      ElMessage.success('已退出群组')
      row.status = 'left'
      fetchGroups(selectedAccount.value)
      fetchAccounts()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('退出群组失败')
    }
  }
}

const getInviteLink = async (row) => {
  try {
    const res = await api.post('/groups/invite-link', {
      account: selectedAccount.value,
      groupId: row.groupId
    })
    if (res.code === 0) {
      const data = res.data
      await ElMessageBox.alert(
        `邀请链接: ${data.inviteLink || data.inviteCode}`,
        '邀请链接',
        {
          confirmButtonText: '复制',
          callback: () => {
            if (data.inviteLink) {
              navigator.clipboard.writeText(data.inviteLink)
            } else {
              navigator.clipboard.writeText(data.inviteCode)
            }
            ElMessage.success('已复制')
          }
        }
      )
    }
  } catch (error) {
    ElMessage.error('获取邀请链接失败')
  }
}

// ============ 生命周期 ============
onMounted(() => {
  fetchAccountGroups()
  fetchAccounts()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
</style>