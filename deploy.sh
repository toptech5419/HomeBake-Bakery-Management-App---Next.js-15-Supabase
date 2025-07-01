#!/bin/bash

echo "🚀 HomeBake PWA - Automated Deployment Script"
echo "=============================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Run pre-deployment checks
echo "🧪 Running pre-deployment tests..."
npm run test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed! Deployment aborted."
    exit 1
fi

echo "✅ All tests passed!"

# Build the application
echo "🏗️  Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Deployment aborted."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo "📱 Your HomeBake PWA is now live!"
    echo ""
    echo "🔗 Next steps:"
    echo "   • Test the live application"
    echo "   • Set up database tables in Supabase"
    echo "   • Configure custom domain (optional)"
    echo "   • Set up monitoring and analytics"
else
    echo "❌ Deployment failed!"
    exit 1
fi