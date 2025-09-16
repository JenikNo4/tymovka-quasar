import { defineStore } from 'pinia'

export const useAuth = defineStore('auth', {
  state: () => ({
    user: null as null | { id: string; email: string; name?: string },
    token: localStorage.getItem('auth_token') || null, // pokud používáš JWT přístup
  }),
  getters: {
    isLogged: (s) => !!s.user,
  },
  actions: {
    setToken(t: string | null) {
      this.token = t
      if (t) localStorage.setItem('auth_token', t)
      else localStorage.removeItem('auth_token')
    },
    setUser(u: { id: string; email: string; name?: string } | null) {
      this.user = u
    },
  },
})
