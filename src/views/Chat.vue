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
      <el-table-column label="会话上限" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.maxPairsPerAccount && row.maxPairsPerAccount > 0" size="small" type="primary">
            {{ row.maxPairsPerAccount }}
          </el-tag>
          <el-tag v-else size="small" type="info">不限</el-tag>
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
      <el-table-column label="操作" width="380" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="showTaskDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'paused'" size="small" type="primary"
            @click="openManageAccounts(row)">管理账号</el-button>
          <el-button v-if="row.status === 'pending'" size="small" type="success"
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
            <el-select v-model="createForm.accountGroups" multiple placeholder="选择账号分组" style="width:100%" size="large">
              <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
                :value="item.name" />
            </el-select>
            <div class="form-tip">可选择多个分组，所有账号合并参与互聊</div>
          </el-form-item>
          <el-form-item label="消息语言">
            <el-radio-group v-model="createForm.language" size="large">
              <el-radio-button value="zh">中文</el-radio-button>
              <el-radio-button value="en">English</el-radio-button>
              <el-radio-button value="pt">Português</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="每账号最多会话数">
            <el-input-number v-model="createForm.maxPairsPerAccount" :min="0" :max="100" size="large" />
            <span style="margin-left:8px;color:#86909c;">0 表示不限制</span>
            <div class="form-tip">每个账号最多和 N 个不同账号会话，已配对过的账号可重复会话</div>
          </el-form-item>
          <el-form-item label="单对重复上限">
            <el-input-number v-model="createForm.maxRepeatPairs" :min="0" :max="100" size="large" />
            <span style="margin-left:8px;color:#86909c;">0 表示不限制</span>
            <div class="form-tip">同一对账号最多重复聊天多少次（防止反复刷同一个号）</div>
          </el-form-item>
          <el-form-item label="同国家配对">
            <el-switch v-model="createForm.allowSameCountry" active-text="开启" inactive-text="关闭" />
            <div class="form-tip">开启后，同一国家的账号可直接配对，无需互为联系人</div>
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
              <el-input-number v-model="createForm.minDelay" :min="1" :max="999" size="large" style="width:130px;" />
              <span class="range-sep">~</span>
              <el-input-number v-model="createForm.maxDelay" :min="2" :max="999" size="large" style="width:130px;" />
              <span class="range-unit">秒</span>
            </div>
          </el-form-item>
          <el-form-item label="对话轮数">
            <div class="range-wrapper">
              <el-input-number v-model="createForm.minRounds" :min="1" :max="999" size="large" style="width:130px;" />
              <span class="range-sep">~</span>
              <el-input-number v-model="createForm.maxRounds" :min="2" :max="999" size="large" style="width:130px;" />
              <span class="range-unit">轮</span>
            </div>
          </el-form-item>
          <el-form-item label="最大并发">
            <div class="range-wrapper">
              <el-input-number v-model="createForm.maxConcurrent" :min="1" :max="999" size="large"
                style="width:130px;" />
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
          <el-form-item label="配对间隔" v-if="createForm.accountGroups.length === 0">
            <div class="range-wrapper">
              <!-- 原本的全局配对间隔设置 -->
            </div>
            <div class="form-tip">请先选择账号分组，然后设置各个分组的专属间隔</div>
          </el-form-item>

          <!-- ✅ 新增：分组独立冷却配置 -->
          <template v-if="createForm.accountGroups.length > 0">
            <el-form-item v-for="group in createForm.accountGroups" :key="group" :label="`[${group}] 冷却间隔`">
              <div class="range-wrapper">
                <el-input-number v-model="createForm.groupCooldowns[group].min" :min="1" :max="9999" size="large"
                  controls-position="right" style="width: 130px;" />
                <span class="range-sep">~</span>
                <el-input-number v-model="createForm.groupCooldowns[group].max" :min="2" :max="9999" size="large"
                  controls-position="right" style="width: 130px;" />
                <span class="range-unit">分钟</span>
              </div>
              <div class="form-tip">账号完成对话后，在此范围内随机冷却</div>
            </el-form-item>
          </template>
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
    <!-- 管理账号对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showManageDialog" title="管理账号" width="700px" :close-on-click-modal="false">
      <div v-if="manageTask">
        <!-- 当前账号 -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:bold;">当前账号 ({{ manageTask.accounts?.length || 0 }})</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <!-- ✅ 新增：按分组移除 -->
            <el-select v-model="removeFilterGroups" multiple placeholder="按分组移除" size="small" style="width:200px">
              <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
                :value="item.name" />
            </el-select>
            <el-button size="small" type="danger" :disabled="removeFilterGroups.length === 0"
              @click="handleRemoveByGroups" :loading="managingAccounts">
              移除分组 ({{ removeFilterGroups.length }})
            </el-button>

            <!-- 原有的按勾选移除 -->
            <el-button size="small" type="danger" :disabled="selectedRemove.length === 0" @click="handleRemoveAccounts"
              :loading="managingAccounts">
              移除选中 ({{ selectedRemove.length }})
            </el-button>
          </div>
        </div>

        <el-divider />

        <!-- 添加账号 -->
        <div>
          <div style="font-weight:bold;margin-bottom:6px;">添加账号</div>
          <el-form label-width="80px">
            <el-form-item label="分组">
              <el-select v-model="addAccountsGroup" multiple placeholder="选择分组（可选）" style="width:100%">
                <el-option v-for="item in accountGroups" :key="item.name" :label="item.name + ' (' + item.count + '个)'"
                  :value="item.name" />
              </el-select>
            </el-form-item>
            <el-form-item label="账号">
              <el-input v-model="addAccountsText" type="textarea" :rows="5" placeholder="每行一个手机号" />
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <el-button @click="showManageDialog = false">关闭</el-button>
        <el-button type="primary" @click="handleAddAccounts" :loading="managingAccounts">添加</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 任务详情对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showDetailDialog" :title="`任务详情 - ${detailTask?.name || ''}`" width="1000px"
      :close-on-click-modal="false" @close="closeDetail">
      <div v-if="detailTask">
        <!-- 基本信息 - 4列 -->
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
          <el-descriptions-item label="同国家配对">
            <el-tag :type="detailTask.allowSameCountry ? 'success' : 'info'" size="small">
              {{ detailTask.allowSameCountry ? '✅ 开启' : '❌ 关闭' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发起概率">{{ detailTask.initiateRate }}%</el-descriptions-item>
          <el-descriptions-item label="回复概率">{{ detailTask.replyRate }}%</el-descriptions-item>
          <el-descriptions-item label="消息间隔">{{ detailTask.minDelay }}~{{ detailTask.maxDelay }}s</el-descriptions-item>
        </el-descriptions>

        <!-- ✅ 账号状态统计 -->
        <div
          style="margin-top:12px; display:flex; gap:16px; align-items:center; flex-wrap:wrap; padding: 8px 12px; background: #f8f9fa; border-radius: 4px; border: 1px solid #ebeef5; font-size: 13px;">
          <span style="font-weight:bold; color:#606266;">账号统计:</span>
          <span style="color:#606266;">总数: <strong>{{ detailTask.accounts?.length || 0 }}</strong></span>
          <span style="color:#67c23a;">🟢 在线: <strong>{{ onlineCount }}</strong></span>
          <span style="color:#f56c6c;">🚫 封禁: <strong>{{ bannedCount }}</strong></span>
          <span style="color:#e6a23c;">⏳ 冷却中: <strong>{{ cooldownCount }}</strong></span>
          <span style="color:#909399;">⚪ 离线: <strong>{{ offlineCount }}</strong></span>
          <span style="color:#409eff;">🟡 登录中: <strong>{{ loggingCount }}</strong></span>
          <span style="color:#909399;">❓ 未知: <strong>{{ unknownCount }}</strong></span>
        </div>

        <div
          style="margin-top:12px; display:flex;flex-direction:column;gap:8px; padding:10px; background:#f5f7fa; border-radius:4px; max-height:200px; overflow-y:auto;">
          <div v-for="group in groupedAccounts" :key="group.groupName">
            <!-- 分组标题 -->
            <div
              style="font-size:12px; color:#409eff; font-weight:bold; margin-bottom:6px; border-bottom:1px dashed #dcdfe6; padding-bottom:2px;">
              📁 {{ group.groupName }} ({{ group.accounts.length }}个)
            </div>

            <!-- 组内账号 -->
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              <el-tag v-for="acc in group.accounts" :key="acc" :type="getAccountStatusType(acc)" size="small"
                style="margin:2px;">
                {{ acc }}
                <span style="margin-left:4px;font-size:10px;color:#999;">
                  {{ getAccountStatusShort(acc) }}
                  <span v-if="accountPairs[acc] !== undefined"> {{ accountPairs[acc] }}</span>
                  <span v-if="accountUniquePairs[acc] !== undefined" style="color:#409eff;margin-left:2px;">
                    ({{ accountUniquePairs[acc] }})
                  </span>
                  <span v-if="detailTask.firstSenderStats && detailTask.firstSenderStats[acc]"
                    style="color:#67c23a;margin-left:4px;">
                    [先{{ detailTask.firstSenderStats[acc].self }} 后{{ detailTask.firstSenderStats[acc].peer }}]
                  </span>
                </span>
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 参数和统计 -->
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
          <el-descriptions-item label="会话上限">
            <span>{{ detailTask.maxPairsPerAccount > 0 ? detailTask.maxPairsPerAccount : '不限' }}</span>
            <el-button size="small" type="primary" link style="margin-left:8px;"
              @click="openEditMaxPairs">修改</el-button>
          </el-descriptions-item>
          <el-descriptions-item label="单对重复上限">
            <span>{{ detailTask.maxRepeatPairs > 0 ? detailTask.maxRepeatPairs + ' 次' : '不限' }}</span>
            <el-button size="small" type="primary" link style="margin-left:8px;"
              @click="openEditMaxRepeat">修改</el-button>
          </el-descriptions-item>
          <el-descriptions-item label="最大并发">
            <span>{{ detailTask.maxConcurrent || 2 }}</span>
            <el-button size="small" type="primary" link style="margin-left:8px;"
              @click="openEditMaxConcurrent">修改</el-button>
          </el-descriptions-item>
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
        <!-- 配对记录查询 -->
        <!-- ========================================== -->
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:bold;font-size:13px;">配对记录查询</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
            <el-input v-model="pairSearchAccount" placeholder="输入号码，如 8615316816550" clearable size="small"
              style="width:220px;" @keyup.enter="searchPairRecord" />
            <el-button size="small" type="primary" @click="searchPairRecord">查询</el-button>
            <el-button size="small" @click="clearPairSearch">清除</el-button>
          </div>

          <!-- 查询结果 -->
          <div v-if="pairSearchResult" style="padding:8px 12px;background:#f5f7fa;border-radius:4px;">
            <div style="font-size:13px;margin-bottom:6px;">
              <!-- 这里也加上 ✅ -->
              <strong>{{ formatAccount(pairSearchResult.account) }}</strong>
              共配过
              <el-tag size="small" type="primary">{{ pairSearchResult.pairedWith.length }}</el-tag>
              个账号
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              <el-tag v-for="item in pairSearchResult.pairedWith" :key="item.account" size="small"
                :type="getPairTagType(item.account)" effect="plain" style="margin:2px;">

                {{ formatAccount(item.account) }}

                <!-- 只有红色（被移除或封禁）时才显示提示字眼 -->
                <span v-if="getPairTagType(item.account) === 'danger'"
                  style="font-size:10px; margin-left:4px; font-weight:normal;">
                  ({{ (detailTask.accounts || []).includes(item.account) ? '已封禁' : '已移出' }})
                </span>

                <span style="margin-left:4px;font-weight:bold;">×{{ item.count }}</span>
              </el-tag>
            </div>
          </div>

          <!-- 查不到 -->
          <div v-else-if="pairSearchDone" style="color:#999;font-size:13px;padding:4px 0;">
            该号码在任务里没有配对记录
          </div>
        </div>

        <!-- 活跃会话 -->
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:bold;font-size:13px;">活跃会话 ({{ activeSessions.length }})</span>
          </div>
          <div v-if="activeSessions.length > 0"
            style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#f5f7fa;border-radius:4px;">
            <el-tag v-for="session in displaySessions" :key="session.id" type="info" effect="plain" size="small"
              style="margin:2px;">
              <span style="color: #409eff; font-weight: bold;">{{ formatAccount(session.accountA) }}</span>
              <span style="color:#909399;">↔</span>
              <span style="color: #67c23a; font-weight: bold;">{{ formatAccount(session.accountB) }}</span>
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
        <div
          style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-weight:bold; font-size:13px;">对话记录</span>

          <!-- ✅ 加在这里：手动刷新按钮 -->
          <el-button size="small" type="primary" plain @click="manualRefreshList" :loading="listRefreshing">
            <el-icon>
              <Refresh />
            </el-icon> 刷新列表
          </el-button>
        </div>
        <!-- ✅ 对话记录（左右分栏版） -->
        <div
          style="margin-top:12px; display:flex; height:550px; border:1px solid #ebeef5; background:#fff; border-radius: 4px;">

          <div
            style="width: 420px; border-right: 1px solid #ebeef5; background: #fff; display: flex; flex-direction: column;">

            <!-- ✅ 新增：搜索框 -->
            <div style="padding: 10px; border-bottom: 1px solid #ebeef5; background: #fff;">
              <el-input v-model="searchChatAccount" placeholder="按号码筛选" clearable size="small"
                @keyup.enter="handleSearchChat" @clear="handleSearchChat">
                <template #append>
                  <el-button @click="handleSearchChat">
                    <el-icon>
                      <Search />
                    </el-icon>
                  </el-button>
                </template>
              </el-input>
            </div>

            <!-- 列表区（占满剩余空间并滚动） -->
            <div style="flex: 1; overflow-y: auto; background: #fafafa;">
              <div v-for="item in chatSessionList" :key="item.session.id" @click="selectChatSession(item.session)"
                :style="{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #ebeef5', background: currentChatSessionId === item.session.id ? '#e6f2ff' : '' }">

                <!-- 账号对 -->
                <div
                  style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 13px; margin-bottom: 6px;">
                  <span style="flex: 1; margin-right: 8px; word-break: break-all; line-height: 1.4;">
                    <span style="color: #409eff; font-weight: 600;">{{ formatAccount(item.session.accountA) }}</span>
                    <span style="color:#909399; font-weight: normal; margin: 0 4px;">↔</span>
                    <span style="color: #67c23a; font-weight: 600;">{{ formatAccount(item.session.accountB) }}</span>
                  </span>
                  <el-tag size="small" style="flex-shrink: 0;" :type="item.session.status === 'active' ? 'warning' :
                    (item.session.status === 'failed' ? 'danger' :
                      (item.session.status === 'ended' ? 'info' : 'success'))
                    ">
                    {{
                      item.session.status === 'active' ? '进行中' :
                        (item.session.status === 'failed' ? '失败' :
                          (item.session.status === 'ended' ? '中断' : '完成'))
                    }}
                  </el-tag>
                </div>

                <!-- 最后一条消息预览 -->
                <div style="font-size: 12px; color: #999; display: flex; justify-content: space-between;">
                  <span>最后活跃:</span>
                  <span>{{ item.session.lastTime ? formatTime(item.session.lastTime).slice(5, 16) : '暂无记录' }}</span>
                </div>
              </div>
              <div v-if="chatSessionList.length === 0" style="text-align:center; padding:20px; color:#999;">暂无会话记录</div>
            </div>

            <!-- ✅ 底部：分页（固定在最下面） -->
            <div
              style="height: 45px; border-top: 1px solid #ebeef5; background: #fff; display: flex; justify-content: center; align-items: center;">
              <el-pagination v-model:current-page="sessionListPage" :page-size="sessionListPageSize"
                :total="sessionListTotal" layout="prev, pager, next" small background
                @current-change="handleChatSessionPageChange" />
            </div>
          </div>
          <!-- ============ 右侧：微信风气泡 ============ -->
          <div style="flex:1; display:flex; flex-direction:column; background:#f5f5f5;">

            <!-- 顶部工具栏 -->
            <div
              style="padding:10px; background:#fff; border-bottom:1px solid #ebeef5; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:bold; font-size:13px;">
                <template v-if="currentChatSessionInfo">
                  <span style="color: #409eff;">{{ formatAccount(currentChatSessionInfo.accountA) }}</span>
                  <span style="color:#909399; font-weight: normal; margin: 0 6px;">↔</span>
                  <span style="color: #67c23a;">{{ formatAccount(currentChatSessionInfo.accountB) }}</span>
                </template>
                <span v-else>请选择左侧会话</span>
              </span>
              <div style="display:flex; align-items:center; gap:8px;">
                <el-select v-model="messageFilterStatus" placeholder="全部状态" clearable size="small" style="width:100px"
                  @change="onMessageFilterChange">
                  <el-option label="全部" value="" />
                  <el-option label="已发送" value="sent" />
                  <el-option label="已送达" value="delivered" />
                  <el-option label="已读" value="read" />
                  <el-option label="失败" value="failed" />
                </el-select>
                <span style="color:#999;font-size:12px;">共 {{ messageTotal }} 条</span>
              </div>
            </div>

            <!-- 消息气泡列表 -->
            <div class="message-list" ref="messageListRef" style="flex:1; overflow-y:auto; padding:15px;"
              v-loading="!!currentChatSessionId && detailMessages.length === 0">
              <div v-if="detailMessages.length === 0"
                style="text-align:center; color:#999; padding:20px; font-size:13px;">
                {{ currentChatSessionId ? '该会话暂无消息' : '请点击左侧会话查看记录' }}
              </div>

              <div v-for="msg in detailMessages" :key="msg.id" style="margin-bottom:20px;">

                <div v-if="msg.isSimulated" style="text-align:center; font-size:12px; color:#999; margin-bottom:10px;">
                  -- {{ msg.fromAccount }} 发送了模拟消息 --
                </div>

                <!-- ✅ 核心修改：通过 fromAccount 和 accountA 对比来决定靠左还是靠右 -->
                <div v-else :style="{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: (currentChatSessionInfo && msg.fromAccount === currentChatSessionInfo.accountA) ? 'flex-end' : 'flex-start'
                }">

                  <!-- 头部信息 -->
                  <div
                    style="font-size:12px; color:#999; margin-bottom:4px; padding: 0 4px; display: flex; align-items: center;">

                    <!-- ✅ 直接显示号码，并加上 A/B 标识 -->
                    <span :style="{
                      fontWeight: 600,
                      marginRight: '8px',
                      color: (currentChatSessionInfo && msg.fromAccount === currentChatSessionInfo.accountA) ? '#409eff' : '#67c23a'
                    }">
                      {{ (currentChatSessionInfo && msg.fromAccount === currentChatSessionInfo.accountA) ? 'A: ' : 'B: '
                      }}{{ msg.fromAccount }}
                    </span>

                    <span style="margin-right: 8px;">{{ formatTime(msg.sentAt).slice(11, 16) }}</span>

                    <el-tag size="small" style="margin-right: 4px; padding: 0 4px; height: 18px; line-height: 16px;"
                      :type="getMessageStatusType(msg.status)">
                      {{ getMessageStatusLabel(msg.status) }}
                    </el-tag>

                    <el-tag size="small" style="padding: 0 4px; height: 18px; line-height: 16px;"
                      :style="{ background: msg.round % 2 === 0 ? '#ecf5ff' : '#f0f9eb', color: msg.round % 2 === 0 ? '#409eff' : '#67c23a' }">
                      {{ msg.round }}轮{{ msg.roundIndex }}句
                    </el-tag>
                  </div>

                  <!-- 气泡本体 -->
                  <div :style="{
                    maxWidth: '70%', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word',
                    // 如果是 A 发的（靠右），用绿色；如果是 B 发的（靠左），用白色
                    background: (currentChatSessionInfo && msg.fromAccount === currentChatSessionInfo.accountA) ? '#95ec69' : '#ffffff',
                    color: '#333',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    border: (currentChatSessionInfo && msg.fromAccount === currentChatSessionInfo.accountA) ? 'none' : '1px solid #ebeef5'
                  }">
                    {{ msg.content }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部：分页 -->
            <div
              style="padding:10px; background:#fff; border-top:1px solid #ebeef5; display:flex; justify-content:flex-end;">
              <el-pagination v-model:current-page="messagePage" v-model:page-size="messagePageSize"
                :page-sizes="[20, 50, 100]" :total="messageTotal" layout="total, prev, pager, next" small
                @size-change="fetchTaskMessages" @current-change="fetchTaskMessages" />
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
    <!-- 修改单对重复上限弹窗 -->
    <el-dialog v-model="showEditMaxRepeatDialog" title="修改单对重复上限" width="400px">
      <el-form label-width="130px">
        <el-form-item label="单对重复上限">
          <el-input-number v-model="editMaxRepeatValue" :min="0" :max="9999" style="width:100%" />
          <div style="font-size:12px;color:#999;margin-top:4px;">
            0 表示不限制；同一对账号最多重复配对几次（防止一直刷老号）
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditMaxRepeatDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateMaxRepeat" :loading="updatingMaxRepeat">确定</el-button>
      </template>
    </el-dialog>
    <!-- ========================================== -->
    <!-- 修改会话上限对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showEditMaxPairsDialog" title="修改会话上限" width="400px">
      <el-form label-width="120px">
        <el-form-item label="会话上限">
          <el-input-number v-model="editMaxPairsValue" :min="0" :max="9999" style="width:100%" />
          <div style="font-size:12px;color:#999;margin-top:4px;">
            0 表示不限制；已配对的账号不受影响，只影响新配对
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditMaxPairsDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateMaxPairs" :loading="updatingMaxPairs">确定</el-button>
      </template>
    </el-dialog>

    <!-- ========================================== -->
    <!-- 修改最大并发对话框 -->
    <!-- ========================================== -->
    <el-dialog v-model="showEditMaxConcurrentDialog" title="修改最大并发" width="400px">
      <el-form label-width="120px">
        <el-form-item label="最大并发">
          <el-input-number v-model="editMaxConcurrentValue" :min="1" :max="999" style="width:100%" />
          <div style="font-size:12px;color:#999;margin-top:4px;">
            同时进行的会话数上限；调小后已进行的会话不受影响
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditMaxConcurrentDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateMaxConcurrent" :loading="updatingMaxConcurrent">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, Timer } from '@element-plus/icons-vue'
import api from '@/api'
import dayjs from 'dayjs'

const searchChatAccount = ref('')
const refreshAccountTimer = ref(null)

const chatSessionList = ref([])
const currentChatSessionId = ref('')
const currentChatSessionInfo = ref(null)

const sessionListPage = ref(1)
const sessionListPageSize = ref(20)
const sessionListTotal = ref(0)

const messagePage = ref(1)
const messagePageSize = ref(20)

// 刷新状态
const listRefreshing = ref(false)
const handleSearchChat = () => {
  sessionListPage.value = 1
  fetchChatSessions(detailTask.value.id)
}

// 手动刷新列表
const manualRefreshList = async () => {
  if (!detailTask.value) return
  listRefreshing.value = true
  try {
    await fetchChatSessions(detailTask.value.id)
    const res = await api.get(`/chat/tasks/${detailTask.value.id}`)
    if (res.code === 0) {
      sessions.value = res.data.sessions || []
      detailTask.value = res.data.task
      accountPairs.value = res.data.account_pairs || {}
      accountUniquePairs.value = res.data.account_unique_pairs || {}
    }
    ElMessage.success('列表已刷新')
  } catch (e) {
    ElMessage.error('刷新失败')
  } finally {
    listRefreshing.value = false
  }
}

const fetchChatSessions = async (taskId) => {
  try {
    const res = await api.get(`/chat/tasks/${taskId}/sessions`, {
      params: {
        page: sessionListPage.value,
        page_size: sessionListPageSize.value,
        account: searchChatAccount.value
      }
    })
    if (res.code === 0) {
      chatSessionList.value = res.data.data || []
      sessionListTotal.value = res.data.total || 0
    }
  } catch (e) {
    console.error('获取会话列表失败', e)
  }
}

// 点击左侧会话
const selectChatSession = (session) => {
  if (currentChatSessionId.value === session.id) return
  currentChatSessionId.value = session.id
  currentChatSessionInfo.value = session
  detailMessages.value = []
  messagePage.value = 1
  fetchChatMessagesOnly()
}

const removeFilterGroups = ref([])
const accountUniquePairs = ref({})

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
const messageFilterAccount = ref('')
const messageTotal = ref(0)

// ============ 配对记录查询 ============
const pairSearchAccount = ref('')
const pairSearchResult = ref(null)
const pairSearchDone = ref(false)

// ============ 修改会话上限 ============
const showEditMaxPairsDialog = ref(false)
const editMaxPairsValue = ref(0)
const updatingMaxPairs = ref(false)

// ============ 修改最大并发 ============
const showEditMaxConcurrentDialog = ref(false)
const editMaxConcurrentValue = ref(2)
const updatingMaxConcurrent = ref(false)

const showEditMaxRepeatDialog = ref(false)
const editMaxRepeatValue = ref(0)
const updatingMaxRepeat = ref(false)

const openEditMaxRepeat = () => {
  if (!detailTask.value) return
  editMaxRepeatValue.value = detailTask.value.maxRepeatPairs || 0
  showEditMaxRepeatDialog.value = true
}

const handleUpdateMaxRepeat = async () => {
  if (!detailTask.value) return
  updatingMaxRepeat.value = true
  try {
    const res = await api.put(`/chat/tasks/${detailTask.value.id}/max-repeat`, {
      maxRepeatPairs: editMaxRepeatValue.value
    })
    if (res.code === 0) {
      ElMessage.success('修改成功')
      showEditMaxRepeatDialog.value = false
      detailTask.value.maxRepeatPairs = editMaxRepeatValue.value
    } else {
      ElMessage.error(res.message || '修改失败')
    }
  } catch (error) {
    ElMessage.error('修改失败: ' + (error.message || ''))
  } finally {
    updatingMaxRepeat.value = false
  }
}

// ============ 管理账号 ============
const showManageDialog = ref(false)
const manageTask = ref(null)
const selectedRemove = ref([])
const addAccountsGroup = ref([])
const addAccountsText = ref('')
const managingAccounts = ref(false)

const handleRemoveByGroups = async () => {
  if (!manageTask.value || removeFilterGroups.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定移除分组【${removeFilterGroups.value.join(', ')}】下的账号？`,
      '提示',
      { type: 'warning' }
    )
  } catch (e) {
    return
  }

  managingAccounts.value = true
  try {
    const res = await api.post(`/chat/tasks/${manageTask.value.id}/accounts/remove`, {
      groups: removeFilterGroups.value
    })
    if (res.code === 0) {
      ElMessage.success(`已移除 ${res.data.removed} 个账号`)
      await fetchTasks()
      const detailRes = await api.get(`/chat/tasks/${manageTask.value.id}`)
      if (detailRes.code === 0) {
        manageTask.value = detailRes.data.task
      }
      removeFilterGroups.value = []
      selectedRemove.value = []
    } else {
      ElMessage.error(res.message || '移除失败')
    }
  } catch (e) {
    ElMessage.error('移除失败: ' + (e.message || ''))
  } finally {
    managingAccounts.value = false
  }
}

// 管理账号：按状态排序
const sortedManageAccounts = computed(() => {
  if (!manageTask.value || !manageTask.value.accounts) return []

  const statusOrder = {
    'online': 1, 'normal': 1, 'logging': 2, 'offline': 3, 'banned': 4, 'expired': 4, 'unknown': 5
  }

  return [...manageTask.value.accounts].sort((a, b) => {
    const statusA = getAccountStatus(a)
    const statusB = getAccountStatus(b)
    const orderA = statusOrder[statusA.status] || 5
    const orderB = statusOrder[statusB.status] || 5
    if (orderA !== orderB) return orderA - orderB
    return a.localeCompare(b)
  })
})

// ============ 创建表单 ============
const createForm = reactive({
  name: '',
  accountGroups: [],
  language: 'pt',
  initiateRate: 60,
  minDelay: 3,
  maxDelay: 60,
  minRounds: 4,
  maxRounds: 6,
  replyRate: 80,
  maxConcurrent: 2,
  pairIntervalMin: 30,
  pairIntervalMax: 99,
  maxPairsPerAccount: 0,
  maxRepeatPairs: 2,
  allowSameCountry: false,
  groupCooldowns: {} // ✅ 新增
})

// 监听分组选择的变化
watch(() => createForm.accountGroups, (newGroups) => {
  newGroups.forEach(g => {
    // 如果这个分组还没配置，给个默认值 30~45
    if (!createForm.groupCooldowns[g]) {
      createForm.groupCooldowns[g] = { min: 30, max: 45 }
    }
  })
}, { deep: true })

// ============ 计算属性 ============
const simulatedCount = computed(() => detailMessages.value.filter(m => m.isSimulated).length)
const failedCount = computed(() => detailMessages.value.filter(m => m.status === 'failed').length)
const activeSessions = computed(() => sessions.value.filter(s => s.status === 'active'))
const displaySessions = computed(() => activeSessions.value.length > 10 && !showAllSessions.value
  ? activeSessions.value.slice(0, 10)
  : activeSessions.value)

// 按图标统计（互斥）
const onlineCount = computed(() =>
  detailTask.value?.accounts.filter(a => getAccountStatusShort(a) === '🟢').length || 0
)
const offlineCount = computed(() =>
  detailTask.value?.accounts.filter(a => getAccountStatusShort(a) === '⚪').length || 0
)
const bannedCount = computed(() =>
  detailTask.value?.accounts.filter(a => getAccountStatusShort(a) === '🚫').length || 0
)
const cooldownCount = computed(() =>
  detailTask.value?.accounts.filter(a => getAccountStatusShort(a) === '⏳').length || 0
)
const loggingCount = computed(() =>
  detailTask.value?.accounts.filter(a => getAccountStatusShort(a) === '🟡').length || 0
)
const unknownCount = computed(() =>
  detailTask.value?.accounts.filter(a => getAccountStatusShort(a) === '❓').length || 0
)

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

// ✅ 新增：前端自动拼接号码和分组
const formatAccount = (acc) => {
  if (!acc) return ''
  const found = allAccounts.value.find(a => a.account === acc)
  if (found && found.group) {
    return `${acc}(${found.group})`
  }
  return acc
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

// ============ 配对记录查询 ============
const searchPairRecord = () => {
  pairSearchDone.value = false
  pairSearchResult.value = null

  const acc = (pairSearchAccount.value || '').trim()
  if (!acc) {
    ElMessage.warning('请输入号码')
    return
  }

  if (!detailTask.value) return

  const pairs = detailTask.value.accountPairs || {}
  const pairCount = detailTask.value.pairCount || {}
  const pairedWith = pairs[acc]

  if (pairedWith && pairedWith.length > 0) {
    const list = pairedWith.map(other => {
      const key = acc < other ? `${acc}|${other}` : `${other}|${acc}`
      return {
        account: other,
        count: pairCount[key] || 0
      }
    })
    list.sort((a, b) => b.count - a.count)

    pairSearchResult.value = {
      account: acc,
      pairedWith: list
    }
  } else {
    pairSearchDone.value = true
  }
}

const clearPairSearch = () => {
  pairSearchAccount.value = ''
  pairSearchResult.value = null
  pairSearchDone.value = false
}

// ============ 修改会话上限 ============
const openEditMaxPairs = () => {
  if (!detailTask.value) return
  editMaxPairsValue.value = detailTask.value.maxPairsPerAccount || 0
  showEditMaxPairsDialog.value = true
}

const handleUpdateMaxPairs = async () => {
  if (!detailTask.value) return
  updatingMaxPairs.value = true
  try {
    const res = await api.put(`/chat/tasks/${detailTask.value.id}/max-pairs`, {
      maxPairsPerAccount: editMaxPairsValue.value
    })
    if (res.code === 0) {
      ElMessage.success('修改成功')
      showEditMaxPairsDialog.value = false
      detailTask.value.maxPairsPerAccount = editMaxPairsValue.value
    } else {
      ElMessage.error(res.message || '修改失败')
    }
  } catch (error) {
    ElMessage.error('修改失败: ' + (error.message || ''))
  } finally {
    updatingMaxPairs.value = false
  }
}

// ✅ 修正后的判断逻辑
const getPairTagType = (acc) => {
  // 1. 如果已经被踢出任务，直接标红
  if (!(detailTask.value.accounts || []).includes(acc)) {
    return 'danger'
  }

  // 2. 如果还在任务里，查一下状态
  const statusInfo = getAccountStatus(acc)

  // 只有明确被封禁或过期，才标红
  if (statusInfo.status === 'banned' || statusInfo.status === 'expired') {
    return 'danger'
  }

  // 3. 正常在线、离线、登录中，都显示绿色
  return 'success'
}

// ============ 修改最大并发 ============
const openEditMaxConcurrent = () => {
  if (!detailTask.value) return
  editMaxConcurrentValue.value = detailTask.value.maxConcurrent || 2
  showEditMaxConcurrentDialog.value = true
}

const handleUpdateMaxConcurrent = async () => {
  if (!detailTask.value) return
  updatingMaxConcurrent.value = true
  try {
    const res = await api.put(`/chat/tasks/${detailTask.value.id}/max-concurrent`, {
      maxConcurrent: editMaxConcurrentValue.value
    })
    if (res.code === 0) {
      ElMessage.success('修改成功')
      showEditMaxConcurrentDialog.value = false
      detailTask.value.maxConcurrent = editMaxConcurrentValue.value
    } else {
      ElMessage.error(res.message || '修改失败')
    }
  } catch (error) {
    ElMessage.error('修改失败: ' + (error.message || ''))
  } finally {
    updatingMaxConcurrent.value = false
  }
}

// ============ 管理账号 ============
const openManageAccounts = (row) => {
  manageTask.value = row
  selectedRemove.value = []
  removeFilterGroups.value = []
  addAccountsGroup.value = []
  addAccountsText.value = ''
  showManageDialog.value = true
}

const handleChatSessionPageChange = () => {
  currentChatSessionId.value = ''
  currentChatSessionInfo.value = null
  detailMessages.value = []
  messageTotal.value = 0
  if (detailTask.value) {
    fetchChatSessions(detailTask.value.id)
  }
}

const handleAddAccounts = async () => {
  if (!manageTask.value) return

  let accounts = addAccountsText.value.split('\n').map(s => s.trim()).filter(s => s)

  if (addAccountsGroup.value.length > 0) {
    for (const g of addAccountsGroup.value) {
      try {
        const res = await api.get('/whatsapp/accounts/by-group', { params: { group: g } })
        if (res.code === 0 && Array.isArray(res.data)) {
          accounts.push(...res.data.map(a => a.account))
        }
      } catch (e) { }
    }
  }

  accounts = [...new Set(accounts)]
  if (accounts.length === 0) {
    ElMessage.warning('请选择分组或输入账号')
    return
  }

  managingAccounts.value = true
  try {
    const res = await api.post(`/chat/tasks/${manageTask.value.id}/accounts`, { accounts })
    if (res.code === 0) {
      ElMessage.success(`已添加 ${res.data.added} 个账号`)
      manageTask.value.accounts = [...new Set([...manageTask.value.accounts, ...accounts])]
      addAccountsText.value = ''
      addAccountsGroup.value = []
      fetchTasks()
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (e) {
    ElMessage.error('添加失败: ' + (e.message || ''))
  } finally {
    managingAccounts.value = false
  }
}

const handleRemoveAccounts = async () => {
  if (!manageTask.value || selectedRemove.value.length === 0) return
  try {
    await ElMessageBox.confirm(`确定移除 ${selectedRemove.value.length} 个账号？`, '提示', { type: 'warning' })
  } catch (e) {
    return
  }

  managingAccounts.value = true
  try {
    const res = await api.post(`/chat/tasks/${manageTask.value.id}/accounts/remove`, {
      accounts: selectedRemove.value
    })
    if (res.code === 0) {
      ElMessage.success(`已移除 ${res.data.removed} 个账号`)
      manageTask.value.accounts = manageTask.value.accounts.filter(a => !selectedRemove.value.includes(a))
      selectedRemove.value = []
      fetchTasks()
    } else {
      ElMessage.error(res.message || '移除失败')
    }
  } catch (e) {
    ElMessage.error('移除失败: ' + (e.message || ''))
  } finally {
    managingAccounts.value = false
  }
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
  if (!createForm.name) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (!createForm.accountGroups || createForm.accountGroups.length === 0) {
    ElMessage.warning('请选择账号分组')
    return
  }
  if (createForm.minDelay > createForm.maxDelay) {
    ElMessage.warning('最小消息间隔不能大于最大间隔')
    return
  }
  if (createForm.minRounds > createForm.maxRounds) {
    ElMessage.warning('最少轮数不能大于最多轮数')
    return
  }
  if (createForm.pairIntervalMin > createForm.pairIntervalMax) {
    ElMessage.warning('最小配对间隔不能大于最大间隔')
    return
  }

  creating.value = true
  try {
    const res = await api.post('/chat/tasks', {
      ...createForm,
      accountGroup: createForm.accountGroups.join(',')
    })
    if (res.code === 0) {
      ElMessage.success('任务创建成功')
      showCreateDialog.value = false
      createForm.name = ''
      createForm.accountGroups = []
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

const onMessageFilterChange = () => {
  fetchTaskMessages()
}

const resetMessageFilter = () => {
  messageFilterAccount.value = ''
  messageFilterStatus.value = ''
  fetchTaskMessages()
}

const fetchTaskMessages = async () => {
  if (!detailTask.value) return
  try {
    const params = {
      page: messagePage.value,
      page_size: messagePageSize.value
    }
    if (messageFilterStatus.value) params.status = messageFilterStatus.value
    if (messageFilterAccount.value) params.account = messageFilterAccount.value

    if (currentChatSessionId.value) {
      params.session_id = currentChatSessionId.value
    }

    const res = await api.get(`/chat/tasks/${detailTask.value.id}`, { params })
    if (res.code === 0) {
      detailMessages.value = res.data.messages || []
      messageTotal.value = res.data.total || 0
    }
  } catch (error) {
    console.error(error)
  }
}

const groupedAccounts = ref([])
const showTaskDetail = async (row) => {
  showDetailDialog.value = true
  detailLoading.value = true
  detailTask.value = row
  sessions.value = []
  detailMessages.value = []
  messageFilterStatus.value = ''
  messageFilterAccount.value = ''
  showAllAccounts.value = false
  showAllSessions.value = false

  currentChatSessionId.value = ''
  currentChatSessionInfo.value = null
  messageTotal.value = 0
  sessionListPage.value = 1
  clearPairSearch()

  try {
    await fetchChatSessions(row.id)
    await refreshAccountsStatus()

    const res = await api.get(`/chat/tasks/${row.id}`)
    if (res.code === 0) {
      detailTask.value = res.data.task
      sessions.value = res.data.sessions || []
      accountPairs.value = res.data.account_pairs || {}
      groupedAccounts.value = res.data.grouped_accounts || []
      accountUniquePairs.value = res.data.account_unique_pairs || {}
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
    if (detailTask.value.status === 'completed' || detailTask.value.status === 'stopped') {
      return
    }

    try {
      const res = await api.get(`/chat/tasks/${detailTask.value.id}`)
      if (res.code === 0) {
        sessions.value = res.data.sessions || []
        detailTask.value = res.data.task
        accountPairs.value = res.data.account_pairs || {}
        accountUniquePairs.value = res.data.account_unique_pairs || {}

        if (currentChatSessionId.value) {
          const latestSession = sessions.value.find(s => s.id === currentChatSessionId.value)
          if (latestSession) {
            currentChatSessionInfo.value = latestSession
          }
        }
      }

      const isSessionCompleted = currentChatSessionInfo.value && currentChatSessionInfo.value.status === 'completed'

      if (currentChatSessionId.value && !isSessionCompleted) {
        await fetchChatMessagesOnly()
      }

    } catch (error) { }
  }, 20000)

  if (refreshAccountTimer.value) clearInterval(refreshAccountTimer.value)
  refreshAccountTimer.value = setInterval(() => {
    if (showDetailDialog.value) {
      refreshAccountsStatus()
    }
  }, 60000)
}

const fetchChatMessagesOnly = async () => {
  if (!detailTask.value || !currentChatSessionId.value) return
  try {
    const params = {
      session_id: currentChatSessionId.value,
      page: messagePage.value,
      page_size: messagePageSize.value
    }
    if (messageFilterStatus.value) params.status = messageFilterStatus.value

    const res = await api.get(`/chat/tasks/${detailTask.value.id}/messages`, { params })
    if (res.code === 0) {
      detailMessages.value = res.data.messages || []
      messageTotal.value = res.data.total || 0
    }
  } catch (error) { }
}

const closeDetail = () => {
  if (detailTimer.value) { clearInterval(detailTimer.value); detailTimer.value = null }
  if (refreshAccountTimer.value) { clearInterval(refreshAccountTimer.value); refreshAccountTimer.value = null }
  showAllAccounts.value = false
  showAllSessions.value = false
  clearPairSearch()
}

// ============ 生命周期 ============
onMounted(() => {
  fetchAccountGroups()
  fetchAccounts()
  fetchTasks()
})

onBeforeUnmount(() => {
  if (detailTimer.value) { clearInterval(detailTimer.value); detailTimer.value = null }
  if (refreshAccountTimer.value) { clearInterval(refreshAccountTimer.value); refreshAccountTimer.value = null }
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

.slider-wrapper :deep(.el-slider) {
  flex: 1;
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