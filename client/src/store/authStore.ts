import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useBusinessStore } from './businessStore'
import { clearLocalUserData } from '@/lib/local-user-data'

export interface Account {
  id: string
  email: string
  name: string
}

interface AuthState {
  token: string | null
  user: Account | null
  signIn: (token: string, user: Account) => void
  signOut: () => void
}

/**
 * Who is signed in.
 *
 * The token is kept in the browser so a refresh does not sign anyone out. It
 * expires on its own after a month, and the server checks it on every request
 * — nothing here is trusted for anything but deciding what to show.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      signIn: (token, user) => set({ token, user }),
      // A browser can retain a previous customer's draft. Remove that data as
      // soon as their session ends so it is never offered to the next visitor.
      signOut: () => {
        useBusinessStore.getState().reset()
        clearLocalUserData()
        set({ token: null, user: null })
      },
    }),
    { name: 'sitebuilder-auth' },
  ),
)

/** Read outside React, by the API layer, which is not a component. */
export function authToken(): string | null {
  return useAuthStore.getState().token
}
