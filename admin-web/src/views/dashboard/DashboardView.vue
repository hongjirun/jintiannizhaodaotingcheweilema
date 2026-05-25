<template>
  <div>
    <a-row :gutter="16" style="margin-bottom:16px">
      <a-col :span="8">
        <a-card>
          <a-statistic title="停车场总数" :value="stats.total" suffix="个">
            <template #prefix><EnvironmentOutlined style="color:#1890ff" /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card>
          <a-statistic title="覆盖城市" :value="stats.cityCount" suffix="个">
            <template #prefix><GlobalOutlined style="color:#52c41a" /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card>
          <a-statistic title="数据来源" value="腾讯POI + 手动录入">
            <template #prefix><DatabaseOutlined style="color:#faad14" /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="城市数据分布 TOP20">
      <a-table
        :dataSource="stats.cityStats"
        :columns="cityColumns"
        :pagination="false"
        rowKey="city"
        size="small"
        :loading="loading"
      />
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { EnvironmentOutlined, GlobalOutlined, DatabaseOutlined } from '@ant-design/icons-vue'
import { parkingApi } from '@/api/parking'

const loading = ref(false)
const rawStats = ref({ total: 0, cityStats: [] })

const stats = computed(() => ({
  total: rawStats.value.total,
  cityCount: rawStats.value.cityStats?.length || 0,
  cityStats: rawStats.value.cityStats || [],
}))

const cityColumns = [
  { title: '城市', dataIndex: 'city', key: 'city' },
  { title: '停车场数量', dataIndex: 'count', key: 'count', align: 'right' },
]

onMounted(async () => {
  loading.value = true
  try {
    const res = await parkingApi.stats()
    if (res.code === 0) rawStats.value = res.data
  } finally {
    loading.value = false
  }
})
</script>
