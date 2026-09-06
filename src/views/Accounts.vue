<template>
  <div class="accounts">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;width:100%;">
        <!-- 搜索框 -->
        <el-input v-model="searchKeyword" placeholder="搜索账号" clearable prefix-icon="Search" style="width:200px"
          @input="debounceFetchAccounts" />

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
          <!-- 上线类 -->
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

          <!-- 下线类 -->
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
          <el-button type="info" plain @click="showGroupProxyDialog = true" size="default">
            <el-icon>
              <Connection />
            </el-icon> 分组改代理
          </el-button>
          <el-button type="primary" plain @click="showBatchProfileDialog = true"
            :disabled="selectedAccounts.length === 0" size="default">
            <el-icon>
              <Edit />
            </el-icon> 批量改资料
          </el-button>
          <el-button type="primary" plain @click="showGroupProfileDialog = true" size="default">
            <el-icon>
              <Edit />
            </el-icon> 分组改资料
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

          <el-button type="danger" plain @click="handleClearReconnectQueue" :loading="clearQueueLoading" size="default">
            <el-icon>
              <Delete />
            </el-icon> 清空重连队列
          </el-button>
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
          <span v-if="row.proxy" style="font-size:12px;font-family:monospace;">{{ row.proxy }}</span>
          <span v-else style="color:#999;font-size:12px;">未分配</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="130">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
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
          <el-tag size="small" type="info">{{ row.chatPairs || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="groupMsgSent" label="群发消息" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="primary">{{ row.groupMsgSent || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="groupMsgReceived" label="群收消息" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="success">{{ row.groupMsgReceived || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="privateMsgReceived" label="收私聊" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.privateMsgReceived || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="statusAt" label="状态更新时间" width="160">
        <template #default="{ row }">{{ formatTime(row.statusAt) }}</template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column label="操作" width="420" fixed="right">
        <template #default="{ row }">
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
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

            <el-button size="small" type="info" @click="showPrivateMessages(row.account)">
              <el-icon>
                <ChatDotRound />
              </el-icon> 私聊
            </el-button>
            <el-button size="small" type="info" @click="showQRCode(row)">二维码</el-button>
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

    <!-- 私聊消息弹窗 -->
    <el-dialog v-model="showPrivateDialog" :title="`私聊消息 - ${currentAccount}`" width="900px"
      :close-on-click-modal="false">
      <div>
        <div style="margin-bottom:12px;display:flex;gap:15px;flex-wrap:wrap;">
          <span>总消息: <el-tag type="info">{{ privateTotal }}</el-tag></span>
        </div>
        <el-table :data="privateMessages" border v-loading="privateLoading" max-height="450" stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column label="方向" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isOutgoing ? 'primary' : 'success'" size="small">
                {{ row.isOutgoing ? '发送' : '接收' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="senderLid" label="发送者LID" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.isOutgoing" style="color:#999;">-</span>
              <span v-else>{{ row.senderLid }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="senderPhone" label="发送者手机号" width="140">
            <template #default="{ row }">
              <span v-if="row.isOutgoing" style="color:#409eff;">{{ row.account }}</span>
              <span v-else-if="row.senderPhone">{{ row.senderPhone }}</span>
              <span v-else style="color:#999;">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="remoteJid" label="对方JID" min-width="160" show-overflow-tooltip />
          <el-table-column prop="content" label="消息内容" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.content">{{ row.content }}</span>
              <span v-else style="color:#999;">[非文本消息]</span>
            </template>
          </el-table-column>
          <el-table-column prop="messageType" label="类型" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.messageType === 'conversation' ? 'primary' : 'warning'">
                {{ row.messageType || 'text' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="receivedAt" label="时间" width="170">
            <template #default="{ row }">{{ formatTime(row.receivedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row }">
              <el-button size="small" type="danger" link @click="handleDeletePrivate(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:15px;display:flex;justify-content:flex-end">
          <el-pagination v-model:current-page="privatePage" v-model:page-size="privatePageSize"
            :page-sizes="[10, 20, 50, 100]" :total="privateTotal" layout="total, sizes, prev, pager, next"
            @size-change="fetchPrivateMessages" @current-change="fetchPrivateMessages" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showPrivateDialog = false">关闭</el-button>
        <el-button type="primary" @click="fetchPrivateMessages">刷新</el-button>
      </template>
    </el-dialog>

    <!-- 批量添加账号对话框 -->
    <el-dialog v-model="showBatchAddDialog" title="批量添加账号" width="600px">
      <el-form :model="batchAddForm" label-width="100px">
        <el-form-item label="账号列表" required>
          <el-input v-model="batchAddForm.accountsText" type="textarea" :rows="10" placeholder="每行一个手机号" />
          <div style="font-size:12px;color:#999;margin-top:4px;">示例: 8612345678901</div>
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

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showImportDialog" title="批量导入账号" width="600px">
      <el-form :model="importForm" label-width="100px">
        <el-form-item label="账号文件" required>
          <el-upload ref="uploadRef" :auto-upload="false" multiple accept=".json,.txt" :limit="200"
            :on-change="handleFileChange" :on-remove="handleFileRemove" :on-exceed="handleExceed">
            <el-button type="primary" plain><el-icon>
                <FolderOpened />
              </el-icon> 选择文件</el-button>
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
        <el-button type="primary" @click="handleFileImport" :loading="importing">导入</el-button>
      </template>
    </el-dialog>

    <!-- 批量改代理对话框 -->
    <el-dialog v-model="showBatchProxyDialog" title="批量改代理" width="450px">
      <el-form label-width="100px">
        <el-form-item label="选中数量"><span>{{ selectedAccounts.length }} 个账号</span></el-form-item>
        <el-form-item label="代理分组" required>
          <el-select v-model="batchProxyGroup" placeholder="请选择代理分组" style="width:100%">
            <el-option v-for="item in proxyGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchProxyDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchProxy" :loading="batchProxyLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分组改代理对话框 -->
    <el-dialog v-model="showGroupProxyDialog" title="分组改代理" width="450px">
      <el-form label-width="100px">
        <el-form-item label="账号分组" required>
          <el-select v-model="groupProxyForm.accountGroup" placeholder="请选择账号分组" style="width:100%">
            <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="代理分组" required>
          <el-select v-model="groupProxyForm.proxyGroup" placeholder="请选择代理分组" style="width:100%">
            <el-option v-for="item in proxyGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-alert type="info" :closable="false" show-icon>
            <template #title>将对该分组下所有账号执行改代理操作，代理在下次登录时生效</template>
          </el-alert>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGroupProxyDialog = false">取消</el-button>
        <el-button type="primary" @click="handleGroupProxy" :loading="groupProxyLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量改分组对话框 -->
    <el-dialog v-model="showBatchGroupDialog" title="批量改分组" width="400px">
      <el-form label-width="80px">
        <el-form-item label="选中数量"><span>{{ selectedAccounts.length }} 个账号</span></el-form-item>
        <el-form-item label="新分组"><el-input v-model="batchGroupForm.group" placeholder="请输入分组名称" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchGroup">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分组上线对话框 -->
    <el-dialog v-model="showGroupOnlineDialog" title="分组上线" width="450px">
      <el-form label-width="100px">
        <el-form-item label="选择分组" required>
          <el-select v-model="onlineGroup" placeholder="请选择要上线的分组" style="width:100%">
            <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGroupOnlineDialog = false">取消</el-button>
        <el-button type="primary" @click="handleGroupOnline" :loading="groupOnlineLoading">确定上线</el-button>
      </template>
    </el-dialog>

    <!-- 分组下线对话框 -->
    <el-dialog v-model="showGroupOfflineDialog" title="分组下线" width="450px">
      <el-form label-width="100px">
        <el-form-item label="选择分组" required>
          <el-select v-model="offlineGroup" placeholder="请选择要下线的分组" style="width:100%">
            <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
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
          <div style="margin-top:12px;width:100%;">
            <div style="display:flex;gap:8px;align-items:center;background:#f5f7fa;padding:8px 12px;border-radius:4px;">
              <el-input v-model="qrCode" readonly size="small" style="flex:1;font-size:12px;" @click="copyQRCode" />
              <el-button size="small" type="primary" @click="copyQRCode"><el-icon>
                  <CopyDocument />
                </el-icon> 复制</el-button>
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

    <!-- 批量修改资料对话框 -->
    <el-dialog v-model="showBatchProfileDialog" title="批量修改资料" width="650px" :close-on-click-modal="false">
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

        <el-form-item label="头像">
          <el-radio-group v-model="batchProfileForm.avatarType" size="small" style="margin-bottom:8px;">
            <el-radio-button value="upload">上传图片</el-radio-button>
            <el-radio-button value="url">URL</el-radio-button>
            <el-radio-button value="group">从分组选取</el-radio-button>
          </el-radio-group>

          <div v-if="batchProfileForm.avatarType === 'upload'" style="display:flex;gap:10px;align-items:center;">
            <el-upload ref="avatarUploadRef" :auto-upload="false" :limit="1" accept="image/*"
              :on-change="handleAvatarFileChange" :on-remove="handleAvatarRemove">
              <el-button type="primary" plain><el-icon>
                  <Upload />
                </el-icon> 选择图片</el-button>
            </el-upload>
            <span v-if="avatarFile" style="font-size:12px;color:#999;">
              {{ avatarFile.name }} ({{ (avatarFile.size / 1024).toFixed(0) }}KB)
            </span>
          </div>

          <el-input v-else-if="batchProfileForm.avatarType === 'url'" v-model="batchProfileForm.imageUrl"
            placeholder="请输入头像图片 URL" />

          <el-select v-else-if="batchProfileForm.avatarType === 'group'" v-model="batchProfileForm.avatarGroup"
            placeholder="选择头像分组" style="width:100%" clearable>
            <el-option v-for="item in avatarGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>

          <div style="font-size:12px;color:#999;margin-top:4px;">
            <span v-if="batchProfileForm.avatarType === 'upload'">支持 JPG/PNG，自动压缩为 640x640</span>
            <span v-else-if="batchProfileForm.avatarType === 'url'">URL 方式：图片需公网可访问</span>
            <span v-else>从分组中随机选取头像</span>
          </div>
        </el-form-item>

        <el-form-item label="状态">
          <el-input v-model="batchProfileForm.status" placeholder="请输入新状态（留空则不修改）" />
        </el-form-item>

        <el-form-item>
          <el-alert type="info" :closable="false" show-icon>
            <template #title>• 至少填写一项 • 仅对在线账号生效 • 头像支持上传、URL 或从分组选取</template>
          </el-alert>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchProfileDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchProfile" :loading="batchProfileLoading">确定修改</el-button>
      </template>
    </el-dialog>

    <!-- 分组改资料对话框 -->
    <el-dialog v-model="showGroupProfileDialog" title="分组改资料" width="550px">
      <el-form :model="groupProfileForm" label-width="100px">
        <el-form-item label="账号分组" required>
          <el-select v-model="groupProfileForm.accountGroup" placeholder="请选择账号分组" style="width:100%">
            <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>
        </el-form-item>

        <el-form-item label="昵称">
          <el-input v-model="groupProfileForm.nickname" placeholder="请输入新昵称（留空则不修改）" />
        </el-form-item>

        <el-form-item label="头像">
          <el-radio-group v-model="groupProfileForm.avatarType" size="small" style="margin-bottom:8px;">
            <el-radio-button value="group">从分组选取</el-radio-button>
            <el-radio-button value="url">URL</el-radio-button>
          </el-radio-group>

          <el-select v-if="groupProfileForm.avatarType === 'group'" v-model="groupProfileForm.avatarGroup"
            placeholder="选择头像分组" style="width:100%" clearable>
            <el-option v-for="item in avatarGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
              :value="item.name" />
          </el-select>

          <el-input v-else v-model="groupProfileForm.imageUrl" placeholder="请输入头像图片 URL" />

          <div style="font-size:12px;color:#999;margin-top:4px;">
            <span v-if="groupProfileForm.avatarType === 'group'">从分组中随机选取头像</span>
            <span v-else>URL 方式：图片需公网可访问</span>
          </div>
        </el-form-item>

        <el-form-item label="状态">
          <el-input v-model="groupProfileForm.status" placeholder="请输入新状态（留空则不修改）" />
        </el-form-item>

        <el-form-item>
          <el-alert type="info" :closable="false" show-icon>
            <template #title>将对该分组下所有账号执行修改，仅对在线账号生效</template>
          </el-alert>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGroupProfileDialog = false">取消</el-button>
        <el-button type="primary" @click="handleGroupProfile" :loading="groupProfileLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { debounce } from 'lodash'
import {
  Plus, Refresh, Folder, Picture, Upload, FolderOpened,
  Promotion, SwitchButton, Connection, Download, Delete, Edit, ChatDotRound, CopyDocument
} from '@element-plus/icons-vue'
import { whatsapp } from '@/api'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const filterIsLogin = ref('')
const accounts = ref([])
const accountGroups = ref([])
const proxyGroups = ref([])
const avatarGroups = ref([])
const loading = ref(false)
const qrLoading = ref(false)
const selectedAccounts = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const filterStatus = ref('')
const clearQueueLoading = ref(false)
const filterGroup = ref('')
const qrCode = ref('')

const showBatchAddDialog = ref(false)
const showImportDialog = ref(false)
const showBatchGroupDialog = ref(false)
const showBatchProxyDialog = ref(false)
const showGroupProxyDialog = ref(false)
const showBatchProfileDialog = ref(false)
const showGroupProfileDialog = ref(false)
const showQRDialog = ref(false)
const importing = ref(false)
const uploadRef = ref(null)
const importFiles = ref([])

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

// ============ 分组改代理 ============
const groupProxyLoading = ref(false)
const groupProxyForm = reactive({
  accountGroup: '',
  proxyGroup: ''
})

// ============ 分组改资料 ============
const groupProfileLoading = ref(false)
const groupProfileForm = reactive({
  accountGroup: '',
  nickname: '',
  avatarType: 'group',
  avatarGroup: '',
  imageUrl: '',
  status: ''
})

// ============ 批量上线/下线 ============
const batchOnlineLoading = ref(false)
const batchOfflineLoading = ref(false)

// ============ 批量删除 ============
const batchDeleteLoading = ref(false)

// ============ 批量添加账号 ============
const batchAddLoading = ref(false)
const batchAddForm = reactive({
  accountsText: '',
  group: '',
  proxyGroup: ''
})

// ============ 批量修改资料 ============
const batchProfileLoading = ref(false)
const avatarFile = ref(null)
const avatarUploadRef = ref(null)
const batchProfileForm = reactive({
  nickname: '',
  avatarType: 'upload',
  imageUrl: '',
  avatarGroup: '',
  status: ''
})

// ============ 私聊消息 ============
const showPrivateDialog = ref(false)
const currentAccount = ref('')
const privateMessages = ref([])
const privateLoading = ref(false)
const privateTotal = ref(0)
const privatePage = ref(1)
const privatePageSize = ref(20)

// ============ 表单 ============
const importForm = reactive({
  proxyGroup: '',
  accountGroup: ''
})
const batchGroupForm = reactive({
  group: ''
})

// ============ 防抖搜索 ============
const debounceFetchAccounts = debounce(() => {
  page.value = 1
  fetchAccounts()
}, 500)

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
const getStatusText = (s) => statusMap[s] || s || '未知'
const getStatusType = (s) => statusTypeMap[s] || 'info'
const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'

// ============ 数据获取 ============
const fetchAccountGroups = async () => {
  try {
    const res = await api.get('/whatsapp/accounts/groups')
    if (res.code === 0) accountGroups.value = res.data || []
  } catch (e) { }
}

const fetchProxyGroups = async () => {
  try {
    const res = await api.get('/proxies/groups')
    if (res.code === 0) proxyGroups.value = res.data || []
  } catch (e) { }
}

const fetchAvatarGroups = async () => {
  try {
    const res = await api.get('/avatar-materials/groups')
    if (res.code === 0) avatarGroups.value = res.data || []
  } catch (e) { }
}

const fetchAccounts = async () => {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterGroup.value) params.group = filterGroup.value
    if (filterStatus.value) params.status = filterStatus.value
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (filterIsLogin.value !== '') params.is_login = filterIsLogin.value
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
  } catch (e) {
    ElMessage.error('获取账号列表失败')
  } finally {
    loading.value = false
  }
}

// ============ 私聊消息 ============
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
      params: { account: currentAccount.value, page: privatePage.value, page_size: privatePageSize.value }
    })
    if (res.code === 0) {
      privateMessages.value = res.data.data || []
      privateTotal.value = res.data.total || 0
    }
  } catch (e) {
    ElMessage.error('获取私聊消息失败')
  } finally {
    privateLoading.value = false
  }
}

const handleDeletePrivate = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该消息吗？', '提示', { type: 'warning' })
    const res = await api.delete(`/private-messages/${id}/delete`)
    if (res.code === 0) { ElMessage.success('删除成功'); fetchPrivateMessages() }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

// ============ 选中账号 ============
const handleSelectionChange = (selection) => {
  selectedAccounts.value = selection.map(item => item.account)
}

// ============ 批量删除 ============
const handleBatchDelete = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  try {
    await ElMessageBox.confirm(`确定删除 ${selectedAccounts.value.length} 个账号？不可恢复！`, '提示', { type: 'error' })
    batchDeleteLoading.value = true
    let success = 0, fail = 0
    for (const account of selectedAccounts.value) {
      const res = await whatsapp.deleteAccount(account)
      if (res.code === 0) success++ 
      else fail++
      await new Promise(r => setTimeout(r, 50))
    }
    ElMessage.success(`成功删除 ${success} 个，失败 ${fail} 个`)
    selectedAccounts.value = []
    fetchAccounts()
    fetchAccountGroups()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('批量删除失败: ' + (e.message || ''))
  } finally {
    batchDeleteLoading.value = false
  }
}

// ============ 批量添加 ============
const handleBatchAdd = async () => {
  const accounts = batchAddForm.accountsText.split('\n').map(a => a.trim()).filter(a => a !== '')
  if (accounts.length === 0) { ElMessage.warning('请输入至少一个手机号'); return }
  if (!batchAddForm.proxyGroup) { ElMessage.warning('请选择代理分组'); return }
  batchAddLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/batch/add', {
      accounts, group: batchAddForm.group || '', proxyGroup: batchAddForm.proxyGroup
    })
    if (res.code === 0) {
      const { success, failed, duplicate, total } = res.data
      ElMessage.success(`添加完成：成功 ${success} 个，失败 ${failed} 个，重复 ${duplicate} 个，共 ${total} 个`)
      showBatchAddDialog.value = false
      batchAddForm.accountsText = ''
      batchAddForm.group = ''
      batchAddForm.proxyGroup = ''
      fetchAccounts(); fetchAccountGroups(); fetchProxyGroups()
    }
  } catch (e) {
    ElMessage.error('批量添加失败: ' + (e.message || ''))
  } finally {
    batchAddLoading.value = false
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

const handleFileImport = async () => {
  if (importFiles.value.length === 0) { ElMessage.warning('请选择账号文件'); return }
  if (!importForm.proxyGroup) { ElMessage.warning('请选择代理分组'); return }
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
        try {
          const jsonData = JSON.parse(trimmed)
          if (jsonData.Phone) phones.push(jsonData.Phone)
          else if (jsonData.data && jsonData.data.Phone) phones.push(jsonData.data.Phone)
          else if (jsonData.me && jsonData.me.id) {
            const id = jsonData.me.id
            const phone = id.split('@')[0].split(':')[0]
            phones.push(phone)
          } else if (Array.isArray(jsonData)) {
            jsonData.forEach(item => {
              if (item.Phone) phones.push(item.Phone)
              else if (item.data && item.data.Phone) phones.push(item.data.Phone)
            })
          }
          if (phones.length === 0) {
            const matches = trimmed.match(/\d{10,15}/g)
            phones = matches || []
          }
        } catch (e) {
          const matches = trimmed.match(/\d{10,15}/g)
          phones = matches || []
        }
      } else {
        const lines = trimmed.split('\n').filter(line => line.trim())
        for (const line of lines) {
          const parts = line.split(',').map(s => s.trim())
          const firstPart = parts[0]
          if (/^\d{10,15}$/.test(firstPart)) phones.push(firstPart)
          else {
            const matches = line.match(/\d{10,15}/)
            if (matches) phones.push(matches[0])
          }
        }
      }
      allPhones.push(...phones)
    }
    const uniquePhones = [...new Set(allPhones)]
    if (uniquePhones.length === 0) { ElMessage.warning('未能提取到手机号'); importing.value = false; return }
    const res = await api.post('/whatsapp/accounts/batch/add', {
      accounts: uniquePhones, group: importForm.accountGroup || '', proxyGroup: importForm.proxyGroup
    })
    if (res.code === 0) {
      const { success, failed, duplicate, total } = res.data
      ElMessage.success(`添加完成：成功 ${success} 个，失败 ${failed} 个，重复 ${duplicate} 个，共 ${total} 个`)
      showImportDialog.value = false
      importFiles.value = []
      importForm.accountGroup = ''
      uploadRef.value?.clearFiles()
      fetchAccounts(); fetchAccountGroups(); fetchProxyGroups()
    }
  } catch (e) {
    ElMessage.error('导入失败: ' + (e.message || ''))
  } finally {
    importing.value = false
  }
}

