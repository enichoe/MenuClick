/**
 * @fileoverview API layer for Supabase interactions with error handling
 */

import { state } from './state.js';
import { showToast } from './ui.js';

/**
 * Wrapper for Supabase calls to handle errors consistently
 * @param {Promise} promise - Supabase call promise
 * @param {string} errorMessage - Message to show on failure
 */
async function handle(promise, errorMessage = 'Error en la operación') {
  try {
    const { data, error, count } = await promise;
    if (error) {
      console.error(`API Error: ${error.message}`, error);
      showToast(errorMessage, 'error');
      return { data: null, error, count: 0 };
    }
    return { data, error: null, count };
  } catch (err) {
    console.error('Unexpected error:', err);
    showToast('Error inesperado de conexión', 'error');
    return { data: null, error: err, count: 0 };
  }
}

/**
 * Load initial user data, restaurant and menu
 * @param {Object} supabase - Supabase client
 * @returns {Promise<void>}
 */
export async function loadUserData(supabase) {
  if (!supabase || !state.currentUser) return;
  
  // Get profile
  const { data: profile } = await handle(
    supabase.from('profiles').select('*').eq('id', state.currentUser.id).single(),
    'Error al cargar perfil'
  );
  
  if (profile) {
    const nameEl = document.getElementById('sidebarUserName');
    const emailEl = document.getElementById('sidebarUserEmail');
    if (nameEl) nameEl.textContent = profile.full_name || 'Usuario';
    if (emailEl) emailEl.textContent = profile.email || state.currentUser.email;
    state.setUserRole(profile.role);
  }
  
  // Get restaurant
  const { data: restaurant } = await handle(
    supabase.from('restaurants').select('*').eq('owner_id', state.currentUser.id).single(),
    'Error al cargar configuración de restaurante'
  );
  
  if (restaurant) {
    state.setRestaurant(restaurant);
    
    // Get menu
    const { data: menu } = await handle(
      supabase.from('menus').select('*').eq('restaurant_id', restaurant.id).single(),
      'Error al cargar el menú'
    );
    
    if (menu) {
      state.setMenu(menu);
    }
  }
}

/**
 * Load full dashboard data including categories and items
 * @param {Object} supabase - Supabase client
 * @returns {Promise<void>}
 */
export async function loadDashboardData(supabase) {
  if (!supabase || !state.currentRestaurant || !state.currentMenu) return;
  
  // Load categories and items in parallel for performance
  const [catsRes, itemsRes] = await Promise.all([
    handle(
      supabase.from('categories')
        .select('*')
        .eq('menu_id', state.currentMenu.id)
        .order('sort_order', { ascending: true }),
      'Error al cargar categorías'
    ),
    handle(
      supabase.from('menu_items')
        .select('*')
        .eq('restaurant_id', state.currentRestaurant.id) // Multi-tenant safety
        .order('sort_order', { ascending: true }),
      'Error al cargar platos'
    )
  ]);
  
  state.setCategories(catsRes.data || []);
  state.setItems(itemsRes.data || []);
}

/**
 * Fetch and return public menu data
 * @param {Object} supabase - Supabase client
 * @param {string} slug - Restaurant slug
 * @returns {Promise<Object|null>}
 */
export async function fetchPublicMenu(supabase, slug) {
  if (!supabase) return null;
  
  // Get restaurant
  const { data: restaurant } = await handle(
    supabase.from('restaurants')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single(),
    'Restaurante no encontrado'
  );
  
  if (!restaurant) return null;
  
  // Track view (Fire and forget, don't wait for it)
  supabase.from('menu_views').insert({
    restaurant_id: restaurant.id,
    viewer_ip: 'anonymous',
    user_agent: navigator.userAgent
  });
  
  // Get menu, categories and items
  const menuRes = await handle(
    supabase.from('menus').select('*').eq('restaurant_id', restaurant.id).eq('is_active', true).single()
  );
  
  if (!menuRes.data) return { restaurant };
  
  const [catsRes, itemsRes] = await Promise.all([
    handle(
      supabase.from('categories')
        .select('*')
        .eq('menu_id', menuRes.data.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
    ),
    handle(
      supabase.from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_available', true)
        .order('sort_order', { ascending: true })
    )
  ]);
  
  return { 
    restaurant, 
    menu: menuRes.data, 
    categories: catsRes.data || [], 
    items: itemsRes.data || [] 
  };
}

/**
 * Load data for the admin panel
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object>}
 */
export async function fetchAdminData(supabase) {
  if (!supabase) return {};
  
  const [restsRes, countRes, itemsCountRes, viewsCountRes, qrStatsRes] = await Promise.all([
    handle(supabase.from('restaurants').select('*, profiles:owner_id(full_name, email, phone)').order('created_at', { ascending: false })),
    handle(supabase.from('restaurants').select('*', { count: 'exact', head: true })),
    handle(supabase.from('menu_items').select('*', { count: 'exact', head: true })),
    handle(supabase.from('menu_views').select('*', { count: 'exact', head: true })),
    handle(supabase.from('qr_codes').select('scan_count'))
  ]);
  
  const totalScans = qrStatsRes.data?.reduce((sum, qr) => sum + (qr.scan_count || 0), 0) || 0;
  
  return {
    restaurants: restsRes.data || [],
    stats: {
      totalRestaurants: countRes.count,
      totalItems: itemsCountRes.count,
      totalViews: viewsCountRes.count,
      totalScans
    }
  };
}

/**
 * Track an item view
 * @param {Object} supabase - Supabase client
 * @param {string} itemId - Item ID
 */
export async function trackItemView(supabase, itemId) {
  if (!supabase) return;
  await supabase.rpc('increment_item_view', { item_id: itemId });
}

/**
 * Admin: Toggle restaurant active status
 * @param {Object} supabase - Supabase client
 * @param {string} id - Restaurant ID
 * @param {boolean} newStatus - New status
 */
export async function toggleRestaurantStatus(supabase, id, newStatus) {
  if (!supabase) return;
  await handle(
    supabase.from('restaurants').update({ is_active: newStatus }).eq('id', id),
    'Error al cambiar estado'
  );
}
/**
 * Upload an image to Supabase Storage
 * @param {Object} supabase - Supabase client
 * @param {File} file - File object from input
 * @param {string} bucket - Bucket name (default 'images')
 * @returns {Promise<string|null>} - Public URL of the uploaded image
 */
export async function uploadImage(supabase, file, bucket = 'images') {
  if (!supabase || !file) return null;
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `${state.currentUser.id}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);
    
  if (error) {
    console.error('Upload error:', error);
    showToast('Error al subir imagen', 'error');
    return null;
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
    
  return publicUrl;
}
