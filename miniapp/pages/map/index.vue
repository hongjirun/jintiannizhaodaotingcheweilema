<template>
  <view class="container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-row">
        <view class="nav-brand">
          <text class="brand-icon">🅿</text>
          <text class="brand-name">找停车位</text>
        </view>
        <picker mode="selector" :range="cities" :value="cityIndex" @change="onCityChange" class="city-picker">
          <view class="city-picker-btn">
            <text class="city-name">{{ cities[cityIndex] }}</text>
            <text class="city-arrow">▼</text>
          </view>
        </picker>
        <view class="nav-search-btn" @tap="goSearch">
          <text class="search-icon-text">🔍</text>
          <text class="search-hint">搜索...</text>
        </view>
      </view>
    </view>

    <!-- 地图 -->
    <map
      id="myMap"
      class="map"
      :latitude="center.lat"
      :longitude="center.lng"
      :markers="markers"
      :scale="scale"
      show-location
      enable-zoom
      enable-scroll
      @regionchange="onRegionChange"
      @markertap="onMarkerTap"
      :style="{ top: navHeight + 'px', height: mapHeight + 'px', width: '100%' }"
    />

    <!-- 加载提示 -->
    <view v-if="loading" class="loading-tip">
      <text class="loading-text">🔄 加载中...</text>
    </view>

    <!-- 结果数量提示 -->
    <view v-else-if="markers.length > 0" class="count-tip">
      <text class="count-text">找到 {{ markers.length }} 个停车场</text>
    </view>

    <!-- 底部停车场详情卡片 -->
    <view v-if="selectedLot" class="overlay" @tap="selectedLot = null">
      <view class="bottom-sheet" @tap.stop>
        <view class="sheet-handle"></view>
        <view class="sheet-header">
          <view class="sheet-title-wrap">
            <text class="sheet-name">{{ selectedLot.name }}</text>
            <view class="dist-badge" v-if="distText">
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
          <view class="info-row" v-if="selectedLot.phone">
            <text class="info-icon">📞</text>
            <text class="info-text">{{ selectedLot.phone }}</text>
          </view>
          <view class="info-row" v-if="selectedLot.city">
            <text class="info-icon">🏙</text>
            <text class="info-text">{{ selectedLot.city }}</text>
          </view>
        </view>
        <view class="sheet-actions">
          <button class="btn-navi" @tap="startNavi">
            <text>🧭 一键导航</text>
          </button>
          <button v-if="selectedLot.phone" class="btn-call" @tap="makeCall">
            <text>📞 复制电话</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { parkingRequest } from '@/utils/request'
// marker图标使用本地图片

const sysInfo = uni.getSystemInfoSync()
const statusBarHeight = ref(sysInfo.statusBarHeight || 20)
const navHeight = ref(statusBarHeight.value + 88)
const mapHeight = ref(sysInfo.windowHeight - navHeight.value)

const center = ref({ lat: 23.129, lng: 113.264 })
const scale = ref(15)
const markers = ref([])
const lots = ref([])
const selectedLot = ref(null)
const loading = ref(false)
let regionCenter = null

// 热门城市列表
const cities = [
  '北京市', '上海市', '广州市', '深圳市', '天津市', '重庆市',
  '杭州市', '南京市', '武汉市', '成都市', '西安市', '沈阳市',
  '青岛市', '郑州市', '苏州市', '长沙市', '大连市', '东莞市',
  '佛山市', '无锡市', '宁波市', '厦门市', '福州市', '哈尔滨市',
  '长春市', '石家庄市', '济南市', '太原市', '昆明市', '合肥市',
  '南昌市', '贵阳市', '兰州市', '海口市', '南宁市', '呼和浩特市',
  '乌鲁木齐市', '银川市', '西宁市', '拉萨市', '台北市'
]
const cityIndex = ref(0)

// 城市坐标映射
const cityCoords = {
  '北京市': { lat: 39.9042, lng: 116.4074 },
  '上海市': { lat: 31.2304, lng: 121.4737 },
  '广州市': { lat: 23.1291, lng: 113.2644 },
  '深圳市': { lat: 22.5431, lng: 114.0579 },
  '天津市': { lat: 39.0842, lng: 117.2010 },
  '重庆市': { lat: 29.5630, lng: 106.5516 },
  '杭州市': { lat: 30.2741, lng: 120.1551 },
  '南京市': { lat: 32.0603, lng: 118.7969 },
  '武汉市': { lat: 30.5928, lng: 114.3055 },
  '成都市': { lat: 30.5728, lng: 104.0668 },
  '西安市': { lat: 34.3416, lng: 108.9398 },
  '沈阳市': { lat: 41.8057, lng: 123.4315 },
  '青岛市': { lat: 36.0671, lng: 120.3826 },
  '郑州市': { lat: 34.7466, lng: 113.6253 },
  '苏州市': { lat: 31.2989, lng: 120.5853 },
  '长沙市': { lat: 28.2280, lng: 112.9388 },
  '大连市': { lat: 38.9140, lng: 121.6147 },
  '东莞市': { lat: 23.0210, lng: 113.7520 },
  '佛山市': { lat: 23.0291, lng: 113.1220 }
}

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

