import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xsnvzidsrlrsgiqhbfaz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzbnZ6aWRzcmxyc2dpcWhiZmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDQzMTMsImV4cCI6MjA2MzUyMDMxM30.u0VIoVbOrp-R1qiEOZZT34M9eLAs1e3ZmPI5NrL3j_Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
