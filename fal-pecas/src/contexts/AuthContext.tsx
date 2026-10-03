import {
  AuthNotConfiguredError,
  getSession,
  mapUser,
  onAuthStateChange,
  resetPassword,
  signInWithIdentifier,
  signOut,
  signUp,
} from '@/services/supabase/authService'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { UserProfile } from '@/types'
import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface AuthContextValue {
  user: UserProfile | null
  session: Session | null
  loading: boolean
  isConfigured: boolean
  signIn: (emailOrUsername: string, password: string) => Promise<void>
  signUp: (params: {
    email: string
    password: string
    firstName: string
    lastName: string
    username?: string
    phone?: string
  }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const current = await getSession()
        if (!active) return
        setSession(current)
        setUser(mapUser(current?.user ?? null))
      } catch (err) {
        console.error('[FAL] Erro ao carregar sessão', err)
      } finally {
        if (active) setLoading(false)
      }
    })()

    const unsubscribe = onAuthStateChange((next) => {
      setSession(next)
      setUser(mapUser(next?.user ?? null))
      setLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const handleSignIn = useCallback(async (emailOrUsername: string, password: string) => {
    const result = await signInWithIdentifier({ emailOrUsername, password })
    setSession(result.session)
    setUser(result.user)
  }, [])

  const handleSignUp = useCallback(
    async (params: {
      email: string
      password: string
      firstName: string
      lastName: string
      username?: string
      phone?: string
    }) => {
      const result = await signUp(params)
      setSession(result.session)
      setUser(result.user)
    },
    [],
  )

  const handleSignOut = useCallback(async () => {
    await signOut()
    setSession(null)
    setUser(null)
  }, [])

  const handleReset = useCallback(async (email: string) => {
    await resetPassword(email)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isConfigured: isSupabaseConfigured,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      resetPassword: handleReset,
    }),
    [user, session, loading, handleSignIn, handleSignUp, handleSignOut, handleReset],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export { AuthNotConfiguredError }
