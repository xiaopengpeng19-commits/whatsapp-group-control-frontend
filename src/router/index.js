import { createRouter, createWebHistory } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";

// 引入 Icon
import {
  DataLine,
  Iphone,
  ChatDotRound,
  Document,
  Connection,
  User,
  Setting,
  Search,
  Promotion,
  ChatLineSquare,
  Sunny,
  Picture,
  Key,
} from "@element-plus/icons-vue";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
    meta: { title: "登录" },
  },
  {
    path: "/",
    component: () => import("../views/Layout.vue"),
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("../views/Dashboard.vue"),
        meta: { title: "仪表盘", icon: DataLine, roles: [1, 2, 3] }, // 所有人都能看
      },
      {
        path: "accounts",
        name: "Accounts",
        component: () => import("../views/Accounts.vue"),
        meta: { title: "账号管理", icon: Iphone, roles: [1, 2] }, // 管理员、经理
      },
      {
        path: "messages",
        name: "Messages",
        component: () => import("../views/Messages.vue"),
        meta: { title: "发送消息", icon: ChatDotRound, roles: [1, 2, 3] },
      },
      {
        path: "message-history",
        name: "MessageHistory",
        component: () => import("../views/MessageHistory.vue"),
        meta: { title: "消息记录", icon: Document, roles: [1, 2, 3] },
      },
      {
        path: "proxies",
        name: "Proxies",
        component: () => import("@/views/Proxies.vue"),
        meta: { title: "代理管理", icon: Connection, roles: [1] }, // 仅管理员
      },
      {
        path: "targets",
        name: "TargetAccounts",
        component: () => import("@/views/TargetAccounts.vue"),
        meta: { title: "目标账号", icon: User, roles: [1, 2] },
      },
      {
        path: "broadcast",
        name: "Broadcast",
        component: () => import("@/views/Broadcast.vue"),
        meta: { title: "群发任务", icon: Promotion, roles: [1, 2] },
      },
      {
        path: "chat",
        name: "Chat",
        component: () => import("@/views/Chat.vue"),
        meta: { title: "互聊任务", icon: ChatLineSquare, roles: [1, 2] },
      },
      {
        path: "nurture",
        name: "Nurture",
        component: () => import("@/views/Nurture.vue"),
        meta: { title: "养号任务", icon: Sunny, roles: [1, 2] },
      },
      {
        path: "check-whatsapp",
        name: "CheckWhatsApp",
        component: () => import("@/views/CheckWhatsApp.vue"),
        meta: { title: "检查注册", icon: Search, roles: [1, 2, 3] },
      },
      {
        path: "contacts",
        name: "Contacts",
        component: () => import("../views/Contacts.vue"),
        meta: { title: "联系人", icon: User, roles: [1, 2, 3] },
      },
      {
        path: "groups",
        name: "Groups",
        component: () => import("@/views/Groups.vue"),
        meta: { title: "群组管理", icon: Connection, roles: [1, 2] },
      },
      {
        path: "group-chat",
        name: "GroupChat",
        component: () => import("@/views/GroupChat.vue"),
        meta: { title: "群聊任务", icon: ChatDotRound, roles: [1, 2] },
      },
      {
        path: "ws-groups",
        name: "WSGroups",
        component: () => import("@/views/WSGroups.vue"),
        meta: { title: "WS群管理", icon: Connection, roles: [1, 2] },
      },
      {
        path: "auto-reply",
        name: "AutoReply",
        component: () => import("@/views/AutoReply.vue"),
        meta: { title: "自动回复", icon: ChatDotRound, roles: [1, 2] },
      },
      {
        path: "avatar-materials",
        name: "AvatarMaterials",
        component: () => import("@/views/AvatarMaterials.vue"),
        meta: { title: "头像素材", icon: Picture, roles: [1, 2] },
      },
      {
        path: "pairing-code",
        name: "PairingCode",
        component: () => import("@/views/PairingCode.vue"),
        meta: { title: "生成配对码", icon: Key, roles: [1, 2] },
      },
      {
        path: "users",
        name: "Users",
        component: () => import("../views/Users.vue"),
        meta: { title: "用户管理", icon: Setting, roles: [1] }, // 仅管理员
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ✅ 路由守卫：配合 Token 和角色拦截
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  const userInfoStr = localStorage.getItem("userInfo");

  if (to.path !== "/login" && !token) {
    next("/login");
  } else if (to.path === "/login" && token) {
    next("/");
  } else {
    // 已登录状态，校验角色访问权限
    if (token && userInfoStr && to.meta?.roles) {
      const userInfo = JSON.parse(userInfoStr);
      const userRole = userInfo.role;

      if (!to.meta.roles.includes(userRole)) {
        // 如果没有权限，强制踢回仪表盘
        ElMessage.warning("您没有权限访问该页面");
        next("/dashboard");
        return;
      }
    }
    next();
  }
});

export default router;
