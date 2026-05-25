<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo">
        <span v-if="!collapsed">🅿 停车位管理</span>
        <span v-else>🅿</span>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        @click="handleMenuClick"
      >
        <a-menu-item key="/dashboard">
          <template #icon><DashboardOutlined /></template>
          数据概览
        </a-menu-item>
        <a-menu-item key="/parking">
          <template #icon><EnvironmentOutlined /></template>
          停车场管理
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <a-layout>
      <a-layout-header style="background:#fff; padding: 0 16px; display:flex; align-items:center; justify-content:flex-end; box-shadow: 0 1px 4px rgba(0,21,41,.08)">
        <a-dropdown>
          <a-button type="text">
            <UserOutlined /> {{ username }}
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="handleLogout">退出登录</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-layout-header>

      <a-layout-content style="margin: 16px; overflow: auto">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  DashboardOutlined, EnvironmentOutlined,
  UserOutlined, DownOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const selectedKeys = ref([route.path])
const username = localStorage.getItem('username') || 'admin'

watch(() => route.path, (p) => { selectedKeys.value = [p] })

function handleMenuClick({ key }) {
  router.push(key)
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  router.push('/login')
}
</script>

<style scoped>
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
}
</style>
