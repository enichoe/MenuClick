/**
 * @fileoverview Central configuration for the application
 */

// Supabase configuration - Replace with your own credentials
export const SUPABASE_URL = 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Base URL for menu links
export const BASE_URL = window.location.origin;

// Application constants
export const APP_NAME = 'MenuQR Pro';
export const PLANS = {
  free: { name: 'Gratis', color: 'text-surface-500' },
  pro: { name: 'Pro', color: 'text-accent' },
  business: { name: 'Business', color: 'text-coral' }
};
