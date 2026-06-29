import { createRouter, createWebHistory } from 'vue-router'

// 直接导入组件（不使用别名）
import Login from '../views/Login.vue'
import Layout from '../views/Layout.vue'
import Dashboard from '../views/Dashboard.vue'
import Accounts from '../views/Accounts.vue'
import Messages from '../views/Messages.vue'
import Users from '../views/Users.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/',
    component: Layout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'accounts',
        name: 'Accounts',
        component: Accounts
      },
      {
        path: 'messages',
        name: 'Messages',
        component: Messages
      },
      {
        path: 'users',
        name: 'Users',
        component: Users
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
