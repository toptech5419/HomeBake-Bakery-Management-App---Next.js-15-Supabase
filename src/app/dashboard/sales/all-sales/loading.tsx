// Full-screen page loading for all sales
export default function AllSalesLoading() {
  return (
    <html className="h-full">
      <head>
        <title>Loading All Sales...</title>
      </head>
      <body className="h-full overflow-hidden">
        <div 
          className="w-screen h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center"
          style={{
            width: '100vw',
            height: '100vh',
            minHeight: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 999999
          }}
        >
          <div className="flex flex-col items-center justify-center text-center px-6 py-8 max-w-lg">
            
            {/* All Sales Branding */}
            <div className="mb-12">
              <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">All Sales</h1>
              <p className="text-2xl text-gray-600 mb-3">Loading sales history...</p>
              <p className="text-lg text-gray-500">Fetching your sales data</p>
            </div>

            {/* Triple-ring loading animation */}
            <div className="relative mb-12">
              <div className="w-28 h-28 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-28 h-28 border-4 border-transparent border-r-cyan-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              <div className="absolute inset-3 w-22 h-22 border-2 border-blue-100 border-b-cyan-400 rounded-full animate-spin" style={{animationDuration: '2s'}}></div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="w-full max-w-md bg-gray-200 rounded-full h-4 mb-8 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-600 h-4 rounded-full shadow-sm" 
                style={{
                  width: '92%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              />
            </div>
            
            {/* Status Messages */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 text-blue-600">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                <span className="text-lg font-medium">Loading sales analytics...</span>
              </div>
              <div className="text-base text-gray-500">
                Fresh interface loading • No cached data
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}