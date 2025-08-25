import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Application {
  id: string
  user_id: string
  organization_id: string | null
  type: 'business_trip' | 'expense'
  title: string
  description: string | null
  data: any
  total_amount: number
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'returned'
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchApplications()
    } else {
      // デモモードの場合はサンプルデータを表示
      if (localStorage.getItem('demoMode') === 'true') {
        setApplications([
          {
            id: 'demo-app-1',
            user_id: 'demo-user-id',
            organization_id: null,
            type: 'business_trip',
            title: '東京出張申請',
            description: 'クライアント訪問',
            data: {},
            total_amount: 52500,
            status: 'approved',
            submitted_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            approved_by: null,
            rejection_reason: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      }
    }
  }, [user])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setApplications([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Applications fetch error:', fetchError)
        throw fetchError
      }

      setApplications(data || [])
    } catch (err) {
      console.error('Applications fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch applications')
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const createApplication = async (
    type: 'business_trip' | 'expense',
    title: string,
    data: any
  ) => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: newApp, error: createError } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          organization_id: null, // 後で組織機能を実装
          type,
          title,
          description: data.description || null,
          data,
          total_amount: calculateTotalAmount(type, data),
          status: 'draft'
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      await fetchApplications()
      return { success: true, application: newApp }
    } catch (err) {
      console.error('Application creation error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create application' 
      }
    }
  }

  const deleteApplication = async (applicationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)

      if (deleteError) {
        throw deleteError
      }

      await fetchApplications()
      return { success: true }
    } catch (err) {
      console.error('Application deletion error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete application' 
      }
    }
  }

  const handleApproval = async (
    applicationId: string,
    action: 'approved' | 'rejected' | 'returned',
    comment?: string
  ) => {
    try {
      const updates: any = {
        status: action,
        updated_at: new Date().toISOString()
      }

      if (action === 'approved') {
        updates.approved_at = new Date().toISOString()
        updates.approved_by = user?.id
      } else if (action === 'rejected' || action === 'returned') {
        updates.rejection_reason = comment
      }

      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', applicationId)
        .select()
        .single()

      if (error) {
        throw error
      }

      await fetchApplications()
      return { success: true, result: data }
    } catch (err) {
      console.error('Approval error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to process approval' 
      }
    }
  }

  return {
    applications,
    loading,
    error,
    createApplication,
    deleteApplication,
    handleApproval,
    refreshApplications: fetchApplications
  }
}

function calculateTotalAmount(type: string, data: any): number {
  if (type === 'business_trip' && data.tripDetails) {
    const { estimatedDailyAllowance = 0, estimatedTransportation = 0, estimatedAccommodation = 0 } = data.tripDetails
    return estimatedDailyAllowance + estimatedTransportation + estimatedAccommodation
  }
  
  if (type === 'expense' && data.expenseItems) {
    return data.expenseItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
  }
  
  return 0
}