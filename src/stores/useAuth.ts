import { defineStore } from 'pinia'

// Minimální typy pro to, co potřebuje header & menu
type TeamMini = {
  id: string
  name: string
  description?: string | null
  isAdmin: boolean
  viewerCanManage: boolean
  viewerCanInvite: boolean
  viewerCanDelete: boolean
  viewerCanLeave: boolean
}
type User = {
  email: string
  firstName: string
  lastName: string
  nickname: string | null
  dateOfBirth: string | null
  preferredLanguage: 'cs-CZ' | 'en-US' | null
  preferredPositions: string[]
  roles: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  teams: TeamMini[]
}

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> }
type EmailAuthResponse = { success: boolean; message: string }

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
              dateOfBirth
              preferredLanguage
              preferredPositions
              roles
              teams {
                id
                name
                description
                isAdmin
                viewerCanManage
                viewerCanInvite
                viewerCanDelete
                viewerCanLeave
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
          const preferredLanguage =
            userData.preferredLanguage === 'cs-CZ' || userData.preferredLanguage === 'en-US'
              ? userData.preferredLanguage
              : null
          this.user = {
            ...userData,
            nickname: userData.nickname ?? null,
            dateOfBirth: userData.dateOfBirth ?? null,
            preferredLanguage,
            preferredPositions: Array.isArray(userData.preferredPositions)
              ? userData.preferredPositions
              : ['PLAYER'],
            roles: userData.roles,
            teams: userData.teams,
          }
          if (preferredLanguage) {
            localStorage.setItem('tymovka.locale', preferredLanguage)
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

    async refreshMe() {
      this.meLoaded = false
      await this.fetchMe()
    },

    async updatePreferredLanguage(language: 'cs-CZ' | 'en-US') {
      if (!this.user) return

      const previous = this.user.preferredLanguage
      this.user.preferredLanguage = language

      try {
        const mutation = `
          mutation($preferredLanguage: String) {
            updateProfile(preferredLanguage: $preferredLanguage) {
              preferredLanguage
            }
          }
        `

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            query: mutation,
            variables: { preferredLanguage: language },
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result: GraphQlResponse<{ updateProfile: { preferredLanguage?: string | null } }> =
          await response.json()
        if (result.errors) {
          throw new Error(result.errors[0]?.message || 'Failed to update preferred language')
        }

        const saved = result.data?.updateProfile?.preferredLanguage
        if (saved === 'cs-CZ' || saved === 'en-US') {
          this.user.preferredLanguage = saved
          localStorage.setItem('tymovka.locale', saved)
        }
      } catch (error) {
        this.user.preferredLanguage = previous
        throw error
      }
    },

    async updateProfile(input: {
      firstName?: string | null
      lastName?: string | null
      nickname?: string | null
      dateOfBirth?: string | null
      preferredPositions?: string[]
    }) {
      if (!this.user) return
      const previousFirstName = this.user.firstName
      const previousLastName = this.user.lastName
      const previousNickname = this.user.nickname
      const previousDateOfBirth = this.user.dateOfBirth
      const previousPositions = [...(this.user.preferredPositions ?? [])]

      if (Object.prototype.hasOwnProperty.call(input, 'firstName')) {
        this.user.firstName = input.firstName ?? ''
      }
      if (Object.prototype.hasOwnProperty.call(input, 'lastName')) {
        this.user.lastName = input.lastName ?? ''
      }
      if (Object.prototype.hasOwnProperty.call(input, 'nickname')) {
        this.user.nickname = input.nickname ?? null
      }
      if (Object.prototype.hasOwnProperty.call(input, 'dateOfBirth')) {
        this.user.dateOfBirth = input.dateOfBirth ?? null
      }
      if (Array.isArray(input.preferredPositions)) {
        this.user.preferredPositions = input.preferredPositions
      }

      try {
        const mutation = `
          mutation(
            $firstName: String
            $lastName: String
            $nickname: String
            $dateOfBirth: String
            $preferredPositions: [PreferredPosition!]
          ) {
            updateProfile(
              firstName: $firstName
              lastName: $lastName
              nickname: $nickname
              dateOfBirth: $dateOfBirth
              preferredPositions: $preferredPositions
            ) {
              firstName
              lastName
              nickname
              dateOfBirth
              preferredPositions
            }
          }
        `

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            query: mutation,
            variables: {
              firstName: input.firstName,
              lastName: input.lastName,
              nickname: input.nickname,
              dateOfBirth: input.dateOfBirth,
              preferredPositions: input.preferredPositions,
            },
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result: GraphQlResponse<{
          updateProfile: {
            firstName?: string | null
            lastName?: string | null
            nickname?: string | null
            dateOfBirth?: string | null
            preferredPositions?: string[] | null
          }
        }> = await response.json()

        if (result.errors) {
          throw new Error(result.errors[0]?.message || 'Failed to update profile')
        }

        const saved = result.data?.updateProfile
        if (saved) {
          this.user.firstName = saved.firstName ?? ''
          this.user.lastName = saved.lastName ?? ''
          this.user.nickname = saved.nickname ?? null
          this.user.dateOfBirth = saved.dateOfBirth ?? null
          this.user.preferredPositions = Array.isArray(saved.preferredPositions)
            ? saved.preferredPositions
            : ['PLAYER']
        }
      } catch (error) {
        this.user.firstName = previousFirstName
        this.user.lastName = previousLastName
        this.user.nickname = previousNickname
        this.user.dateOfBirth = previousDateOfBirth
        this.user.preferredPositions = previousPositions
        throw error
      }
    },

    loginWithGoogle() {
      window.location.href = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/google`
    },

    async loginWithEmail(email: string, password: string) {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/email/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const payload = await response.json() as EmailAuthResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `HTTP error! status: ${response.status}`)
      }

      await this.refreshMe()
    },

    async registerWithEmail(email: string, password: string, confirmPassword: string): Promise<EmailAuthResponse> {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/email/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, confirmPassword }),
      })

      const payload = await response.json() as EmailAuthResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `HTTP error! status: ${response.status}`)
      }

      return payload
    },

    async resendEmailVerification(email: string): Promise<EmailAuthResponse> {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/email/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })

      const payload = await response.json() as EmailAuthResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `HTTP error! status: ${response.status}`)
      }

      return payload
    },

    async forgotPassword(email: string): Promise<EmailAuthResponse> {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/email/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })

      const payload = await response.json() as EmailAuthResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `HTTP error! status: ${response.status}`)
      }

      return payload
    },

    async resetPassword(token: string, password: string, confirmPassword: string): Promise<EmailAuthResponse> {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/email/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token, password, confirmPassword }),
      })

      const payload = await response.json() as EmailAuthResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `HTTP error! status: ${response.status}`)
      }

      return payload
    },
  },
})