// ============ 批量改分组 ============
const handleBatchGroup = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  if (!batchGroupForm.group) { ElMessage.warning('请输入分组名称'); return }
  try {
    let success = 0
    for (const account of selectedAccounts.value) {
      const res = await api.put(`/whatsapp/accounts/${account}/group`, { group: batchGroupForm.group })
      if (res.code === 0) success++
    }
    ElMessage.success(`成功更新 ${success}/${selectedAccounts.value.length} 个账号的分组`)
    showBatchGroupDialog.value = false
    batchGroupForm.group = ''
    selectedAccounts.value = []
    fetchAccounts(); fetchAccountGroups()
  } catch (e) {
    ElMessage.error('批量改分组失败: ' + (e.message || ''))
  }
}

// ============ 批量改代理 ============
const handleBatchProxy = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  if (!batchProxyGroup.value) { ElMessage.warning('请选择代理分组'); return }
  batchProxyLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/batch/proxy', {
      accounts: selectedAccounts.value,
      proxyGroup: batchProxyGroup.value
    })
    if (res.code === 0) {
      ElMessage.success(`已提交 ${res.data.total} 个账号的改代理任务`)
      showBatchProxyDialog.value = false
      batchProxyGroup.value = ''
      selectedAccounts.value = []
      setTimeout(() => {
        fetchAccounts()
        fetchProxyGroups()
      }, 2000)
    } else {
      ElMessage.error(res.message || '批量改代理失败')
    }
  } catch (e) {
    ElMessage.error('批量改代理失败: ' + (e.message || ''))
  } finally {
    batchProxyLoading.value = false
  }
}

