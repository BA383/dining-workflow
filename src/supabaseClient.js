import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xsnvzidsrlrsgiqhbfaz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzbnZ6aWRzcmxyc2dpcWhiZmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDQzMTMsImV4cCI6MjA2MzUyMDMxM30.u0VIoVbOrp-R1qiEOZZT34M9eLAs1e3ZmPI5NrL3j_Q',
  {
    global: {
      headers: {
        'X-Client-Info': 'custom-client',
        // 👇 Inject the unit if user is logged in
        'Accept': 'application/json',
        ...(localStorage.getItem('user') && {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).access_token || ''}`,
          'request.unit': JSON.parse(localStorage.getItem('user')).unit || '',
        }),
      },
    },
  }
);

export { supabase };
