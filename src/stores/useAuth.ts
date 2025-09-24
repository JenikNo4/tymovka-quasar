import { defineStore } from 'pinia'
import { apiGet } from 'src/utils/api'

// Minimální typy pro to, co potřebuje header & menu
type TeamMini = { id: string; name: string; isAdmin: boolean; viewerCanManage: boolean }
type User = {
  email: string
  firstName: string
  lastName: string
  nickname?: string | null
  roles: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  teams: TeamMini[]
}

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }

export const useAuth = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    meLoaded: false,
  }),
  getters: {
    isLogged: (s) => !!s.user,
    isSuperAdmin: (s) => s.user?.roles === 'SUPER_ADMIN',
    isAdmin: (s) => s.user?.roles === 'SUPER_ADMIN' || (s.user?.teams ?? []).some(t => t.isAdmin || t.viewerCanManage),
    isAnyTeamAdmin: (s) => (s.user?.teams ?? []).some(t => t.isAdmin || t.viewerCanManage),
  },
  actions: {
    async fetchMe() {
      if (this.meLoaded) return

      try {
        // Volání GraphQL query pro načtení uživatelských dat
        const query = `
          query {
            loggedUser {
              firstName
              lastName
              email
              nickname
              roles
              teams {
                id
                name
                viewerCanManage
              }
            }
          }
        `

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ query })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result: GraphQlResponse<{ loggedUser: User }> = await response.json()

        if (result.errors) {
          console.error('GraphQL errors:', result.errors)
          this.user = null
        } else if (result.data?.loggedUser) {
          // Mapování z GraphQL response na naší User type
          const userData = result.data.loggedUser
          this.user = {
            ...userData,
            roles: userData.roles, // GraphQL vrací 'roles', my očekáváme 'role'
            teams: userData.teams.map(team => ({
              ...team,
              isAdmin: team.viewerCanManage // dočasné mapování
            }))
          }
        } else {
          this.user = null
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
        this.user = null
      } finally {
        this.meLoaded = true
      }
    },

    async logout() {
      try {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/logout`, {
          method: 'POST',
          credentials: 'include',
        })
      } catch (err) {
        console.warn('Logout failed', err)
      }
      this.user = null
      this.meLoaded = false
    },

    loginWithGoogle() {
      window.location.href = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/google`
    },
  },
})
