<template>
  <div>
    <!-- 工具栏 -->
    <a-card style="margin-bottom:16px">
      <a-row :gutter="12" align="middle">
        <a-col :flex="1">
          <a-space>
            <a-input
              v-model:value="query.keyword"
              placeholder="搜索停车场名称或地址"
              style="width:200px"
              allow-clear
              @press-enter="loadData"
            />
            <a-select v-model:value="query.status" style="width:120px" allow-clear placeholder="审核状态">
              <a-select-option :value="0">待审核</a-select-option>
              <a-select-option :value="1">已通过</a-select-option>
              <a-select-option :value="2">已拒绝</a-select-option>
            </a-select>
            <a-button type="primary" @click="loadData">查询</a-button>
            <a-button @click="resetQuery">重置</a-button>
          </a-space>
        </a-col>
        <a-col>
          <a-space>
            <!-- 功能开关控制 -->
            <a-switch 
              v-model:checked="reportEnabled" 
              checkedChildren="开启" 
              unCheckedChildren="关闭"
              @change="toggleReportEnabled"
              :loading="switchLoading"
            />
            <span style="margin-left:8px">上报功能</span>
          </a-space>
        </a-col>
      </a-row>
    </a-card>

    <!-- 数据表格 -->
    <a-card>
      <a-table
        :dataSource="list"
        :columns="columns"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
        size="middle"
        :scroll="{ x: 1200 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColorMap[record.status]">
              {{ statusMap[record.status] }}
            </a-tag>
          </template>
          <template v-if="column.key === 'freeType'">
            <a-tag>{{ freeTypeMap[record.freeType] }}</a-tag>
          </template>
          <template v-if="column.key === 'images'">
            <a-image
              v-if="record.images && record.images.length"
              :src="record.images[0]"
              :width="40"
              :height="40"
              style="object-fit: cover; border-radius: 4px;"
            />
            <span v-else>-</span>
          </template>
          <template v-if="column.key === 'location'">
            <a-button type="link" size="small" @click="showLocation(record)">
              查看位置
            </a-button>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="openReviewModal(record)" v-if="record.status === 0">审核</a>
              <a @click="openDetailModal(record)">详情</a>
              <a-divider type="vertical" />
              <a-popconfirm title="确认删除？" @confirm="deleteOne(record.id)">
                <a style="color:red">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 审核弹窗 -->
    <a-modal
      v-model:open="reviewModalVisible"
      title="审核免费停车点位"
      @ok="handleReview"
      :confirmLoading="reviewLoading"
      width="600px"
      destroy-on-close
    >
      <a-descriptions :column="1" bordered size="small" style="margin-bottom:16px">
        <a-descriptions-item label="停车场名称">{{ currentRecord.name }}</a-descriptions-item>
        <a-descriptions-item label="详细地址">{{ currentRecord.address }}</a-descriptions-item>
        <a-descriptions-item label="免费时段">{{ currentRecord.freeTimeStart }} - {{ currentRecord.freeTimeEnd }}</a-descriptions-item>
        <a-descriptions-item label="免费类型">{{ freeTypeMap[currentRecord.freeType] }}</a-descriptions-item>
        <a-descriptions-item label="车位数量">{{ currentRecord.parkingSpaces || '-' }}</a-descriptions-item>
        <a-descriptions-item label="上报人">{{ currentRecord.reporterName }}</a-descriptions-item>
        <a-descriptions-item label="上报时间">{{ formatTime(currentRecord.createdAt) }}</a-descriptions-item>
        <a-descriptions-item label="备注说明" v-if="currentRecord.remark">{{ currentRecord.remark }}</a-descriptions-item>
      </a-descriptions>

      <a-form :model="reviewForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="审核结果" required>
          <a-radio-group v-model:value="reviewForm.status">
            <a-radio :value="1">通过</a-radio>
            <a-radio :value="2">拒绝</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="审核备注">
          <a-textarea 
            v-model:value="reviewForm.reviewRemark" 
            placeholder="请输入审核备注"
            :rows="3"
          />
        </a-form-item>
      </a-form>

      <!-- 图片预览 -->
      <div v-if="currentRecord.images && currentRecord.images.length" style="margin-top:16px">
        <div style="margin-bottom:8px; font-weight: bold;">上传图片：</div>
        <a-image-preview-group>
          <a-image
            v-for="(img, index) in currentRecord.images"
            :key="index"
            :src="img"
            :width="80"
            :height="80"
            style="object-fit: cover; margin-right: 8px; border-radius: 4px;"
          />
        </a-image-preview-group>
      </div>
    </a-modal>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="点位详情"
      :footer="null"
      width="600px"
    >
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="停车场名称">{{ currentRecord.name }}</a-descriptions-item>
        <a-descriptions-item label="详细地址">{{ currentRecord.address }}</a-descriptions-item>
        <a-descriptions-item label="坐标位置">{{ currentRecord.latitude }}, {{ currentRecord.longitude }}</a-descriptions-item>
        <a-descriptions-item label="免费时段">{{ currentRecord.freeTimeStart }} - {{ currentRecord.freeTimeEnd }}</a-descriptions-item>
        <a-descriptions-item label="免费类型">{{ freeTypeMap[currentRecord.freeType] }}</a-descriptions-item>
        <a-descriptions-item label="车位数量">{{ currentRecord.parkingSpaces || '-' }}</a-descriptions-item>
        <a-descriptions-item label="上报人">{{ currentRecord.reporterName }}</a-descriptions-item>
        <a-descriptions-item label="上报时间">{{ formatTime(currentRecord.createdAt) }}</a-descriptions-item>
        <a-descriptions-item label="审核状态">
          <a-tag :color="statusColorMap[currentRecord.status]">
            {{ statusMap[currentRecord.status] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="审核时间" v-if="currentRecord.reviewTime">
          {{ formatTime(currentRecord.reviewTime) }}
        </a-descriptions-item>
        <a-descriptions-item label="审核人" v-if="currentRecord.reviewerName">
          {{ currentRecord.reviewerName }}
        </a-descriptions-item>
        <a-descriptions-item label="审核备注" v-if="currentRecord.reviewRemark">
          {{ currentRecord.reviewRemark }}
        </a-descriptions-item>
        <a-descriptions-item label="备注说明" v-if="currentRecord.remark">
          {{ currentRecord.remark }}
        </a-descriptions-item>
      </a-descriptions>

      <!-- 图片预览 -->
      <div v-if="currentRecord.images && currentRecord.images.length" style="margin-top:16px">
        <div style="margin-bottom:8px; font-weight: bold;">上传图片：</div>
        <a-image-preview-group>
          <a-image
            v-for="(img, index) in currentRecord.images"
            :key="index"
            :src="img"
            :width="100"
            :height="100"
            style="object-fit: cover; margin-right: 8px; border-radius: 4px;"
          />
        </a-image-preview-group>
      </div>
    </a-modal>

    <!-- 位置预览弹窗 -->
    <a-modal
      v-model:open="locationModalVisible"
      title="位置预览"
      :footer="null"
      width="500px"
    >
      <div style="text-align: center;">
        <div style="margin-bottom: 8px; color: #666;">{{ currentRecord.address }}</div>
        <div style="margin-bottom: 8px; color: #999;">
          坐标: {{ currentRecord.latitude }}, {{ currentRecord.longitude }}
        </div>
        <iframe
          v-if="locationModalVisible"
          :src="`https://apis.map.qq.com/tools/poimarker?type=0&marker=coord:${currentRecord.latitude},${currentRecord.longitude};title:${currentRecord.name};addr:${currentRecord.address}&key=UAYBZ-37KC7-AMXX2-HNLUT-5INIQ-N4BKS`"
          width="450"
          height="300"
          frameborder="0"
          style="border: 1px solid #ddd; border-radius: 4px;"
        ></iframe>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { freeParkingApi } from '@/api/free-parking'

const loading = ref(false)
const switchLoading = ref(false)
const list = ref([])
const reportEnabled = ref(true)
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })
const query = reactive({ keyword: '', status: undefined })

