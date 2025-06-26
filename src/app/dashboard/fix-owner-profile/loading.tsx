import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Fix Owner Profile</h1>
        <p className="text-muted-foreground mt-2">
          Loading...
        </p>
      </div>
      
      <div className="flex justify-center">
        <LoadingSpinner />
      </div>
    </div>
  );
} 