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
            <el-table-column prop="name" label="任务名称" width="100" />
            <el-table-column label="分组" width="140">
                <template #default="{ row }">
                    <el-tag size="small" type="success">{{ row.nurtureGroup }}</el-tag>
                    <el-tag size="small" type="warning" style="margin-left:4px;">{{ row.newGroup }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="配对" width="260">
                <template #default="{ row }">
                    总 <el-tag size="small" type="info">{{ row.pairStats?.total || 0 }}</el-tag>
                    剩 <el-tag size="small" type="warning">{{ row.pairStats?.remaining || 0 }}</el-tag>
                    完 <el-tag size="small" type="success">{{ row.pairStats?.completed || 0 }}</el-tag>
                    封 <el-tag size="small" type="danger">{{ row.pairStats?.banned || 0 }}</el-tag>
                    跑 <el-tag size="small" type="primary">{{ row.pairStats?.running || 0 }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="轮数" width="70">
                <template #default="{ row }">
                    <span style="font-size:13px;">{{ row.minRounds || 2 }}-{{ row.maxRounds || 6 }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="replyRate" label="回复率" width="70" align="center">
                <template #default="{ row }">{{ row.replyRate || 80 }}%</template>
            </el-table-column>
            <el-table-column label="进度" width="120">
                <template #default="{ row }">
                    <el-progress :percentage="getProgress(row)" :color="getProgressColor(row)" :stroke-width="6" />
                </template>
            </el-table-column>
            <el-table-column label="会话消息" width="85" align="center">
                <template #default="{ row }">{{ row.totalMessages || 0 }}</template>
            </el-table-column>
            <el-table-column label="复活消息" width="85" align="center">
                <template #default="{ row }">{{ row.repeatMessages || 0 }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                    <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="140">
                <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
                <template #default="{ row }">
                    <el-button size="small" type="primary" @click="showTaskDetail(row)">详情</el-button>
                    <el-button v-if="row.status === 'pending'" size="small" type="success"
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
                <div class="form-section">
                    <div class="section-title"><span class="section-line"></span>基本信息</div>
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

                <div class="form-section">
                    <div class="section-title"><span class="section-line"></span>对话参数</div>
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
                            <el-input-number v-model="createForm.minDelay" :min="1" :max="999" size="large"
                                style="width:130px;" />
                            <span class="range-sep">~</span>
                            <el-input-number v-model="createForm.maxDelay" :min="2" :max="999" size="large"
                                style="width:130px;" />
                            <span class="range-unit">秒</span>
                        </div>
                    </el-form-item>
                    <el-form-item label="对话轮数">
                        <div class="range-wrapper">
                            <el-input-number v-model="createForm.minRounds" :min="1" :max="999" size="large"
                                style="width:130px;" />
                            <span class="range-sep">~</span>
                            <el-input-number v-model="createForm.maxRounds" :min="2" :max="999" size="large"
                                style="width:130px;" />
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
                <div class="form-section">
                    <div class="section-title"><span class="section-line"></span>第一轮破冰配置</div>

                    <el-form-item label="首轮发送消息数">
                        <el-input-number v-model="createForm.firstRoundMsgCount" :min="1" :max="10" size="large" />
                        <span class="range-unit">条（连续发送）</span>
                    </el-form-item>

                    <el-form-item label="首轮消息间隔">
                        <el-input-number v-model="createForm.firstRoundMsgInterval" :min="1" :max="999" size="large" />
                        <span class="range-unit">秒</span>
                        <div class="form-tip">连续发送多条消息时，每条之间的间隔</div>
                    </el-form-item>

                    <el-form-item label="等待回复间隔">
                        <el-input-number v-model="createForm.firstRoundWaitInterval" :min="1" :max="999" size="large" />
                        <span class="range-unit">分钟</span>
                        <div class="form-tip">A发完第一轮全部消息后，等待多久让B回复（建议10-15分钟）</div>
                    </el-form-item>
                </div>
                <div class="form-section">
                    <div class="section-title"><span class="section-line"></span>配对冷却</div>
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
                        <el-tag :type="getStatusType(detailTask.status)" size="small">{{
                            getStatusLabel(detailTask.status)
                        }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="发起概率">{{ detailTask.initiateRate || 60 }}%</el-descriptions-item>
                    <el-descriptions-item label="回复概率">{{ detailTask.replyRate || 80 }}%</el-descriptions-item>
                    <el-descriptions-item label="消息间隔">{{ detailTask.minDelay || 3 }}~{{ detailTask.maxDelay || 30
                    }}s</el-descriptions-item>
                    <el-descriptions-item label="轮数">{{ detailTask.minRounds || 2 }}~{{ detailTask.maxRounds || 6
                    }}</el-descriptions-item>
                    <el-descriptions-item label="养号冷却">{{ detailTask.nurtureCooldownMin || 30 }}~{{
                        detailTask.nurtureCooldownMax || 45 }}分钟</el-descriptions-item>
                    <el-descriptions-item label="新号冷却">
                        <span>{{ detailTask.newCooldownMin || 60 }}~{{ detailTask.newCooldownMax || 90 }}分钟</span>
                        <el-button size="small" type="primary" link style="margin-left:8px;"
                            @click="openEditNewCooldown">修改</el-button>
                    </el-descriptions-item>
                    <el-descriptions-item label="总配对数">{{ detailTask.totalPairs || 0 }}</el-descriptions-item>
                    <el-descriptions-item label="总消息">{{ detailTask.totalMessages || 0 }}</el-descriptions-item>
                    <el-descriptions-item label="活跃会话">{{ detailTask.activeSessions || 0 }}</el-descriptions-item>
                    <el-descriptions-item label="最大并发">
                        <span>{{ detailTask.maxConcurrent || 3 }}</span>
                        <el-button size="small" type="primary" link style="margin-left:8px;"
                            @click="openEditMaxConcurrent">修改</el-button>
                    </el-descriptions-item>
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
                        <el-tag type="danger" size="small">{{ bannedCount || 0 }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="创建时间">{{ formatTime(detailTask.createdAt) }}</el-descriptions-item>
                    <el-descriptions-item label="启动时间">{{ formatTime(detailTask.startedAt) }}</el-descriptions-item>
                    <el-descriptions-item label="完成时间" v-if="detailTask.completedAt">{{
                        formatTime(detailTask.completedAt)
                    }}</el-descriptions-item>
                    <el-descriptions-item label="完成时间" v-else>-</el-descriptions-item>
                </el-descriptions>

                <!-- 进行中配对 -->
                <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-weight:bold;font-size:13px;">进行中配对 ({{ runningPairs.length }})</span>
                    </div>
                    <div
                        style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#f5f7fa;border-radius:4px;max-height:60px;overflow:hidden;">
                        <template v-for="pair in runningPairs" :key="pair.nurtureAcc + pair.newAcc">
                            <el-tag size="small" type="warning" style="margin:2px;">
                                {{ pair.nurtureAcc }} ↔ {{ pair.newAcc }}
                            </el-tag>
                        </template>
                        <span v-if="runningPairs.length === 0" style="color:#999;font-size:13px;">暂无进行中的配对</span>
                    </div>
                </div>
                <!-- ✅ 配对进度统计 -->
                <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-weight:bold;font-size:13px;">配对进度 (已完成 / 总分配)</span>
                    </div>

                    <div style="display:flex;gap:12px;">
                        <!-- 左侧：养号账号 -->
                        <div style="flex:1; background:#f5f7fa; padding:10px; border-radius:4px;">
                            <div style="font-size:12px; color:#666; margin-bottom:8px; font-weight:bold;">🟡 养号账号
                                <span style="color:#409eff; font-weight:normal; margin-left:4px;">
                                    ({{ detailTask.nurtureGroup || '未分组' }})
                                </span>
                            </div>
                            <div style="display:flex; flex-wrap:wrap; gap:4px; max-height:160px; overflow-y:auto;">
                                <template v-for="acc in detailTask.nurtureAccounts" :key="'nurture-' + acc">
                                    <!-- ✅ 优先判断未登录为 danger(红) -->
                                    <el-tag size="small"
                                        :type="isAccountBanned(acc) ? 'danger' : ((accountPairStats[acc]?.completed || 0) === (accountPairStats[acc]?.total || 0) ? 'success' : 'warning')"
                                        style="margin:2px;">
                                        {{ acc }}:
                                        <strong>{{ accountPairStats[acc]?.completed || 0 }}</strong> / {{
                                            accountPairStats[acc]?.total || 0 }}
                                    </el-tag>
                                </template>
                                <span v-if="!detailTask.nurtureAccounts || detailTask.nurtureAccounts.length === 0"
                                    style="color:#999;font-size:12px;">无</span>
                            </div>
                        </div>

                        <!-- 右侧：新号 -->
                        <div style="flex:1; background:#f5f7fa; padding:10px; border-radius:4px;">
                            <div style="font-size:12px; color:#666; margin-bottom:8px; font-weight:bold;">🔵 新号
                                <span style="color:#409eff; font-weight:normal; margin-left:4px;">
                                    ({{ detailTask.newGroup || '未分组' }})
                                </span>
                            </div>
                            <div style="display:flex; flex-wrap:wrap; gap:4px; max-height:160px; overflow-y:auto;">
                                <template v-for="acc in detailTask.newAccounts" :key="'new-' + acc">
                                    <!-- ✅ 优先判断未登录为 danger(红) -->
                                    <el-tag size="small"
                                        :type="isAccountBanned(acc) ? 'danger' : ((accountPairStats[acc]?.completed || 0) === (accountPairStats[acc]?.total || 0) ? 'success' : 'info')"
                                        style="margin:2px;">
                                        {{ acc }}:
                                        <strong>{{ accountPairStats[acc]?.completed || 0 }}</strong> / {{
                                            accountPairStats[acc]?.total || 0 }}
                                    </el-tag>
                                </template>
                                <span v-if="!detailTask.newAccounts || detailTask.newAccounts.length === 0"
                                    style="color:#999;font-size:12px;">无</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 会话列表 -->
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
                            <el-tag v-if="sessionStats.completed > 0" type="success" size="small">已完成 {{
                                sessionStats.completed
                            }}</el-tag>
                            <el-tag v-if="sessionStats.failed > 0" type="danger" size="small">失败 {{ sessionStats.failed
                            }}</el-tag>
                            <el-tag v-if="sessionStats.active > 0" type="warning" size="small">进行中 {{
                                sessionStats.active
                            }}</el-tag>
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
                        <el-input v-model="searchNurtureAcc" placeholder="养号号码" clearable style="width:150px"
                            size="small" @keyup.enter="onSearch" />
                        <el-input v-model="searchNewAcc" placeholder="新号号码" clearable style="width:150px" size="small"
                            @keyup.enter="onSearch" />
                        <el-button type="primary" size="small" @click="onSearch">搜索</el-button>
                        <el-button size="small" @click="onResetSearch">重置</el-button>
                    </div>

                    <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                        <el-button :type="sessionFilterStatus === '' ? 'primary' : ''" size="small"
                            @click="sessionFilterStatus = ''; onSessionFilterChange()">全部</el-button>
                        <el-button :type="sessionFilterStatus === 'active' ? 'primary' : ''" size="small"
                            @click="sessionFilterStatus = 'active'; onSessionFilterChange()">进行中</el-button>
                        <el-button :type="sessionFilterStatus === 'completed' ? 'primary' : ''" size="small"
                            @click="sessionFilterStatus = 'completed'; onSessionFilterChange()">已完成</el-button>
                        <el-button :type="sessionFilterStatus === 'failed' ? 'primary' : ''" size="small"
                            @click="sessionFilterStatus = 'failed'; onSessionFilterChange()">失败</el-button>
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
                            <template #default="{ row }">{{ row.rounds }}/{{ row.maxRounds }}</template>
                        </el-table-column>
                        <el-table-column prop="chatCount" label="消息数" width="80" align="center" />
                        <el-table-column prop="lastTime" label="最后活跃" width="160">
                            <template #default="{ row }">{{ formatTime(row.lastTime) }}</template>
                        </el-table-column>
                        <el-table-column prop="startedAt" label="开始时间" width="160">
                            <template #default="{ row }">{{ formatTime(row.startedAt) }}</template>
                        </el-table-column>
                        <el-table-column prop="endReason" label="结束原因" min-width="120" show-overflow-tooltip>
                            <template #default="{ row }">
                                <span v-if="row.endReason"
                                    :style="{ color: row.status === 'completed' ? '#67c23a' : '#f56c6c', fontSize: '12px' }">{{
                                        row.endReason }}</span>
                                <span v-else style="color:#999;font-size:12px;">-</span>
                            </template>
                        </el-table-column>
                    </el-table>

                    <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                        <el-pagination v-model:current-page="sessionPage" v-model:page-size="sessionPageSize"
                            :page-sizes="[10, 20, 50, 100]" :total="sessionTotal"
                            layout="total, sizes, prev, pager, next" size="small" @size-change="onSessionPageChange"
                            @current-change="onSessionPageChange" />
                    </div>
                </div>

                <!-- 消息记录 -->
                <el-tabs v-model="activeTab" style="margin-top:12px;">
                    <el-tab-pane label="会话消息" name="session">
                        <div style="display:flex; height: 500px; border: 1px solid #ebeef5;">
                            <!-- 左侧：会话列表 -->
                            <div
                                style="width: 350px; border-right: 1px solid #ebeef5; background: #fff; display: flex; flex-direction: column;">
                                <div style="flex: 1; overflow-y: auto; background: #fafafa;">
                                    <div v-for="item in sessionList" :key="item.session.id"
                                        @click="selectSession(item.session)"
                                        :style="{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #ebeef5', background: currentSessionId === item.session.id ? '#e6f2ff' : '' }">
                                        <div
                                            style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 13px; margin-bottom: 6px;">
                                            <span
                                                style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; margin-right: 8px;"
                                                :title="`${item.session.nurtureAcc} ↔ ${item.session.newAcc}`">
                                                {{ item.session.nurtureAcc }} <span style="color:#409eff;">↔</span> {{
                                                    item.session.newAcc }}
                                            </span>
                                            <el-tag size="small" style="flex-shrink: 0;"
                                                :type="item.session.status === 'completed' ? 'success' : item.session.status === 'failed' ? 'danger' : 'warning'">
                                                {{ item.session.status === 'completed' ? '完成' : item.session.status ===
                                                    'failed'
                                                    ? '失败' : '进行中' }}
                                            </el-tag>
                                        </div>
                                        <div
                                            style="font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            {{ item.last_msg ? item.last_msg.content : '暂无消息' }}
                                        </div>
                                    </div>
                                    <div v-if="sessionList.length === 0"
                                        style="text-align:center; padding:20px; color:#999;">
                                        暂无会话记录</div>
                                </div>
                                <div
                                    style="height: 45px; border-top: 1px solid #ebeef5; background: #fff; display: flex; justify-content: center; align-items: center;">
                                    <el-pagination v-model:current-page="sessionListPage"
                                        :page-size="sessionListPageSize" :total="sessionListTotal"
                                        layout="prev, pager, next" size="small" background
                                        @current-change="handleSessionPageChange" />
                                </div>
                            </div>

                            <!-- 右侧：聊天内容 -->
                            <div style="flex:1; display:flex; flex-direction:column;">
                                <div
                                    style="padding:10px; border-bottom:1px solid #ebeef5; background:#fff; font-weight:bold;">
                                    {{ currentSessionInfo ? `${currentSessionInfo.nurtureAcc} ↔
                                    ${currentSessionInfo.newAcc}` :
                                        '请选择左侧会话' }}
                                </div>
                                <div style="flex:1; overflow-y: auto; padding:15px; background:#f5f7fa;">
                                    <div v-if="!currentSessionId"
                                        style="text-align:center; margin-top:100px; color:#999;">
                                        选择会话后查看聊天记录</div>
                                    <div v-for="msg in detailMessages" :key="msg.id" style="margin-bottom:20px;">
                                        <div v-if="msg.isSimulated"
                                            style="text-align:center; font-size:12px; color:#999; margin-bottom:10px;">
                                            -- {{
                                                msg.fromAccount }} 发送了模拟消息 --</div>
                                        <div v-else
                                            :style="{ display: 'flex', flexDirection: 'column', alignItems: msg.fromAccount === currentSessionInfo?.nurtureAcc ? 'flex-end' : 'flex-start' }">
                                            <div style="font-size:12px; color:#999; margin-bottom:4px; padding: 0 4px;">
                                                <span v-if="msg.fromAccount === currentSessionInfo?.nurtureAcc">我 ({{
                                                    msg.fromAccount }})</span>
                                                <span v-else>{{ msg.fromAccount }}</span>
                                                <span style="margin-left: 8px;">{{ formatTime(msg.sentAt).slice(11, 16)
                                                }}</span>
                                                <el-tag size="small"
                                                    style="margin-left: 4px; padding: 0 4px; height: 18px; line-height: 16px;"
                                                    :type="msg.status === 'read' ? 'success' : 'info'">
                                                    {{ msg.status === 'read' ? '已读' : msg.status === 'delivered' ? '已送达'
                                                        : '已发送'
                                                    }}
                                                </el-tag>
                                                <span style="margin-left: 8px; font-weight:bold;">[{{ msg.round
                                                }}轮]</span>
                                            </div>
                                            <div :style="{
                                                maxWidth: '70%', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word',
                                                background: msg.fromAccount === currentSessionInfo?.nurtureAcc ? '#95ec69' : '#ffffff', color: '#333',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)', border: msg.fromAccount === currentSessionInfo?.nurtureAcc ? 'none' : '1px solid #ebeef5'
                                            }">
                                                {{ msg.content }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </el-tab-pane>

                    <!-- Tab 2: 复活消息 -->
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
                                style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无复活消息</div>
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
                                            style="font-size:10px;padding:0 6px;">{{ getMessageStatusLabel(msg.status)
                                            }}</el-tag>
                                        <span style="font-size:11px;color:#bbb;margin-left:auto;">{{
                                            formatTime(msg.sentAt)
                                        }}</span>
                                    </div>
                                    <div style="font-size:13px;color:#333;word-wrap:break-word;padding:2px 0;">{{
                                        msg.content }}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                            <el-pagination v-model:current-page="repeatPage" v-model:page-size="repeatPageSize"
                                :page-sizes="[10, 20, 50, 100]" :total="repeatTotal"
                                layout="total, sizes, prev, pager, next" size="small" @size-change="fetchRepeatMessages"
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
        <!-- 修改新号冷却弹窗 -->
        <el-dialog v-model="showEditNewCooldownDialog" title="修改新号冷却" width="400px">
            <el-form label-width="120px">
                <el-form-item label="冷却时间">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <el-input-number v-model="editNewCooldownMin" :min="1" :max="9999" />
                        <span>~</span>
                        <el-input-number v-model="editNewCooldownMax" :min="1" :max="9999" />
                        <span>分钟</span>
                    </div>
                    <div style="font-size:12px;color:#999;margin-top:4px;">新号配对完成后的冷却时间，冷却期间不再参与配对</div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showEditNewCooldownDialog = false">取消</el-button>
                <el-button type="primary" @click="handleUpdateNewCooldown" :loading="updatingNewCooldown">确定</el-button>
            </template>
        </el-dialog>
        <!-- 修改最大并发弹窗 -->
        <el-dialog v-model="showEditMaxConcurrentDialog" title="修改最大并发" width="400px">
            <el-form label-width="120px">
                <el-form-item label="最大并发">
                    <el-input-number v-model="editMaxConcurrentValue" :min="1" :max="999" style="width:100%" />
                    <div style="font-size:12px;color:#999;margin-top:4px;">同时进行的会话数上限；调小后已进行的会话不受影响</div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showEditMaxConcurrentDialog = false">取消</el-button>
                <el-button type="primary" @click="handleUpdateMaxConcurrent"
                    :loading="updatingMaxConcurrent">确定</el-button>
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

const accountStatuses = ref({})
const sessionList = ref([])
const sessionListPage = ref(1)
const sessionListPageSize = ref(20)
const sessionListTotal = ref(0)
const currentSessionId = ref('')
const currentSessionInfo = ref(null)

// ✅ 新增：账号配对统计
const accountPairCounts = ref({})

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
    firstRoundMsgCount: 1,
    firstRoundMsgInterval: 5,
    firstRoundWaitInterval: 10,
})
// ✅ 判断账号是否未登录（封禁）
const isAccountBanned = (acc) => {
    // 如果后端明确返回了 false，说明掉线/封禁
    return accountStatuses.value[acc] === false
}
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
const sessionStats = ref({ active: 0, completed: 0, failed: 0 })
const activeTab = ref('session')
const repeatMessages = ref([])
const repeatTotal = ref(0)
const repeatPage = ref(1)
const repeatPageSize = ref(20)
const repeatFilterStatus = ref('')

// ✅ 修改最大并发
const showEditMaxConcurrentDialog = ref(false)
const editMaxConcurrentValue = ref(3)
const updatingMaxConcurrent = ref(false)


// ✅ 修改新号冷却
const showEditNewCooldownDialog = ref(false)
const editNewCooldownMin = ref(60)
const editNewCooldownMax = ref(90)
const updatingNewCooldown = ref(false)

const openEditNewCooldown = () => {
    if (!detailTask.value) return
    editNewCooldownMin.value = detailTask.value.newCooldownMin || 60
    editNewCooldownMax.value = detailTask.value.newCooldownMax || 90
    showEditNewCooldownDialog.value = true
}

const handleUpdateNewCooldown = async () => {
    if (!detailTask.value) return
    if (editNewCooldownMin.value > editNewCooldownMax.value) {
        ElMessage.warning('最小冷却不能大于最大冷却')
        return
    }

    updatingNewCooldown.value = true
    try {
        const res = await api.put(`/nurture/tasks/new-cooldown/${detailTask.value.id}`, {
            newCooldownMin: editNewCooldownMin.value,
            newCooldownMax: editNewCooldownMax.value
        })
        if (res.code === 0) {
            ElMessage.success('修改成功')
            showEditNewCooldownDialog.value = false
            detailTask.value.newCooldownMin = editNewCooldownMin.value
            detailTask.value.newCooldownMax = editNewCooldownMax.value
        } else {
            ElMessage.error(res.message || '修改失败')
        }
    } catch (error) {
        ElMessage.error('修改失败: ' + (error.message || ''))
    } finally {
        updatingNewCooldown.value = false
    }
}

// ============ 方法 ============
const openEditMaxConcurrent = () => {
    if (!detailTask.value) return
    editMaxConcurrentValue.value = detailTask.value.maxConcurrent || 3
    showEditMaxConcurrentDialog.value = true
}

const handleUpdateMaxConcurrent = async () => {
    if (!detailTask.value) return
    updatingMaxConcurrent.value = true
    try {
        const res = await api.put(`/nurture/tasks/max-concurrent/${detailTask.value.id}`, {
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

const fetchRepeatMessages = async () => {
    if (!detailTask.value) return
    try {
        const params = { page: repeatPage.value, page_size: repeatPageSize.value }
        if (repeatFilterStatus.value) params.status = repeatFilterStatus.value
        const res = await api.get(`/nurture/tasks/repeat/${detailTask.value.id}`, { params })
        if (res.code === 0) {
            repeatMessages.value = res.data.data || []
            repeatTotal.value = res.data.total || 0
        }
    } catch (error) {
        console.error('获取复活消息失败:', error)
    }
}

const messagePage = ref(1)
const messagePageSize = ref(20)
const messageTotal = ref(0)
const messageFilterStatus = ref('')

const simulatedCount = computed(() => detailMessages.value.filter(m => m.isSimulated).length)
const msgFailedCount = computed(() => detailMessages.value.filter(m => m.status === 'failed' || m.errorMsg !== '').length)

const statusMap = { pending: '待执行', running: '执行中', paused: '已暂停', completed: '已完成', stopped: '已停止' }
const statusTypeMap = { pending: 'info', running: 'warning', paused: 'warning', completed: 'success', stopped: 'danger' }

const runningPairs = computed(() => {
    if (!detailTask.value?.pairList) return []
    return detailTask.value.pairList.filter(p => p.status === 'running')
})

const bannedCount = computed(() => {
    let count = 0
    // 遍历所有账号的登录状态
    Object.values(accountStatuses.value).forEach(isLogin => {
        if (!isLogin) count++
    })
    return count
})

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

const isCooldownActive = (cooldownAt) => {
    if (!cooldownAt) return false
    return new Date() < new Date(cooldownAt)
}

const formatCooldown = (cooldownAt) => {
    if (!cooldownAt) return '已冷却'
    const remaining = new Date(cooldownAt) - new Date()
    if (remaining <= 0) return '已冷却'
    return `${Math.ceil(remaining / 60000)}分钟`
}

const getProgress = (row) => {
    const pairStats = row.pairStats || {}
    const total = pairStats.total || 0
    const completed = pairStats.completed || 0
    const banned = pairStats.banned || 0
    if (total === 0) return 0
    return Math.round(((completed + banned) / total) * 100)
}

const getProgressColor = (row) => {
    const p = getProgress(row)
    if (p === 100) return '#67c23a'
    if (p > 50) return '#409eff'
    return '#e6a23c'
}

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

const handleSessionPageChange = () => {
    currentSessionId.value = ''
    currentSessionInfo.value = null
    detailMessages.value = []
    messageTotal.value = 0
    if (detailTask.value) {
        fetchSessionList(detailTask.value.id)
    }
}

const handleCreate = async () => {
    if (!createForm.name) { ElMessage.warning('请输入任务名称'); return }
    if (createForm.nurtureGroups.length === 0) { ElMessage.warning('请选择养号分组'); return }
    if (createForm.newGroups.length === 0) { ElMessage.warning('请选择新号分组'); return }
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
const accountPairStats = ref({})
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

        if (currentSessionId.value) params.session_id = currentSessionId.value
        if (messageFilterStatus.value) params.status = messageFilterStatus.value
        if (sessionFilterStatus.value) params.session_status = sessionFilterStatus.value
        if (searchNurtureAcc.value) params.nurture_acc = searchNurtureAcc.value
        if (searchNewAcc.value) params.new_acc = searchNewAcc.value

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
            pairStats.value = res.data.pair_stats || {}

            // ✅ 赋值配对统计
            accountPairCounts.value = res.data.account_pair_counts || {}
            accountPairStats.value = res.data.account_pair_stats || {} // ✅ 接收
            accountStatuses.value = res.data.account_statuses || {} // ✅ 接收状态
        }
    } catch (error) {
        console.error('获取详情失败:', error)
    }
}

const onSessionPageChange = () => fetchTaskDetail()
const onSessionFilterChange = () => { sessionPage.value = 1; fetchTaskDetail() }
const onMessagePageChange = () => fetchTaskDetail()
const onMessageFilterChange = () => { messagePage.value = 1; fetchTaskDetail() }
const onSearch = () => { sessionPage.value = 1; fetchTaskDetail() }
const onResetSearch = () => {
    searchNurtureAcc.value = ''
    searchNewAcc.value = ''
    sessionPage.value = 1
    fetchTaskDetail()
}

const showTaskDetail = async (row) => {
    showDetailDialog.value = true
    detailLoading.value = true
    detailTask.value = row

    currentSessionId.value = ''
    currentSessionInfo.value = null
    detailMessages.value = []
    messageTotal.value = 0
    sessionListPage.value = 1
    sessionListTotal.value = 0
    sessionList.value = []

    if (detailTimer.value) {
        clearInterval(detailTimer.value)
        detailTimer.value = null
    }

    page.value = 1
    pageSize.value = 20
    sessionPage.value = 1
    sessionPageSize.value = 20
    repeatPage.value = 1
    repeatPageSize.value = 20

    try {
        await fetchSessionList(row.id)
        await fetchTaskDetail()
        await nextTick()
    } catch (error) {
        ElMessage.error('获取任务详情失败')
    } finally {
        detailLoading.value = false
    }

    detailTimer.value = setInterval(async () => {
        if (!showDetailDialog.value || !detailTask.value) return
        if (detailTask.value.status === 'completed' || detailTask.value.status === 'stopped') return

        try {
            if (currentSessionId.value) {
                await fetchTaskDetail()
            }
        } catch (e) { }
    }, 20000)
}

const fetchSessionList = async (taskId) => {
    try {
        const res = await api.get(`/nurture/tasks/sessions/${taskId}`, {
            params: { page: sessionListPage.value, page_size: sessionListPageSize.value }
        })
        if (res.code === 0) {
            sessionList.value = res.data.data || []
            sessionListTotal.value = res.data.total || 0
        }
    } catch (e) {
        console.error('获取会话列表失败', e)
    }
}

const selectSession = (session) => {
    currentSessionId.value = session.id
    currentSessionInfo.value = session
    messagePage.value = 1
    messageTotal.value = 0
    detailMessages.value = []
    fetchTaskDetail()
}

const closeDetail = () => {
    if (detailTimer.value) {
        clearInterval(detailTimer.value)
        detailTimer.value = null
    }
}

const refreshDetail = () => {
    if (detailTask.value) fetchTaskDetail()
}

onMounted(() => {
    fetchAccountGroups()
    fetchTasks()
})

onBeforeUnmount(() => {
    if (detailTimer.value) clearInterval(detailTimer.value)
})
</script>

<style scoped>
/* 样式保持不变，如果原文件有的话直接复用即可 */
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
    gap: 20px;
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