const statusMap = { 0: '待审核', 1: '已通过', 2: '已拒绝' }
const statusColorMap = { 0: 'orange', 1: 'green', 2: 'red' }
const freeTypeMap = { 
  night: '夜间免费', 
  weekend: '周末免费', 
  allday: '全天免费', 
  holiday: '节假日免费' 
}

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '停车场名称', dataIndex: 'name', key: 'name', ellipsis: true, width: 150 },
  { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true, width: 200 },
  { title: '免费时段', key: 'freeTime', width: 120, render: (record) => `${record.freeTimeStart}-${record.freeTimeEnd}` },
  { title: '免费类型', dataIndex: 'freeType', key: 'freeType', width: 100 },
  { title: '图片', key: 'images', width: 60 },
  { title: '上报人', dataIndex: 'reporterName', key: 'reporterName', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '位置', key: 'location', width: 80 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
]

// 审核弹窗相关
const reviewModalVisible = ref(false)
const reviewLoading = ref(false)
const currentRecord = ref({})
const reviewForm = reactive({ status: 1, reviewRemark: '' })

// 详情弹窗相关
const detailModalVisible = ref(false)

// 位置弹窗相关
const locationModalVisible = ref(false)

async function loadData() {
  loading.value = true
  try {
    const res = await freeParkingApi.getReports({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: query.keyword || undefined,
      status: query.status,
    })
    if (res.code === 0) {
      list.value = res.data.list
      pagination.total = res.data.total
    }
  } finally {
    loading.value = false
  }
}

