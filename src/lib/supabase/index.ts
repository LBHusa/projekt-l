// Re-export Supabase clients
// Note: Only export browser client here for use in client components
// Use server.ts directly in Server Components/API routes
export { createClient as createBrowserClient } from './client';
