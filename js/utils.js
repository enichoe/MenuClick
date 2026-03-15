/**
 * @fileoverview General utility functions
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate a unique slug for a restaurant
 * @param {string} name - Base name for the slug
 * @param {Object} supabase - Supabase client
 * @returns {Promise<string>} - The generated slug
 */
export async function generateSlug(name, supabase) {
  if (!supabase) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  
  const { data } = await supabase.rpc('generate_unique_slug', { base_name: name });
  return data;
}

/**
 * Scroll smoothly to a category element
 * @param {string} categoryId - The ID of the category
 */
export function scrollToCategory(categoryId) {
  const element = document.getElementById('category-' + categoryId);
  if (element) {
    const headerOffset = 100;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
  
  // Update active tab styling
  document.querySelectorAll('.category-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.categoryId === categoryId);
  });
}
