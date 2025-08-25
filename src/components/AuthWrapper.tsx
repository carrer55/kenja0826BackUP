import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import Login from './auth/Login'
import Register from './auth/Register'
import RegisterSuccess from './auth/RegisterSuccess'
import EmailConfirmed from './auth/EmailConfirmed'
import Onboarding from './auth/Onboarding'
import PasswordReset from './auth/PasswordReset'
import Dashboard from './Dashboard'

interface AuthWrapperProps {
  children?: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<string>('login')

  const checkAuth = useCallback(async () => {
    try {
      setError(null)
      
      // デモモードのチェック
      const demoMode = localStorage.getItem('demoMode')
      const demoSession = localStorage.getItem('demoSession')
      
      if (demoMode === 'true' && demoSession) {
        try {
          const session = JSON.parse(demoSession)
          const demoProfile = JSON.parse(localStorage.getItem('userProfile') || '{}')
          
          setUser(session.user)
          setProfile(demoProfile)
          setLoading(false)
          return
        } catch (error) {
          console.error('Demo session parse error:', error)
          localStorage.removeItem('demoMode')
          localStorage.removeItem('demoSession')
          localStorage.removeItem('userProfile')
        }
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth check error:', authError)
        setError(authError.message)
        setUser(null)
        setProfile(null)
      } else {
        setUser(user)
        
        if (user) {
          // プロフィール取得
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .single()

            if (profileError) {
              console.error('Profile fetch error:', profileError)
              setProfile(null)
            } else {
              setProfile(profileData)
            }
          } catch (profileError) {
            console.error('Profile fetch error:', profileError)
            setProfile(null)
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Auth check error:', err)
      setError(errorMessage)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          
          // プロフィール取得
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!profileError) {
              setProfile(profileData)
            }
          } catch (error) {
            console.error('Profile fetch on sign in error:', error)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
        
        setLoading(false)
        setError(null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [checkAuth])

  const navigateToView = (view: string) => {
    setCurrentView(view)
  }

  const handleLoginSuccess = () => {
    // 認証状態は onAuthStateChange で自動更新される
  }

  const handleOnboardingComplete = () => {
    checkAuth() // プロフィール情報を再取得
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-navy-600 to-navy-800 flex items-center justify-center animate-pulse">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <strong className="font-bold">エラー: </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // 認証済みユーザーの場合
  if (user) {
    // プロフィールが存在しない、またはオンボーディングが未完了の場合
    if (!profile || !profile.onboarding_completed) {
      if (currentView === 'onboarding' || !profile) {
        return <Onboarding onNavigate={navigateToView} onComplete={handleOnboardingComplete} />
      }
    }
    
    // 認証完了 - ダッシュボードを表示
    return <Dashboard />
  }

  // 未認証ユーザーの場合
  switch (currentView) {
    case 'register':
      return <Register onNavigate={navigateToView} />
    case 'register-success':
      return <RegisterSuccess onNavigate={navigateToView} />
    case 'email-confirmed':
      return <EmailConfirmed onNavigate={navigateToView} />
    case 'onboarding':
      return <Onboarding onNavigate={navigateToView} onComplete={handleOnboardingComplete} />
    case 'password-reset':
      return <PasswordReset onNavigate={navigateToView} />
    default:
      return <Login onNavigate={navigateToView} onLoginSuccess={handleLoginSuccess} />
  }
}

export default AuthWrapper