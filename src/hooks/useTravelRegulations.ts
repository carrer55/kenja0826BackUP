import { useState, useEffect } from 'react'
import { supabase, getTravelRegulations, createTravelRegulation as createRegulation } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface TravelRegulation {
  id: string
  organization_id: string | null
  name: string
  version: string
  company_info: any
  articles: any
  allowance_settings: any
  status: 'draft' | 'active' | 'archived'
  created_by: string | null
  created_at: string
  updated_at: string
}

export function useTravelRegulations() {
  const [regulations, setRegulations] = useState<TravelRegulation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, profile } = useAuth()

  useEffect(() => {
    if (user) {
      fetchRegulations()
    } else {
      // デモモードの場合はローカルストレージから読み込み
      if (localStorage.getItem('demoMode') === 'true') {
        const savedRegulations = JSON.parse(localStorage.getItem('travelRegulations') || '[]')
        setRegulations(savedRegulations)
      }
    }
  }, [user])

  const fetchRegulations = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setRegulations([])
        return
      }

      const data = await getTravelRegulations(profile?.default_organization_id || undefined)
      setRegulations(data || [])
    } catch (err) {
      console.error('Travel regulations fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch travel regulations')
      setRegulations([])
    } finally {
      setLoading(false)
    }
  }

  const createTravelRegulation = async (
    name: string,
    companyInfo: any,
    articles: any,
    allowanceSettings: any
  ) => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      // デモモードの場合はローカルストレージに保存
      if (localStorage.getItem('demoMode') === 'true') {
        const savedRegulations = JSON.parse(localStorage.getItem('travelRegulations') || '[]')
        const newRegulation = {
          id: Date.now().toString(),
          organization_id: null,
          name,
          version: 'v1.0',
          company_info: companyInfo,
          articles,
          allowance_settings: allowanceSettings,
          status: 'draft',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        savedRegulations.push(newRegulation)
        localStorage.setItem('travelRegulations', JSON.stringify(savedRegulations))
        setRegulations(savedRegulations)
        return { success: true, regulation: newRegulation }
      }

      const result = await createRegulation(
        name,
        companyInfo,
        articles,
        allowanceSettings,
        user.id,
        profile?.default_organization_id || undefined
      )
      
      if (!result.success) {
        throw new Error(result.error)
      }

      await fetchRegulations()
      return result
    } catch (err) {
      console.error('Travel regulation creation error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create travel regulation' 
      }
    }
  }

  const updateTravelRegulation = async (
    regulationId: string,
    updates: Partial<TravelRegulation>
  ) => {
    try {
      const { data, error } = await supabase
        .from('travel_regulations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', regulationId)
        .select()
        .single()

      if (error) {
        throw error
      }

      await fetchRegulations()
      return { success: true, regulation: data }
    } catch (err) {
      console.error('Travel regulation update error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update travel regulation' 
      }
    }
  }

  const deleteTravelRegulation = async (regulationId: string) => {
    try {
      const { error } = await supabase
        .from('travel_regulations')
        .delete()
        .eq('id', regulationId)

      if (error) {
        throw error
      }

      await fetchRegulations()
      return { success: true }
    } catch (err) {
      console.error('Travel regulation deletion error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete travel regulation' 
      }
    }
  }

  return {
    regulations,
    loading,
    error,
    createTravelRegulation,
    updateTravelRegulation,
    deleteTravelRegulation,
    refreshRegulations: fetchRegulations
  }
}