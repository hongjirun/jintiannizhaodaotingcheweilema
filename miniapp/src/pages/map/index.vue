<template>
  <view class="container">
    <!-- 地图全屏 -->
    <map
      id="myMap"
      class="map-view"
      :latitude="center.lat"
      :longitude="center.lng"
      :markers="markers"
      :scale="scale"
      show-location
      enable-zoom
      enable-scroll
      @regionchange="onRegionChange"
      @markertap="onMarkerTap"
    />

    <!-- 顶部导航栏浮层 -->
    <cover-view class="nav-float" :style="{ paddingTop: statusBarHeight + 'px' }">
      <cover-view class="nav-inner">
        <cover-view class="nav-brand">
          <cover-view class="brand-icon-text">🅿</cover-view>
          <cover-view class="brand-name">找停车位</cover-view>
        </cover-view>
        <cover-view class="nav-search-btn" @tap="goSearch">
          <cover-view class="search-hint">搜索停车场...</cover-view>
        </cover-view>
      </cover-view>
    </cover-view>

    <!-- 加载提示 -->
    <cover-view v-if="loading" class="loading-tip">
      <cover-view class="tip-text">加载中...</cover-view>
    </cover-view>
    <cover-view v-else-if="markers.length > 0" class="count-tip">
      <cover-view class="tip-text">找到 {{ markers.length }} 个停车场</cover-view>
    </cover-view>

    <!-- 定位按钮，单独浮层 -->
    <cover-view class="locate-btn" @tap="locateMe">
      <cover-view class="locate-icon-text">📍</cover-view>
      <cover-view class="locate-label">定位</cover-view>
    </cover-view>

    <!-- 停车场详情卡片 -->
    <view v-if="selectedLot" class="detail-overlay" @tap="selectedLot = null">
      <view class="bottom-sheet" @tap.stop>
        <view class="sheet-handle"></view>
        <view class="sheet-header">
          <view class="sheet-title-wrap">
            <text class="sheet-name">{{ selectedLot.name }}</text>
            <view v-if="distText" class="dist-badge">
              <text class="dist-text">📏 {{ distText }}</text>
            </view>
          </view>
          <view class="sheet-close" @tap="selectedLot = null">
            <text class="close-icon">✕</text>
          </view>
        </view>
        <view class="sheet-body">
          <view class="info-row">
            <text class="info-icon">📍</text>
            <text class="info-text">{{ selectedLot.address || '暂无地址' }}</text>
          </view>
          <view v-if="selectedLot.phone" class="info-row">
            <text class="info-icon">📞</text>
            <text class="info-text">{{ selectedLot.phone }}</text>
          </view>
          <view v-if="selectedLot.city" class="info-row">
            <text class="info-icon">🏙</text>
            <text class="info-text">{{ selectedLot.city }}</text>
          </view>
        </view>
        <view class="sheet-actions">
          <button class="btn-navi" @tap="startNavi">🧭 一键导航</button>
          <button v-if="selectedLot.phone" class="btn-call" @tap="makeCall">📞 复制电话</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { parkingRequest } from '@/utils/request'

const sysInfo = uni.getSystemInfoSync()
const statusBarHeight = sysInfo.statusBarHeight || 20

const center = ref({ lat: 23.129, lng: 113.264 })
const scale = ref(14)
const markers = ref([])
const lots = ref([])
const selectedLot = ref(null)
const loading = ref(false)
let regionCenter = null
let locating = false

