#!/bin/bash

# Deploy Generate Level Edge Function to Supabase
# This script deploys the generate-level Edge Function

set -e

echo "🚀 Deploying Generate Level Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Running login..."
    supabase login
fi

echo "📦 Deploying generate-level function..."
supabase functions deploy generate-level

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure GROQ_API_KEY is set in Supabase Dashboard:"
echo "   Dashboard → Project Settings → Edge Functions → Secrets"
echo ""
echo "2. Test the function:"
echo "   - Go to Teacher Dashboard"
echo "   - Click '🤖 AI Generator' button"
echo "   - Enter a topic and generate levels"
echo ""
echo "3. Check logs if needed:"
echo "   supabase functions logs generate-level"
echo ""