// ============ 分组改代理 ============
const handleGroupProxy = async () => {
  if (!groupProxyForm.accountGroup) {
    ElMessage.warning('请选择账号分组')
    return
  }
  if (!groupProxyForm.proxyGroup) {
    ElMessage.warning('请选择代理分组')
    return
  }

  groupProxyLoading.value = true
  try {
    const res = await api.get('/whatsapp/accounts/by-group', {
      params: { group: groupProxyForm.accountGroup }
    })
    if (res.code !== 0 || !res.data || res.data.length === 0) {
      ElMessage.warning('该分组没有账号')
      return
    }

    const accounts = res.data.map(a => a.account)
    const proxyRes = await api.post('/whatsapp/accounts/batch/proxy', {
      accounts: accounts,
      proxyGroup: groupProxyForm.proxyGroup
    })
    if (proxyRes.code === 0) {
      ElMessage.success(`已提交 ${accounts.length} 个账号的改代理任务`)
      showGroupProxyDialog.value = false
      groupProxyForm.accountGroup = ''
      groupProxyForm.proxyGroup = ''
      setTimeout(() => {
        fetchAccounts()
        fetchProxyGroups()
      }, 2000)
    }
  } catch (e) {
    ElMessage.error('操作失败: ' + (e.message || ''))
  } finally {
    groupProxyLoading.value = false
  }
}

