import { PageLoading } from '@/components/ui/page-loading';

export default function EndShiftLoading() {
  const endShiftIcon = (
    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <PageLoading 
      title="End Shift"
      description="Preparing shift report..."
      icon={endShiftIcon}
    />
  );
}