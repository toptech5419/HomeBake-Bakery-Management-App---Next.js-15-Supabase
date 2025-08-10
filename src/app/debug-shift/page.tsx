import ShiftDebugger from './ShiftDebugger';

export default function DebugShiftPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-8 text-center">End Shift Process Debugger</h1>
        <ShiftDebugger />
      </div>
    </div>
  );
}