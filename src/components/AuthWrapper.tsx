import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Login from './auth/Login'
import Register from './auth/Register'
import PasswordReset from './auth/PasswordReset'
import RegisterSuccess from './auth/RegisterSuccess'
import EmailConfirmed from './auth/EmailConfirmed'
import Onboarding from './auth/Onboarding'
import Dashboard from './Dashboard'

export function AuthWrapper() {
  const { user, profile, loading, error } = useAuth()
  const [currentView, setCurrentView] = useState<string>('login')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // 初期化完了を待つ
    if (!loading) {
      setIsInitialized(true)
    }
  }, [loading])

  const handleNavigate = (view: string) => {
    setCurrentView(view)
  }

  const handleLoginSuccess = () => {
    // ログイン成功後の処理
    if (user && profile?.onboarding_completed) {
      setCurrentView('dashboard')
    } else if (user && !profile?.onboarding_completed) {
      setCurrentView('onboarding')
    }
  }

  const handleOnboardingComplete = () => {
    setCurrentView('dashboard')
  }

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
          </div>
          <p className="mt-4 text-center text-sm text-slate-600">
            {loading ? '認証情報を確認中...' : 'アプリケーションを初期化中...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-center text-lg font-medium text-gray-900 mb-4">
              認証エラー
            </h2>
            <p className="text-center text-sm text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 認証済みユーザーの場合
  if (user) {
    // オンボーディング未完了の場合
    if (!profile?.onboarding_completed && currentView !== 'onboarding') {
      return <Onboarding onNavigate={handleNavigate} onComplete={handleOnboardingComplete} />
    }
    
    // ダッシュボードを表示
    return <Dashboard />
  }

  // 未認証ユーザーの認証フロー
  switch (currentView) {
    case 'register':
      return <Register onNavigate={handleNavigate} />
    case 'register-success':
      return <RegisterSuccess onNavigate={handleNavigate} />
    case 'email-confirmed':
      return <EmailConfirmed onNavigate={handleNavigate} />
    case 'onboarding':
      return <Onboarding onNavigate={handleNavigate} onComplete={handleOnboardingComplete} />
    case 'password-reset':
      return <PasswordReset onNavigate={handleNavigate} />
    case 'login':
    default:
      return <Login onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />
  }
}

export default AuthWrapper