// ============ 分组改资料 ============
const handleGroupProfile = async () => {
  if (!groupProfileForm.accountGroup) {
    ElMessage.warning('请选择账号分组')
    return
  }

  const hasNickname = groupProfileForm.nickname && groupProfileForm.nickname.trim() !== ''
  const hasImageUrl = groupProfileForm.imageUrl && groupProfileForm.imageUrl.trim() !== ''
  const hasStatus = groupProfileForm.status && groupProfileForm.status.trim() !== ''
  const hasAvatarGroup = groupProfileForm.avatarGroup && groupProfileForm.avatarGroup.trim() !== ''

  if (!hasNickname && !hasImageUrl && !hasStatus && !hasAvatarGroup) {
    ElMessage.warning('请至少填写一项要修改的内容')
    return
  }

  groupProfileLoading.value = true
  try {
    const res = await api.get('/whatsapp/accounts/by-group', {
      params: { group: groupProfileForm.accountGroup }
    })
    if (res.code !== 0 || !res.data || res.data.length === 0) {
      ElMessage.warning('该分组没有账号')
      return
    }

    const accounts = res.data.map(a => a.account)
    let hasError = false

    // 修改昵称
    if (hasNickname) {
      const nickRes = await api.post('/whatsapp/accounts/batch/nickname', {
        accounts: accounts,
        nickname: groupProfileForm.nickname.trim()
      })
      if (nickRes.code !== 0) {
        ElMessage.error('修改昵称失败: ' + (nickRes.message || ''))
        hasError = true
      } else {
        ElMessage.success(`昵称修改已提交 (${accounts.length} 个账号)`)
      }
    }

    // 修改头像 - 从分组选取
    if (hasAvatarGroup) {
      const avatarRes = await api.post('/whatsapp/accounts/batch/avatar-group', {
        accounts: accounts,
        group: groupProfileForm.avatarGroup
      })
      if (avatarRes.code !== 0) {
        ElMessage.error('修改头像失败: ' + (avatarRes.message || ''))
        hasError = true
      } else {
        ElMessage.success(`头像修改已提交 (${accounts.length} 个账号)`)
      }
    }

    // 修改头像 - URL
    if (hasImageUrl) {
      const avatarRes = await api.post('/whatsapp/accounts/batch/avatar', {
        accounts: accounts,
        imageUrl: groupProfileForm.imageUrl.trim()
      })
      if (avatarRes.code !== 0) {
        ElMessage.error('修改头像失败: ' + (avatarRes.message || ''))
        hasError = true
      } else {
        ElMessage.success(`头像修改已提交 (${accounts.length} 个账号)`)
      }
    }

    // 修改状态
    if (hasStatus) {
      const statusRes = await api.post('/whatsapp/accounts/batch/status', {
        accounts: accounts,
        status: groupProfileForm.status.trim()
      })
      if (statusRes.code !== 0) {
        ElMessage.error('修改状态失败: ' + (statusRes.message || ''))
        hasError = true
      } else {
        ElMessage.success(`状态修改已提交 (${accounts.length} 个账号)`)
      }
    }

    if (!hasError) {
      showGroupProfileDialog.value = false
      groupProfileForm.accountGroup = ''
      groupProfileForm.nickname = ''
      groupProfileForm.avatarType = 'group'
      groupProfileForm.avatarGroup = ''
      groupProfileForm.imageUrl = ''
      groupProfileForm.status = ''
      setTimeout(() => fetchAccounts(), 3000)
    }
  } catch (e) {
    ElMessage.error('操作失败: ' + (e.message || ''))
  } finally {
    groupProfileLoading.value = false
  }
}

