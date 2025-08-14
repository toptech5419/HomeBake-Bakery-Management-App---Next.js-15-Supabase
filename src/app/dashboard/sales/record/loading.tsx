import { PageLoading } from '@/components/ui/page-loading';

export default function RecordSalesLoading() {
  const recordIcon = (
    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );

  return (
    <PageLoading 
      title="Record Sales"
      description="Preparing sales interface..."
      icon={recordIcon}
    />
  );
}