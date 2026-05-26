<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">免费停车点位上报</text>
      <view class="nav-right"></view>
    </view>

    <!-- 表单内容 -->
    <view class="form-container">
      <!-- 基本信息卡片 -->
      <view class="form-card">
        <view class="card-header">
          <view class="card-icon">🅿️</view>
          <text class="card-title">基本信息</text>
        </view>
        
        <view class="form-item">
          <view class="form-label">
            <text class="label-icon">🏢</text>
            停车场名称 <text class="required">*</text>
          </view>
          <input 
            class="form-input" 
            v-model="formData.name" 
            placeholder="例如：市民广场地下停车场"
            maxlength="50"
          />
        </view>

        <view class="form-item">
          <view class="form-label">
            <text class="label-icon">📍</text>
            详细地址 <text class="required">*</text>
          </view>
          <input 
            class="form-input" 
            v-model="formData.address" 
            placeholder="请输入详细地址"
            maxlength="100"
          />
        </view>

        <view class="form-item">
          <view class="form-label">
            <text class="label-icon">🗺️</text>
            选择位置 <text class="required">*</text>
          </view>
          <view class="location-picker" @tap="chooseLocation">
            <text class="location-text" :class="{ placeholder: !formData.location }">
              {{ formData.location ? formData.location.address : '点击地图选择精确位置' }}
            </text>
            <text class="location-icon">📍</text>
          </view>
        </view>

        <view class="form-item">
          <view class="form-label">
            <text class="label-icon">⏰</text>
            免费时段 <text class="required">*</text>
          </view>
          <view class="time-inputs">
            <input 
              class="time-input" 
              v-model="formData.freeTimeStart" 
              placeholder="19:00"
              type="text"
            />
            <text class="time-separator">至</text>
            <input 
              class="time-input" 
              v-model="formData.freeTimeEnd" 
              placeholder="08:00"
              type="text"
            />
          </view>
          <text class="form-tip">💡 示例：19:00-08:00 表示晚上7点到次日早上8点免费</text>
        </view>

        <view class="form-item">
          <view class="form-label">
            <text class="label-icon">🚗</text>
            车位数量
          </view>
          <input 
            class="form-input" 
            v-model="formData.parkingSpaces" 
            placeholder="大概有多少个车位（选填）"
            type="number"
          />
        </view>
      </view>

      <!-- 补充信息卡片 -->
      <view class="form-card">
        <view class="card-header">
          <view class="card-icon">📝</view>
          <text class="card-title">补充信息</text>
        </view>
        
        <view class="form-item">
          <view class="form-label">
            <text class="label-icon">🎯</text>
            免费类型
          </view>
          <view class="type-grid">
            <view 
              class="type-item" 
              v-for="type in freeTypes" 
              :key="type.value"
              :class="{ active: formData.freeType === type.value }"
              @tap="selectType(type.value)"
            >
              <text class="type-icon">{{ typeIcons[type.value] }}</text>
              <text class="type-label">{{ type.label }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <view class="form-label">
            <text class="label-icon">💬</text>
            备注说明
          </view>
          <textarea 
            class="form-textarea" 
            v-model="formData.remark" 
            placeholder="请输入其他补充信息，如：周末免费、节假日免费、特殊说明等"
            maxlength="200"
          />
        </view>

        <view class="form-item">
          <view class="form-label">
            <text class="label-icon">📸</text>
            上传照片
          </view>
          <view class="upload-area">
            <view class="upload-btn" @tap="uploadImage" v-if="formData.images.length < 3">
              <text class="upload-icon">📷</text>
              <text class="upload-text">添加照片</text>
              <text class="upload-hint">{{ formData.images.length }}/3</text>
            </view>
            <view class="image-grid">
              <view 
                class="image-item" 
                v-for="(image, index) in formData.images" 
                :key="index"
              >
                <image class="image-preview" :src="image" mode="aspectFill" />
                <view class="image-delete" @tap="deleteImage(index)">×</view>
              </view>
            </view>
          </view>
          <text class="form-tip">💡 上传现场照片能帮助管理员更快审核通过</text>
        </view>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-area">
      <button class="submit-btn" @tap="submitReport" :disabled="!canSubmit">
        提交上报
      </button>
      <text class="submit-tip">提交后将在1-3个工作日内审核</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { parkingRequest } from '@/utils/request'

const formData = ref({
  name: '',
  address: '',
  location: null,
  freeTimeStart: '',
  freeTimeEnd: '',
  parkingSpaces: '',
  freeType: 'night',
  remark: '',
  images: []
})

const reportEnabled = ref(true)

const freeTypes = [
  { label: '夜间免费', value: 'night' },
  { label: '周末免费', value: 'weekend' },
  { label: '全天免费', value: 'allday' },
  { label: '节假日免费', value: 'holiday' }
]

const typeIcons = {
  night: '🌙',
  weekend: '🎉',
  allday: '✨',
  holiday: '🎊'
}

const canSubmit = computed(() => {
  return formData.value.name && 
         formData.value.address && 
         formData.value.location &&
         formData.value.freeTimeStart && 
         formData.value.freeTimeEnd &&
         reportEnabled.value
})

onMounted(() => {
  // 直接默认开启功能，避免API请求导致的加载问题
  reportEnabled.value = true
})

function goBack() {
  uni.navigateBack()
}

function chooseLocation() {
  uni.chooseLocation({
    success: (res) => {
      formData.value.location = {
        latitude: res.latitude,
        longitude: res.longitude,
        address: res.address || res.name
      }
    }
  })
}

function selectType(value) {
  formData.value.freeType = value
}

function uploadImage() {
  uni.chooseImage({
    count: 3 - formData.value.images.length,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: (res) => {
      formData.value.images.push(...res.tempFilePaths)
    }
  })
}

function deleteImage(index) {
  formData.value.images.splice(index, 1)
}

// 防止重复提交
let isSubmitting = false

async function submitReport() {
  if (isSubmitting) {
    uni.showToast({ title: '正在提交中...', icon: 'none' })
    return
  }

  if (!canSubmit.value) {
    uni.showToast({ title: '请填写必填项', icon: 'none' })
    return
  }

  if (!reportEnabled.value) {
    uni.showToast({ title: '上报功能已关闭', icon: 'none' })
    return
  }

  isSubmitting = true
  uni.showLoading({ title: '提交中...' })
  
  try {
    // 获取用户信息
    const userInfo = uni.getUserInfo()
    
    const submitData = {
      name: formData.value.name,
      address: formData.value.address,
      latitude: formData.value.location.latitude,
      longitude: formData.value.location.longitude,
      freeTimeStart: formData.value.freeTimeStart,
      freeTimeEnd: formData.value.freeTimeEnd,
      parkingSpaces: formData.value.parkingSpaces ? parseInt(formData.value.parkingSpaces) : null,
      freeType: formData.value.freeType,
      remark: formData.value.remark,
      images: formData.value.images,
      reporterName: userInfo.nickName || '微信用户',
      reporterAvatar: userInfo.avatarUrl || ''
    }

    const res = await parkingRequest.createReport(submitData)
    
    uni.hideLoading()
    if (res.code === 0) {
      uni.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    } else {
      uni.showToast({ title: res.message || '提交失败', icon: 'none' })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('提交失败:', error)
    uni.showToast({ title: '网络错误，请重试', icon: 'none' })
  } finally {
    isSubmitting = false
  }
}
</script>

<style scoped>
.page { 
  background: linear-gradient(180deg, #e8f4ff 0%, #f4f6f9 100%); 
  min-height: 100vh; 
}

.nav-bar {
  display: flex; align-items: center;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  padding: 20rpx 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(22, 119, 255, 0.15);
  position: sticky; top: 0; z-index: 100;
}
.nav-left { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; }
.nav-icon { font-size: 48rpx; color: #fff; font-weight: bold; }
.nav-title { flex: 1; font-size: 36rpx; font-weight: bold; color: #fff; text-align: center; }
.nav-right { width: 60rpx; }

.form-container { 
  padding: 24rpx; 
  padding-bottom: 120rpx;
}

.form-card {
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06);
  border: 1rpx solid rgba(22, 119, 255, 0.08);
}

.card-header {
  display: flex; align-items: center;
  padding: 32rpx 28rpx 20rpx;
  background: linear-gradient(135deg, #f8fbff 0%, #fff 100%);
  border-bottom: 1rpx solid #f0f6ff;
}
.card-icon {
  font-size: 40rpx; 
  margin-right: 16rpx;
}
.card-title {
  font-size: 32rpx; 
  font-weight: bold; 
  color: #1a1a1a;
}

.form-item {
  padding: 32rpx 28rpx;
  border-bottom: 1rpx solid #f8f9fa;
}
.form-item:last-child { 
  border-bottom: none; 
  padding-bottom: 32rpx;
}

.form-label {
  font-size: 28rpx; 
  color: #333;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  font-weight: 500;
}
.label-icon {
  font-size: 32rpx; 
  margin-right: 12rpx;
}
.required { 
  color: #ff4d4f; 
  margin-left: 4rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid #e8f0fe;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: #fafbff;
  transition: all 0.3s ease;
}
.form-input:focus {
  border-color: #1677ff;
  background: #fff;
  box-shadow: 0 0 0 6rpx rgba(22, 119, 255, 0.1);
}

.location-picker {
  display: flex; align-items: center;
  height: 88rpx;
  border: 2rpx solid #e8f0fe;
  border-radius: 16rpx;
  padding: 0 24rpx;
  background: #fafbff;
  transition: all 0.3s ease;
}
.location-picker:active {
  background: #f0f6ff;
  border-color: #1677ff;
}
.location-text { 
  flex: 1; 
  font-size: 28rpx; 
  color: #333;
}
.location-text.placeholder { 
  color: #999; 
}
.location-icon { 
  font-size: 32rpx; 
  color: #1677ff;
}

.time-inputs {
  display: flex; align-items: center;
  gap: 20rpx;
}
.time-input {
  flex: 1;
  height: 88rpx;
  border: 2rpx solid #e8f0fe;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  text-align: center;
  background: #fafbff;
  transition: all 0.3s ease;
}
.time-input:focus {
  border-color: #1677ff;
  background: #fff;
  box-shadow: 0 0 0 6rpx rgba(22, 119, 255, 0.1);
}
.time-separator { 
  font-size: 28rpx; 
  color: #666;
  font-weight: 500;
}

.form-textarea {
  width: 100%;
  min-height: 180rpx;
  border: 2rpx solid #e8f0fe;
  border-radius: 16rpx;
  padding: 24rpx;
  font-size: 28rpx;
  background: #fafbff;
  transition: all 0.3s ease;
}
.form-textarea:focus {
  border-color: #1677ff;
  background: #fff;
  box-shadow: 0 0 0 6rpx rgba(22, 119, 255, 0.1);
}

.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.type-item {
  display: flex; flex-direction: column; align-items: center;
  padding: 24rpx 16rpx;
  border: 2rpx solid #e8f0fe;
  border-radius: 16rpx;
  background: #fafbff;
  transition: all 0.3s ease;
}
.type-item.active {
  border-color: #1677ff;
  background: linear-gradient(135deg, #e8f4ff 0%, #f0f6ff 100%);
  transform: scale(1.02);
}
.type-icon {
  font-size: 48rpx; 
  margin-bottom: 8rpx;
}
.type-label { 
  font-size: 26rpx; 
  color: #333;
  font-weight: 500;
}

.upload-area {
  display: flex; flex-direction: column;
  gap: 20rpx;
}
.upload-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 200rpx; height: 200rpx;
  border: 3rpx dashed #d9d9d9;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #fafbff 0%, #f8f9fa 100%);
  transition: all 0.3s ease;
}
.upload-btn:active {
  border-color: #1677ff;
  background: #e8f4ff;
  transform: scale(0.98);
}
.upload-icon { 
  font-size: 56rpx; 
  margin-bottom: 8rpx;
}
.upload-text { 
  font-size: 24rpx; 
  color: #666;
  font-weight: 500;
}
.upload-hint {
  font-size: 20rpx; 
  color: #999;
  margin-top: 4rpx;
}

.image-grid {
  display: flex; 
  gap: 16rpx;
  flex-wrap: wrap;
}
.image-item {
  position: relative;
  width: 200rpx; height: 200rpx;
}
.image-preview {
  width: 100%; height: 100%;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}
.image-delete {
  position: absolute; top: -8rpx; right: -8rpx;
  width: 44rpx; height: 44rpx;
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  color: #fff;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
  box-shadow: 0 4rpx 12rpx rgba(255, 77, 79, 0.3);
}

.form-tip {
  font-size: 24rpx; 
  color: #666;
  margin-top: 16rpx;
  display: block;
  line-height: 1.6;
}

.submit-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx 24rpx 40rpx;
  background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,1) 100%);
  backdrop-filter: blur(20rpx);
  border-top: 1rpx solid #f0f0f0;
  display: flex; 
  flex-direction: column; 
  align-items: center;
  gap: 12rpx;
}
.submit-btn {
  width: 100%; 
  height: 96rpx;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  color: #fff;
  border: none;
  border-radius: 48rpx;
  font-size: 32rpx; 
  font-weight: bold;
  display: flex; 
  align-items: center; 
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.3);
  transition: all 0.3s ease;
}
.submit-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(22, 119, 255, 0.4);
}
.submit-btn[disabled] {
  background: linear-gradient(135deg, #d9d9d9, #bfbfbf);
  box-shadow: none;
}
.submit-tip {
  font-size: 24rpx; 
  color: #999;
}
</style>
