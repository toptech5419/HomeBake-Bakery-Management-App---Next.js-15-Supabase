// Full-screen loading for sales management
export default function SalesManagementLoading() {
  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-purple-50 to-pink-50 z-[100000] flex items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        minHeight: '100vh'
      }}
    >
      <div className="flex flex-col items-center justify-center text-center px-6 py-8">
        
        {/* Sales Management branding */}
        <div className="mb-12">
          <div className="w-28 h-28 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Sales Management</h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-3">Setting up your sales tools...</p>
          <p className="text-base text-gray-500">Preparing inventory and recording interface</p>
        </div>

        {/* Enhanced loading animation */}
        <div className="relative mb-10">
          <div className="w-24 h-24 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-r-pink-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          <div className="absolute inset-2 w-20 h-20 border-2 border-purple-100 border-b-pink-400 rounded-full animate-spin" style={{animationDuration: '2s'}}></div>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-96 max-w-[90vw] bg-gray-200 rounded-full h-3 mb-6 shadow-inner">
          <div 
            className="bg-gradient-to-r from-purple-400 via-purple-500 to-pink-600 h-3 rounded-full animate-pulse transition-all duration-2000 shadow-sm" 
            style={{
              width: '76%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
        </div>
        
        {/* Status Indicators */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-purple-600">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
            <span className="text-sm font-medium">Loading sales management tools...</span>
          </div>
          <div className="text-sm text-gray-500 font-mono opacity-75">
            🛒 Fresh interface loading • {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}