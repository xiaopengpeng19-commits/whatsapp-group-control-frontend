<!-- frontend/src/views/AutoReply.vue -->

<template>
    <div class="auto-reply">
        <el-card>
            <template #header>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span>🤖 私聊自动回复</span>
                    <el-tag :type="config.enabled ? 'success' : 'danger'" size="large">
                        {{ config.enabled ? '已启用' : '已停用' }}
                    </el-tag>
                </div>
            </template>

            <el-form :model="config" label-width="140px" label-position="right">

                <!-- 启用开关 -->
                <el-form-item label="启用自动回复">
                    <el-switch v-model="config.enabled" active-text="开启" inactive-text="关闭" />
                </el-form-item>

                <el-divider />

                <!-- 触发条件 -->
                <el-form-item label="触发消息数">
                    <el-input-number v-model="config.trigger_count" :min="1" :max="10" />
                    <span style="margin-left:10px;color:#999;">条消息后回复 1 次</span>
                    <div style="font-size:12px;color:#999;margin-top:4px;">
                        例如：设为2，对方发2条消息后触发1次回复
                    </div>
                </el-form-item>

                <el-form-item label="冷却时间">
                    <el-input-number v-model="config.cooldown_minutes" :min="1" :max="60" />
                    <span style="margin-left:10px;color:#999;">分钟</span>
                    <div style="font-size:12px;color:#999;margin-top:4px;">
                        同一发送者触发回复后，在此时间内不再回复
                    </div>
                </el-form-item>

                <el-divider />

                <!-- 延迟设置 -->
                <el-form-item label="回复延迟">
                    <el-input-number v-model="config.delay_min" :min="0" :max="10" style="width:100px;" />
                    <span style="margin:0 8px;color:#999;">~</span>
                    <el-input-number v-model="config.delay_max" :min="1" :max="30" style="width:100px;" />
                    <span style="margin-left:10px;color:#999;">秒</span>
                    <div style="font-size:12px;color:#999;margin-top:4px;">
                        发送回复前随机延迟，模拟真人打字
                    </div>
                </el-form-item>

                <el-divider />

                <!-- 回复消息 -->
                <el-form-item label="回复消息">
                    <el-input v-model="replyText" type="textarea" :rows="8" placeholder="每行一条回复消息" />
                    <div style="font-size:12px;color:#999;margin-top:4px;">
                        当前 {{ config.reply_messages.length }} 条消息，回复时随机选取一条
                    </div>
                    <div style="font-size:12px;color:#e6a23c;margin-top:4px;">
                        💡 建议使用礼貌的结束语，让对方自然结束对话
                    </div>
                </el-form-item>

                <el-divider />

                <!-- 黑名单 -->
                <el-form-item label="黑名单">
                    <el-input v-model="blacklistText" type="textarea" :rows="3" placeholder="每行一个手机号" />
                    <div style="font-size:12px;color:#999;margin-top:4px;">
                        黑名单中的发送者不会收到自动回复
                    </div>
                </el-form-item>

                <el-divider />

                <!-- 保存按钮 -->
                <el-form-item>
                    <el-button type="primary" @click="saveConfig" :loading="saving">
                        <el-icon>
                            <Check />
                        </el-icon> 保存配置
                    </el-button>
                    <el-button @click="loadConfig">
                        <el-icon>
                            <Refresh />
                        </el-icon> 刷新
                    </el-button>
                    <el-button type="danger" plain @click="resetDefault">
                        <el-icon>
                            <RefreshLeft />
                        </el-icon> 恢复默认
                    </el-button>
                </el-form-item>

            </el-form>
        </el-card>

        <!-- 使用说明 -->
        <el-card style="margin-top:20px;">
            <template #header>
                <span>📖 使用说明</span>
            </template>
            <div style="font-size:14px;color:#666;line-height:1.8;">
                <p><strong>触发逻辑：</strong></p>
                <ul>
                    <li>对方发送消息达到 <strong>{{ config.trigger_count }}</strong> 条后，自动回复 1 条</li>
                    <li>回复后计数重置，重新开始累计</li>
                    <li>冷却时间内（<strong>{{ config.cooldown_minutes }}</strong> 分钟）不再回复同一发送者</li>
                </ul>

                <p style="margin-top:12px;"><strong>示例场景：</strong></p>
                <ul>
                    <li>对方第1条消息 → 只记录，不回复</li>
                    <li>对方第2条消息 → 触发回复</li>
                    <li>回复后冷却 {{ config.cooldown_minutes }} 分钟</li>
                </ul>

                <p style="margin-top:12px;"><strong>适用场景：</strong></p>
                <ul>
                    <li>账号被非控用户私聊骚扰</li>
                    <li>希望快速结束对话，避免深入交流</li>
                    <li>降低账号被封风险</li>
                </ul>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Refresh, RefreshLeft } from '@element-plus/icons-vue'
import api from '@/api'

const saving = ref(false)

// 默认配置
const defaultConfig = {
    enabled: true,
    trigger_count: 2,
    cooldown_minutes: 10,
    reply_messages: [
        "Sorry, I'm busy right now.",
        "Can't talk now, later.",
        "In a meeting, talk later.",
        "Sorry, not available at the moment.",
        "Busy now, catch you later.",
        "Can't chat right now, sorry.",
        "Working, will get back to you.",
        "Sorry, I'll reply later.",
        "Not free now, talk soon.",
        "Busy, text you later."
    ],
    delay_min: 2,
    delay_max: 5,
    whitelist: [],
    blacklist: []
}

const config = reactive({ ...defaultConfig })

// 回复消息文本（textarea 绑定）
const replyText = computed({
    get: () => config.reply_messages.join('\n'),
    set: (val) => {
        config.reply_messages = val.split('\n').filter(s => s.trim() !== '')
        if (config.reply_messages.length === 0) {
            config.reply_messages = ['Sorry, busy now.']
        }
    }
})

// 黑名单文本
const blacklistText = computed({
    get: () => config.blacklist.join('\n'),
    set: (val) => {
        config.blacklist = val.split('\n').filter(s => s.trim() !== '')
    }
})

// 加载配置
const loadConfig = async () => {
    try {
        const res = await api.get('/auto-reply/config')
        if (res.code === 0) {
            const data = res.data
            Object.assign(config, data)
            // 确保回复消息不为空
            if (!config.reply_messages || config.reply_messages.length === 0) {
                config.reply_messages = defaultConfig.reply_messages
            }
        }
    } catch (error) {
        ElMessage.error('加载配置失败')
    }
}

// 保存配置
const saveConfig = async () => {
    saving.value = true
    try {
        const res = await api.put('/auto-reply/config', config)
        if (res.code === 0) {
            ElMessage.success('配置保存成功')
        } else {
            ElMessage.error(res.message || '保存失败')
        }
    } catch (error) {
        ElMessage.error('保存失败: ' + (error.message || ''))
    } finally {
        saving.value = false
    }
}

// 恢复默认
const resetDefault = () => {
    Object.assign(config, defaultConfig)
    ElMessage.success('已恢复默认配置，请点击保存生效')
}

onMounted(() => {
    loadConfig()
})
</script>

<style scoped>
.auto-reply {
    max-width: 800px;
}

.auto-reply :deep(.el-divider) {
    margin: 18px 0;
}

.auto-reply :deep(.el-form-item) {
    margin-bottom: 18px;
}
</style>