import { createRouter, createWebHistory } from "vue-router";

import Login from "../views/Login.vue";
import Layout from "../views/Layout.vue";
import Dashboard from "../views/Dashboard.vue";
import Accounts from "../views/Accounts.vue";
import Messages from "../views/Messages.vue";
import MessageHistory from "../views/MessageHistory.vue";
import Contacts from "../views/Contacts.vue";
import Users from "../views/Users.vue";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { title: "登录" },
  },
  {
    path: "/",
    component: Layout,
    meta: { title: "管理后台" },
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: Dashboard,
        meta: { title: "仪表盘" },
      },
      {
        path: "accounts",
        name: "Accounts",
        component: Accounts,
        meta: { title: "账号管理" },
      },
      {
        path: "messages",
        name: "Messages",
        component: Messages,
        meta: { title: "发送消息" },
      },
      {
        path: "message-history",
        name: "MessageHistory",
        component: MessageHistory,
        meta: { title: "消息记录" },
      },
      {
        path: "proxies",
        name: "Proxies",
        component: () => import("@/views/Proxies.vue"),
        meta: { title: "代理管理" },
      },
      {
        path: "targets",
        name: "TargetAccounts",
        component: () => import("@/views/TargetAccounts.vue"),
        meta: { title: "目标账号" },
      },
      {
        path: "broadcast",
        name: "Broadcast",
        component: () => import("@/views/Broadcast.vue"),
        meta: { title: "群发任务" },
      },
      {
        path: "chat",
        name: "Chat",
        component: () => import("@/views/Chat.vue"),
        meta: { title: "互聊任务" },
      },
      {
        path: "check-whatsapp",
        name: "CheckWhatsApp",
        component: () => import("@/views/CheckWhatsApp.vue"),
        meta: { title: "检查注册" },
      },
      {
        path: "contacts",
        name: "Contacts",
        component: Contacts,
        meta: { title: "联系人" },
      },
      {
        path: "groups",
        name: "Groups",
        component: () => import("@/views/Groups.vue"),
        meta: { title: "群组管理" },
      },
      {
        path: "users",
        name: "Users",
        component: Users,
        meta: { title: "用户管理" },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  if (to.path !== "/login" && !token) {
    next("/login");
  } else if (to.path === "/login" && token) {
    next("/");
  } else {
    next();
  }
});

export default router;
