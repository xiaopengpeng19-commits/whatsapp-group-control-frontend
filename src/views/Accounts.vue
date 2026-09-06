<template>
  <div class="accounts">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;width:100%;">
        <!-- 搜索框 -->
        <el-input v-model="searchKeyword" placeholder="搜索账号" clearable prefix-icon="Search" style="width:200px"
          @input="fetchAccounts" />

        <!-- 状态筛选 -->
        <el-select v-model="filterStatus" placeholder="全部状态" clearable @change="fetchAccounts" style="width:120px">
          <el-option label="全部状态" value="" />
          <el-option label="在线" value="online" />
          <el-option label="正常" value="normal" />
          <el-option label="离线" value="offline" />
          <el-option label="封禁" value="banned" />
          <el-option label="过期" value="expired" />
          <el-option label="登录中" value="logging" />
          <el-option label="请求配对码" value="requesting_pair_code" />
          <el-option label="等待配对码" value="waiting_pair_code" />
        </el-select>
        <el-select v-model="filterIsLogin" placeholder="登录状态" clearable @change="fetchAccounts" style="width:120px">
          <el-option label="全部" value="" />
          <el-option label="已登录" value="true" />
          <el-option label="未登录" value="false" />
        </el-select>
        <el-select v-model="filterGroup" placeholder="全部分组" clearable @change="fetchAccounts" style="width:140px">
          <el-option label="全部分组" value="" />
          <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
            :value="item.name" />
        </el-select>

        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <!-- 上线类（绿色）放最左边 -->
          <el-button type="success" plain @click="handleBatchOnline" :disabled="selectedAccounts.length === 0"
            :loading="batchOnlineLoading" size="default">
            <el-icon>
              <Promotion />
            </el-icon> 批量上线
          </el-button>
          <el-button type="success" plain @click="showGroupOnlineDialog = true" size="default">
            <el-icon>
              <Promotion />
            </el-icon> 分组上线
          </el-button>

          <!-- 下线类（红色） -->
          <el-button type="danger" plain @click="handleBatchOffline" :disabled="selectedAccounts.length === 0"
            :loading="batchOfflineLoading" size="default">
            <el-icon>
              <SwitchButton />
            </el-icon> 批量下线
          </el-button>
          <el-button type="danger" plain @click="showGroupOfflineDialog = true" size="default">
            <el-icon>
              <SwitchButton />
            </el-icon> 分组下线
          </el-button>

          <!-- 其他操作 -->
          <el-button type="primary" @click="showBatchAddDialog = true" size="default">
            <el-icon>
              <Plus />
            </el-icon> 批量添加
          </el-button>
          <el-button type="success" @click="showImportDialog = true" size="default">
            <el-icon>
              <Upload />
            </el-icon> 批量导入
          </el-button>
          <el-button type="warning" plain @click="showBatchGroupDialog = true" :disabled="selectedAccounts.length === 0"
            size="default">
            <el-icon>
              <Folder />
            </el-icon> 改分组
          </el-button>
          <el-button type="info" plain @click="showBatchProxyDialog = true" :disabled="selectedAccounts.length === 0"
            size="default">
            <el-icon>
              <Connection />
            </el-icon> 改代理
          </el-button>
          <el-button type="primary" plain @click="showBatchProfileDialog = true"
            :disabled="selectedAccounts.length === 0" size="default">
            <el-icon>
              <Edit />
            </el-icon> 批量改资料
          </el-button>
          <el-button type="warning" plain @click="handleBatchExport" :disabled="selectedAccounts.length === 0"
            size="default">
            <el-icon>
              <Download />
            </el-icon> 导出
          </el-button>
          <el-button @click="fetchAccounts" size="default">
            <el-icon>
              <Refresh />
            </el-icon> 刷新
          </el-button>

          <!-- ✅ 清空重连队列 -->
          <el-button type="danger" plain @click="handleClearReconnectQueue" :loading="clearQueueLoading" size="default">
            <el-icon>
              <Delete />
            </el-icon> 清空重连队列
          </el-button>
          <!-- ✅ 新增：批量删除 -->
          <el-button type="danger" @click="handleBatchDelete" :disabled="selectedAccounts.length === 0"
            :loading="batchDeleteLoading" size="default">
            <el-icon>
              <Delete />
            </el-icon> 批量删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 账号分组统计 -->
    <el-card style="margin-bottom:20px">
      <template #header>
        <span>账号分组统计</span>
      </template>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div v-for="item in accountGroups" :key="item.name" class="group-stat">
          <el-tag size="large">
            {{ item.name }}: {{ item.count }} 个
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 账号列表 -->
    <el-table :data="accounts" v-loading="loading" border @selection-change="handleSelectionChange" row-key="account">
      <el-table-column type="selection" width="55" />
      <el-table-column prop="account" label="账号" width="140" />
      <el-table-column prop="nickname" label="昵称" width="100" />
      <el-table-column prop="group" label="账号分组" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.group ? 'primary' : 'info'">
            {{ row.group || '未分组' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="proxyGroup" label="代理分组" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.proxyGroup ? 'primary' : 'info'">
            {{ row.proxyGroup || '未分配' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="proxy" label="代理IP" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.proxy" style="font-size:12px;font-family:monospace;">
            {{ row.proxy }}
          </span>
          <span v-else style="color:#999;font-size:12px;">未分配</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="130">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
            <el-tag v-if="row.status === 'banned' && row.errCode" type="danger" size="small" style="font-size:10px;">
              {{ row.errCode }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="isLogin" label="登录" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isLogin ? 'success' : 'danger'" size="small">
            {{ row.isLogin ? '已登录' : '未登录' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="chatPairs" label="配对次数" width="90" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="info">
            {{ row.chatPairs || 0 }}
          </el-tag>
        </template>
      </el-table-column>
      <!-- 在表格中添加 -->
      <el-table-column prop="groupMsgSent" label="群发消息" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="primary">
            {{ row.groupMsgSent || 0 }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="groupMsgReceived" label="群收消息" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="success">
            {{ row.groupMsgReceived || 0 }}
          </el-tag>
        </template>
      </el-table-column>
      <!-- 在账号列表表格中添加 -->
      <el-table-column prop="privateMsgReceived" label="收私聊" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="info">
            {{ row.privateMsgReceived || 0 }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="statusAt" label="状态更新时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.statusAt) }}
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <!-- 操作列 -->
      <el-table-column label="操作" width="420" fixed="right">
        <template #default="{ row }">
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <!-- 上线/下线按钮 -->
            <el-button
              v-if="row.status !== 'online' && row.status !== 'normal' && row.status !== 'logging' && row.status !== 'banned'"
              size="small" type="success" @click="handleOnline(row.account)">
              <el-icon>
                <Promotion />
              </el-icon> 上线
            </el-button>
            <el-button v-else-if="row.status === 'online' || row.status === 'normal'" size="small" type="warning"
              @click="handleOffline(row.account)">
              <el-icon>
                <SwitchButton />
              </el-icon> 下线
            </el-button>
            <el-button v-else-if="row.status === 'logging'" size="small" type="info" disabled>登录中...</el-button>
            <el-button v-else-if="row.status === 'banned'" size="small" type="danger" disabled>已封禁</el-button>

            <!-- 私聊按钮 -->
            <el-button size="small" type="info" @click="showPrivateMessages(row.account)">
              <el-icon>
                <ChatDotRound />
              </el-icon> 私聊
            </el-button>

            <!-- 二维码 -->
            <el-button size="small" type="info" @click="showQRCode(row)">
              二维码
            </el-button>

            <!-- 删除 -->
            <el-button size="small" type="danger" @click="handleDelete(row.account)">
              <el-icon>
                <Delete />
              </el-icon> 删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top:20px;display:flex;justify-content:flex-end">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
        :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="fetchAccounts"
        @current-change="fetchAccounts" />
    </div>
    <!-- ========================================== -->
    <!-- 批量修改资料对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showBatchProfileDialog" title="批量修改资料" width="600px" :close-on-click-modal="false">
      <el-form :model="batchProfileForm" label-width="120px">
        <el-form-item label="选中账号">
          <span>{{ selectedAccounts.length }} 个账号</span>
          <el-tag v-for="acc in selectedAccounts.slice(0, 5)" :key="acc" size="small" style="margin-left:4px;">
            {{ acc }}
          </el-tag>
          <span v-if="selectedAccounts.length > 5" style="color:#999;font-size:12px;margin-left:4px;">
            +{{ selectedAccounts.length - 5 }}
          </span>
        </el-form-item>

        <el-form-item label="昵称">
          <el-input v-model="batchProfileForm.nickname" placeholder="请输入新昵称（留空则不修改）" />
        </el-form-item>

        <!-- ✅ 头像：支持 URL 或 Base64 -->
        <el-form-item label="头像">
          <el-radio-group v-model="batchProfileForm.avatarType" size="small" style="margin-bottom:8px;">
            <el-radio-button value="url">URL</el-radio-button>
            <el-radio-button value="base64">Base64</el-radio-button>
          </el-radio-group>
          <el-input v-if="batchProfileForm.avatarType === 'url'" v-model="batchProfileForm.imageUrl"
            placeholder="请输入头像图片 URL（如：https://example.com/avatar.jpg）" />
          <el-input v-else v-model="batchProfileForm.base64Content" type="textarea" :rows="3"
            placeholder="请粘贴 Base64 编码的图片数据" />
          <div style="font-size:12px;color:#999;margin-top:4px;">
            {{ batchProfileForm.avatarType === 'url' ? 'URL 方式：图片需公网可访问' : 'Base64 方式：支持 data:image/png;base64,开头或纯Base64'}}
          </div>
        </el-form-item>

        <el-form-item label="状态">
          <el-input v-model="batchProfileForm.status" placeholder="请输入新状态（留空则不修改）" />
        </el-form-item>

        <el-form-item>
          <el-alert type="info" :closable="false" show-icon>
            <template #title>
              <div>
                <div>• 至少填写一项要修改的内容</div>
                <div>• 仅对在线账号生效</div>
                <div>• 头像支持 URL 或 Base64 两种方式</div>
              </div>
            </template>
          </el-alert>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showBatchProfileDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchProfile" :loading="batchProfileLoading">
          确定修改
        </el-button>
      </template>
    </el-dialog>
    <!-- 批量添加账号对话框 -->
    <el-dialog v-model="showBatchAddDialog" title="批量添加账号" width="600px">
      <el-form :model="batchAddForm" label-width="100px">
        <el-form-item label="账号列表" required>
          <el-input v-model="batchAddForm.accountsText" type="textarea" :rows="10" placeholder="每行一个手机号" />
          <div style="font-size:12px;color:#999;margin-top:4px;">
            示例:<br>
            8612345678901<br>
            8612345678902
          </div>
        </el-form-item>
        <el-form-item label="账号分组">
          <el-input v-model="batchAddForm.group" placeholder="请输入分组名称（可选）" />
        </el-form-item>
        <el-form-item label="代理分组" required>
          <el-select v-model="batchAddForm.proxyGroup" placeholder="请选择代理分组" style="width:100%">
            <el-option v-for="item in proxyGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchAdd" :loading="batchAddLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 批量导入对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showImportDialog" title="批量添加账号" width="600px">
      <el-form :model="importForm" label-width="100px">
        <el-form-item label="账号文件" required>
          <el-upload ref="uploadRef" :auto-upload="false" multiple accept=".json,.txt" :limit="200"
            :on-change="handleFileChange" :on-remove="handleFileRemove" :on-exceed="handleExceed">
            <el-button type="primary" plain>
              <el-icon>
                <FolderOpened />
              </el-icon> 选择账号文件（支持 .json / .txt）
            </el-button>
            <template #tip>
              <div style="font-size:12px;color:#999;margin-top:4px;">
                支持格式：<br>
                1. .txt 每行一个手机号，或 手机号,凭证...（自动提取手机号）<br>
                2. .json 格式的凭证文件（自动提取手机号）
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="账号分组">
          <el-input v-model="importForm.accountGroup" placeholder="请输入分组名称（可选）" />
        </el-form-item>
        <el-form-item label="代理分组" required>
          <el-select v-model="importForm.proxyGroup" placeholder="请选择代理分组" style="width:100%">
            <el-option v-for="item in proxyGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="importFiles.length > 0" label="已选文件">
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            <el-tag v-for="(file, index) in importFiles" :key="index" size="small" closable @close="removeFile(index)">
              {{ file.name }}
            </el-tag>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="handleFileImport" :loading="importing">
          {{ importing ? '导入中...' : '批量添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 批量改代理对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showBatchProxyDialog" title="批量改代理" width="450px">
      <el-form label-width="100px">
        <el-form-item label="选中数量">
          <span>{{ selectedAccounts.length }} 个账号</span>
        </el-form-item>
        <el-form-item label="代理分组" required>
          <el-select v-model="batchProxyGroup" placeholder="请选择代理分组" style="width:100%">
            <el-option v-for="item in proxyGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
          <div style="font-size:12px;color:#999;margin-top:4px;">
            切换后自动分配该分组中使用最少的代理IP
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchProxyDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchProxy" :loading="batchProxyLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 批量改分组对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showBatchGroupDialog" title="批量改分组" width="400px">
      <el-form label-width="80px">
        <el-form-item label="选中数量">
          <span>{{ selectedAccounts.length }} 个账号</span>
        </el-form-item>
        <el-form-item label="新分组">
          <el-input v-model="batchGroupForm.group" placeholder="请输入分组名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchGroup">确定</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 分组上线对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showGroupOnlineDialog" title="分组上线" width="450px">
      <el-form label-width="100px">
        <el-form-item label="选择分组" required>
          <el-select v-model="onlineGroup" placeholder="请选择要上线的分组" style="width:100%">
            <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-alert type="info" :closable="false" show-icon>
            <template #title>将对该分组下所有离线账号执行上线操作</template>
          </el-alert>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGroupOnlineDialog = false">取消</el-button>
        <el-button type="primary" @click="handleGroupOnline" :loading="groupOnlineLoading">确定上线</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 分组下线对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showGroupOfflineDialog" title="分组下线" width="450px">
      <el-form label-width="100px">
        <el-form-item label="选择分组" required>
          <el-select v-model="offlineGroup" placeholder="请选择要下线的分组" style="width:100%">
            <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-alert type="warning" :closable="false" show-icon>
            <template #title>将对该分组下所有在线账号执行下线操作</template>
          </el-alert>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGroupOfflineDialog = false">取消</el-button>
        <el-button type="danger" @click="handleGroupOffline" :loading="groupOfflineLoading">确定下线</el-button>
      </template>
    </el-dialog>

    <!-- 二维码对话框 -->
    <el-dialog v-model="showQRDialog" title="扫码登录" width="450px" :close-on-click-modal="false">
      <div class="qr-container" v-loading="qrLoading">
        <div v-if="qrCode" class="qr-image-wrapper">
          <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrCode)"
            alt="二维码" />
          <p class="qr-tip">请使用 WhatsApp 扫描二维码登录</p>

          <!-- ✅ 新增：显示链接 -->
          <div style="margin-top:12px;width:100%;">
            <div style="display:flex;gap:8px;align-items:center;background:#f5f7fa;padding:8px 12px;border-radius:4px;">
              <el-input v-model="qrCode" readonly size="small" style="flex:1;font-size:12px;" @click="copyQRCode" />
              <el-button size="small" type="primary" @click="copyQRCode">
                <el-icon>
                  <CopyDocument />
                </el-icon> 复制
              </el-button>
            </div>
            <!-- 简短提示 -->
            <div style="font-size:12px;color:#999;margin-top:4px;text-align:center;word-break:break-all;">
              点击输入框或复制按钮即可复制完整链接
            </div>
          </div>
        </div>
        <div v-else-if="!qrLoading" class="qr-empty">
          <el-icon :size="48">
            <Picture />
          </el-icon>
          <p>暂无二维码</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import { Plus, Refresh, Folder, Picture, Upload, FolderOpened, Promotion, SwitchButton, Connection, Download, Delete } from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import api from '@/api'
import dayjs from 'dayjs'
import { ChatDotRound } from '@element-plus/icons-vue'
import { Edit } from '@element-plus/icons-vue'
// ============ 批量修改资料 ============
const showBatchProfileDialog = ref(false)
const batchProfileLoading = ref(false)
const batchProfileForm = reactive({
  nickname: '',
  avatarType: 'url',  // ✅ 新增：url 或 base64
  imageUrl: '',
  base64Content: '',  // ✅ 新增
  status: ''
})

const handleBatchProfile = async () => {
  if (selectedAccounts.value.length === 0) {
    ElMessage.warning('请先选择账号')
    return
  }

  // 检查是否至少填写一项
  if (!batchProfileForm.nickname && !batchProfileForm.imageUrl && !batchProfileForm.base64Content && !batchProfileForm.status) {
    ElMessage.warning('请至少填写一项要修改的内容')
    return
  }

  batchProfileLoading.value = true
  let hasError = false

  try {
    // 修改昵称
    if (batchProfileForm.nickname) {
      const res = await api.post('/whatsapp/accounts/batch/nickname', {
        accounts: selectedAccounts.value,
        nickname: batchProfileForm.nickname
      })
      if (res.code !== 0) {
        ElMessage.error('修改昵称失败: ' + (res.message || ''))
        hasError = true
      } else {
        ElMessage.success(`昵称修改已提交 (${selectedAccounts.value.length} 个账号)`)
      }
    }

    // ✅ 修改头像（支持 URL 或 Base64）
    if (batchProfileForm.imageUrl || batchProfileForm.base64Content) {
      const payload = {
        accounts: selectedAccounts.value
      }
      if (batchProfileForm.avatarType === 'url') {
        payload.imageUrl = batchProfileForm.imageUrl
      } else {
        // 如果是 data:image/png;base64, 开头的，提取纯 Base64
        let base64 = batchProfileForm.base64Content
        if (base64.startsWith('data:image')) {
          base64 = base64.split(',')[1] || base64
        }
        payload.base64Content = base64
      }

      const res = await api.post('/whatsapp/accounts/batch/avatar', payload)
      if (res.code !== 0) {
        ElMessage.error('修改头像失败: ' + (res.message || ''))
        hasError = true
      } else {
        ElMessage.success(`头像修改已提交 (${selectedAccounts.value.length} 个账号)`)
      }
    }

    // 修改状态
    if (batchProfileForm.status) {
      const res = await api.post('/whatsapp/accounts/batch/status', {
        accounts: selectedAccounts.value,
        status: batchProfileForm.status
      })
      if (res.code !== 0) {
        ElMessage.error('修改状态失败: ' + (res.message || ''))
        hasError = true
      } else {
        ElMessage.success(`状态修改已提交 (${selectedAccounts.value.length} 个账号)`)
      }
    }

    if (!hasError) {
      showBatchProfileDialog.value = false
      batchProfileForm.nickname = ''
      batchProfileForm.avatarType = 'url'
      batchProfileForm.imageUrl = ''
      batchProfileForm.base64Content = ''
      batchProfileForm.status = ''
      selectedAccounts.value = []
      setTimeout(() => fetchAccounts(), 3000)
    }
  } catch (error) {
    ElMessage.error('操作失败: ' + (error.message || ''))
  } finally {
    batchProfileLoading.value = false
  }
}

// ============ 私聊消息 ============
const showPrivateDialog = ref(false)
const currentAccount = ref('')
const privateMessages = ref([])
const privateLoading = ref(false)
const privateTotal = ref(0)
const privatePage = ref(1)
const privatePageSize = ref(20)

const showPrivateMessages = async (account) => {
  currentAccount.value = account
  privatePage.value = 1
  showPrivateDialog.value = true
  await fetchPrivateMessages()
}

const fetchPrivateMessages = async () => {
  if (!currentAccount.value) return
  privateLoading.value = true
  try {
    const res = await api.get('/private-messages/list', {
      params: {
        account: currentAccount.value,
        page: privatePage.value,
        page_size: privatePageSize.value
      }
    })
    if (res.code === 0) {
      privateMessages.value = res.data.data || []
      privateTotal.value = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取私聊消息失败')
  } finally {
    privateLoading.value = false
  }
}

const handleDeletePrivate = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该消息吗？', '提示', { type: 'warning' })
    const res = await api.delete(`/private-messages/${id}/delete`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchPrivateMessages()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}
// ============ 状态 ============
const filterIsLogin = ref('')
const accounts = ref([])
const accountGroups = ref([])
const proxyGroups = ref([])
const loading = ref(false)
const qrLoading = ref(false)
const selectedAccounts = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const filterStatus = ref('')
const clearQueueLoading = ref(false)

const showAddDialog = ref(false)
const showImportDialog = ref(false)
const showBatchGroupDialog = ref(false)
const showBatchProxyDialog = ref(false)
const showQRDialog = ref(false)
const importing = ref(false)
const uploadRef = ref(null)
const importFiles = ref([])

const filterGroup = ref('')
const qrCode = ref('')

// ============ 分组上线/下线 ============
const showGroupOnlineDialog = ref(false)
const onlineGroup = ref('')
const groupOnlineLoading = ref(false)
const showGroupOfflineDialog = ref(false)
const offlineGroup = ref('')
const groupOfflineLoading = ref(false)

// ============ 批量改代理 ============
const batchProxyGroup = ref('')
const batchProxyLoading = ref(false)

// ============ 批量上线/下线 ============
const batchOnlineLoading = ref(false)
const batchOfflineLoading = ref(false)

// ============ 批量添加账号 ============
const showBatchAddDialog = ref(false)
const batchAddLoading = ref(false)
const batchAddForm = reactive({
  accountsText: '',
  group: '',
  proxyGroup: ''
})
const copyQRCode = () => {
  if (!qrCode.value) {
    ElMessage.warning('没有可复制的内容')
    return
  }

  // 优先使用 Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(qrCode.value).then(() => {
      ElMessage.success('已复制链接')
    }).catch(() => {
      fallbackCopy(qrCode.value)
    })
  } else {
    fallbackCopy(qrCode.value)
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
    ElMessage.success('已复制链接')
  } catch (err) {
    ElMessage.error('复制失败，请手动复制')
  }
  document.body.removeChild(textarea)
}
const handleBatchAdd = async () => {
  const accounts = batchAddForm.accountsText.split('\n')
    .map(a => a.trim())
    .filter(a => a !== '')

  if (accounts.length === 0) {
    ElMessage.warning('请输入至少一个手机号')
    return
  }

  if (!batchAddForm.proxyGroup) {
    ElMessage.warning('请选择代理分组')
    return
  }

  batchAddLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/batch/add', {
      accounts: accounts,
      group: batchAddForm.group || '',
      proxyGroup: batchAddForm.proxyGroup
    })
    if (res.code === 0) {
      const { success, failed, duplicate, total } = res.data
      ElMessage.success(`添加完成：成功 ${success} 个，失败 ${failed} 个，重复 ${duplicate} 个，共 ${total} 个`)
      showBatchAddDialog.value = false
      batchAddForm.accountsText = ''
      batchAddForm.group = ''
      batchAddForm.proxyGroup = ''
      fetchAccounts()
      fetchAccountGroups()
      fetchProxyGroups()
    }
  } catch (error) {
    ElMessage.error('批量添加失败: ' + (error.message || ''))
  } finally {
    batchAddLoading.value = false
  }
}

// ============ 表单 ============
const addForm = reactive({
  account: '',
  nickname: '',
  group: '',
  proxyGroup: ''
})

const importForm = reactive({
  proxyGroup: '',
  accountGroup: ''
})

const batchGroupForm = reactive({
  group: ''
})

// ============ 状态映射 ============
const statusMap = {
  'online': '在线',
  'normal': '在线',
  'logging': '登录中',
  'offline': '离线',
  'banned': '封禁',
  'expired': '过期',
  'requesting_pair_code': '请求配对码中',
  'waiting_pair_code': '等待配对码'
}

const statusTypeMap = {
  'online': 'success',
  'normal': 'success',
  'logging': 'warning',
  'offline': 'info',
  'banned': 'danger',
  'expired': 'danger',
  'requesting_pair_code': 'warning',
  'waiting_pair_code': 'warning'
}

const getStatusText = (status) => statusMap[status] || status || '未知'
const getStatusType = (status) => statusTypeMap[status] || 'info'
const formatTime = (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'

// ============ 数据获取 ============
const fetchAccountGroups = async () => {
  try {
    const res = await api.get('/whatsapp/accounts/groups')
    if (res.code === 0) accountGroups.value = res.data || []
  } catch (error) { }
}

const fetchProxyGroups = async () => {
  try {
    const res = await api.get('/proxies/groups')
    if (res.code === 0) proxyGroups.value = res.data || []
  } catch (error) { }
}

const fetchAccounts = async () => {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterGroup.value) params.group = filterGroup.value
    if (filterStatus.value) params.status = filterStatus.value
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (filterIsLogin.value !== '') params.is_login = filterIsLogin.value  // ✅ 新增
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
// ============ 批量删除 ============
const batchDeleteLoading = ref(false)

const handleBatchDelete = async () => {
  if (selectedAccounts.value.length === 0) {
    ElMessage.warning('请先选择要删除的账号')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedAccounts.value.length} 个账号吗？\n此操作不可恢复！`,
      '批量删除确认',
      { type: 'error', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )

    batchDeleteLoading.value = true
    let successCount = 0
    let failCount = 0
    const failedAccounts = []

    for (const account of selectedAccounts.value) {
      try {
        const res = await whatsapp.deleteAccount(account)
        if (res.code === 0) {
          successCount++
        } else {
          failCount++
          failedAccounts.push(account + ': ' + res.message)
        }
      } catch (error) {
        failCount++
        failedAccounts.push(account + ': ' + (error.message || '未知错误'))
      }
      // 间隔50ms，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    if (failCount === 0) {
      ElMessage.success(`成功删除 ${successCount} 个账号`)
    } else {
      ElMessage.warning(`成功删除 ${successCount} 个，失败 ${failCount} 个`)
      if (failedAccounts.length > 0) {
        console.log('删除失败列表:', failedAccounts)
        ElMessage.error('部分账号删除失败: ' + failedAccounts.join('; '))
      }
    }

    selectedAccounts.value = []
    fetchAccounts()
    fetchAccountGroups()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败: ' + (error.message || ''))
    }
  } finally {
    batchDeleteLoading.value = false
  }
}
// ============ 选中账号 ============
const handleSelectionChange = (selection) => {
  selectedAccounts.value = selection.map(item => item.account)
}

// ============ 添加账号 ============
const handleAdd = async () => {
  if (!addForm.account) { ElMessage.warning('请输入手机号'); return }
  if (!addForm.proxyGroup) { ElMessage.warning('请选择代理分组'); return }
  try {
    const res = await whatsapp.addAccount({
      account: addForm.account,
      nickname: addForm.nickname,
      group: addForm.group,
      proxyGroup: addForm.proxyGroup
    })
    if (res.code === 0) {
      const msg = res.data.proxy ? '已分配代理: ' + res.data.proxy : '未分配代理'
      ElMessage.success('添加成功，' + msg)
      showAddDialog.value = false
      addForm.account = ''
      addForm.nickname = ''
      addForm.group = ''
      addForm.proxyGroup = ''
      fetchAccounts()
      fetchAccountGroups()
    }
  } catch (error) {
    ElMessage.error('添加失败: ' + (error.message || ''))
  }
}

// ============ 批量导入 ============
const handleFileChange = (file) => { importFiles.value.push(file) }
const handleFileRemove = (file) => {
  const index = importFiles.value.findIndex(f => f.uid === file.uid)
  if (index !== -1) importFiles.value.splice(index, 1)
}
const removeFile = (index) => { importFiles.value.splice(index, 1) }
const handleExceed = () => { ElMessage.warning('最多只能选择200个文件') }

// ============ 从文件导入手机号 ============
const handleFileImport = async () => {
  if (importFiles.value.length === 0) {
    ElMessage.warning('请选择账号文件')
    return
  }

  if (!importForm.proxyGroup) {
    ElMessage.warning('请选择代理分组')
    return
  }

  importing.value = true
  try {
    const allPhones = []

    for (const file of importFiles.value) {
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsText(file.raw)
      })

      const trimmed = content.trim()
      let phones = []

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // JSON格式：提取所有手机号
        try {
          const jsonData = JSON.parse(trimmed)
          // 尝试多种路径提取手机号
          if (jsonData.Phone) {
            phones.push(jsonData.Phone)
          } else if (jsonData.data && jsonData.data.Phone) {
            phones.push(jsonData.data.Phone)
          } else if (jsonData.me && jsonData.me.id) {
            const id = jsonData.me.id
            const phone = id.split('@')[0].split(':')[0]
            phones.push(phone)
          } else if (Array.isArray(jsonData)) {
            jsonData.forEach(item => {
              if (item.Phone) phones.push(item.Phone)
              else if (item.data && item.data.Phone) phones.push(item.data.Phone)
            })
          }
          // 如果还是没提取到，尝试正则匹配手机号
          if (phones.length === 0) {
            const matches = trimmed.match(/\d{10,15}/g)
            phones = matches || []
          }
        } catch (e) {
          // JSON解析失败，尝试正则匹配
          const matches = trimmed.match(/\d{10,15}/g)
          phones = matches || []
        }
      } else {
        // TXT格式：每行解析
        const lines = trimmed.split('\n').filter(line => line.trim())
        for (const line of lines) {
          // 尝试逗号分隔，取第一段
          const parts = line.split(',').map(s => s.trim())
          const firstPart = parts[0]
          // 如果第一段是手机号（10-15位数字）
          if (/^\d{10,15}$/.test(firstPart)) {
            phones.push(firstPart)
          } else {
            // 尝试从整行提取手机号
            const matches = line.match(/\d{10,15}/)
            if (matches) {
              phones.push(matches[0])
            }
          }
        }
      }

      allPhones.push(...phones)
    }

    // 去重
    const uniquePhones = [...new Set(allPhones)]

    if (uniquePhones.length === 0) {
      ElMessage.warning('未能从文件中提取到手机号')
      importing.value = false
      return
    }

    // 调用批量添加接口
    const res = await api.post('/whatsapp/accounts/batch/add', {
      accounts: uniquePhones,
      group: importForm.accountGroup || '',
      proxyGroup: importForm.proxyGroup
    })

    if (res.code === 0) {
      const { success, failed, duplicate, total } = res.data
      ElMessage.success(`添加完成：成功 ${success} 个，失败 ${failed} 个，重复 ${duplicate} 个，共 ${total} 个`)
      showImportDialog.value = false
      importFiles.value = []
      importForm.accountGroup = ''
      uploadRef.value?.clearFiles()
      fetchAccounts()
      fetchAccountGroups()
      fetchProxyGroups()
    } else {
      ElMessage.error(res.message || '批量添加失败')
    }
  } catch (error) {
    ElMessage.error('批量添加失败: ' + (error.message || ''))
  } finally {
    importing.value = false
  }
}

// ============ 批量改分组 ============
const handleBatchGroup = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  if (!batchGroupForm.group) { ElMessage.warning('请输入分组名称'); return }
  try {
    let successCount = 0
    for (const account of selectedAccounts.value) {
      const res = await api.put(`/whatsapp/accounts/${account}/group`, { group: batchGroupForm.group })
      if (res.code === 0) successCount++
    }
    ElMessage.success(`成功更新 ${successCount}/${selectedAccounts.value.length} 个账号的分组`)
    showBatchGroupDialog.value = false
    batchGroupForm.group = ''
    selectedAccounts.value = []
    fetchAccounts()
    fetchAccountGroups()
  } catch (error) {
    ElMessage.error('批量改分组失败: ' + (error.message || ''))
  }
}

// ============ 批量改代理 ============
const handleBatchProxy = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  if (!batchProxyGroup.value) { ElMessage.warning('请选择代理分组'); return }
  batchProxyLoading.value = true
  try {
    let successCount = 0
    for (const account of selectedAccounts.value) {
      const res = await api.put(`/whatsapp/accounts/${account}/proxygroup`, { proxyGroup: batchProxyGroup.value })
      if (res.code === 0) successCount++
    }
    ElMessage.success(`成功更新 ${successCount}/${selectedAccounts.value.length} 个账号的代理分组`)
    showBatchProxyDialog.value = false
    batchProxyGroup.value = ''
    selectedAccounts.value = []
    fetchAccounts()
    fetchProxyGroups()
  } catch (error) {
    ElMessage.error('批量改代理失败: ' + (error.message || ''))
  } finally {
    batchProxyLoading.value = false
  }
}

// ============ 批量导出凭证 ============
const handleBatchExport = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  try {
    for (const account of selectedAccounts.value) {
      await handleExport(account)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    ElMessage.success(`已导出 ${selectedAccounts.value.length} 个凭证`)
    selectedAccounts.value = []
  } catch (error) {
    ElMessage.error('批量导出失败: ' + (error.message || ''))
  }
}

// ============ 批量上线 ============
const handleBatchOnline = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  const offlineAccounts = selectedAccounts.value.filter(account => {
    const acc = accounts.value.find(a => a.account === account)
    return acc && (acc.status === 'offline' || acc.status === 'expired')
  })
  if (offlineAccounts.length === 0) { ElMessage.warning('选中的账号中没有离线账号'); return }
  if (offlineAccounts.length < selectedAccounts.value.length) {
    const onlineCount = selectedAccounts.value.length - offlineAccounts.length
    ElMessage.warning(`已过滤 ${onlineCount} 个在线账号，将上线 ${offlineAccounts.length} 个离线账号`)
  }
  batchOnlineLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/batch/online', { accounts: offlineAccounts })
    if (res.code === 0) {
      ElMessage.success(`已提交 ${res.data.total} 个账号的批量上线任务，请稍后刷新查看状态`)
      selectedAccounts.value = []
      setTimeout(() => fetchAccounts(), 5000)
    } else {
      ElMessage.error(res.message || '批量上线失败')
    }
  } catch (error) {
    ElMessage.error('批量上线失败: ' + (error.message || ''))
  } finally {
    batchOnlineLoading.value = false
  }
}

// ============ 批量下线 ============
const handleBatchOffline = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  const onlineAccounts = selectedAccounts.value.filter(account => {
    const acc = accounts.value.find(a => a.account === account)
    return acc && (acc.status === 'online' || acc.status === 'normal')
  })
  if (onlineAccounts.length === 0) { ElMessage.warning('选中的账号中没有在线账号'); return }
  if (onlineAccounts.length < selectedAccounts.value.length) {
    const offlineCount = selectedAccounts.value.length - onlineAccounts.length
    ElMessage.warning(`已过滤 ${offlineCount} 个离线账号，将下线 ${onlineAccounts.length} 个在线账号`)
  }
  batchOfflineLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/batch/offline', { accounts: onlineAccounts })
    if (res.code === 0) {
      ElMessage.success(`已提交 ${res.data.total} 个账号的批量下线任务，请稍后刷新查看状态`)
      selectedAccounts.value = []
      setTimeout(() => fetchAccounts(), 3000)
    } else {
      ElMessage.error(res.message || '批量下线失败')
    }
  } catch (error) {
    ElMessage.error('批量下线失败: ' + (error.message || ''))
  } finally {
    batchOfflineLoading.value = false
  }
}

// ============ 分组上线 ============
const handleGroupOnline = async () => {
  if (!onlineGroup.value) { ElMessage.warning('请选择分组'); return }
  groupOnlineLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/group-online', { group: onlineGroup.value })
    if (res.code === 0) {
      ElMessage.success(`分组上线任务已提交，请稍后刷新查看结果`)
      showGroupOnlineDialog.value = false
      onlineGroup.value = ''
      setTimeout(() => fetchAccounts(), 5000)
    }
  } catch (error) {
    ElMessage.error('分组上线失败: ' + (error.message || ''))
  } finally {
    groupOnlineLoading.value = false
  }
}

// ============ 分组下线 ============
const handleGroupOffline = async () => {
  if (!offlineGroup.value) { ElMessage.warning('请选择分组'); return }
  groupOfflineLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/group-offline', { group: offlineGroup.value })
    if (res.code === 0) {
      ElMessage.success(`分组下线任务已提交，请稍后刷新查看结果`)
      showGroupOfflineDialog.value = false
      offlineGroup.value = ''
      setTimeout(() => fetchAccounts(), 3000)
    }
  } catch (error) {
    ElMessage.error('分组下线失败: ' + (error.message || ''))
  } finally {
    groupOfflineLoading.value = false
  }
}

// ============ 删除账号 ============
const handleDelete = async (account) => {
  // 不再检查 isLogin
  try {
    await ElMessageBox.confirm(`确定要删除账号 ${account} 吗？`, '提示', { type: 'warning' })
    const res = await whatsapp.deleteAccount(account)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchAccounts()
      fetchAccountGroups()
    }
  } catch { }
}

// ============ 上线/下线 ============
const handleOnline = async (account) => {
  try {
    const res = await whatsapp.online(account)
    if (res.code === 0) { ElMessage.success('上线成功'); fetchAccounts() }
  } catch (error) {
    ElMessage.error(error.message || '上线失败')
  }
}

const handleOffline = async (account) => {
  try {
    const res = await whatsapp.offline(account)
    if (res.code === 0) { ElMessage.success('下线成功'); fetchAccounts() }
  } catch (error) {
    ElMessage.error('下线失败')
  }
}

// ============ 二维码 ============
const showQRCode = async (row) => {
  showQRDialog.value = true
  qrCode.value = ''
  qrLoading.value = true
  try {
    const res = await whatsapp.getQRCodeLogin(row.account, { proxy: row.proxy || '', callbackurl: '' })
    if (res.code === 0 && res.data?.qrCode) {
      qrCode.value = res.data.qrCode
    } else {
      ElMessage.warning('二维码生成中，请稍后重试')
    }
  } catch (error) {
    ElMessage.error('获取二维码失败: ' + (error.message || ''))
  } finally {
    qrLoading.value = false
  }
}

// ============ 导出凭证 ============
const handleExport = async (account) => {
  try {
    const res = await whatsapp.exportCreds(account)
    if (res.code === 0) {
      let credsData = res.data
      if (res.data && typeof res.data === 'object' && res.data.creds) {
        credsData = res.data.creds
      }
      const filename = `${account}_${Date.now()}.json`
      const blob = new Blob([JSON.stringify(credsData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      ElMessage.success(`凭证 ${filename} 导出成功`)
    } else {
      ElMessage.error(res.message || '导出失败')
    }
  } catch (error) {
    ElMessage.error('导出失败: ' + (error.message || ''))
  }
}

// ============ 清空重连队列 ============
const handleClearReconnectQueue = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空重连队列吗？\n清空后，所有等待重连的账号将不会自动上线。',
      '警告',
      { type: 'warning', confirmButtonText: '确定清空', cancelButtonText: '取消' }
    )
    clearQueueLoading.value = true
    const res = await api.post('/system/reconnect/clear')
    if (res.code === 0) {
      const { count, members } = res.data
      ElMessage.success(`已清空 ${count} 个等待重连的账号`)
      if (members && members.length > 0) {
        ElMessage.info(`已清除: ${members.join(', ')}`)
      }
    } else {
      ElMessage.error(res.message || '清空失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空失败: ' + (error.message || ''))
    }
  } finally {
    clearQueueLoading.value = false
  }
}

// ============ 生命周期 ============
onMounted(() => {
  fetchAccountGroups()
  fetchProxyGroups()
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

.group-stat {
  padding: 4px 0;
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 250px;
  padding: 20px 0;
}

.qr-image-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qr-container img {
  width: 250px;
  height: 250px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
}

.qr-tip {
  color: #999;
  font-size: 14px;
}

.qr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #999;
}

.qr-empty .el-icon {
  font-size: 48px;
}
</style>