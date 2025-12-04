#!/bin/bash
# Apply missing migrations in correct order

echo "Applying missing migrations..."
echo ""

echo "1. Creating character system..."
supabase db execute --file supabase/migrations/20251107000002_create_character_system.sql
if [ $? -ne 0 ]; then
  echo "❌ Failed to apply 20251107000002_create_character_system.sql"
  exit 1
fi
echo "✓ Character system created"
echo ""

echo "2. Adding skill tracking system..."
supabase db execute --file supabase/migrations/20251109000000_add_skill_tracking.sql
if [ $? -ne 0 ]; then
  echo "❌ Failed to apply 20251109000000_add_skill_tracking.sql"
  exit 1
fi
echo "✓ Skill tracking added"
echo ""

echo "3. Fixing get_recommended_levels function..."
supabase db execute --file supabase/migrations/20251204000000_fix_get_recommended_levels_qualified_names.sql
if [ $? -ne 0 ]; then
  echo "❌ Failed to apply 20251204000000_fix_get_recommended_levels_qualified_names.sql"
  exit 1
fi
echo "✓ get_recommended_levels fixed"
echo ""

echo "4. Fixing skill and character functions..."
supabase db execute --file supabase/migrations/20251204000001_fix_skill_and_character_functions.sql
if [ $? -ne 0 ]; then
  echo "❌ Failed to apply 20251204000001_fix_skill_and_character_functions.sql"
  exit 1
fi
echo "✓ Skill and character functions fixed"
echo ""

echo "==========================================="
echo "✅ All migrations applied successfully!"
echo "==========================================="
echo ""
echo "Verifying database state..."
supabase db execute --file verify_database.sql