const distText = computed(() => {
  if (!selectedLot.value) return ''
  const d = calcDist(center.value.lat, center.value.lng, Number(selectedLot.value.latitude), Number(selectedLot.value.longitude))
  return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`
})

function calcDist(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function goSearch() {
  uni.switchTab({ url: '/pages/search/index' })
}

function locateMe() {
  uni.showToast({ title: '定位中...', icon: 'loading', duration: 3000 })
  uni.getLocation({
    type: 'gcj02',
    isHighAccuracy: true,
    success: (res) => {
      uni.hideToast()
      center.value = { lat: res.latitude, lng: res.longitude }
      scale.value = 18
      loadNearby(res.latitude, res.longitude)
    },
    fail: (err) => {
      uni.hideToast()
      uni.showToast({ title: '定位失败，请检查权限', icon: 'none', duration: 2000 })
      console.error('getLocation fail', err)
    },
  })
}

function scaleToDelta(s) {
  if (s >= 16) return 0.15
  if (s >= 14) return 0.3
  if (s >= 12) return 0.8
  if (s >= 10) return 2.0
  return 4.0
}

async function loadNearby(lat, lng) {
  const delta = scaleToDelta(scale.value)
  loading.value = true
  try {
    const res = await parkingRequest.getByBounds(lat - delta, lng - delta, lat + delta, lng + delta)
    if (res.code === 0) renderMarkers(res.data)
  } finally {
    loading.value = false
  }
}

let regionChangeTimer = null
function onRegionChange(e) {
  if (e.type === 'end') {
    clearTimeout(regionChangeTimer)
    regionChangeTimer = setTimeout(() => {
      const mapCtx = uni.createMapContext('myMap')
      mapCtx.getCenterLocation({
        success: (res) => {
          if (res.scale) scale.value = res.scale
          loadNearby(res.latitude, res.longitude)
        }
      })
    }, 800)
  }
}

function renderMarkers(data) {
  lots.value = data
  markers.value = data
    .filter((item) => {
      const lat = parseFloat(item.latitude)
      const lng = parseFloat(item.longitude)
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
    })
    .map((item) => ({
      id: Number(item.id),
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      title: item.name,
      iconPath: '/static/marker.png',
      width: 36,
      height: 36,
      callout: null,
    }))
}

function onMarkerTap(e) {
  const lot = lots.value.find((l) => Number(l.id) === Number(e.detail.markerId))
  if (lot) selectedLot.value = lot
}

function startNavi() {
  if (!selectedLot.value) return
  uni.openLocation({
    latitude: Number(selectedLot.value.latitude),
    longitude: Number(selectedLot.value.longitude),
    name: selectedLot.value.name,
    address: selectedLot.value.address || '',
  })
}

function makeCall() {
  if (!selectedLot.value?.phone) return
  uni.setClipboardData({
    data: selectedLot.value.phone,
    success: () => {
      uni.showToast({ title: '电话已复制', icon: 'success' })
    }
  })
}

onMounted(() => {
  uni.getLocation({
    type: 'gcj02',
    isHighAccuracy: false,
    success: (res) => {
      center.value = { lat: res.latitude, lng: res.longitude }
      loadNearby(res.latitude, res.longitude)
    },
    fail: () => {
      loadNearby(center.value.lat, center.value.lng)
    },
  })
})

onShow(() => {
  uni.$on('locateLot', (item) => {
    const lat = parseFloat(item.latitude)
    const lng = parseFloat(item.longitude)
    if (!isNaN(lat) && !isNaN(lng)) {
      center.value = { lat, lng }
      scale.value = 18
      selectedLot.value = item
    }
    uni.$off('locateLot')
  })
})

onHide(() => {
  uni.$off('locateLot')
})
</script>

<style scoped>
.container { width: 100%; height: 100vh; }

.map-view {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
}

.nav-float {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: rgba(255,255,255,0.95);
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.10);
}
.nav-inner {
  display: flex; align-items: center;
  padding: 10rpx 24rpx; gap: 16rpx;
  height: 72rpx; box-sizing: border-box;
}
.nav-brand { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.brand-icon-text { font-size: 36rpx; }
.brand-name { font-size: 30rpx; font-weight: bold; color: #1677ff; }
.nav-search-btn {
  flex: 1; display: flex; align-items: center;
  background: #f4f6f9; border-radius: 36rpx;
  padding: 10rpx 24rpx; height: 52rpx;
}
.search-hint { font-size: 26rpx; color: #bbb; }

.loading-tip, .count-tip {
  position: fixed; top: 0; left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6); border-radius: 0 0 24rpx 24rpx;
  padding: 8rpx 28rpx;
  z-index: 50;
}
.tip-text { font-size: 22rpx; color: #fff; }

.locate-btn {
  position: fixed; right: 32rpx; bottom: 200rpx;
  width: 104rpx;
  background: #fff; border-radius: 24rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 14rpx 0;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.15);
  z-index: 50;
  gap: 4rpx;
}
.locate-icon-text { font-size: 44rpx; line-height: 1; text-align: center; }
.locate-label { font-size: 20rpx; color: #333; }

.detail-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25); z-index: 200;
  display: flex; align-items: flex-end;
}
.bottom-sheet {
  background: #fff; width: 100%;
  border-radius: 32rpx 32rpx 0 0;
  padding: 0 0 40rpx;
  box-shadow: 0 -4rpx 32rpx rgba(0,0,0,0.12);
}
.sheet-handle {
  width: 64rpx; height: 8rpx;
  background: #e0e0e0; border-radius: 4rpx;
  margin: 16rpx auto 24rpx;
}
.sheet-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 0 32rpx 16rpx;
}
.sheet-title-wrap { flex: 1; }
.sheet-name { font-size: 36rpx; font-weight: bold; color: #1a1a1a; display: block; margin-bottom: 10rpx; }
.dist-badge {
  display: inline-flex; align-items: center;
  background: #e8f4ff; border-radius: 20rpx;
  padding: 4rpx 16rpx;
}
.dist-text { font-size: 22rpx; color: #1677ff; }
.sheet-close {
  width: 56rpx; height: 56rpx;
  background: #f5f5f5; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.close-icon { font-size: 28rpx; color: #888; }
.sheet-body { padding: 0 32rpx 24rpx; }
.info-row {
  display: flex; align-items: flex-start; gap: 12rpx;
  margin-bottom: 16rpx;
}
.info-icon { font-size: 28rpx; flex-shrink: 0; margin-top: 2rpx; }
.info-text { font-size: 26rpx; color: #555; flex: 1; line-height: 1.5; }
.sheet-actions { display: flex; gap: 20rpx; padding: 0 32rpx; }
.btn-navi {
  flex: 1; height: 88rpx; line-height: 88rpx;
  background: #1677ff; color: #fff;
  border: none; border-radius: 20rpx;
  font-size: 30rpx; font-weight: 500;
}
.btn-call {
  flex: 1; height: 88rpx; line-height: 88rpx;
  background: #fff; color: #1677ff;
  border: 2rpx solid #1677ff; border-radius: 20rpx;
  font-size: 30rpx; font-weight: 500;
}
</style>
