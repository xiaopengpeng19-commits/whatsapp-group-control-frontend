<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import api from '@/api'

const stats = ref([
  { title: '总账号', value: 0, icon: Iphone, color: '#409eff' },
  { title: '在线账号', value: 0, icon: DataLine, color: '#67c23a' },
  { title: '离线账号', value: 0, icon: SwitchButton, color: '#909399' },
  { title: '封禁账号', value: 0, icon: Warning, color: '#f56c6c' }
])

// 最近消息
// 账号状态 - 这个要保留（展示具体账号列表）

const fetchStats = async () => {
  try {
    const res = await api.get('/dashboard/stats')
    if (res.code === 0) {
      stats.value[0].value = res.data.total || 0
      stats.value[1].value = res.data.online || 0
      stats.value[2].value = res.data.offline || 0
      stats.value[3].value = res.data.banned || 0
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

onMounted(() => {
  fetchStats()
})
</script>