// ============ 头像上传 ============
const handleAvatarFileChange = (file) => { avatarFile.value = file.raw }
const handleAvatarRemove = () => { avatarFile.value = null; avatarUploadRef.value?.clearFiles() }

// ============ 批量修改资料 ============
const handleBatchProfile = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }

  const hasNickname = batchProfileForm.nickname?.trim()
  const hasImageUrl = batchProfileForm.imageUrl?.trim()
  const hasStatus = batchProfileForm.status?.trim()
  const hasAvatarGroup = batchProfileForm.avatarGroup?.trim()
  const hasAvatarFile = avatarFile.value !== null

  if (!hasNickname && !hasImageUrl && !hasStatus && !hasAvatarGroup && !hasAvatarFile) {
    ElMessage.warning('请至少填写一项要修改的内容')
    return
  }

  batchProfileLoading.value = true
  let hasError = false

  try {
    if (hasNickname) {
      const res = await api.post('/whatsapp/accounts/batch/nickname', {
        accounts: selectedAccounts.value,
        nickname: batchProfileForm.nickname.trim()
      })
      if (res.code !== 0) { ElMessage.error('修改昵称失败'); hasError = true }
      else ElMessage.success(`昵称修改已提交 (${selectedAccounts.value.length} 个账号)`)
    }

    if (hasAvatarGroup) {
      const res = await api.post('/whatsapp/accounts/batch/avatar-group', {
        accounts: selectedAccounts.value,
        group: batchProfileForm.avatarGroup
      })
      if (res.code !== 0) { ElMessage.error('修改头像失败'); hasError = true }
      else ElMessage.success(`头像修改已提交 (${selectedAccounts.value.length} 个账号)`)
    }

    if (hasAvatarFile) {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(avatarFile.value)
      })
      const uploadRes = await api.post('/avatar-materials/upload', {
        base64Content: base64,
        group: '临时'
      })
      if (uploadRes.code !== 0) { ElMessage.error('头像上传失败'); hasError = true }
      else {
        const res = await api.post('/whatsapp/accounts/batch/avatar', {
          accounts: selectedAccounts.value,
          imageUrl: uploadRes.data.fileUrl
        })
        if (res.code !== 0) { ElMessage.error('修改头像失败'); hasError = true }
        else ElMessage.success(`头像修改已提交 (${selectedAccounts.value.length} 个账号)`)
      }
    }

    if (hasImageUrl) {
      const res = await api.post('/whatsapp/accounts/batch/avatar', {
        accounts: selectedAccounts.value,
        imageUrl: batchProfileForm.imageUrl.trim()
      })
      if (res.code !== 0) { ElMessage.error('修改头像失败'); hasError = true }
      else ElMessage.success(`头像修改已提交 (${selectedAccounts.value.length} 个账号)`)
    }

    if (hasStatus) {
      const res = await api.post('/whatsapp/accounts/batch/status', {
        accounts: selectedAccounts.value,
        status: batchProfileForm.status.trim()
      })
      if (res.code !== 0) { ElMessage.error('修改状态失败'); hasError = true }
      else ElMessage.success(`状态修改已提交 (${selectedAccounts.value.length} 个账号)`)
    }

    if (!hasError) {
      showBatchProfileDialog.value = false
      batchProfileForm.nickname = ''
      batchProfileForm.avatarType = 'upload'
      batchProfileForm.imageUrl = ''
      batchProfileForm.avatarGroup = ''
      batchProfileForm.status = ''
      avatarFile.value = null
      avatarUploadRef.value?.clearFiles()
      selectedAccounts.value = []
      setTimeout(() => fetchAccounts(), 3000)
    }
  } catch (e) {
    ElMessage.error('操作失败: ' + (e.message || ''))
  } finally {
    batchProfileLoading.value = false
  }
}

