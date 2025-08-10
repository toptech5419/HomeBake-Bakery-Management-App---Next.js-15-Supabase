'use server'

import { createServer } from '@/lib/supabase/server'

export interface BatchData {
  id: string
  bread_type_id: string
  batch_number: string
  start_time: string
  end_time?: string
  actual_quantity: number
  status: string
  shift: string
  created_by: string
  bread_types: { name: string } | { name: string }[] | null
  users: { name: string } | { name: string }[] | null
}

export interface GroupedReport {
  id: string
  date: string
  shift: string
  batches: BatchData[]
  manager: string
  breadTypes: string[]
  totalBatches: number
  totalUnits: number
  status: string
  latestEndTime: string
}

// Helper to safely extract name from possible array/object/null
const getName = (val: unknown): string => {
  if (!val) return 'Unknown'
  if (Array.isArray(val)) {
    if (val.length && typeof val[0]?.name === 'string') return val[0].name
    return 'Unknown'
  }
  if (typeof val === 'object' && val !== null && 'name' in val && typeof val.name === 'string') {
    return val.name
  }
  return 'Unknown'
}

/**
 * Fetch manager reports (from all_batches table) - Server Action
 */
export async function getManagerReports(): Promise<GroupedReport[]> {
  const supabase = await createServer()
  
  try {
    const { data: batches, error } = await supabase
      .from('all_batches')
      .select(`
        id, bread_type_id, batch_number, start_time, end_time, actual_quantity, 
        status, shift, created_by, 
        bread_types (name), 
        users:created_by (name)
      `)
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error fetching manager reports:', error)
      return []
    }

    // Group by date+shift
    const groups: Record<string, any> = {}
    for (const batch of batches || []) {
      const date = batch.start_time ? batch.start_time.split('T')[0] : 'unknown'
      const shift = batch.shift
      const key = `${date}-${shift}`
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          date,
          shift,
          batches: [],
          manager: getName(batch.users),
          breadTypes: new Set(),
          totalUnits: 0,
          endTimes: [],
          statuses: []
        }
      }
      
      groups[key].batches.push(batch)
      const breadTypeName = getName(batch.bread_types)
      if (breadTypeName && breadTypeName !== 'Unknown') {
        groups[key].breadTypes.add(breadTypeName)
      }
      if (batch.end_time) groups[key].endTimes.push(batch.end_time)
      groups[key].statuses.push(batch.status)
      groups[key].totalUnits += batch.actual_quantity || 0
    }

    // Convert to array with calculated fields
    // Since all_batches contains historical/completed records, all should be marked as completed
    const result = Object.values(groups).map((g: any) => {
      return {
        ...g,
        totalBatches: g.batches.length,
        status: 'Completed', // All records from all_batches are completed by definition
        latestEndTime: g.endTimes.length > 0 ? g.endTimes.sort().slice(-1)[0] : '',
        breadTypes: Array.from(g.breadTypes),
      }
    })

    return result
  } catch (error) {
    console.error('Error fetching manager reports:', error)
    return []
  }
}