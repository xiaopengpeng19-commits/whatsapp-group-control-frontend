// frontend/src/stores/account.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useAccountStore = defineStore('account', () => {
  const accounts = ref([])
  const loading = ref(false)

  const fetchAccounts = async () => {
    loading.value = true
    try {
      const res = await api.whatsapp.getAccounts()
      if (res.code === 0) {
        accounts.value = res.data
      }
    } finally {
      loading.value = false
    }
  }

  const addAccount = async (accountData) => {
    const res = await api.whatsapp.addAccount(accountData)
    if (res.code === 0) {
      await fetchAccounts()
    }
    return res
  }

  const deleteAccount = async (account) => {
    const res = await api.whatsapp.deleteAccount(account)
    if (res.code === 0) {
      await fetchAccounts()
    }
    return res
  }

  const online = async (account) => {
    const res = await api.whatsapp.online(account)
    if (res.code === 0) {
      await fetchAccounts()
    }
    return res
  }

  const offline = async (account) => {
    const res = await api.whatsapp.offline(account)
    if (res.code === 0) {
      await fetchAccounts()
    }
    return res
  }

  return {
    accounts,
    loading,
    fetchAccounts,
    addAccount,
    deleteAccount,
    online,
    offline
  }
})