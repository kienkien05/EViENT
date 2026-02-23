import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  full_name: string
  role: 'user' | 'admin'
  avatar_url?: string
  phone_number?: string
  facebook_url?: string
  gender?: 'male' | 'female' | 'other'
  address?: string
  date_of_birth?: string
  created_at?: string
  is_active?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (data: { token: string; user: User }) => void
  logout: () => void
  updateUser: (data: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: ({ token, user }) => {
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
      },

      updateUser: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }))
      },
    }),
    {
      name: 'evient-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
