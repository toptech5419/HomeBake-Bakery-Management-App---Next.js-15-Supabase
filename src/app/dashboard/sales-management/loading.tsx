import { PageLoading } from '@/components/ui/page-loading';

export default function SalesManagementLoading() {
  const managementIcon = (
    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );

  return (
    <PageLoading 
      title="Sales Management"
      description="Loading management tools..."
      icon={managementIcon}
    />
  );
}