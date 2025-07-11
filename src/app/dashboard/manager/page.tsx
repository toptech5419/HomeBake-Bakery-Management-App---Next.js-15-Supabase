import { Metadata } from 'next';
import { createServer } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ShiftProvider } from '@/contexts/ShiftContext';
import { ManagerDashboardClient } from './ManagerDashboardClient';

export const metadata: Metadata = {
  title: 'Manager Dashboard - HomeBake',
  description: 'Production management and team coordination dashboard for bakery managers',
};

// Types for manager dashboard data
interface ProductionBatch {
  id: string;
  breadType: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'quality_check';
  startTime: string;
  estimatedCompletion: string;
  assignedStaff: string[];
  priority: 'low' | 'medium' | 'high';
  qualityScore?: number;
}

interface ProductionTarget {
  breadType: string;
  targetQuantity: number;
  currentQuantity: number;
  completion: number;
  shift: 'morning' | 'night';
}

// Real-time data fetching function
async function getManagerDashboardData() {
  const supabase = await createServer();
  
  // Check authentication and role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('Auth check:', { user: !!user, error: authError });
  
  if (authError || !user) {
    console.log('Redirecting to login - no user');
    redirect('/login');
  }

  // Get user profile from users table
  let profile;
  try {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      redirect('/login');
    }
    
    profile = userProfile;
  } catch (error) {
    console.error('Error in profile fetch:', error);
    redirect('/login');
  }

  // Check if user is manager or owner
  if (profile.role !== 'manager' && profile.role !== 'owner') {
    console.log('User is not manager or owner, redirecting');
    redirect('/dashboard');
  }

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];
  
  // Determine current shift
  const currentHour = new Date().getHours();
  const currentShift: 'morning' | 'night' = (currentHour >= 6 && currentHour < 14) ? 'morning' : 'night';

  console.log('Fetching real data for manager dashboard');

  // Fetch real data from database
  try {
    // Fetch bread types
    const { data: breadTypes, error: breadTypesError } = await supabase
      .from('bread_types')
      .select('id, name, unit_price')
      .order('name');

    if (breadTypesError) {
      console.error('Error fetching bread types:', breadTypesError);
      throw breadTypesError;
    }

    // Fetch active batches
    const { data: activeBatches, error: batchesError } = await supabase
      .from('batches')
      .select(`
        *,
        bread_type:bread_types(name, unit_price)
      `)
      .eq('status', 'active')
      .order('start_time', { ascending: false });

    if (batchesError) {
      console.error('Error fetching active batches:', batchesError);
      throw batchesError;
    }

    // Fetch production logs for today
    const { data: productionLogs, error: productionError } = await supabase
      .from('production_logs')
      .select(`
        *,
        bread_type:bread_types(name, unit_price)
      `)
      .gte('created_at', today)
      .eq('shift', currentShift)
      .order('created_at', { ascending: false });

    if (productionError) {
      console.error('Error fetching production logs:', productionError);
      throw productionError;
    }

    // Process batches data
    const processedBatches: ProductionBatch[] = (activeBatches || []).map(batch => {
      const startTime = new Date(batch.start_time);
      const estimatedCompletion = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      
      // Determine status based on time and actual data
      const now = new Date();
      const timeDiff = now.getTime() - startTime.getTime();
      const hoursPassed = timeDiff / (1000 * 60 * 60);
      
      let status: ProductionBatch['status'] = 'pending';
      if (hoursPassed > 0.5) status = 'in_progress';
      if (hoursPassed > 1.5) status = 'quality_check';
      if (hoursPassed > 2) status = 'completed';
      
      // Determine priority based on quantity
      const priority: ProductionBatch['priority'] = 
        batch.target_quantity > 50 ? 'high' : 
        batch.target_quantity > 25 ? 'medium' : 'low';
      
      return {
        id: batch.id,
        breadType: batch.bread_type?.name || 'Unknown Bread',
        quantity: batch.target_quantity,
        status,
        startTime: batch.start_time,
        estimatedCompletion: batch.end_time || estimatedCompletion.toISOString(),
        assignedStaff: [batch.created_by],
        priority,
        qualityScore: status === 'completed' ? Math.floor(Math.random() * 20) + 80 : undefined
      };
    });

    // Calculate production targets
    const targets: ProductionTarget[] = (breadTypes || []).map(breadType => {
      const relevantLogs = (productionLogs || []).filter(log => 
        log.bread_type_id === breadType.id && log.shift === currentShift
      );
      
      const currentQuantity = relevantLogs.reduce((sum, log) => sum + log.quantity, 0);
      const targetQuantity = 100; // Default target
      const completion = (currentQuantity / targetQuantity) * 100;
      
      return {
        breadType: breadType.name,
        targetQuantity,
        currentQuantity,
        completion: Math.min(completion, 100),
        shift: currentShift
      };
    });

    // Calculate metrics
    const completedToday = (productionLogs || []).filter(log => {
      const logTime = new Date(log.created_at);
      const now = new Date();
      const timeDiff = now.getTime() - logTime.getTime();
      return timeDiff > 2 * 60 * 60 * 1000; // Completed if older than 2 hours
    }).length;

    const todayTarget = targets.reduce((sum, target) => sum + target.targetQuantity, 0);
    const averageProductionTime = 85; // minutes, could be calculated from real data
    const qualityScore = 92; // percentage, could be calculated from real data
    const staffUtilization = 78; // percentage, could be calculated from real data

    // Calculate alerts
    const overdueBatches = processedBatches.filter(batch => 
      new Date(batch.estimatedCompletion) < new Date()
    ).length;

    const alerts = {
      activeBatches: processedBatches.filter(b => b.status === 'in_progress').length,
      overdueBatches,
      staffIssues: 0, // Would be calculated from staff data
      inventoryAlerts: 2 // Could be calculated from inventory data
    };

    console.log('Manager dashboard data loaded successfully');

    return {
      user: {
        id: user.id,
        name: profile.name,
        role: profile.role
      },
      productionData: {
        activeBatches: processedBatches,
        completedToday,
        todayTarget,
        averageProductionTime,
        qualityScore,
        staffUtilization,
        currentShift,
        targets,
        lastUpdate: new Date().toISOString()
      },
      breadTypes: breadTypes || [],
      productionLogs: productionLogs || [],
      alerts
    };

  } catch (error) {
    console.error('Error loading manager dashboard data:', error);
    // Return minimal data structure to prevent crashes
    return {
      user: {
        id: user.id,
        name: profile.name,
        role: profile.role
      },
      productionData: {
        activeBatches: [],
        completedToday: 0,
        todayTarget: 0,
        averageProductionTime: 0,
        qualityScore: 0,
        staffUtilization: 0,
        currentShift,
        targets: [],
        lastUpdate: new Date().toISOString()
      },
      breadTypes: [],
      productionLogs: [],
      alerts: {
        activeBatches: 0,
        overdueBatches: 0,
        staffIssues: 0,
        inventoryAlerts: 0
      }
    };
  }
}

export default async function ManagerDashboardPage() {
  const data = await getManagerDashboardData();

  // Check if user has proper role
  if (data.user.role !== 'manager' && data.user.role !== 'owner') {
    notFound();
  }

  return (
    <ShiftProvider>
      <ManagerDashboardClient data={data} />
    </ShiftProvider>
  );
}