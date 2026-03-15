/**
 * @fileoverview Authentication logic
 */

import { state } from './state.js';
import { loadUserData, loadDashboardData, fetchAdminData } from './api.js';
import { showView, showToast, closeAuthModal } from './ui.js';
import { generateSlug } from './utils.js';

/**
 * Check the current authentication state and redirect if needed
 * @param {Object} supabase - Supabase client
 * @returns {Promise<void>}
 */
export async function checkAuthState(supabase) {
  if (!supabase) return;
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    state.setUser(session.user);
    await loadUserData(supabase);
    
    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', state.currentUser.id)
      .single();
    
    if (profile && profile.role === 'admin') {
      if (document.body.dataset.page === 'landing') {
        window.location.href = 'admin.html';
      } else {
        showView('adminView');
      }
    } else {
      if (document.body.dataset.page === 'landing') {
        window.location.href = 'dashboard.html';
      } else {
        showView('dashboardView');
        await loadDashboardData(supabase);
      }
    }
  }
}

/**
 * Handle user login
 * @param {Event} e - Form submit event
 * @param {Object} supabase - Supabase client
 */
export async function handleLogin(e, supabase) {
  e.preventDefault();
  
  if (!supabase) {
    showToast('Configura Supabase primero', 'warning');
    return;
  }
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    showToast(error.message, 'error');
    return;
  }
  
  state.setUser(data.user);
  await loadUserData(supabase);
  
  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', state.currentUser.id)
    .single();
  
  closeAuthModal();
  
  if (profile && profile.role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'dashboard.html';
  }
  
  showToast('¡Bienvenido de vuelta!', 'success');
}

/**
 * Handle user registration
 * @param {Event} e - Form submit event
 * @param {Object} supabase - Supabase client
 */
export async function handleRegister(e, supabase) {
  e.preventDefault();
  
  if (!supabase) {
    showToast('Configura Supabase primero', 'warning');
    return;
  }
  
  const name = document.getElementById('registerName').value;
  const restaurantName = document.getElementById('registerRestaurant').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  
  // Register user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });
  
  if (error) {
    showToast(error.message, 'error');
    return;
  }
  
  state.setUser(data.user);
  
  // Generate slug
  const slug = await generateSlug(restaurantName, supabase);
  
  // Create restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({
      owner_id: state.currentUser.id,
      name: restaurantName,
      slug: slug
    })
    .select()
    .single();
  
  if (restaurantError) {
    showToast('Error al crear restaurante', 'error');
    return;
  }
  
  state.setRestaurant(restaurant);
  
  // Create default menu
  const { data: menu } = await supabase
    .from('menus')
    .insert({
      restaurant_id: state.currentRestaurant.id,
      name: 'Menú Principal'
    })
    .select()
    .single();
  
  state.setMenu(menu);
  
  // Create QR code record
  await supabase
    .from('qr_codes')
    .insert({
      restaurant_id: state.currentRestaurant.id,
      menu_id: state.currentMenu.id,
      name: 'QR Principal'
    });
  
  closeAuthModal();
  window.location.href = 'dashboard.html';
  
  showToast('¡Cuenta creada exitosamente!', 'success');
}

/**
 * Handle user logout
 * @param {Object} supabase - Supabase client
 */
export async function handleLogout(supabase) {
  if (!supabase) {
    showView('landingView');
    return;
  }
  
  await supabase.auth.signOut();
  state.setUser(null);
  state.setRestaurant(null);
  state.setMenu(null);
  state.setCategories([]);
  state.setItems([]);
  
  showView('landingView');
  showToast('Sesión cerrada', 'success');
}