async function loadEnabledStatus() {
  try {
    const res = await freeParkingApi.getEnabledStatus()
    if (res.code === 0) {
      reportEnabled.value = res.data.enabled
    }
  } catch (error) {
    console.error('获取开关状态失败:', error)
  }
}

async function toggleReportEnabled(enabled) {
  switchLoading.value = true
  try {
    const res = await freeParkingApi.toggleEnabled(enabled)
    if (res.code === 0) {
      message.success(enabled ? '已开启上报功能' : '已关闭上报功能')
    } else {
      message.error(res.message || '操作失败')
      // 恢复开关状态
      reportEnabled.value = !enabled
    }
  } catch (error) {
    message.error('操作失败')
    reportEnabled.value = !enabled
  } finally {
    switchLoading.value = false
  }
}

function handleTableChange(pag) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

function resetQuery() {
  query.keyword = ''
  query.status = undefined
  pagination.current = 1
  loadData()
}

function openReviewModal(record) {
  currentRecord.value = record
  reviewForm.status = 1
  reviewForm.reviewRemark = ''
  reviewModalVisible.value = true
}

function openDetailModal(record) {
  currentRecord.value = record
  detailModalVisible.value = true
}

function showLocation(record) {
  currentRecord.value = record
  locationModalVisible.value = true
}

async function handleReview() {
  reviewLoading.value = true
  try {
    const res = await freeParkingApi.review(currentRecord.value.id, {
      status: reviewForm.status,
      reviewRemark: reviewForm.reviewRemark,
      reviewerName: '管理员' // TODO: 从登录信息获取
    })
    if (res.code === 0) {
      message.success('审核成功')
      reviewModalVisible.value = false
      loadData()
    } else {
      message.error(res.message || '审核失败')
    }
  } finally {
    reviewLoading.value = false
  }
}

async function deleteOne(id) {
  const res = await freeParkingApi.delete(id)
  if (res.code === 0) { 
    message.success('删除成功')
    loadData()
  }
}

function formatTime(time) {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  loadData()
  loadEnabledStatus()
})
</script>
