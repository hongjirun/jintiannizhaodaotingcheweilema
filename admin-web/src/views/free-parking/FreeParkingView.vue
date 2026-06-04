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
            <span>小程序上报:</span>
            <a-switch 
              v-model:checked="reportEnabled" 
              checked-children="开启" 
              un-checked-children="关闭"
              @change="toggleReportEnabled"
              :loading="switchLoading"
            />
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
            <a-tag color="blue" style="cursor: pointer;" @click="showLocation(record)">
              <template #icon><EnvironmentOutlined /></template>
              查看
            </a-tag>
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
        <a-descriptions-item label="免费时段" v-if="currentRecord.freeType !== 'not_free'">{{ currentRecord.freeTimeStart || '-' }} - {{ currentRecord.freeTimeEnd || '-' }}</a-descriptions-item>
        <a-descriptions-item label="停车类型">{{ freeTypeMap[currentRecord.freeType] }}</a-descriptions-item>
        <a-descriptions-item label="每小时价格" v-if="currentRecord.freeType === 'not_free'">{{ currentRecord.hourlyPrice ? currentRecord.hourlyPrice + ' 元/小时' : '-' }}</a-descriptions-item>
        <a-descriptions-item label="车位数量">{{ currentRecord.parkingSpaces || '-' }}</a-descriptions-item>
        <a-descriptions-item label="上报人">{{ currentRecord.reporterName || '-' }}</a-descriptions-item>
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
        <a-descriptions-item label="免费时段" v-if="currentRecord.freeType !== 'not_free'">{{ currentRecord.freeTimeStart || '-' }} - {{ currentRecord.freeTimeEnd || '-' }}</a-descriptions-item>
        <a-descriptions-item label="停车类型">{{ freeTypeMap[currentRecord.freeType] }}</a-descriptions-item>
        <a-descriptions-item label="每小时价格" v-if="currentRecord.freeType === 'not_free'">{{ currentRecord.hourlyPrice ? currentRecord.hourlyPrice + ' 元/小时' : '-' }}</a-descriptions-item>
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

    <!-- 位置编辑弹窗 -->
    <a-modal
      v-model:open="locationModalVisible"
      title="编辑位置"
      width="1000px"
      :footer="null"
      @cancel="closeLocationModal"
    >
      <div v-if="editingRecord" style="display: flex; gap: 16px;">
        <!-- 地图容器 -->
        <div style="flex: 1;">
          <div id="tencentMapContainer" style="width: 100%; height: 500px; border-radius: 8px; background: #f0f0f0;"></div>
          <div style="margin-top: 8px; color: #666; font-size: 12px;">
            💡 提示：拖动红色标记可修改位置，或点击地图任意位置
          </div>
        </div>
        
        <!-- 编辑侧边栏 -->
        <div style="width: 260px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
          <h4 style="margin-bottom: 16px; color: #1890ff;">编辑位置</h4>
          
          <div style="margin-bottom: 12px;">
            <label style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">停车场名称:</label>
            <a-input 
              v-model:value="editableName" 
              style="width: 100%;"
              placeholder="输入停车场名称"
            />
          </div>
          
          <div style="margin-bottom: 12px;">
            <label style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">纬度:</label>
            <a-input-number 
              v-model:value="editableLat" 
              :precision="6" 
              style="width: 100%;"
              @change="updateMapPosition"
            />
          </div>
          
          <div style="margin-bottom: 12px;">
            <label style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">经度:</label>
            <a-input-number 
              v-model:value="editableLng" 
              :precision="6" 
              style="width: 100%;"
              @change="updateMapPosition"
            />
          </div>
          
          <div style="margin-bottom: 12px;">
            <label style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">地址:</label>
            <div style="font-size: 13px; color: #333; line-height: 1.5;">{{ editableAddress || '点击地图获取地址' }}</div>
          </div>
          
          <a-divider style="margin: 16px 0;" />
          
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a-button type="primary" block @click="saveLocation">
              保存修改
            </a-button>
            <a-button block @click="openTencentMapApp">
              在腾讯地图中打开
            </a-button>
            <a-button block @click="closeLocationModal">
              取消
            </a-button>
          </div>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { EnvironmentOutlined } from '@ant-design/icons-vue'
import { freeParkingApi } from '@/api/free-parking'

const loading = ref(false)
const switchLoading = ref(false)
const list = ref([])
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })
const query = reactive({ keyword: '', status: undefined })
const reportEnabled = ref(true)

