<!-- frontend/src/views/Nurture.vue -->

<template>
    <div class="nurture">
        <!-- 工具栏 -->
        <div class="toolbar">
            <el-button type="primary" @click="showCreateDialog = true">
                <el-icon>
                    <Plus />
                </el-icon> 创建养号任务
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

        <el-table :data="tasks" v-loading="loading" border>
            <!-- 任务名称 -->
            <el-table-column prop="name" label="任务名称" width="100" />

            <!-- 分组 -->
            <el-table-column label="分组" width="140">
                <template #default="{ row }">
                    <el-tag size="small" type="success">{{ row.nurtureGroup }}</el-tag>
                    <el-tag size="small" type="warning" style="margin-left:4px;">{{ row.newGroup }}</el-tag>
                </template>
            </el-table-column>

            <!-- 配对 -->
            <el-table-column label="配对" width="260">
                <template #default="{ row }">
                    总 <el-tag size="small" type="info">{{ row.pairStats?.total || 0 }}</el-tag>
                    剩 <el-tag size="small" type="warning">{{ row.pairStats?.remaining || 0 }}</el-tag>
                    完 <el-tag size="small" type="success">{{ row.pairStats?.completed || 0 }}</el-tag>
                    封 <el-tag size="small" type="danger">{{ row.pairStats?.banned || 0 }}</el-tag>
                    跑 <el-tag size="small" type="primary">{{ row.pairStats?.running || 0 }}</el-tag>
                </template>
            </el-table-column>

            <!-- 轮数 -->
            <el-table-column label="轮数" width="70">
                <template #default="{ row }">
                    <span style="font-size:13px;">{{ row.minRounds || 2 }}-{{ row.maxRounds || 6 }}</span>
                </template>
            </el-table-column>

            <!-- 回复率 -->
            <el-table-column prop="replyRate" label="回复率" width="70" align="center">
                <template #default="{ row }">{{ row.replyRate || 80 }}%</template>
            </el-table-column>

            <!-- 进度 -->
            <el-table-column label="进度" width="120">
                <template #default="{ row }">
                    <el-progress :percentage="getProgress(row)" :color="getProgressColor(row)" :stroke-width="6" />
                </template>
            </el-table-column>

            <!-- 会话/消息 -->
            <el-table-column label="会话消息" width="85" align="center">
                <template #default="{ row }">{{ row.totalMessages || 0 }}</template>
            </el-table-column>
            <el-table-column label="复活消息" width="85" align="center">
                <template #default="{ row }">{{ row.repeatMessages || 0 }}</template>
            </el-table-column>

            <!-- 状态 -->
            <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                    <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
                </template>
            </el-table-column>

            <!-- 创建时间 -->
            <el-table-column prop="createdAt" label="创建时间" width="140">
                <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>

            <!-- 操作 -->
            <el-table-column label="操作" width="220" fixed="right">
                <template #default="{ row }">
                    <el-button size="small" type="primary" @click="showTaskDetail(row)">详情</el-button>
                    <el-button v-if="row.status === 'pending' || row.status === 'paused'" size="small" type="success"
                        @click="handleStart(row)">启动</el-button>
                    <el-button v-if="row.status === 'running'" size="small" type="warning"
                        @click="handlePause(row)">暂停</el-button>
                    <el-button v-if="row.status === 'paused'" size="small" type="success"
                        @click="handleResume(row)">恢复</el-button>
                    <el-button size="small" type="danger" plain @click="handleDelete(row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div style="margin-top:20px;display:flex;justify-content:flex-end">
            <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]"
                :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="fetchTasks"
                @current-change="fetchTasks" />
        </div>

        <!-- ========================================== -->
        <!-- 创建任务对话框 -->
        <!-- ========================================== -->
        <el-dialog v-model="showCreateDialog" title="创建养号任务" width="680px" :close-on-click-modal="false"
            class="create-nurture-dialog">
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
                    <el-form-item label="养号分组" required>
                        <el-select v-model="createForm.nurtureGroups" multiple placeholder="选择养号分组" style="width:100%"
                            size="large">
                            <el-option v-for="item in accountGroups" :key="item.name"
                                :label="item.name + ' (' + item.count + '个)'" :value="item.name" />
                        </el-select>
                        <div class="form-tip">可选择多个分组</div>
                    </el-form-item>
                    <el-form-item label="新号分组" required>
                        <el-select v-model="createForm.newGroups" multiple placeholder="选择新号分组" style="width:100%"
                            size="large">
                            <el-option v-for="item in accountGroups" :key="item.name"
                                :label="item.name + ' (' + item.count + '个)'" :value="item.name" />
                        </el-select>
                        <div class="form-tip">可选择多个分组</div>
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
                        <div class="form-tip">新号回复的概率，未命中时自动模拟跳过</div>
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
                        <div class="form-tip">第1轮严格检查已读，第2+轮宽松处理</div>
                    </el-form-item>
                    <el-form-item label="最大并发">
                        <div class="range-wrapper">
                            <el-input-number v-model="createForm.maxConcurrent" :min="1" :max="10" size="large" />
                            <span class="range-unit" style="margin-left:8px;">同时进行的对话数</span>
                        </div>
                    </el-form-item>
                </div>

                <!-- 配对冷却 -->
                <div class="form-section">
                    <div class="section-title">
                        <span class="section-line"></span>
                        配对冷却
                    </div>
                    <el-form-item label="养号冷却">
                        <div class="range-wrapper">
                            <el-input-number v-model="createForm.nurtureCooldownMin" :min="1" :max="999" size="large" />
                            <span class="range-sep">~</span>
                            <el-input-number v-model="createForm.nurtureCooldownMax" :min="2" :max="999" size="large" />
                            <span class="range-unit">分钟</span>
                        </div>
                        <div class="form-tip">养号账号配对后的冷却时间，冷却期间不再参与配对</div>
                    </el-form-item>
                    <el-form-item label="新号冷却">
                        <div class="range-wrapper">
                            <el-input-number v-model="createForm.newCooldownMin" :min="1" :max="999" size="large" />
                            <span class="range-sep">~</span>
                            <el-input-number v-model="createForm.newCooldownMax" :min="2" :max="999" size="large" />
                            <span class="range-unit">分钟</span>
                        </div>
                        <div class="form-tip">新号账号配对后的冷却时间，冷却期间不再参与配对（建议比养号长）</div>
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
        <!-- 任务详情对话框 -->
        <!-- ========================================== -->
        <el-dialog v-model="showDetailDialog" :title="`养号任务 - ${detailTask?.name || ''}`" width="1000px"
            :close-on-click-modal="false" @close="closeDetail">
            <div v-if="detailTask" v-loading="detailLoading">
                <!-- 基本信息 -->
                <el-descriptions :column="4" border size="small">
                    <el-descriptions-item label="任务名称">{{ detailTask.name }}</el-descriptions-item>
                    <el-descriptions-item label="养号分组">
                        <el-tag size="small" type="success">{{ detailTask.nurtureGroup || '-' }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="新号分组">
                        <el-tag size="small" type="warning">{{ detailTask.newGroup || '-' }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="状态">
                        <el-tag :type="getStatusType(detailTask.status)" size="small">
                            {{ getStatusLabel(detailTask.status) }}
                        </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="发起概率">{{ detailTask.initiateRate || 60 }}%</el-descriptions-item>
                    <el-descriptions-item label="回复概率">{{ detailTask.replyRate || 80 }}%</el-descriptions-item>
                    <el-descriptions-item label="消息间隔">{{ detailTask.minDelay || 3 }}~{{ detailTask.maxDelay || 30
                    }}s</el-descriptions-item>
                    <el-descriptions-item label="轮数">{{ detailTask.minRounds || 2 }}~{{ detailTask.maxRounds || 6
                    }}</el-descriptions-item>
                    <el-descriptions-item label="养号冷却">{{ detailTask.nurtureCooldownMin || 30 }}~{{
                        detailTask.nurtureCooldownMax || 45 }}分钟</el-descriptions-item>
                    <el-descriptions-item label="新号冷却">{{ detailTask.newCooldownMin || 60 }}~{{
                        detailTask.newCooldownMax || 90
                    }}分钟</el-descriptions-item>
                    <el-descriptions-item label="总配对数">{{ detailTask.totalPairs || 0 }}</el-descriptions-item>
                    <el-descriptions-item label="总消息">{{ detailTask.totalMessages || 0 }}</el-descriptions-item>
                    <el-descriptions-item label="活跃会话">{{ detailTask.activeSessions || 0 }}</el-descriptions-item>
                    <el-descriptions-item label="总配对">
                        <el-tag type="info" size="small">{{ pairStats.total || 0 }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="剩余">
                        <el-tag type="warning" size="small">{{ pairStats.remaining || 0 }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="已完成">
                        <el-tag type="success" size="small">{{ pairStats.completed || 0 }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="封禁">
                        <el-tag type="danger" size="small">{{ pairStats.banned || 0 }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="创建时间">{{ formatTime(detailTask.createdAt) }}</el-descriptions-item>
                    <el-descriptions-item label="启动时间">{{ formatTime(detailTask.startedAt) }}</el-descriptions-item>
                    <el-descriptions-item label="完成时间" v-if="detailTask.completedAt">{{
                        formatTime(detailTask.completedAt)
                    }}</el-descriptions-item>
                    <el-descriptions-item label="完成时间" v-else>-</el-descriptions-item>
                </el-descriptions>

                <!-- 配对列表 -->
                <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-weight:bold;font-size:13px;">配对列表 ({{ Object.keys(detailTask.pairMap ||
                            {}).length
                        }})</span>
                    </div>
                    <div
                        style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#f5f7fa;border-radius:4px;max-height:60px;overflow:hidden;">
                        <template v-for="(newAcc, nurtureAcc) in detailTask.pairMap" :key="nurtureAcc">
                            <el-tag size="small" style="margin:2px;">
                                {{ nurtureAcc }} ↔ {{ newAcc }}
                            </el-tag>
                        </template>
                        <span v-if="Object.keys(detailTask.pairMap || {}).length === 0"
                            style="color:#999;font-size:13px;">暂无配对</span>
                    </div>
                </div>

                <!-- 冷却状态 -->
                <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-weight:bold;font-size:13px;">冷却状态</span>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#f5f7fa;border-radius:4px;">
                        <template v-for="(cooldownAt, account) in detailTask.nurtureCooldowns" :key="account">
                            <el-tag size="small" :type="isCooldownActive(cooldownAt) ? 'warning' : 'success'"
                                style="margin:2px;">
                                🟡 {{ account }}: {{ formatCooldown(cooldownAt) }}
                            </el-tag>
                        </template>
                        <template v-for="(cooldownAt, account) in detailTask.newCooldowns" :key="account">
                            <el-tag size="small" :type="isCooldownActive(cooldownAt) ? 'warning' : 'success'"
                                style="margin:2px;">
                                🔵 {{ account }}: {{ formatCooldown(cooldownAt) }}
                            </el-tag>
                        </template>
                        <span
                            v-if="Object.keys(detailTask.nurtureCooldowns || {}).length === 0 && Object.keys(detailTask.newCooldowns || {}).length === 0"
                            style="color:#999;font-size:13px;">暂无冷却中的账号</span>
                    </div>
                </div>

                <!-- ========================================== -->
                <!-- 会话列表 -->
                <!-- ========================================== -->
                <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-weight:bold;font-size:13px;">
                            会话列表 ({{ sessionTotal }})
                            <span style="font-size:12px;color:#999;font-weight:normal;margin-left:8px;">
                                显示第 {{ (sessionPage - 1) * sessionPageSize + 1 }} - {{ Math.min(sessionPage *
                                    sessionPageSize,
                                    sessionTotal) }} 条
                            </span>
                        </span>
                        <div style="display:flex;gap:6px;">
                            <el-tag v-if="sessionStats.completed > 0" type="success" size="small">
                                已完成 {{ sessionStats.completed }}
                            </el-tag>
                            <el-tag v-if="sessionStats.failed > 0" type="danger" size="small">
                                失败 {{ sessionStats.failed }}
                            </el-tag>
                            <el-tag v-if="sessionStats.active > 0" type="warning" size="small">
                                进行中 {{ sessionStats.active }}
                            </el-tag>
                        </div>
                    </div>

                    <!-- ✅ 搜索栏 -->
                    <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
                        <el-input v-model="searchNurtureAcc" placeholder="养号号码" clearable style="width:150px"
                            size="small" @keyup.enter="onSearch" />
                        <el-input v-model="searchNewAcc" placeholder="新号号码" clearable style="width:150px" size="small"
                            @keyup.enter="onSearch" />
                        <el-button type="primary" size="small" @click="onSearch">搜索</el-button>
                        <el-button size="small" @click="onResetSearch">重置</el-button>
                    </div>

                    <!-- 状态筛选按钮 -->
                    <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                        <el-button :type="sessionFilterStatus === '' ? 'primary' : ''" size="small"
                            @click="sessionFilterStatus = ''; onSessionFilterChange()">
                            全部
                        </el-button>
                        <el-button :type="sessionFilterStatus === 'active' ? 'primary' : ''" size="small"
                            @click="sessionFilterStatus = 'active'; onSessionFilterChange()">
                            进行中
                        </el-button>
                        <el-button :type="sessionFilterStatus === 'completed' ? 'primary' : ''" size="small"
                            @click="sessionFilterStatus = 'completed'; onSessionFilterChange()">
                            已完成
                        </el-button>
                        <el-button :type="sessionFilterStatus === 'failed' ? 'primary' : ''" size="small"
                            @click="sessionFilterStatus = 'failed'; onSessionFilterChange()">
                            失败
                        </el-button>
                    </div>

                    <el-table :data="sessions" border size="small" max-height="300">
                        <el-table-column prop="nurtureAcc" label="养号" width="140" />
                        <el-table-column prop="newAcc" label="新号" width="140" />
                        <el-table-column prop="status" label="状态" width="100">
                            <template #default="{ row }">
                                <el-tag
                                    :type="row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'"
                                    size="small">
                                    {{ row.status === 'completed' ? '✅ 完成' : row.status === 'failed' ? '❌ 失败' : '🟢 进行中'
                                    }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="rounds" label="轮数" width="80" align="center">
                            <template #default="{ row }">
                                {{ row.rounds }}/{{ row.maxRounds }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="chatCount" label="消息数" width="80" align="center" />
                        <el-table-column prop="lastTime" label="最后活跃" width="160">
                            <template #default="{ row }">
                                {{ formatTime(row.lastTime) }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="startedAt" label="开始时间" width="160">
                            <template #default="{ row }">
                                {{ formatTime(row.startedAt) }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="endReason" label="结束原因" min-width="120" show-overflow-tooltip>
                            <template #default="{ row }">
                                <span v-if="row.endReason"
                                    :style="{ color: row.status === 'completed' ? '#67c23a' : '#f56c6c', fontSize: '12px' }">
                                    {{ row.endReason }}
                                </span>
                                <span v-else style="color:#999;font-size:12px;">-</span>
                            </template>
                        </el-table-column>
                    </el-table>

                    <!-- 会话分页 -->
                    <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                        <el-pagination v-model:current-page="sessionPage" v-model:page-size="sessionPageSize"
                            :page-sizes="[10, 20, 50, 100]" :total="sessionTotal"
                            layout="total, sizes, prev, pager, next" small @size-change="onSessionPageChange"
                            @current-change="onSessionPageChange" />
                    </div>
                </div>

                <!-- ========================================== -->
                <!-- 消息记录 -->
                <!-- ========================================== -->
                <!-- 在消息记录下方或旁边新增复活消息 Tab -->

                <el-tabs v-model="activeTab" style="margin-top:12px;">
                    <!-- ========================================== -->
                    <!-- Tab 1: 会话消息 -->
                    <!-- ========================================== -->
                    <el-tab-pane label="会话消息" name="session">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-weight:bold;font-size:13px;">会话消息 ({{ messageTotal }})</span>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <el-select v-model="messageFilterStatus" placeholder="全部状态" clearable size="small"
                                    style="width:100px" @change="onMessageFilterChange">
                                    <el-option label="全部" value="" />
                                    <el-option label="已发送" value="sent" />
                                    <el-option label="已送达" value="delivered" />
                                    <el-option label="已读" value="read" />
                                    <el-option label="失败" value="failed" />
                                </el-select>
                                <el-tag v-if="simulatedCount > 0" type="warning" size="small">模拟 {{ simulatedCount
                                    }}</el-tag>
                                <el-tag v-if="msgFailedCount > 0" type="danger" size="small">失败 {{ msgFailedCount
                                    }}</el-tag>
                            </div>
                        </div>

                        <div class="message-list" style="max-height:350px;overflow-y:auto;">
                            <div v-if="detailMessages.length === 0"
                                style="text-align:center;color:#999;padding:20px;font-size:13px;">
                                暂无消息
                            </div>
                            <div v-for="msg in detailMessages" :key="msg.id" style="margin-bottom:6px;">
                                <div
                                    style="padding:6px 10px;border-radius:4px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
                                    <div
                                        style="display:flex;align-items:center;gap:6px;font-size:12px;color:#999;flex-wrap:wrap;">
                                        <span style="font-weight:600;color:#333;">{{ msg.fromAccount }}</span>
                                        <span>→</span>
                                        <span>{{ msg.toAccount }}</span>
                                        <el-tag size="small" style="font-size:10px;padding:0 6px;">{{ msg.round
                                            }}轮</el-tag>
                                        <el-tag v-if="msg.isSimulated" type="warning" size="small"
                                            style="font-size:10px;padding:0 6px;">模拟</el-tag>
                                        <el-tag :type="getMessageStatusType(msg.status)" size="small"
                                            style="font-size:10px;padding:0 6px;">
                                            {{ getMessageStatusLabel(msg.status) }}
                                        </el-tag>
                                        <span style="font-size:11px;color:#bbb;margin-left:auto;">{{
                                            formatTime(msg.sentAt)
                                            }}</span>
                                    </div>
                                    <div style="font-size:13px;color:#333;word-wrap:break-word;padding:2px 0;">
                                        <span v-if="msg.isSimulated"
                                            style="color:#b3b3b3;font-style:italic;">[概率未命中，模拟跳过]</span>
                                        <span v-else>{{ msg.content }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 会话消息分页 -->
                        <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                            <el-pagination v-model:current-page="messagePage" v-model:page-size="messagePageSize"
                                :page-sizes="[10, 20, 50, 100]" :total="messageTotal"
                                layout="total, sizes, prev, pager, next" small @size-change="onMessagePageChange"
                                @current-change="onMessagePageChange" />
                        </div>
                    </el-tab-pane>

                    <!-- ========================================== -->
                    <!-- Tab 2: 复活消息 -->
                    <!-- ========================================== -->
                    <el-tab-pane label="复活消息" name="repeat">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-weight:bold;font-size:13px;">复活消息 ({{ repeatTotal }})</span>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <el-select v-model="repeatFilterStatus" placeholder="全部状态" clearable size="small"
                                    style="width:100px" @change="fetchRepeatMessages">
                                    <el-option label="全部" value="" />
                                    <el-option label="已发送" value="sent" />
                                    <el-option label="已送达" value="delivered" />
                                    <el-option label="已读" value="read" />
                                    <el-option label="失败" value="failed" />
                                </el-select>
                            </div>
                        </div>

                        <div class="message-list" style="max-height:350px;overflow-y:auto;">
                            <div v-if="!repeatMessages || repeatMessages.length === 0"
                                style="text-align:center;color:#999;padding:20px;font-size:13px;">
                                暂无复活消息
                            </div>
                            <div v-for="msg in (repeatMessages || [])" :key="msg.id" style="margin-bottom:6px;">
                                <div
                                    style="padding:6px 10px;border-radius:4px;background:#f5f7fa;box-shadow:0 1px 2px rgba(0,0,0,0.06);border-left:3px solid #e6a23c;">
                                    <div
                                        style="display:flex;align-items:center;gap:6px;font-size:12px;color:#999;flex-wrap:wrap;">
                                        <span style="font-weight:600;color:#333;">{{ msg.fromAccount }}</span>
                                        <span>→</span>
                                        <span>{{ msg.toAccount }}</span>
                                        <el-tag type="warning" size="small"
                                            style="font-size:10px;padding:0 6px;">复活</el-tag>
                                        <el-tag :type="getMessageStatusType(msg.status)" size="small"
                                            style="font-size:10px;padding:0 6px;">
                                            {{ getMessageStatusLabel(msg.status) }}
                                        </el-tag>
                                        <span style="font-size:11px;color:#bbb;margin-left:auto;">{{
                                            formatTime(msg.sentAt)
                                            }}</span>
                                    </div>
                                    <div style="font-size:13px;color:#333;word-wrap:break-word;padding:2px 0;">
                                        {{ msg.content }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 复活消息分页 -->
                        <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                            <el-pagination v-model:current-page="repeatPage" v-model:page-size="repeatPageSize"
                                :page-sizes="[10, 20, 50, 100]" :total="repeatTotal"
                                layout="total, sizes, prev, pager, next" small @size-change="fetchRepeatMessages"
                                @current-change="fetchRepeatMessages" />
                        </div>
                    </el-tab-pane>
                </el-tabs>
            </div>

            <template #footer>
                <el-button @click="showDetailDialog = false">关闭</el-button>
                <el-button type="primary" @click="refreshDetail">刷新</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import nurtureApi from '@/api/nurture'
import api from '@/api'
import dayjs from 'dayjs'

// ============ 状态 ============
const tasks = ref([])
const accountGroups = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const creating = ref(false)
const pairStats = ref({})

const showCreateDialog = ref(false)
const createForm = reactive({
    name: '',
    nurtureGroups: [],
    newGroups: [],
    language: 'zh',
    initiateRate: 60,
    replyRate: 80,
    minDelay: 5,
    maxDelay: 30,
    minRounds: 8,
    maxRounds: 12,
    maxConcurrent: 3,
    nurtureCooldownMin: 60,
    nurtureCooldownMax: 80,
    newCooldownMin: 10,
    newCooldownMax: 20,
})

// 详情
const showDetailDialog = ref(false)
const detailTask = ref(null)
const detailLoading = ref(false)
const sessions = ref([])
const detailMessages = ref([])
const detailTimer = ref(null)

// 会话分页
const sessionPage = ref(1)
const sessionPageSize = ref(20)
const sessionTotal = ref(0)
const sessionFilterStatus = ref('')

// ✅ 会话搜索
const searchNurtureAcc = ref('')
const searchNewAcc = ref('')

// 会话统计（后端返回）
const sessionStats = ref({
    active: 0,
    completed: 0,
    failed: 0
})
const activeTab = ref('session')
const repeatMessages = ref([])  // ← 确保是数组
const repeatTotal = ref(0)
const repeatPage = ref(1)
const repeatPageSize = ref(20)
const repeatFilterStatus = ref('')
const fetchRepeatMessages = async () => {
    if (!detailTask.value) return
    try {
        const params = {
            page: repeatPage.value,
            page_size: repeatPageSize.value,
        }
        if (repeatFilterStatus.value) {
            params.status = repeatFilterStatus.value
        }
        const res = await api.get(`/nurture/tasks/repeat/${detailTask.value.id}`, { params })
        if (res.code === 0) {
            repeatMessages.value = res.data.data || []
            repeatTotal.value = res.data.total || 0
        }
    } catch (error) {
        console.error('获取复活消息失败:', error)
    }
}
// 消息分页
const messagePage = ref(1)
const messagePageSize = ref(20)
const messageTotal = ref(0)
const messageFilterStatus = ref('')

// ============ 计算属性 ============
const simulatedCount = computed(() => detailMessages.value.filter(m => m.isSimulated).length)
const msgFailedCount = computed(() => {
    return detailMessages.value.filter(m => m.status === 'failed' || m.errorMsg !== '').length
})

// ============ 状态映射 ============
const statusMap = {
    pending: '待执行',
    running: '执行中',
    paused: '已暂停',
    completed: '已完成',
    stopped: '已停止'
}

const statusTypeMap = {
    pending: 'info',
    running: 'warning',
    paused: 'warning',
    completed: 'success',
    stopped: 'danger'
}

const getStatusLabel = (status) => statusMap[status] || status
const getStatusType = (status) => statusTypeMap[status] || 'info'
const formatTime = (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'

const getMessageStatusType = (status) => {
    const map = { sent: 'info', delivered: 'success', read: 'success', failed: 'danger' }
    return map[status] || 'info'
}

const getMessageStatusLabel = (status) => {
    const map = { sent: '已发送', delivered: '已送达', read: '已读', failed: '失败' }
    return map[status] || status
}

// ============ 冷却状态 ============
const isCooldownActive = (cooldownAt) => {
    if (!cooldownAt) return false
    return new Date() < new Date(cooldownAt)
}

const formatCooldown = (cooldownAt) => {
    if (!cooldownAt) return '已冷却'
    const remaining = new Date(cooldownAt) - new Date()
    if (remaining <= 0) return '已冷却'
    const minutes = Math.ceil(remaining / 60000)
    return `${minutes}分钟`
}

// ============ 进度 ============
const getProgress = (row) => {
    // ✅ 基于配对完成率
    const pairStats = row.pairStats || {}
    const total = pairStats.total || 0
    const completed = pairStats.completed || 0
    const banned = pairStats.banned || 0
    if (total === 0) return 0
    // 完成 + 封禁 = 已结束的配对
    return Math.round(((completed + banned) / total) * 100)
}

const getProgressColor = (row) => {
    const p = getProgress(row)
    if (p === 100) return '#67c23a'
    if (p > 50) return '#409eff'
    return '#e6a23c'
}

// ============ 数据获取 ============
const fetchAccountGroups = async () => {
    try {
        const res = await api.get('/whatsapp/accounts/groups')
        if (res.code === 0) accountGroups.value = res.data || []
    } catch (error) { }
}

const fetchTasks = async () => {
    loading.value = true
    try {
        const params = { page: page.value, page_size: pageSize.value }
        if (filterStatus.value) params.status = filterStatus.value
        const res = await nurtureApi.getTasks(params)
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
    if (createForm.nurtureGroups.length === 0) {
        ElMessage.warning('请选择养号分组')
        return
    }
    if (createForm.newGroups.length === 0) {
        ElMessage.warning('请选择新号分组')
        return
    }
    if (createForm.minDelay > createForm.maxDelay) { ElMessage.warning('最小间隔不能大于最大间隔'); return }
    if (createForm.minRounds > createForm.maxRounds) { ElMessage.warning('最少轮数不能大于最多轮数'); return }
    if (createForm.nurtureCooldownMin > createForm.nurtureCooldownMax) { ElMessage.warning('养号最小冷却不能大于最大冷却'); return }
    if (createForm.newCooldownMin > createForm.newCooldownMax) { ElMessage.warning('新号最小冷却不能大于最大冷却'); return }

    creating.value = true
    try {
        const res = await nurtureApi.createTask(createForm)
        if (res.code === 0) {
            ElMessage.success('任务创建成功')
            showCreateDialog.value = false
            createForm.name = ''
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
        const res = await nurtureApi.startTask(row.id)
        if (res.code === 0) { ElMessage.success('任务已启动'); fetchTasks() }
    } catch (error) {
        if (error !== 'cancel') ElMessage.error('启动失败')
    }
}

const handlePause = async (row) => {
    try {
        await ElMessageBox.confirm(`确定要暂停任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
        const res = await nurtureApi.pauseTask(row.id)
        if (res.code === 0) { ElMessage.success('任务已暂停'); fetchTasks() }
    } catch (error) {
        if (error !== 'cancel') ElMessage.error('暂停失败')
    }
}

const handleResume = async (row) => {
    try {
        await ElMessageBox.confirm(`确定要恢复任务 "${row.name}" 吗？`, '提示', { type: 'info' })
        const res = await nurtureApi.resumeTask(row.id)
        if (res.code === 0) { ElMessage.success('任务已恢复'); fetchTasks() }
    } catch (error) {
        if (error !== 'cancel') ElMessage.error('恢复失败')
    }
}

const handleDelete = async (row) => {
    try {
        await ElMessageBox.confirm(`确定要删除任务 "${row.name}" 吗？`, '提示', { type: 'warning' })
        const res = await nurtureApi.deleteTask(row.id)
        if (res.code === 0) { ElMessage.success('删除成功'); fetchTasks() }
    } catch (error) {
        if (error !== 'cancel') ElMessage.error('删除失败')
    }
}

// ============ 任务详情 ============

// 获取任务详情
const fetchTaskDetail = async () => {
    if (!detailTask.value) return

    try {
        const params = {
            page: messagePage.value,
            page_size: messagePageSize.value,
            session_page: sessionPage.value,
            session_page_size: sessionPageSize.value,
            repeat_page: repeatPage.value,
            repeat_page_size: repeatPageSize.value,
        }
        if (messageFilterStatus.value) {
            params.status = messageFilterStatus.value
        }
        if (sessionFilterStatus.value) {
            params.session_status = sessionFilterStatus.value
        }
        if (searchNurtureAcc.value) {
            params.nurture_acc = searchNurtureAcc.value
        }
        if (searchNewAcc.value) {
            params.new_acc = searchNewAcc.value
        }

        const res = await api.get(`/nurture/tasks/detail/${detailTask.value.id}`, { params })
        if (res.code === 0) {
            detailTask.value = res.data.task
            sessions.value = res.data.sessions || []
            sessionTotal.value = res.data.session_total || 0
            sessionStats.value = res.data.session_stats || { active: 0, completed: 0, failed: 0 }
            detailMessages.value = res.data.messages || []
            messageTotal.value = res.data.total || 0
            repeatMessages.value = res.data.repeat_messages || []
            repeatTotal.value = res.data.repeat_total || 0
            // ✅ 接收配对统计
            pairStats.value = res.data.pair_stats || {}
        }
    } catch (error) {
        console.error('获取详情失败:', error)
    }
}

// 会话分页变化
const onSessionPageChange = () => {
    fetchTaskDetail()
}

// 会话状态过滤变化
const onSessionFilterChange = () => {
    sessionPage.value = 1
    fetchTaskDetail()
}

// 消息分页变化
const onMessagePageChange = () => {
    fetchTaskDetail()
}

// 消息状态过滤变化
const onMessageFilterChange = () => {
    messagePage.value = 1
    fetchTaskDetail()
}

// ✅ 搜索
const onSearch = () => {
    sessionPage.value = 1
    fetchTaskDetail()
}

// ✅ 重置搜索
const onResetSearch = () => {
    searchNurtureAcc.value = ''
    searchNewAcc.value = ''
    sessionPage.value = 1
    fetchTaskDetail()
}

// 显示任务详情
const showTaskDetail = async (row) => {
    showDetailDialog.value = true
    detailLoading.value = true
    detailTask.value = row

    // 重置所有分页
    messagePage.value = 1
    messagePageSize.value = 20
    messageTotal.value = 0
    messageFilterStatus.value = ''

    sessionPage.value = 1
    sessionPageSize.value = 20
    sessionTotal.value = 0
    sessionFilterStatus.value = ''
    sessionStats.value = { active: 0, completed: 0, failed: 0 }

    // 重置复活消息
    repeatMessages.value = []
    repeatTotal.value = 0
    repeatPage.value = 1
    repeatPageSize.value = 20
    // ✅ 重置搜索
    searchNurtureAcc.value = ''
    searchNewAcc.value = ''

    sessions.value = []
    detailMessages.value = []

    try {
        await fetchTaskDetail()
        await nextTick()
    } catch (error) {
        ElMessage.error('获取任务详情失败')
    } finally {
        detailLoading.value = false
    }

    // 定时刷新
    if (detailTimer.value) clearInterval(detailTimer.value)
    detailTimer.value = setInterval(() => {
        if (showDetailDialog.value && detailTask.value) {
            fetchTaskDetail()
        }
    }, 5000)
}

// 关闭详情
const closeDetail = () => {
    if (detailTimer.value) {
        clearInterval(detailTimer.value)
        detailTimer.value = null
    }
}

// 手动刷新详情
const refreshDetail = () => {
    if (detailTask.value) {
        fetchTaskDetail()
    }
}

// ============ 生命周期 ============
onMounted(() => {
    fetchAccountGroups()
    fetchTasks()
})

onBeforeUnmount(() => {
    if (detailTimer.value) {
        clearInterval(detailTimer.value)
        detailTimer.value = null
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

.create-nurture-dialog :deep(.el-dialog__body) {
    max-height: 65vh;
    overflow-y: auto;
}

.form-section {
    margin-bottom: 24px;
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
</style>