function onCityChange(e) {
  cityIndex.value = e.detail.value
  const cityName = cities[cityIndex.value]
  const coords = cityCoords[cityName] || { lat: 23.129, lng: 113.264 }
  center.value = coords
  scale.value = 13
  loadNearby(coords.lat, coords.lng)
}

function locateMe() {
  // 不再使用 wx.getLocation，改用城市选择
  uni.showToast({ title: '请使用上方城市选择', icon: 'none' })
}

async function loadNearby(lat, lng) {
  loading.value = true
  try {
    const res = await parkingRequest.getNearby(lat, lng, 5000)
    if (res.code === 0) renderMarkers(res.data)
  } finally {
    loading.value = false
  }
}

async function loadByRegion() {
  const lat = regionCenter ? regionCenter.lat : center.value.lat
  const lng = regionCenter ? regionCenter.lng : center.value.lng
  loadNearby(lat, lng)
}

function onRegionChange(e) {
  if (e.type === 'end' && e.detail && e.detail.centerLocation) {
    regionCenter = {
      lat: e.detail.centerLocation.latitude,
      lng: e.detail.centerLocation.longitude,
    }
  }
}

function renderMarkers(data) {
  lots.value = data
  markers.value = data.map((item) => ({
    id: Number(item.id),
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    title: item.name,
    iconPath: '/static/marker.png',
    width: 36,
    height: 36,
    // 禁用默认 callout，使用自定义底部卡片
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
  // 默认加载北京数据
  loadNearby(39.9042, 116.4074)
})
</script>

<style scoped>
.container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #f0f2f5; }

/* 导航栏 */
.nav-bar {
  position: fixed; top: 0; left: 0; right: 0;
  background: #ffffff;
  z-index: 100;
}
.nav-row {
  display: flex; align-items: center;
  padding: 12rpx 24rpx;
  gap: 16rpx;
  height: 72rpx;
  box-sizing: border-box;
}
.nav-brand {
  display: flex; align-items: center; gap: 8rpx;
  flex-shrink: 0;
}
.brand-icon { font-size: 36rpx; }
.brand-name { font-size: 30rpx; font-weight: bold; color: #1677ff; }
.city-picker {
  flex-shrink: 0;
}
.city-picker-btn {
  display: flex; align-items: center; gap: 6rpx;
  background: #f4f6f9; border-radius: 36rpx;
  padding: 10rpx 20rpx;
  height: 48rpx;
  box-sizing: border-box;
}
.city-name { font-size: 26rpx; color: #333; font-weight: 500; }
.city-arrow { font-size: 20rpx; color: #999; }
.nav-search-btn {
  flex: 1; display: flex; align-items: center; gap: 10rpx;
  background: #f4f6f9; border-radius: 36rpx;
  padding: 10rpx 20rpx;
  height: 48rpx;
}
.search-icon-text { font-size: 28rpx; }
.search-hint { font-size: 26rpx; color: #bbb; flex: 1; }

/* 地图 */
.map { position: fixed; left: 0; right: 0; width: 100%; }

/* 加载/数量提示 */
.loading-tip, .count-tip {
  position: fixed; top: 0; left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  border-radius: 0 0 24rpx 24rpx;
  padding: 8rpx 28rpx;
  z-index: 150;
}
.loading-text, .count-text { font-size: 22rpx; color: #fff; }

/* 右侧浮动按钮组 */
.float-btns {
  position: fixed; right: 24rpx; bottom: 280rpx;
  display: flex; flex-direction: column; gap: 16rpx;
  z-index: 50;
}
.float-btn {
  background: #fff;
  border-radius: 20rpx;
  width: 96rpx;
  padding: 16rpx 0;
  display: flex; flex-direction: column; align-items: center; gap: 6rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.12);
}
.float-btn-icon { font-size: 36rpx; }
.float-btn-label { font-size: 20rpx; color: #555; }

/* 底部详情浮层 */
.overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25);
  z-index: 200;
  display: flex; align-items: flex-end;
}
.bottom-sheet {
  background: #fff;
  width: 100%;
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
.sheet-actions {
  display: flex; gap: 20rpx;
  padding: 0 32rpx;
}
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