// ============ 批量上线/下线 ============
const handleBatchOnline = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  const offlineAccounts = selectedAccounts.value.filter(account => {
    const acc = accounts.value.find(a => a.account === account)
    return acc && (acc.status === 'offline' || acc.status === 'expired')
  })
  if (offlineAccounts.length === 0) { ElMessage.warning('选中的账号中没有离线账号'); return }
  batchOnlineLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/batch/online', { accounts: offlineAccounts })
    if (res.code === 0) {
      ElMessage.success(`已提交 ${res.data.total} 个账号的批量上线任务`)
      selectedAccounts.value = []
      setTimeout(() => fetchAccounts(), 5000)
    }
  } catch (e) {
    ElMessage.error('批量上线失败: ' + (e.message || ''))
  } finally {
    batchOnlineLoading.value = false
  }
}

const handleBatchOffline = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  const onlineAccounts = selectedAccounts.value.filter(account => {
    const acc = accounts.value.find(a => a.account === account)
    return acc && (acc.status === 'online' || acc.status === 'normal')
  })
  if (onlineAccounts.length === 0) { ElMessage.warning('选中的账号中没有在线账号'); return }
  batchOfflineLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/batch/offline', { accounts: onlineAccounts })
    if (res.code === 0) {
      ElMessage.success(`已提交 ${res.data.total} 个账号的批量下线任务`)
      selectedAccounts.value = []
      setTimeout(() => fetchAccounts(), 3000)
    }
  } catch (e) {
    ElMessage.error('批量下线失败: ' + (e.message || ''))
  } finally {
    batchOfflineLoading.value = false
  }
}

