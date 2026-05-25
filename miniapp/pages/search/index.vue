<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="input-wrap">
        <text class="search-icon">🔍</text>
        <input
          v-model="keyword"
          placeholder="输入停车场名称或地址"
          class="input"
          confirm-type="search"
          @confirm="doSearch"
          :focus="true"
        />
        <text v-if="keyword" class="clear-btn" @tap="clearKeyword">✕</text>
      </view>
      <text class="cancel-btn" @tap="uni.navigateBack()">取消</text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-wrap">
      <text class="state-icon">🔄</text>
      <text class="state-text">搜索中...</text>
    </view>

    <!-- 空结果 -->
    <view v-else-if="searched && list.length === 0" class="state-wrap">
      <text class="state-icon">🅿</text>
      <text class="state-title">未找到停车场</text>
      <text class="state-sub">换个关键词试试，如「北京西站停车场」</text>
    </view>

    <!-- 初始未搜索 -->
    <view v-else-if="!searched && !loading" class="state-wrap">
      <text class="state-icon">🗺</text>
      <text class="state-title">搜索附近停车场</text>
      <text class="state-sub">输入停车场名称、地址或城市</text>
    </view>

    <!-- 搜索结果列表 -->
    <scroll-view v-else scroll-y class="result-list">
      <view class="result-header">
        <text class="result-count">共找到 {{ list.length }} 个结果</text>
      </view>
      <view
        v-for="item in list"
        :key="item.id"
        class="result-item"
        @tap="goMap(item)"
      >
        <view class="item-left">
          <view class="item-icon-wrap">
            <text class="item-icon">🅿</text>
          </view>
        </view>
        <view class="item-body">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-addr">{{ item.address || item.city || '暂无地址' }}</text>
          <view class="item-tags">
            <view v-if="item.city" class="tag tag-city">{{ item.city }}</view>
          </view>
        </view>
        <view class="item-right">
          <view class="navi-btn" @tap.stop="navi(item)">
            <text class="navi-icon">🧭</text>
            <text class="navi-text">导航</text>
          </view>
        </view>
      </view>
      <view class="list-bottom-pad"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { parkingRequest } from '@/utils/request'

const keyword = ref('')
const list = ref([])
const loading = ref(false)
const searched = ref(false)

function clearKeyword() {
  keyword.value = ''
  list.value = []
  searched.value = false
}

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return
  loading.value = true
  searched.value = false
  list.value = []
  try {
    const res = await parkingRequest.search(kw)
    if (res.code === 0) list.value = res.data
    searched.value = true
  } finally {
    loading.value = false
  }
}

function goMap(item) {
  uni.switchTab({
    url: '/pages/map/index',
    success: () => {
      uni.$emit('locateLot', item)
    },
  })
}

function navi(item) {
  uni.openLocation({
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    name: item.name,
    address: item.address || '',
  })
}
</script>

<style scoped>
.page { background: #f4f6f9; min-height: 100vh; }

/* 搜索栏 */
.search-bar {
  display: flex; align-items: center;
  padding: 16rpx 24rpx;
  background: #fff;
  gap: 16rpx;
  position: sticky; top: 0; z-index: 10;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
}
.input-wrap {
  flex: 1; display: flex; align-items: center;
  background: #f4f6f9; border-radius: 36rpx;
  padding: 14rpx 24rpx; gap: 10rpx;
}
.search-icon { font-size: 28rpx; }
.input { flex: 1; font-size: 28rpx; background: transparent; color: #222; }
.clear-btn { color: #bbb; font-size: 30rpx; padding: 0 4rpx; }
.cancel-btn { font-size: 28rpx; color: #1677ff; white-space: nowrap; flex-shrink: 0; }

/* 空状态 */
.state-wrap {
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 48rpx 0;
  gap: 16rpx;
}
.state-icon { font-size: 96rpx; }
.state-title { font-size: 32rpx; font-weight: bold; color: #333; margin-top: 8rpx; }
.state-sub { font-size: 26rpx; color: #999; text-align: center; line-height: 1.6; }

/* 结果列表 */
.result-list { height: 100vh; }
.result-header {
  padding: 20rpx 32rpx 12rpx;
}
.result-count { font-size: 24rpx; color: #999; }

.result-item {
  display: flex; align-items: center;
  background: #fff; padding: 24rpx 28rpx;
  margin: 0 24rpx 16rpx;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  gap: 20rpx;
}
.item-left { flex-shrink: 0; }
.item-icon-wrap {
  width: 80rpx; height: 80rpx;
  background: #e8f4ff; border-radius: 20rpx;
  display: flex; align-items: center; justify-content: center;
}
.item-icon { font-size: 40rpx; }
.item-body { flex: 1; min-width: 0; }
.item-name {
  font-size: 30rpx; font-weight: bold; color: #1a1a1a;
  display: block; margin-bottom: 8rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.item-addr {
  font-size: 24rpx; color: #888; display: block; margin-bottom: 10rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.item-tags { display: flex; gap: 8rpx; flex-wrap: wrap; }
.tag {
  font-size: 20rpx; padding: 4rpx 14rpx;
  border-radius: 16rpx;
}
.tag-city { background: #f0f7ff; color: #1677ff; }

.item-right { flex-shrink: 0; }
.navi-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4rpx;
  background: #1677ff; border-radius: 16rpx;
  padding: 14rpx 20rpx; min-width: 80rpx;
}
.navi-icon { font-size: 32rpx; }
.navi-text { font-size: 20rpx; color: #fff; }

.list-bottom-pad { height: 40rpx; }
</style>
