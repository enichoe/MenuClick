/**
 * @fileoverview Main entry point of the application
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL } from './config.js';
import { state } from './state.js';
import * as api from './api.js';
import * as auth from './auth.js';
import * as ui from './ui.js';
import * as qr from './qr.js';
import * as utils from './utils.js';

// Initialize Supabase client
let supabaseClient = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Global exposure for HTML event handlers
window.app = {
  api, auth, ui, qr, utils, state, supabaseClient
};

// ============ DOM READY ============
document.addEventListener('DOMContentLoaded', async function() {
  const page = document.body.dataset.page;
  
  // Initialize Lucide icons
  if (window.lucide) window.lucide.createIcons();
  
  // Hide loading overlay
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    setTimeout(() => { overlay.style.display = 'none'; }, 1000);
  }
  
  // Setup event listeners
  setupGlobalListeners();
  
  // Page-specific initialization
  switch (page) {
    case 'landing':
      initLanding();
      break;
    case 'dashboard':
      await initDashboard();
      break;
    case 'menu':
      await initPublicMenu();
      break;
    case 'admin':
      await initAdmin();
      break;
  }
  
  // Check auth state for redirection if needed
  if (page === 'landing') {
    await auth.checkAuthState(supabaseClient);
  } else if (page === 'dashboard' || page === 'admin') {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = 'index.html';
    } else {
      state.setUser(session.user);
    }
  }
});

function setupGlobalListeners() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
  
  // Forms
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', (e) => auth.handleLogin(e, supabaseClient));
  
  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', (e) => auth.handleRegister(e, supabaseClient));

  // Dashboard forms
  const catForm = document.getElementById('categoryForm');
  if (catForm) catForm.addEventListener('submit', handleCategorySubmit);
  
  const itemForm = document.getElementById('itemForm');
  if (itemForm) itemForm.addEventListener('submit', handleItemSubmit);
  
  const settingsForm = document.getElementById('restaurantSettingsForm');
  if (settingsForm) settingsForm.addEventListener('submit', handleSettingsSubmit);
}

function initLanding() {
  qr.generateHeroQR();
}

async function initDashboard() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  
  state.setUser(session.user);
  await api.loadUserData(supabaseClient);
  await api.loadDashboardData(supabaseClient);
  
  // Initial renders
  ui.renderMenuContent();
  updateDashboardStats();
  qr.generateDashboardQR();
  
  // Setup section navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showDashboardSection(btn.dataset.section));
  });
  
  // Set menu links
  if (state.currentRestaurant) {
    const menuUrl = `${BASE_URL}/menu.html?s=${state.currentRestaurant.slug}`;
    const input = document.getElementById('menuUrlInput');
    if (input) input.value = menuUrl;
    const link = document.getElementById('viewMenuLink');
    if (link) {
      link.href = menuUrl;
      link.classList.remove('hidden');
    }
    
    const nameInput = document.getElementById('settingsRestaurantName');
    const descInput = document.getElementById('settingsRestaurantDesc');
    
    if (nameInput) nameInput.value = state.currentRestaurant.name || '';
    if (descInput) descInput.value = state.currentRestaurant.description || '';
  }
}

async function initPublicMenu() {
  const urlParams = new URLSearchParams(window.location.search);
  let slug = urlParams.get('s');
  
  // Also try path-based slug if rewrites are active or on local test
  if (!slug) {
    const pathMatch = window.location.pathname.match(/\/menu\/(.+)$/);
    if (pathMatch) slug = pathMatch[1];
  }
  
  if (!slug) {
    ui.showToast('Menú no especificado', 'error');
    return;
  }
  
  const data = await api.fetchPublicMenu(supabaseClient, slug);
  if (data && data.restaurant) {
    ui.renderPublicMenu(data.restaurant, data.categories || [], data.items || [], supabaseClient);
  } else {
    ui.showToast('Menú no encontrado', 'error');
  }
}

async function initAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  
  const data = await api.fetchAdminData(supabaseClient);
  if (data.stats) {
    document.getElementById('adminStatRestaurants').textContent = data.stats.totalRestaurants;
    document.getElementById('adminStatItems').textContent = data.stats.totalItems;
    document.getElementById('adminStatViews').textContent = data.stats.totalViews;
    document.getElementById('adminStatScans').textContent = data.stats.totalScans;
  }
  
  if (data.restaurants) {
    ui.renderAdminRestaurants(data.restaurants);
  }
}

// ============ RE-IMPLEMENTED HANDLERS ============
// These were in the original HTML and need to bridge to modules

async function handleCategorySubmit(e) {
  e.preventDefault();
  const id = document.getElementById('categoryId').value;
  const name = document.getElementById('categoryName').value;
  const description = document.getElementById('categoryDesc').value;
  
  const data = { menu_id: state.currentMenu.id, name, description };
  
  if (id) {
    await supabaseClient.from('categories').update(data).eq('id', id);
    ui.showToast('Categoría actualizada');
  } else {
    await supabaseClient.from('categories').insert(data);
    ui.showToast('Categoría creada');
  }
  
  ui.closeCategoryModal();
  await initDashboard();
}

async function handleItemSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('itemId').value;
  const itemData = {
    category_id: document.getElementById('itemCategory').value,
    name: document.getElementById('itemName').value,
    description: document.getElementById('itemDesc').value,
    price: parseFloat(document.getElementById('itemPrice').value),
    is_available: document.getElementById('itemAvailable').checked,
    is_featured: document.getElementById('itemFeatured').checked,
    image_url: state.uploadedImageUrl
  };
  
  if (id) {
    await supabaseClient.from('menu_items').update(itemData).eq('id', id);
    ui.showToast('Plato actualizado');
  } else {
    await supabaseClient.from('menu_items').insert(itemData);
    ui.showToast('Plato creado');
  }
  
  ui.closeItemModal();
  await initDashboard();
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('settingsRestaurantName').value,
    description: document.getElementById('settingsRestaurantDesc').value
  };
  
  await supabaseClient.from('restaurants').update(data).eq('id', state.currentRestaurant.id);
  ui.showToast('Configuracion guardada');
  await initDashboard();
}

function updateDashboardStats() {
  if (state.menuItems) {
    document.getElementById('statTotalItems').textContent = state.menuItems.length;
    document.getElementById('statTotalCategories').textContent = state.categories.length;
  }
}

function showDashboardSection(section) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('bg-surface-400', 'text-accent');
    if (item.dataset.section === section) item.classList.add('bg-surface-400', 'text-accent');
  });
  
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('hidden'));
  const sectionEl = document.getElementById(section + 'Section');
  if (sectionEl) sectionEl.classList.remove('hidden');
  
  const titles = { overview: 'Panel Principal', menu: 'Mi Menú', qr: 'Código QR', stats: 'Estadísticas', settings: 'Configuración' };
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titles[section] || 'Dashboard';
}
