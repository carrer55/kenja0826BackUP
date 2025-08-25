import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  phone: string | null
  position: string | null
  department: string | null
  role: string | null
  default_organization_id: string | null
  avatar_url: string | null
  onboarding_completed: boolean | null
  created_at: string
  updated_at: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    // デモモードチェック
    const demoMode = localStorage.getItem('demoMode') === 'true'
    if (demoMode) {
      const demoSession = localStorage.getItem('demoSession')
      const demoProfile = localStorage.getItem('userProfile')
      
      if (demoSession && demoProfile) {
        try {
          const sessionData = JSON.parse(demoSession)
          const profileData = JSON.parse(demoProfile)
          if (mounted) {
            setUser(sessionData.user)
            setProfile(profileData)
          }
        } catch (err) {
          console.error('Demo mode data parse error:', err)
          localStorage.removeItem('demoMode')
          localStorage.removeItem('demoSession')
          localStorage.removeItem('userProfile')
        }
      }
      if (mounted) setLoading(false)
      return
    }

    // 通常の認証処理
    const getInitialUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!mounted) return

        if (error) throw error
        setUser(user)
      } catch (err) {
        if (!mounted) return
        console.error('Initial auth error:', err)
        setError(err instanceof Error ? err.message : 'Auth error')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    getInitialUser()

    // 認証状態変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth event:', event)
        setUser(session?.user || null)
        setError(null)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // メモ化された認証メソッド
  const authMethods = useMemo(() => ({
    signIn: async (email: string, password: string) => {
      setLoading(true)
      setError(null)
      
      try {
        // デモアカウントの処理
        if (email === 'demo' && password === 'pass9981') {
          const demoProfile = {
            id: 'demo-user-id',
            email: 'demo',
            full_name: 'デモユーザー',
            company_name: '株式会社デモ',
            position: '代表取締役',
            phone: '090-0000-0000',
            department: '経営企画部',
            role: 'admin',
            default_organization_id: null,
            avatar_url: null,
            onboarding_completed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          localStorage.setItem('userProfile', JSON.stringify(demoProfile));
          localStorage.setItem('demoMode', 'true');
          
          const demoSession = {
            user: {
              id: 'demo-user-id',
              email: 'demo',
              email_confirmed_at: new Date().toISOString()
            }
          };
          
          localStorage.setItem('demoSession', JSON.stringify(demoSession));
          
          setUser(demoSession.user as User);
          setProfile(demoProfile);
          
          return { success: true };
        }

        // 通常のログイン処理
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) throw error
        return { success: true }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Sign in failed'
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setLoading(false)
      }
    },

    signOut: async () => {
      try {
        // デモモードの場合
        if (localStorage.getItem('demoMode') === 'true') {
          localStorage.clear()
          setUser(null)
          setProfile(null)
          return { success: true }
        }

        // 通常のログアウト処理
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        
        localStorage.clear()
        setUser(null)
        setProfile(null)
        return { success: true }
      } catch (err) {
        console.error('Sign out error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Sign out failed'
        return { success: false, error: errorMessage }
      }
    }
  }), [])

  return {
    user,
    profile,
    loading,
    error,
    ...authMethods,
    isAuthenticated: !!user
  }
}