"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Package, Search, Filter, Download, Plus, Clock, User, Eye, Share2, Calendar } from "lucide-react";
import { cn } from '@/lib/utils';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface BatchData {
  id: string;
  bread_type_id: string;
  batch_number: string;
  start_time: string;
  end_time: string | null;
  actual_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  shift: 'morning' | 'night';
  created_by: string;
  bread_types: {
    name: string;
  } | null;
  users: {
    name: string;
  } | null;
}

interface GroupedReport {
  id: string;
  date: string;
  shift: 'morning' | 'night';
  batches: BatchData[];
  manager: string;
  breadTypes: Set<string>;
  endTimes: string[];
  statuses: string[];
  totalUnits: number;
  breadTypesCount?: number;
  status?: string;
  totalValue?: number;
}

// Utility: Format date
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Completed': return 'bg-green-100 text-green-700';
    case 'In Progress': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-4">
        <div className="h-4 w-1/3 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-100 rounded" />
        <div className="h-8 w-full bg-gray-100 rounded" />
      </div>
    ))}
  </div>
);

export default function ManagerReportsPage() {
  const [loading, setLoading] = useState(true);
  const [groupedReports, setGroupedReports] = useState<GroupedReport[]>([]);
  const [search, setSearch] = useState("");
  const [filterShift, setFilterShift] = useState("All");

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const supabase = createClientComponentClient();
      // Fetch all_batches with bread_types and users
      const { data: batches, error } = await supabase
        .from('all_batches')
        .select(`id, bread_type_id, batch_number, start_time, end_time, actual_quantity, status, shift, created_by, bread_types (name), users:created_by (name)`) // join bread_types, users
        .order('start_time', { ascending: false });
      if (error) {
        setGroupedReports([]);
        setLoading(false);
        return;
      }
      // Group by date+shift
      const groups: Record<string, GroupedReport> = {};
      for (const batch of (batches || []) as unknown as BatchData[]) {
        const date = batch.start_time ? batch.start_time.split('T')[0] : 'unknown';
        const shift = batch.shift;
        const key = `${date}-${shift}`;
        if (!groups[key]) {
          groups[key] = {
            id: key,
            date,
            shift,
            batches: [],
            manager: batch.users?.name || 'Unknown',
            breadTypes: new Set(),
            endTimes: [],
            statuses: [],
            totalUnits: 0,
          };
        }
        groups[key].batches.push(batch);
        if (batch.bread_types && typeof batch.bread_types.name === 'string') {
          groups[key].breadTypes.add(batch.bread_types.name);
        }
        if (batch.end_time) groups[key].endTimes.push(batch.end_time);
        groups[key].statuses.push(batch.status);
        groups[key].totalUnits += batch.actual_quantity || 0;
      }
      // Build array
      const arr = Object.values(groups).map((g: GroupedReport) => {
        const allCompleted = g.statuses.every((s: string) => s === 'completed');
        return {
          ...g,
          totalBatches: g.batches.length,
          totalUnits: g.totalUnits,
          status: allCompleted ? 'Completed' : 'In Progress',
          latestEndTime: g.endTimes.length > 0 ? g.endTimes.sort().slice(-1)[0] : '',
          breadTypesCount: g.breadTypes.size,
        };
      });
      setGroupedReports(arr);
      setLoading(false);
    };
    fetchReports();
  }, []);

  // Filtering
  const filtered = groupedReports.filter((r: any) => {
    const matchesShift = filterShift === 'All' || r.shift === filterShift;
    const matchesSearch =
      r.date.includes(search) ||
      r.manager.toLowerCase().includes(search.toLowerCase()) ||
      r.breadTypes.some((b: string) => b.toLowerCase().includes(search.toLowerCase()));
    return matchesShift && matchesSearch;
  });

  // Summary
  const totalReports = filtered.length;
  const completedReports = filtered.filter((r: any) => r.status === 'Completed').length;
  const totalProduction = filtered.reduce((sum: number, r: any) => sum + r.totalUnits, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Reports</h1>
              <p className="text-xs sm:text-sm opacity-90">Production reports and analytics</p>
            </div>
          </div>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium">New Report</span>
          </button>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white bg-opacity-10 rounded-lg p-3 flex flex-col">
            <span className="text-xs opacity-80">Total Reports</span>
            <span className="text-xl font-bold">{totalReports}</span>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3 flex flex-col">
            <span className="text-xs opacity-80">Completed</span>
            <span className="text-xl font-bold">{completedReports}</span>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3 flex flex-col">
            <span className="text-xs opacity-80">Total Production</span>
            <span className="text-xl font-bold">{totalProduction.toLocaleString()}</span>
          </div>
        </div>
      </div>
      {/* Filters */}
      <div className="p-4 bg-white border-b flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
          <select
            value={filterShift}
            onChange={e => setFilterShift(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Shifts</option>
            <option value="morning">Morning</option>
            <option value="night">Night</option>
          </select>
        </div>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span className="text-xs sm:text-sm">More Filters</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-lg hover:shadow-lg">
            <Download className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Export All</span>
          </button>
        </div>
      </div>
      {/* Reports List */}
      <main className="flex-1 p-2 sm:p-4">
        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No reports found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((report: any) => (
              <div
                key={report.id}
                className={cn(
                  "bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg flex flex-col gap-2 p-4",
                  "animate-fade-in"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{report.id}</span>
                  {report.status === 'Completed' && (
                    <span className={cn("text-xs px-2 py-1 rounded-full", getStatusColor(report.status))}>{report.status}</span>
                  )}
                  <span className="ml-auto text-xs text-gray-400">{report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDate(report.date)}
                      <Clock className="w-4 h-4 ml-4" />
                      {formatTime(report.latestEndTime)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      {report.manager}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                      <Package className="w-4 h-4" />
                      <span className="font-medium">{report.totalBatches}</span> batches
                      <BarChart3 className="w-4 h-4 ml-4" />
                      <span className="font-medium">{report.totalUnits}</span> units
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-600 flex-wrap mt-1">
                      {report.breadTypes.map((b: string, i: number) => (
                        <span key={i} className="bg-blue-50 px-2 py-1 rounded-full">{b}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
} 