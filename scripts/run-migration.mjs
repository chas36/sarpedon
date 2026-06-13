import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read the migration file
const migrationPath = join(projectRoot, 'supabase/migrations/20251103000001_add_full_name_to_profiles.sql');
const sql = readFileSync(migrationPath, 'utf8');

console.log('Applying migration: 20251103000001_add_full_name_to_profiles.sql');
console.log('SQL:', sql);
console.log('\nNote: This migration needs to be run with database admin privileges.');
console.log('Please run it manually through the Supabase Dashboard SQL Editor:\n');
console.log('1. Go to https://supabase.com/dashboard/project/uanfulofnrhcqugmxpna/sql/new');
console.log('2. Paste the SQL above');
console.log('3. Click "Run"');
