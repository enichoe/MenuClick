/**
 * @fileoverview Central configuration for the application
 */

// Supabase configuration - Replace with your own credentials
export const SUPABASE_URL = 'https://catugqmcrailrujtbike.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdHVncW1jcmFpbHJ1anRiaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTk5NTcsImV4cCI6MjA4OTA5NTk1N30.3gIRbfjrdvSqFETYnbtRgcoEi6V-boIMAmn7695yTI4';

// Base URL for menu links
export const BASE_URL = window.location.origin;

// Application constants
export const APP_NAME = 'MenuClick';
export const PLANS = {
  free: { name: 'Gratis', color: 'text-surface-500' },
  pro: { name: 'Pro', color: 'text-accent' },
  business: { name: 'Business', color: 'text-coral' }
};
