import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// ローディング画面を非表示にする関数
const hideLoading = () => {
  const loadingElement = document.getElementById('loading')
  if (loadingElement) {
    loadingElement.style.display = 'none'
  }
}

// React 18の新しいcreateRootを使用
const root = ReactDOM.createRoot(document.getElementById('root')!)

// アプリケーションをレンダリング
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// レンダリング完了後にローディングを非表示
setTimeout(hideLoading, 100)