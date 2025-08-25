import { useState, useEffect } from 'react'
import { supabase, getDocuments, createDocument as createDoc } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Document {
  id: string
  user_id: string
  organization_id: string | null
  application_id: string | null
  type: 'business_report' | 'allowance_detail' | 'expense_settlement' | 'travel_detail' | 'gps_log' | 'monthly_report' | 'annual_report'
  title: string
  content: any
  file_url: string | null
  file_size: number | null
  mime_type: string | null
  status: 'draft' | 'submitted' | 'approved' | 'completed'
  created_at: string
  updated_at: string
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchDocuments()
    } else {
      // デモモードの場合はサンプルデータを表示
      if (localStorage.getItem('demoMode') === 'true') {
        setDocuments([
          {
            id: 'demo-doc-1',
            user_id: 'demo-user-id',
            organization_id: null,
            application_id: null,
            type: 'business_report',
            title: '東京出張報告書_2024年7月',
            content: {},
            file_url: null,
            file_size: null,
            mime_type: null,
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      }
    }
  }, [user])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setDocuments([])
        return
      }

      const data = await getDocuments(user.id)
      setDocuments(data || [])
    } catch (err) {
      console.error('Documents fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const createDocument = async (
    type: string,
    title: string,
    content: any
  ) => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const result = await createDoc(type, title, content, user.id)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      await fetchDocuments()
      return result
    } catch (err) {
      console.error('Document creation error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create document' 
      }
    }
  }

  const updateDocument = async (
    documentId: string,
    updates: Partial<Document>
  ) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single()

      if (error) {
        throw error
      }

      await fetchDocuments()
      return { success: true, document: data }
    } catch (err) {
      console.error('Document update error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update document' 
      }
    }
  }

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (error) {
        throw error
      }

      await fetchDocuments()
      return { success: true }
    } catch (err) {
      console.error('Document deletion error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete document' 
      }
    }
  }

  return {
    documents,
    loading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    refreshDocuments: fetchDocuments
  }
}