const statusMap = { 0: '待审核', 1: '已通过', 2: '已拒绝' }
const statusColorMap = { 0: 'orange', 1: 'green', 2: 'red' }
const freeTypeMap = { 
  night: '夜间免费', 
  weekend: '周末免费', 
  allday: '全天免费', 
  holiday: '节假日免费',
  not_free: '不免费'
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

// 位置编辑相关
const locationModalVisible = ref(false)
const editingRecord = ref(null)
const editableLat = ref(0)
const editableLng = ref(0)
const editableAddress = ref('')
const editableName = ref('')
let map = null
let marker = null

// 从环境变量获取腾讯地图Key
const TENCENT_MAP_KEY = import.meta.env.VITE_TENCENT_MAP_KEY || 'UAYBZ-37KC7-AMXX2-HNLUT-5INIQ-N4BKS'

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

// 显示位置编辑弹窗
async function showLocation(record) {
  editingRecord.value = record
  editableLat.value = record.latitude
  editableLng.value = record.longitude
  editableAddress.value = record.address
  editableName.value = record.name || ''
  locationModalVisible.value = true
  
  // 等待弹窗渲染完成后初始化地图
  await new Promise(resolve => setTimeout(resolve, 300))
  await initMap()
}

// 关闭位置弹窗
function closeLocationModal() {
  locationModalVisible.value = false
  editingRecord.value = null
  map = null
  marker = null
}

// 更新地图位置（输入框修改时）
function updateMapPosition() {
  if (!map || !marker) return
  const newCenter = new window.TMap.LatLng(editableLat.value, editableLng.value)
  map.setCenter(newCenter)
  marker.setGeometries([{
    id: '1',
    styleId: 'default',
    position: newCenter
  }])
  // 逆地理编码获取地址
  reverseGeocoding(editableLat.value, editableLng.value)
}

// 逆地理编码
async function reverseGeocoding(lat, lng) {
  try {
    const res = await fetch(`https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${TENCENT_MAP_KEY}`)
    const data = await res.json()
    if (data.status === 0 && data.result) {
      editableAddress.value = data.result.address
    }
  } catch (error) {
    console.error('逆地理编码失败:', error)
  }
}

// 保存位置修改
async function saveLocation() {
  if (!editingRecord.value) return
  
  try {
    // 这里调用API保存修改后的坐标和名称
    await freeParkingApi.updateLocation(editingRecord.value.id, {
      latitude: editableLat.value,
      longitude: editableLng.value,
      address: editableAddress.value,
      name: editableName.value
    })
    message.success('位置和名称已更新')
    closeLocationModal()
    loadData() // 刷新列表
  } catch (error) {
    message.error('保存失败：' + error.message)
  }
}

// 在腾讯地图中打开
function openTencentMapApp() {
  if (!editingRecord.value) return
  const url = `https://map.qq.com/?marker=${editableLat.value},${editableLng.value}&name=${encodeURIComponent(editingRecord.value.name || '')}`
  window.open(url, '_blank')
}

// 加载腾讯地图JS API
function loadTencentMapScript() {
  return new Promise((resolve, reject) => {
    if (window.TMap) {
      resolve(window.TMap)
      return
    }
    
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${TENCENT_MAP_KEY}&t=${Date.now()}`
    
    script.onload = () => {
      setTimeout(() => {
        if (window.TMap && typeof window.TMap.Map === 'function') {
          resolve(window.TMap)
        } else {
          reject(new Error('腾讯地图API加载失败'))
        }
      }, 1000)
    }
    
    script.onerror = () => reject(new Error('地图脚本加载失败'))
    document.head.appendChild(script)
  })
}

// 初始化地图
async function initMap() {
  try {
    if (!editingRecord.value) return
    
    await loadTencentMapScript()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const center = new window.TMap.LatLng(editableLat.value, editableLng.value)
    
    // 创建地图实例
    map = new window.TMap.Map('tencentMapContainer', {
      center: center,
      zoom: 16
    })
    
    // 创建标记样式
    const markerStyle = new window.TMap.MarkerStyle({
      width: 35,
      height: 45,
      anchor: { x: 17, y: 45 }
    })
    
    // 创建可拖拽标记 - 在 geometries 中设置 draggable
    marker = new window.TMap.MultiMarker({
      map: map,
      styles: {
        'default': markerStyle
      },
      geometries: [{
        id: '1',
        styleId: 'default',
        position: center,
        properties: { 
          title: editingRecord.value.name,
          draggable: true
        }
      }]
    })
    
    // 监听标记拖拽结束事件 - 使用 'position_changed' 事件
    marker.on('position_changed', (e) => {
      if (e.geometry && e.geometry.position) {
        const newPosition = e.geometry.position
        editableLat.value = parseFloat(newPosition.lat.toFixed(6))
        editableLng.value = parseFloat(newPosition.lng.toFixed(6))
        reverseGeocoding(editableLat.value, editableLng.value)
      }
    })
    
    // 监听地图点击事件
    map.on('click', (e) => {
      const newPosition = e.latLng
      editableLat.value = parseFloat(newPosition.lat.toFixed(6))
      editableLng.value = parseFloat(newPosition.lng.toFixed(6))
      marker.setGeometries([{
        id: '1',
        styleId: 'default',
        position: newPosition,
        properties: { 
          title: editingRecord.value.name,
          draggable: true
        }
      }])
      reverseGeocoding(editableLat.value, editableLng.value)
    })
    
  } catch (error) {
    console.error('地图初始化失败:', error)
    message.error('地图加载失败，请检查网络')
  }
}

onMounted(() => {
  loadData()
  loadEnabledStatus()
})
</script>
