<template>
  <view class="page">
    <view class="section">
      <view class="section-title">功能服务</view>
      <view class="menu-list">
        <view class="menu-item" @tap="goToReport">
          <text class="menu-icon">🅿️</text>
          <text class="menu-label">免费停车点位上报</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="openGroupChat">
          <text class="menu-icon">💬</text>
          <text class="menu-label">加入群聊</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 底部说明 -->
    <view class="footer">
      <text class="footer-text">数据来源：腾讯位置服务</text>
      <text class="footer-text">停车场信息仅供参考，以现场为准</text>
    </view>
  </view>
</template>

<script setup>
function goToReport() {
  uni.navigateTo({ url: '/pages/report/index' })
}

function openGroupChat() {
  uni.showModal({
    title: '加入停车交流群',
    content: '扫描群二维码加入停车技巧分享群，与更多车主交流经验。',
    confirmText: '查看二维码',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        uni.previewImage({
          urls: ['/static/group-qrcode.png'],
          current: '/static/group-qrcode.png',
        })
      }
    }
  })
}
</script>

<style scoped>
.page { background: #f4f6f9; min-height: 100vh; }

.header {
  display: flex; align-items: center;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  padding: 60rpx 40rpx 48rpx;
  gap: 28rpx;
}
.avatar-wrap {
  width: 112rpx; height: 112rpx;
  background: rgba(255,255,255,0.25);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.avatar-icon { font-size: 56rpx; }
.user-info { flex: 1; }
.user-name { font-size: 36rpx; font-weight: bold; color: #fff; display: block; margin-bottom: 8rpx; }
.user-sub { font-size: 24rpx; color: rgba(255,255,255,0.8); }

.section { padding: 24rpx 24rpx 0; }
.section-title { font-size: 24rpx; color: #999; padding: 0 8rpx 12rpx; }

.menu-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
}
.menu-item {
  display: flex; align-items: center;
  padding: 32rpx 28rpx;
  gap: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.menu-item:last-child { border-bottom: none; }
.menu-icon { font-size: 36rpx; flex-shrink: 0; width: 48rpx; text-align: center; }
.menu-label { flex: 1; font-size: 30rpx; color: #222; }
.menu-value { font-size: 26rpx; color: #999; }
.menu-arrow { font-size: 36rpx; color: #ccc; }

.qrcode-card {
  background: #fff; border-radius: 20rpx;
  padding: 32rpx 28rpx;
  display: flex; align-items: center; gap: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
}
.qrcode-wrap {
  width: 160rpx; height: 160rpx; flex-shrink: 0;
  background: #f4f6f9; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.qrcode-img { width: 160rpx; height: 160rpx; }
.qrcode-info { flex: 1; }
.qrcode-title { font-size: 30rpx; font-weight: bold; color: #1a1a1a; display: block; margin-bottom: 12rpx; }
.qrcode-sub { font-size: 24rpx; color: #888; display: block; line-height: 1.7; }

.footer {
  padding: 48rpx 0 60rpx;
  display: flex; flex-direction: column; align-items: center; gap: 8rpx;
}
.footer-text { font-size: 22rpx; color: #bbb; }
</style>
