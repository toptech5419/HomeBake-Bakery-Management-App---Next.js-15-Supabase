import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SimpleInventoryPage() {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Simple data fetch
  const { data: breadTypes, error } = await supabase
    .from('bread_types')
    .select('*')
    .limit(5);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Simple Inventory Test</h1>
      <p>This is a simplified inventory page for testing navigation.</p>
      
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Bread Types (Limited to 5):</h2>
        {error ? (
          <p className="text-red-600">Error: {error.message}</p>
        ) : (
          <ul className="list-disc list-inside">
            {breadTypes?.map((bread) => (
              <li key={bread.id}>{bread.name} - ${bread.unit_price}</li>
            ))}
          </ul>
        )}
      </div>
      
      <p className="text-green-600 font-semibold">
        If you can see this page, navigation is working!
      </p>
    </div>
  );
}