const handleGroupOnline = async () => {
  if (!onlineGroup.value) { ElMessage.warning('请选择分组'); return }
  groupOnlineLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/group-online', { group: onlineGroup.value })
    if (res.code === 0) {
      ElMessage.success('分组上线任务已提交')
      showGroupOnlineDialog.value = false
      onlineGroup.value = ''
      setTimeout(() => fetchAccounts(), 5000)
    }
  } catch (e) {
    ElMessage.error('分组上线失败: ' + (e.message || ''))
  } finally {
    groupOnlineLoading.value = false
  }
}

const handleGroupOffline = async () => {
  if (!offlineGroup.value) { ElMessage.warning('请选择分组'); return }
  groupOfflineLoading.value = true
  try {
    const res = await api.post('/whatsapp/accounts/group-offline', { group: offlineGroup.value })
    if (res.code === 0) {
      ElMessage.success('分组下线任务已提交')
      showGroupOfflineDialog.value = false
      offlineGroup.value = ''
      setTimeout(() => fetchAccounts(), 3000)
    }
  } catch (e) {
    ElMessage.error('分组下线失败: ' + (e.message || ''))
  } finally {
    groupOfflineLoading.value = false
  }
}

// ============ 单个账号操作 ============
const handleDelete = async (account) => {
  try {
    await ElMessageBox.confirm(`确定删除账号 ${account}？`, '提示', { type: 'warning' })
    const res = await whatsapp.deleteAccount(account)
    if (res.code === 0) { ElMessage.success('删除成功'); fetchAccounts(); fetchAccountGroups() }
  } catch (e) { }
}

