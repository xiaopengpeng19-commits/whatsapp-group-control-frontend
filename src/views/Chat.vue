<template>
  <div class="chat">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon>
          <Plus />
        </el-icon> 创建互聊任务
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
      <el-table-column prop="accountGroup" label="账号分组" width="120">
        <template #default="{ row }">
          <el-tag size="small" type="primary">
            {{ row.accountGroup || '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="参与账号" min-width="200">
        <template #default="{ row }">
          <el-tag v-for="(acc, index) in row.accounts.slice(0, 5)" :key="acc" size="small" style="margin:2px">
            {{ acc }}
          </el-tag>
          <el-tag v-if="row.accounts.length > 5" size="small" type="info" style="margin:2px">
            +{{ row.accounts.length - 5 }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="language" label="语言" width="70">
        <template #default="{ row }">
          {{ getLanguageLabel(row.language) }}
        </template>
      </el-table-column>
      <el-table-column label="配对间隔" width="110">
        <template #default="{ row }">
          <span style="font-size:13px;">
            {{ row.pairIntervalMin || 30 }}~{{ row.pairIntervalMax || 45 }}分钟
          </span>
        </template>
      </el-table-column>
      <el-table-column label="进度" width="130">
        <template #default="{ row }">
          <el-progress :percentage="getProgress(row)" :color="getProgressColor(row)" :stroke-width="6"
            style="width:100px" />
        </template>
      </el-table-column>
      <el-table-column prop="activeSessions" label="会话数" width="70" align="center" />
      <el-table-column prop="totalMessages" label="消息数" width="70" align="center" />
      <el-table-column prop="totalPairs" label="配对数" width="70" align="center" />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="150">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="showTaskDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'pending' || row.status === 'paused'" size="small" type="success"
            @click="handleStart(row)">启动</el-button>
          <el-button v-if="row.status === 'running'" size="small" type="warning"
            @click="handlePause(row)">暂停</el-button>
          <el-button v-if="row.status === 'paused'" size="small" type="success"
            @click="handleResume(row)">恢复</el-button>
          <el-button v-if="row.status === 'running' || row.status === 'paused'" size="small" type="danger"
            @click="handleStop(row)">停止</el-button>
          <el-button size="small" type="danger" plain @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top:20px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" :total="total"
        layout="total, sizes, prev, pager, next, jumper" @size-change="fetchTasks" @current-change="fetchTasks" />
    </div>

    <!-- ========================================== -->
    <!-- 创建任务对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showCreateDialog" title="创建互聊任务" width="680px" :close-on-click-modal="false"
      class="create-chat-dialog">
      <el-form :model="createForm" label-width="120px" label-position="right">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-title">
            <span class="section-line"></span>
            基本信息
          </div>
          <el-form-item label="任务名称" required>
            <el-input v-model="createForm.name" placeholder="请输入任务名称" size="large" />
          </el-form-item>
          <el-form-item label="账号分组" required>
            <el-select v-model="createForm.accountGroup" placeholder="选择账号分组" style="width:100%" size="large">
              <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
                :value="item.name" />
            </el-select>
            <div class="form-tip">选择分组后，该分组下所有账号将参与互聊</div>
          </el-form-item>
          <el-form-item label="消息语言">
            <el-radio-group v-model="createForm.language" size="large">
              <el-radio-button value="zh">中文</el-radio-button>
              <el-radio-button value="en">English</el-radio-button>
              <el-radio-button value="pt">Português</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </div>

        <!-- 对话参数 -->
        <div class="form-section">
          <div class="section-title">
            <span class="section-line"></span>
            对话参数
          </div>
          <el-form-item label="发起概率">
            <div class="slider-wrapper">
              <el-slider v-model="createForm.initiateRate" :min="10" :max="100" :step="5" />
              <span class="slider-value">{{ createForm.initiateRate }}%</span>
            </div>
            <div class="form-tip">概率未命中时自动模拟填充</div>
          </el-form-item>
          <el-form-item label="回复概率">
            <div class="slider-wrapper">
              <el-slider v-model="createForm.replyRate" :min="10" :max="100" :step="5" />
              <span class="slider-value">{{ createForm.replyRate }}%</span>
            </div>
            <div class="form-tip">概率未命中时自动模拟填充</div>
          </el-form-item>
          <el-form-item label="消息间隔">
            <div class="range-wrapper">
              <el-input-number v-model="createForm.minDelay" :min="1" :max="30" size="large" />
              <span class="range-sep">~</span>
              <el-input-number v-model="createForm.maxDelay" :min="2" :max="60" size="large" />
              <span class="range-unit">秒</span>
            </div>
          </el-form-item>
          <el-form-item label="对话轮数">
            <div class="range-wrapper">
              <el-input-number v-model="createForm.minRounds" :min="1" :max="20" size="large" />
              <span class="range-sep">~</span>
              <el-input-number v-model="createForm.maxRounds" :min="2" :max="50" size="large" />
              <span class="range-unit">轮</span>
            </div>
          </el-form-item>
          <el-form-item label="最大并发">
            <div class="range-wrapper">
              <el-input-number v-model="createForm.maxConcurrent" :min="1" :max="10" size="large" />
              <span class="range-unit" style="margin-left:8px;">同时进行的对话数</span>
            </div>
          </el-form-item>
        </div>

        <!-- 配对间隔 -->
        <div class="form-section">
          <div class="section-title">
            <span class="section-line"></span>
            配对间隔
          </div>
          <el-form-item label="间隔范围">
            <div class="range-wrapper">
              <el-input-number v-model="createForm.pairIntervalMin" :min="1" :max="120" size="large" />
              <span class="range-sep">~</span>
              <el-input-number v-model="createForm.pairIntervalMax" :min="2" :max="180" size="large" />
              <span class="range-unit">分钟</span>
            </div>
            <div class="form-tip">账号完成对话后，在此范围内随机冷却，冷却结束后可再次配对</div>
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false" size="large">取消</el-button>
          <el-button type="primary" @click="handleCreate" :loading="creating" size="large">
            {{ creating ? '创建中...' : '创建任务' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 任务详情对话框 - 精简版 -->
    <!-- ========================================== -->
    <el-dialog v-model="showDetailDialog" :title="`任务详情 - ${detailTask?.name || ''}`" width="1000px"
      :close-on-click-modal="false" @close="closeDetail">
      <div v-if="detailTask" v-loading="detailLoading">
        <!-- ========================================== -->
        <!-- 基本信息 - 4列 -->
        <!-- ========================================== -->
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="任务名称">{{ detailTask.name }}</el-descriptions-item>
          <el-descriptions-item label="账号分组">
            <el-tag size="small" type="primary">{{ detailTask.accountGroup || '-' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(detailTask.status)" size="small">
              {{ getStatusLabel(detailTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="语言">{{ getLanguageLabel(detailTask.language) }}</el-descriptions-item>
        </el-descriptions>

        <!-- ========================================== -->
        <!-- 参与账号 - 缩略显示 -->
        <!-- ========================================== -->
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:bold;font-size:13px;">参与账号</span>
            <span style="color:#999;font-size:12px;">
              共 {{ detailTask.accounts?.length || 0 }} 个
              <el-tag size="small" type="success">在线 {{ onlineCount }}</el-tag>
              <el-tag size="small" type="info">离线 {{ offlineCount }}</el-tag>
              <el-tag size="small" type="warning">冷却中 {{ cooldownCount }}</el-tag>
              <el-tag size="small" type="danger">封禁 {{ bannedCount }}</el-tag>
            </span>
          </div>
          <div
            style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#f5f7fa;border-radius:4px;max-height:60px;overflow:hidden;"
            :style="showAllAccounts ? 'max-height:none;' : ''">
            <template v-for="(acc, index) in detailTask.accounts" :key="acc">
              <el-tag v-if="index < 10 || showAllAccounts" :type="getAccountStatusType(acc)" size="small"
                style="margin:2px;">
                {{ acc }}
                <span style="margin-left:4px;font-size:10px;color:#999;">
                  {{ getAccountStatusShort(acc) }}
                  <span v-if="accountPairs[acc] !== undefined"> {{ accountPairs[acc] }}</span>
                </span>
              </el-tag>
            </template>
            <el-tag v-if="detailTask.accounts?.length > 10 && !showAllAccounts" size="small" type="info"
              style="margin:2px;cursor:pointer;" @click="showAllAccounts = true">
              +{{ detailTask.accounts.length - 10 }}
            </el-tag>
          </div>
          <el-button v-if="detailTask.accounts?.length > 10" size="small" type="primary" plain
            @click="showAllAccounts = !showAllAccounts" style="margin-top:4px;">
            {{ showAllAccounts ? '收起' : `展开全部 (${detailTask.accounts.length}个)` }}
          </el-button>
        </div>

        <!-- ========================================== -->
        <!-- 参数和统计 - 4列 -->
        <!-- ========================================== -->
        <el-descriptions :column="4" border size="small" style="margin-top:12px;">
          <el-descriptions-item label="发起概率">{{ detailTask.initiateRate }}%</el-descriptions-item>
          <el-descriptions-item label="回复概率">{{ detailTask.replyRate }}%</el-descriptions-item>
          <el-descriptions-item label="消息间隔">{{ detailTask.minDelay }}~{{ detailTask.maxDelay }}s</el-descriptions-item>
          <el-descriptions-item label="轮数">{{ detailTask.minRounds }}~{{ detailTask.maxRounds }}</el-descriptions-item>
          <el-descriptions-item label="配对间隔">{{ detailTask.pairIntervalMin || 30 }}~{{ detailTask.pairIntervalMax || 45
          }}分钟</el-descriptions-item>
          <el-descriptions-item label="总配对数">{{ detailTask.totalPairs || 0 }}</el-descriptions-item>
          <el-descriptions-item label="总消息">{{ detailTask.totalMessages || 0 }}</el-descriptions-item>
          <el-descriptions-item label="活跃会话">{{ detailTask.activeSessions || 0 }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(detailTask.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="启动时间">{{ formatTime(detailTask.startedAt) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间" v-if="detailTask.completedAt">{{ formatTime(detailTask.completedAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="完成时间" v-else>-</el-descriptions-item>
          <el-descriptions-item label="停止原因" v-if="detailTask.stopReason" :span="4">
            <span style="color:#f56c6c;">{{ detailTask.stopReason }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="错误信息" v-if="detailTask.lastError" :span="4">
            <span style="color:#f56c6c;">{{ detailTask.lastError }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- ========================================== -->
        <!-- 活跃会话 -->
        <!-- ========================================== -->
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:bold;font-size:13px;">活跃会话 ({{ activeSessions.length }})</span>
          </div>
          <div v-if="activeSessions.length > 0"
            style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#f5f7fa;border-radius:4px;">
            <el-tag v-for="session in displaySessions" :key="session.id" type="success" size="small"
              style="margin:2px;">
              {{ session.accountA }} ↔ {{ session.accountB }}
              <span style="margin-left:4px;font-size:11px;color:#999;">
                {{ getCurrentRound(session) }}/{{ session.maxRounds }}轮
              </span>
            </el-tag>
          </div>
          <div v-else
            style="color:#999;text-align:center;padding:8px;background:#f5f7fa;border-radius:4px;font-size:13px;">
            暂无活跃会话
          </div>
          <el-button v-if="activeSessions.length > 10" size="small" type="primary" plain
            @click="showAllSessions = !showAllSessions" style="margin-top:4px;">
            {{ showAllSessions ? '收起' : `查看全部 (${activeSessions.length}个)` }}
          </el-button>
        </div>

        <!-- ========================================== -->
        <!-- 对话记录 -->
        <!-- ========================================== -->
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:bold;font-size:13px;">对话记录</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <el-select v-model="messageFilterStatus" placeholder="全部状态" clearable size="small" style="width:120px"
                @change="fetchTaskMessages">
                <el-option label="全部" value="" />
                <el-option label="已发送" value="sent" />
                <el-option label="已送达" value="delivered" />
                <el-option label="已读" value="read" />
                <el-option label="失败" value="failed" />
              </el-select>
              <span style="color:#999;font-size:12px;">
                共 {{ messageTotal }} 条
                <el-tag v-if="failedCount > 0" type="danger" size="small" style="margin-left:4px;">失败 {{ failedCount
                }}</el-tag>
                <el-tag v-if="simulatedCount > 0" type="warning" size="small" style="margin-left:4px;">模拟 {{
                  simulatedCount
                }}</el-tag>
              </span>
            </div>
          </div>
          <div class="message-list" ref="messageListRef" style="max-height:350px;overflow-y:auto;">
            <div v-if="detailMessages.length === 0" style="text-align:center;color:#999;padding:20px;font-size:13px;">
              暂无消息
            </div>
            <div v-for="msg in detailMessages" :key="msg.id" class="message-item" style="margin-bottom:6px;">
              <div class="message-bubble" :class="[
                msg.direction === 'send' ? 'message-send' : 'message-receive',
                msg.isSimulated ? 'message-simulated' : ''
              ]" style="padding:8px 12px;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.08);">
                <div class="message-header"
                  style="display:flex;align-items:center;gap:6px;font-size:12px;color:#999;flex-wrap:wrap;">
                  <span style="font-weight:600;color:#333;">{{ msg.fromAccount }}</span>
                  <span>→</span>
                  <span>{{ msg.toAccount }}</span>
                  <el-tag size="small" style="font-size:10px;padding:0 6px;" :style="{
                    background: msg.round % 2 === 0 ? '#ecf5ff' : '#f0f9eb',
                    color: msg.round % 2 === 0 ? '#409eff' : '#67c23a'
                  }">
                    {{ msg.round }}轮{{ msg.roundIndex }}句
                  </el-tag>
                  <el-tag v-if="msg.isSimulated" type="warning" size="small"
                    style="font-size:10px;padding:0 6px;">模拟</el-tag>
                  <el-tag :type="getMessageStatusType(msg.status)" size="small" style="font-size:10px;padding:0 6px;">
                    {{ getMessageStatusLabel(msg.status) }}
                  </el-tag>
                  <span style="font-size:11px;color:#bbb;margin-left:auto;">{{ formatTime(msg.sentAt) }}</span>
                </div>
                <div class="message-content" style="font-size:13px;color:#333;word-wrap:break-word;padding:2px 0;">
                  <span v-if="msg.isSimulated" style="color:#b3b3b3;font-style:italic;">[概率未命中，模拟跳过]</span>
                  <span v-else>{{ msg.content }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Timer } from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const tasks = ref([])
const allAccounts = ref([])
const accountGroups = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const creating = ref(false)

const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const detailLoading = ref(false)
const detailTask = ref(null)
const sessions = ref([])
const detailMessages = ref([])
const messageListRef = ref(null)
const detailTimer = ref(null)
const accountPairs = ref({})
const showAllAccounts = ref(false)
const showAllSessions = ref(false)

const messageFilterStatus = ref('')
const messageTotal = ref(0)

// ============ 创建表单 ============
const createForm = reactive({
  name: '',
  accountGroup: '',
  language: 'pt',
  initiateRate: 60,
  minDelay: 3,
  maxDelay: 60,
  minRounds: 4,
  maxRounds: 6,
  replyRate: 80,
  maxConcurrent: 2,
  pairIntervalMin: 30,
  pairIntervalMax: 99
})

// ============ 计算属性 ============
const simulatedCount = computed(() => detailMessages.value.filter(m => m.isSimulated).length)
const failedCount = computed(() => detailMessages.value.filter(m => m.status === 'failed').length)
const activeSessions = computed(() => sessions.value.filter(s => s.status === 'active'))
const displaySessions = computed(() => activeSessions.value.length > 10 && !showAllSessions.value
  ? activeSessions.value.slice(0, 10)
  : activeSessions.value)

const onlineCount = computed(() => {
  if (!detailTask.value) return 0
  return detailTask.value.accounts.filter(acc => {
    const status = getAccountStatus(acc)
    return status.status === 'online' && !isAccountCooling(acc)
  }).length
})

const offlineCount = computed(() => {
  if (!detailTask.value) return 0
  return detailTask.value.accounts.filter(acc => {
    const status = getAccountStatus(acc)
    return status.status === 'offline' && !isAccountCooling(acc)
  }).length
})

const cooldownCount = computed(() => {
  if (!detailTask.value) return 0
  return detailTask.value.accounts.filter(acc => isAccountCooling(acc)).length
})

const bannedCount = computed(() => {
  if (!detailTask.value) return 0
  return detailTask.value.accounts.filter(acc => {
    const status = getAccountStatus(acc)
    return status.status === 'banned' || status.status === 'expired'
  }).length
})

// ============ 工具函数 ============
const getLanguageLabel = (lang) => {
  const map = { zh: '中文', en: 'English', pt: 'Português' }
  return map[lang] || lang
}

const getStatusType = (status) => {
  const map = { pending: 'info', running: 'warning', paused: 'warning', completed: 'success', stopped: 'danger', syncing: 'warning' }
  return map[status] || 'info'
}

const getStatusLabel = (status) => {
  const map = { pending: '待执行', running: '执行中', paused: '已暂停', completed: '已完成', stopped: '已停止', syncing: '同步中' }
  return map[status] || status
}

const getProgress = (row) => {
  if (!row.totalRounds || row.totalRounds === 0) return 0
  return Math.round(((row.currentRound || 0) / row.totalRounds) * 100)
}

const getProgressColor = (row) => {
  const p = getProgress(row)
  if (p === 100) return '#67c23a'
  if (p > 50) return '#409eff'
  return '#e6a23c'
}

const getMessageStatusType = (status) => {
  const map = { sent: 'info', delivered: 'success', read: 'success', failed: 'danger', received: 'info' }
  return map[status] || 'info'
}

const getMessageStatusLabel = (status) => {
  const map = { sent: '已发送', delivered: '已送达', read: '已读', failed: '失败', received: '已接收' }
  return map[status] || status
}

const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// ============ 账号状态函数 ============
const getAccountStatus = (account) => {
  const found = allAccounts.value.find(a => a.account === account)
  if (!found) return { status: 'unknown', label: '未知', type: 'info' }
  const statusMap = {
    'online': { status: 'online', label: '在线', type: 'success' },
    'normal': { status: 'online', label: '在线', type: 'success' },
    'logging': { status: 'logging', label: '登录中', type: 'warning' },
    'offline': { status: 'offline', label: '离线', type: 'info' },
    'banned': { status: 'banned', label: '封禁', type: 'danger' },
    'expired': { status: 'expired', label: '过期', type: 'danger' }
  }
  return statusMap[found.status] || { status: 'unknown', label: '未知', type: 'info' }
}

const isAccountCooling = (account) => {
  if (!detailTask.value || !detailTask.value.accountCooldowns) return false
  const cooldownAt = detailTask.value.accountCooldowns[account]
  if (!cooldownAt) return false
  return new Date() < new Date(cooldownAt)
}

const getAccountStatusType = (account) => {
  const status = getAccountStatus(account)
  if (status.status === 'banned' || status.status === 'expired') return 'danger'
  if (isAccountCooling(account)) return 'warning'
  if (status.status === 'online') return 'success'
  if (status.status === 'logging') return 'warning'
  return 'info'
}

const getAccountStatusText = (account) => {
  const status = getAccountStatus(account)
  if (status.status === 'banned') return '🚫 封禁'
  if (status.status === 'expired') return '⏰ 过期'
  if (isAccountCooling(account)) {
    const cooldownAt = detailTask.value.accountCooldowns[account]
    const remaining = Math.ceil((new Date(cooldownAt) - new Date()) / 60000)
    return remaining > 0 ? `⏳ ${remaining}分钟` : '⏳ 冷却中'
  }
  if (status.status === 'online') return '🟢 在线'
  if (status.status === 'logging') return '🟡 登录中'
  if (status.status === 'offline') return '⚪ 离线'
  return '❓ 未知'
}

const getAccountStatusShort = (account) => {
  const status = getAccountStatus(account)
  if (status.status === 'banned' || status.status === 'expired') return '🚫'
  if (isAccountCooling(account)) return '⏳'
  if (status.status === 'online') return '🟢'
  if (status.status === 'logging') return '🟡'
  if (status.status === 'offline') return '⚪'
  return '❓'
}

const getCurrentRound = (session) => {
  if (!session || session.chatCount === undefined || session.chatCount === 0) return 0
  return Math.ceil(session.chatCount / 2)
}

// ============ 数据获取 ============
const fetchAccountGroups = async () => {
  try {
    const res = await api.get('/whatsapp/accounts/groups')
    if (res.code === 0) accountGroups.value = res.data || []
  } catch (error) { }
}

const fetchAccounts = async () => {
  try {
    const res = await api.get('/whatsapp/accounts/list')
    if (res.code === 0) {
      let data = res.data
      if (data && data.data && Array.isArray(data.data)) data = data.data
      allAccounts.value = data || []
    }
  } catch (error) { }
}

const fetchTasks = async () => {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await api.get('/chat/tasks', { params })
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
  if (!createForm.accountGroup) { ElMessage.warning('请选择账号分组'); return }
  if (createForm.minDelay > createForm.maxDelay) { ElMessage.warning('最小消息间隔不能大于最大间隔'); return }
  if (createForm.minRounds > createForm.maxRounds) { ElMessage.warning('最少轮数不能大于最多轮数'); return }
  if (createForm.pairIntervalMin > createForm.pairIntervalMax) { ElMessage.warning('最小配对间隔不能大于最大间隔'); return }

  creating.value = true
  try {
    const res = await api.post('/chat/tasks', createForm)
    if (res.code === 0) {
      ElMessage.success('任务创建成功')
      showCreateDialog.value = false
      createForm.name = ''
      createForm.accountGroup = ''
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
    await ElMessageBox.confirm(`确定要启动任务 "${row.name}" 吗？`, '提示', { type: 'info' })
    const res = await api.post(`/chat/tasks/${row.id}/start`)
    if (res.code === 0) { ElMessage.success('任务已启动'); fetchTasks() }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('启动失败')
  }
}

const handlePause = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要暂停任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res = await api.post(`/chat/tasks/${row.id}/pause`)
    if (res.code === 0) { ElMessage.success('任务已暂停'); fetchTasks() }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('暂停失败')
  }
}

const handleResume = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要恢复任务 "${row.name}" 吗？`, '提示', { type: 'info' })
    const res = await api.post(`/chat/tasks/${row.id}/resume`)
    if (res.code === 0) { ElMessage.success('任务已恢复'); fetchTasks() }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('恢复失败')
  }
}

const handleStop = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要停止任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res = await api.post(`/chat/tasks/${row.id}/stop`)
    if (res.code === 0) { ElMessage.success('任务已停止'); fetchTasks() }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('停止失败')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res = await api.delete(`/chat/tasks/${row.id}`)
    if (res.code === 0) { ElMessage.success('删除成功'); fetchTasks() }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

// ============ 任务详情 ============
const refreshAccountsStatus = async () => {
  try {
    const res = await api.get('/whatsapp/accounts/list', { params: { page: 1, page_size: 1000 } })
    if (res.code === 0) {
      let data = res.data
      if (data && data.data && Array.isArray(data.data)) data = data.data
      allAccounts.value = data || []
    }
  } catch (error) { }
}

const fetchTaskMessages = async () => {
  if (!detailTask.value) return
  try {
    const params = {}
    if (messageFilterStatus.value) params.status = messageFilterStatus.value
    const res = await api.get(`/chat/tasks/${detailTask.value.id}`, { params })
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
  sessions.value = []
  detailMessages.value = []
  messageFilterStatus.value = ''
  showAllAccounts.value = false
  showAllSessions.value = false

  try {
    await refreshAccountsStatus()
    const res = await api.get(`/chat/tasks/${row.id}`)
    if (res.code === 0) {
      detailTask.value = res.data.task
      sessions.value = res.data.sessions || []
      detailMessages.value = res.data.messages || []
      messageTotal.value = res.data.total || 0
      accountPairs.value = res.data.account_pairs || {}
      await nextTick()
    }
  } catch (error) {
    ElMessage.error('获取任务详情失败')
  } finally {
    detailLoading.value = false
  }

  if (detailTimer.value) clearInterval(detailTimer.value)
  detailTimer.value = setInterval(async () => {
    if (!showDetailDialog.value || !detailTask.value) return
    try {
      const params = {}
      if (messageFilterStatus.value) params.status = messageFilterStatus.value
      const res = await api.get(`/chat/tasks/${detailTask.value.id}`, { params })
      if (res.code === 0) {
        detailMessages.value = res.data.messages || []
        messageTotal.value = res.data.total || 0
        sessions.value = res.data.sessions || []
        detailTask.value = res.data.task
        accountPairs.value = res.data.account_pairs || {}
        await refreshAccountsStatus()
      }
    } catch (error) { }
  }, 5000)
}

const closeDetail = () => {
  if (detailTimer.value) { clearInterval(detailTimer.value); detailTimer.value = null }
  showAllAccounts.value = false
  showAllSessions.value = false
}

// ============ 生命周期 ============
onMounted(() => {
  fetchAccountGroups()
  fetchAccounts()
  fetchTasks()
})

onBeforeUnmount(() => {
  if (detailTimer.value) { clearInterval(detailTimer.value); detailTimer.value = null }
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

.create-chat-dialog :deep(.el-dialog__header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.create-chat-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.create-chat-dialog :deep(.el-dialog__body) {
  padding: 20px 24px 8px;
  max-height: 65vh;
  overflow-y: auto;
}

.create-chat-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px 20px;
  border-top: 1px solid #f0f0f0;
}

.create-chat-dialog :deep(.el-dialog__body::-webkit-scrollbar) {
  width: 4px;
}

.create-chat-dialog :deep(.el-dialog__body::-webkit-scrollbar-thumb) {
  background: #d0d0d0;
  border-radius: 2px;
}

.form-section {
  margin-bottom: 24px;
}

.form-section:last-child {
  margin-bottom: 0;
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

.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 关键 :deep()穿透scoped */
.slider-wrapper :deep(.el-slider) {
  flex: 1;
  /* 兜底给最小宽度，防止极端压缩 */
  min-width: 120px;
}

.slider-value {
  font-size: 14px;
  font-weight: 500;
  color: #409eff;
  min-width: 44px;
  text-align: center;
}

.range-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.range-wrapper .el-input-number {
  width: 110px;
}

.range-sep {
  color: #86909c;
  font-size: 14px;
  padding: 0 2px;
}

.range-unit {
  color: #86909c;
  font-size: 13px;
  margin-left: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: #e4e7ed;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #a0a4ac;
}

@media (max-width: 768px) {
  .create-chat-dialog :deep(.el-dialog) {
    width: 95% !important;
  }

  .range-wrapper .el-input-number {
    width: 80px;
  }

  .slider-wrapper {
    flex-direction: column;
    gap: 8px;
  }

  .slider-wrapper .el-slider {
    width: 100%;
  }
}
</style>