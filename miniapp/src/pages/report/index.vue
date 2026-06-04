<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">免费停车点位上报</text>
      <view class="nav-right"></view>
    </view>

    <scroll-view class="form-container" scroll-y>
      <!-- 基本信息 -->
      <view class="section">
        <view class="section-title">基本信息</view>
        <view class="form-item">
          <text class="label required">停车场名称</text>
          <input 
            class="input" 
            v-model="formData.name" 
            placeholder="请输入停车场名称"
            maxlength="50"
          />
        </view>
        <view class="form-item">
          <text class="label required">地址</text>
          <input 
            class="input" 
            v-model="formData.address" 
            placeholder="请输入详细地址"
            maxlength="100"
          />
        </view>
      </view>

      <!-- 位置信息 -->
      <view class="section">
        <view class="section-title">位置信息</view>
        <view class="form-item">
          <text class="label required">选择位置</text>
          <view class="location-btn" @tap="chooseLocation">
            <text v-if="formData.location" class="location-text">
              {{ formData.location.latitude.toFixed(6) }}, {{ formData.location.longitude.toFixed(6) }}
            </text>
            <text v-else class="placeholder">点击选择地图位置</text>
          </view>
        </view>
      </view>

      <!-- 免费类型 -->
      <view class="section">
        <view class="section-title">免费类型</view>
        <view class="type-list">
          <view 
            v-for="item in freeTypes" 
            :key="item.value"
            class="type-item"
            :class="{ active: formData.freeType === item.value }"
            @tap="formData.freeType = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <!-- 免费时段 -->
      <view class="section">
        <view class="section-title">免费时段</view>
        <view class="form-item">
          <text class="label">开始时间</text>
          <picker mode="time" :value="formData.freeTimeStart" @change="e => formData.freeTimeStart = e.detail.value">
            <view class="picker">{{ formData.freeTimeStart || '请选择' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="label">结束时间</text>
          <picker mode="time" :value="formData.freeTimeEnd" @change="e => formData.freeTimeEnd = e.detail.value">
            <view class="picker">{{ formData.freeTimeEnd || '请选择' }}</view>
          </picker>
        </view>
      </view>

      <!-- 备注 -->
      <view class="section">
        <view class="section-title">备注</view>
        <textarea 
          class="textarea" 
          v-model="formData.remark" 
          placeholder="补充说明（选填）"
          maxlength="200"
        />
      </view>

      <!-- 图片上传 -->
      <view class="section">
        <view class="section-title">图片上传</view>
        <view class="image-list">
          <view 
            v-for="(img, index) in formData.images" 
            :key="index"
            class="image-item"
          >
            <image :src="img" mode="aspectFill" class="uploaded-img" />
            <text class="delete-btn" @tap="deleteImage(index)">×</text>
          </view>
          <view v-if="formData.images.length < 3" class="image-item upload-btn" @tap="chooseImage">
            <text class="plus">+</text>
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
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parkingRequest } from '@/utils/request'

const formData = ref({
  name: '',
  address: '',
  location: null,
  freeType: 'night',
  freeTimeStart: '',
  freeTimeEnd: '',
  remark: '',
  images: []
})

const freeTypes = [
  { label: '夜间免费', value: 'night' },
  { label: '周末免费', value: 'weekend' },
  { label: '全天免费', value: 'allday' },
  { label: '节假日免费', value: 'holiday' }
]

const canSubmit = computed(() => {
  return formData.value.name && formData.value.location
})

function goBack() {
  uni.navigateBack()
}

function chooseLocation() {
  uni.chooseLocation({
    success: (res) => {
      formData.value.location = {
        latitude: res.latitude,
        longitude: res.longitude
      }
      if (!formData.value.address) {
        formData.value.address = res.address || res.name
      }
    }
  })
}

function chooseImage() {
  uni.chooseImage({
    count: 3 - formData.value.images.length,
    success: (res) => {
      formData.value.images.push(...res.tempFilePaths)
    }
  })
}

function deleteImage(index) {
  formData.value.images.splice(index, 1)
}

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

  isSubmitting = true
  uni.showLoading({ title: '提交中...' })

  try {
    const userInfo = uni.getStorageSync('userInfo') || {}

    const submitData = {
      name: formData.value.name,
      address: formData.value.address,
      latitude: formData.value.location.latitude,
      longitude: formData.value.location.longitude,
      freeType: formData.value.freeType,
      freeTimeStart: formData.value.freeTimeStart,
      freeTimeEnd: formData.value.freeTimeEnd,
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
  background: #f4f6f9; 
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-left, .nav-right {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  font-size: 48rpx;
  color: #666;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.form-container {
  flex: 1;
  padding-bottom: 160rpx;
}

.section {
  margin: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}

.label.required::after {
  content: ' *';
  color: #ff4d4f;
}

.input {
  height: 80rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #333;
}

.picker {
  height: 80rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #333;
  display: flex;
  align-items: center;
}

.location-btn {
  height: 80rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  border: 2rpx dashed #d9d9d9;
}

.location-text {
  color: #333;
}

.placeholder {
  color: #999;
}

.type-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.type-item {
  padding: 16rpx 32rpx;
  background: #f8f9fa;
  border-radius: 32rpx;
  font-size: 28rpx;
  color: #666;
  border: 2rpx solid transparent;
}

.type-item.active {
  background: #e6f7ff;
  color: #1890ff;
  border-color: #1890ff;
}

.textarea {
  width: 100%;
  height: 160rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 30rpx;
  color: #333;
  box-sizing: border-box;
}

.image-list {
  display: flex;
  gap: 20rpx;
}

.image-item {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  position: relative;
}

.uploaded-img {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
}

.delete-btn {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 40rpx;
  height: 40rpx;
  background: #ff4d4f;
  color: #fff;
  border-radius: 50%;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-btn {
  background: #f8f9fa;
  border: 2rpx dashed #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus {
  font-size: 48rpx;
  color: #999;
}

.submit-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
}

.submit-btn[disabled] {
  background: #d9d9d9;
  color: #999;
}

.submit-tip {
  display: block;
  text-align: center;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #999;
}
</style>