const handleOnline = async (account) => {
  try {
    const res = await whatsapp.online(account)
    if (res.code === 0) { ElMessage.success('上线成功'); fetchAccounts() }
  } catch (e) { ElMessage.error(e.message || '上线失败') }
}

const handleOffline = async (account) => {
  try {
    const res = await whatsapp.offline(account)
    if (res.code === 0) { ElMessage.success('下线成功'); fetchAccounts() }
  } catch (e) { ElMessage.error('下线失败') }
}

// ============ 二维码 ============
const showQRCode = async (row) => {
  showQRDialog.value = true
  qrCode.value = ''
  qrLoading.value = true
  try {
    const res = await whatsapp.getQRCodeLogin(row.account, { proxy: row.proxy || '', callbackurl: '' })
    if (res.code === 0 && res.data?.qrCode) qrCode.value = res.data.qrCode
    else ElMessage.warning('二维码生成中，请稍后重试')
  } catch (e) {
    ElMessage.error('获取二维码失败: ' + (e.message || ''))
  } finally {
    qrLoading.value = false
  }
}

const copyQRCode = () => {
  if (!qrCode.value) { ElMessage.warning('没有可复制的内容'); return }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(qrCode.value).then(() => ElMessage.success('已复制链接'))
      .catch(() => fallbackCopy(qrCode.value))
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
  try { document.execCommand('copy'); ElMessage.success('已复制链接') }
  catch (e) { ElMessage.error('复制失败，请手动复制') }
  document.body.removeChild(textarea)
}

// ============ 导出凭证 ============
const handleExport = async (account) => {
  try {
    const res = await whatsapp.exportCreds(account)
    if (res.code === 0) {
      let credsData = res.data
      if (res.data && typeof res.data === 'object' && res.data.creds) credsData = res.data.creds
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
    }
  } catch (e) {
    ElMessage.error('导出失败: ' + (e.message || ''))
  }
}

const handleBatchExport = async () => {
  if (selectedAccounts.value.length === 0) { ElMessage.warning('请先选择账号'); return }
  try {
    for (const account of selectedAccounts.value) {
      await handleExport(account)
      await new Promise(r => setTimeout(r, 500))
    }
    ElMessage.success(`已导出 ${selectedAccounts.value.length} 个凭证`)
    selectedAccounts.value = []
  } catch (e) {
    ElMessage.error('批量导出失败: ' + (e.message || ''))
  }
}

// ============ 清空重连队列 ============
const handleClearReconnectQueue = async () => {
  try {
    await ElMessageBox.confirm('确定清空重连队列？', '警告', { type: 'warning' })
    clearQueueLoading.value = true
    const res = await api.post('/system/reconnect/clear')
    if (res.code === 0) {
      const { count, members } = res.data
      ElMessage.success(`已清空 ${count} 个等待重连的账号`)
      if (members?.length > 0) ElMessage.info(`已清除: ${members.join(', ')}`)
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('清空失败: ' + (e.message || ''))
  } finally {
    clearQueueLoading.value = false
  }
}

// ============ 生命周期 ============
onMounted(() => {
  fetchAccountGroups()
  fetchProxyGroups()
  fetchAvatarGroups()
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