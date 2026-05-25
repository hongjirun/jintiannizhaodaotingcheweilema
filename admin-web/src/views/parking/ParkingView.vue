<template>
  <div>
    <!-- 工具栏 -->
    <a-card style="margin-bottom:16px">
      <a-row :gutter="12" align="middle">
        <a-col :flex="1">
          <a-space>
            <a-input
              v-model:value="query.keyword"
              placeholder="搜索停车场名称"
              style="width:200px"
              allow-clear
              @press-enter="loadData"
            />
            <a-input
              v-model:value="query.city"
              placeholder="按城市筛选"
              style="width:140px"
              allow-clear
            />
            <a-select v-model:value="query.status" style="width:110px" allow-clear placeholder="状态">
              <a-select-option :value="1">启用</a-select-option>
              <a-select-option :value="0">停用</a-select-option>
            </a-select>
            <a-button type="primary" @click="loadData">查询</a-button>
            <a-button @click="resetQuery">重置</a-button>
          </a-space>
        </a-col>
        <a-col>
          <a-space>
            <a-button type="primary" @click="openAddModal">+ 新增</a-button>
            <a-button @click="openPoiModal">📡 POI导入</a-button>
            <a-upload :before-upload="handleExcelUpload" accept=".xlsx,.xls" :show-upload-list="false">
              <a-button>📊 Excel导入</a-button>
            </a-upload>
            <a-button danger :disabled="!selectedIds.length" @click="batchDelete">
              批量删除({{ selectedIds.length }})
            </a-button>
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
        :row-selection="rowSelection"
        row-key="id"
        @change="handleTableChange"
        size="middle"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 1 ? 'green' : 'red'">
              {{ record.status === 1 ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'dataSource'">
            <a-tag color="blue">{{ sourceMap[record.dataSource] || record.dataSource }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="openEditModal(record)">编辑</a>
              <a-divider type="vertical" />
              <a-popconfirm title="确认删除？" @confirm="deleteOne(record.id)">
                <a style="color:red">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑停车场' : '新增停车场'"
      @ok="handleSubmit"
      :confirmLoading="submitLoading"
      width="600px"
      destroy-on-close
    >
      <a-form :model="formData" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="停车场名称" required>
          <a-input v-model:value="formData.name" placeholder="请输入名称" />
        </a-form-item>
        <a-form-item label="地址">
          <a-input v-model:value="formData.address" placeholder="请输入地址" />
        </a-form-item>
        <a-form-item label="城市">
          <a-input v-model:value="formData.city" placeholder="如：广州市" />
        </a-form-item>
        <a-form-item label="省份">
          <a-input v-model:value="formData.province" placeholder="如：广东省" />
        </a-form-item>
        <a-form-item label="经度" required>
          <a-input-number v-model:value="formData.longitude" :precision="8" style="width:100%" placeholder="GCJ-02经度" />
        </a-form-item>
        <a-form-item label="纬度" required>
          <a-input-number v-model:value="formData.latitude" :precision="8" style="width:100%" placeholder="GCJ-02纬度" />
        </a-form-item>
        <a-form-item label="联系电话">
          <a-input v-model:value="formData.phone" />
        </a-form-item>
        <a-form-item label="状态">
          <a-radio-group v-model:value="formData.status">
            <a-radio :value="1">启用</a-radio>
            <a-radio :value="0">停用</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- POI导入弹窗 -->
    <a-modal
      v-model:open="poiModalVisible"
      title="从腾讯POI按城市导入"
      @ok="handlePoiImport"
      :confirmLoading="poiLoading"
    >
      <a-alert
        message="系统将调用腾讯位置服务搜索该城市内的全部停车场，去重后存入数据库，每次最多导入约1000条，时间较长请耐心等待。"
        type="info"
        show-icon
        style="margin-bottom:16px"
      />
      <a-input v-model:value="poiCity" placeholder="请输入城市名称，如：广州市 或 广州" size="large" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import * as XLSX from 'xlsx'
import { parkingApi } from '@/api/parking'

const loading = ref(false)
const list = ref([])
const selectedIds = ref([])
const pagination = reactive({ current: 1, pageSize: 20, total: 0 })
const query = reactive({ keyword: '', city: '', status: undefined })

const sourceMap = { tencent: '腾讯POI', manual: '手动', excel: 'Excel' }

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: '城市', dataIndex: 'city', key: 'city', width: 90 },
  { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
  { title: '经度', dataIndex: 'longitude', key: 'longitude', width: 110 },
  { title: '纬度', dataIndex: 'latitude', key: 'latitude', width: 110 },
  { title: '电话', dataIndex: 'phone', key: 'phone', width: 120 },
  { title: '来源', dataIndex: 'dataSource', key: 'dataSource', width: 90 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
]

const rowSelection = {
  onChange: (keys) => { selectedIds.value = keys },
}

async function loadData() {
  loading.value = true
  try {
    const res = await parkingApi.list({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: query.keyword || undefined,
      city: query.city || undefined,
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

function handleTableChange(pag) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadData()
}

function resetQuery() {
  query.keyword = ''
  query.city = ''
  query.status = undefined
  pagination.current = 1
  loadData()
}

// 新增/编辑
const modalVisible = ref(false)
const editingId = ref(null)
const submitLoading = ref(false)
const formData = reactive({
  name: '', address: '', city: '', province: '',
  longitude: null, latitude: null, phone: '', status: 1,
})

function openAddModal() {
  editingId.value = null
  Object.assign(formData, { name: '', address: '', city: '', province: '', longitude: null, latitude: null, phone: '', status: 1 })
  modalVisible.value = true
}

function openEditModal(record) {
  editingId.value = record.id
  Object.assign(formData, { ...record })
  modalVisible.value = true
}

async function handleSubmit() {
  if (!formData.name || !formData.longitude || !formData.latitude) {
    return message.warning('名称、经度、纬度为必填项')
  }
  submitLoading.value = true
  try {
    let res
    if (editingId.value) {
      res = await parkingApi.update(editingId.value, formData)
    } else {
      res = await parkingApi.create(formData)
    }
    if (res.code === 0) {
      message.success(editingId.value ? '更新成功' : '新增成功')
      modalVisible.value = false
      loadData()
    }
  } finally {
    submitLoading.value = false
  }
}

async function deleteOne(id) {
  const res = await parkingApi.remove(id)
  if (res.code === 0) { message.success('删除成功'); loadData() }
}

async function batchDelete() {
  Modal.confirm({
    title: `确认删除选中的 ${selectedIds.value.length} 条数据？`,
    okType: 'danger',
    async onOk() {
      const res = await parkingApi.batchRemove(selectedIds.value)
      if (res.code === 0) { message.success(res.message); selectedIds.value = []; loadData() }
    },
  })
}

// POI导入
const poiModalVisible = ref(false)
const poiLoading = ref(false)
const poiCity = ref('')

function openPoiModal() {
  poiCity.value = ''
  poiModalVisible.value = true
}

async function handlePoiImport() {
  if (!poiCity.value.trim()) return message.warning('请输入城市名称')
  poiLoading.value = true
  try {
    const res = await parkingApi.importPoi(poiCity.value.trim())
    if (res.code === 0) {
      message.success(res.message)
      poiModalVisible.value = false
      loadData()
    }
  } finally {
    poiLoading.value = false
  }
}

// Excel导入
async function handleExcelUpload(file) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws)
      if (!data.length) return message.warning('Excel内容为空')
      const res = await parkingApi.importExcel(data)
      if (res.code === 0) { message.success(res.message); loadData() }
    } catch (err) {
      message.error('Excel解析失败')
    }
  }
  reader.readAsBinaryString(file)
  return false
}

onMounted(loadData)
</script>
