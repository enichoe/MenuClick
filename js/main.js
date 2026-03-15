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
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarClose = document.getElementById('sidebarClose');

  const toggleSidebar = () => {
    if (sidebar) sidebar.classList.toggle('open');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('hidden');
  };

  if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', toggleSidebar);
  
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
    // Fill settings form
    const r = state.currentRestaurant;
    const fields = {
      settingsRestaurantName: r.name,
      settingsRestaurantDesc: r.description,
      settingsPhone: r.phone,
      settingsAddress: r.address,
      settingsMaps: r.google_maps_url,
      settingsWhatsapp: r.whatsapp,
      settingsInstagram: r.instagram,
      settingsFacebook: r.facebook,
      settingsTiktok: r.tiktok,
      settingsWebsite: r.website,
      settingsPrimaryColor: r.primary_color || '#10b981',
      settingsButtonColor: r.button_color || '#10b981',
      settingsLogoUrl: r.logo_url,
      settingsBannerUrl: r.banner_url
    };
    
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val || (el.type === 'color' ? '#10b981' : '');
    });

    // Fill hours
    if (r.opening_hours) {
      Object.entries(r.opening_hours).forEach(([day, h]) => {
        const openInput = document.querySelector(`input[data-day="${day}"][data-type="open"]`);
        const closeInput = document.querySelector(`input[data-day="${day}"][data-type="close"]`);
        const closedCheck = document.querySelector(`input[data-day="${day}"][data-type="closed"]`);
        if (openInput) openInput.value = h.open || '';
        if (closeInput) closeInput.value = h.close || '';
        if (closedCheck) closedCheck.checked = h.closed || false;
      });
    }

    const menuUrl = `${BASE_URL}/menu.html?s=${r.slug}`;
    const urlInput = document.getElementById('menuUrlInput');
    if (urlInput) urlInput.value = menuUrl;
    const link = document.getElementById('viewMenuLink');
    if (link) {
      link.href = menuUrl;
      link.classList.remove('hidden');
    }

    // Setup image previews
    ui.setupImagePreview('itemImageFile', 'itemImagePreviewImg', 'itemImagePreview');
    ui.setupImagePreview('settingsLogoFile', 'settingsLogoPreviewImg', 'settingsLogoPreview');
    ui.setupImagePreview('settingsBannerFile', 'settingsBannerPreviewImg', 'settingsBannerPreview');
    
    // Show current images in previews if they exist
    if (r.logo_url) {
      document.getElementById('settingsLogoPreviewImg').src = r.logo_url;
      document.getElementById('settingsLogoPreview').classList.remove('hidden');
    }
    if (r.banner_url) {
      document.getElementById('settingsBannerPreviewImg').src = r.banner_url;
      document.getElementById('settingsBannerPreview').classList.remove('hidden');
    }
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
    
    // Add ScrollSpy for Categories
    window.addEventListener('scroll', utils.debounce(() => {
      const categories = data.categories || [];
      const scrollPos = window.scrollY + 150; // Offset for sticky nav + some margin
      
      let currentActiveId = null;
      for (const cat of categories) {
        const element = document.getElementById('category-' + cat.id);
        if (element && element.offsetTop <= scrollPos) {
          currentActiveId = cat.id;
        }
      }
      
      if (currentActiveId) {
        document.querySelectorAll('.category-tab').forEach(btn => {
          const isActive = btn.dataset.categoryId === currentActiveId;
          if (btn.classList.contains('active') !== isActive) {
            btn.classList.toggle('active', isActive);
            if (isActive) {
               btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
          }
        });
      }
    }, 100));
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
    document.getElementById('adminStatViews').textContent = data.stats.totalViews;
    document.getElementById('adminStatScans').textContent = data.stats.totalScans;
    
    // Calculate active restaurants
    const activeCount = data.restaurants.filter(r => r.is_active).length;
    const activeEl = document.getElementById('adminStatActiveRests');
    if (activeEl) activeEl.textContent = activeCount;
  }
  
  if (data.restaurants) {
    state.setAdminRestaurants(data.restaurants);
    ui.renderAdminRestaurants(data.restaurants);
  }

  // Admin Specific Listeners (only if they exist)
  const searchInput = document.getElementById('adminSearchInput');
  const dateFilter = document.getElementById('adminDateFilter');

  if (searchInput) {
    searchInput.addEventListener('input', utils.debounce(() => filterAdminData(), 300));
  }
  if (dateFilter) {
    dateFilter.addEventListener('change', () => filterAdminData());
  }
}

function filterAdminData() {
  const query = document.getElementById('adminSearchInput').value.toLowerCase();
  const dateRange = document.getElementById('adminDateFilter').value;
  
  let filtered = state.adminRestaurants.filter(r => {
    const profile = r.profiles || {};
    const matchesSearch = 
      r.name.toLowerCase().includes(query) || 
      r.slug.toLowerCase().includes(query) ||
      (profile.full_name || '').toLowerCase().includes(query) ||
      (profile.email || '').toLowerCase().includes(query);
      
    if (!matchesSearch) return false;
    
    // Date filter
    if (dateRange === 'all') return true;
    
    const createdDate = new Date(r.created_at);
    const now = new Date();
    
    if (dateRange === 'today') {
      return createdDate.toDateString() === now.toDateString();
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return createdDate >= weekAgo;
    } else if (dateRange === 'month') {
      return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
    }
    
    return true;
  });
  
  ui.renderAdminRestaurants(filtered);
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
  const imageFile = document.getElementById('itemImageFile').files[0];
  let imageUrl = document.getElementById('itemImageUrl').value;
  
  if (imageFile) {
    ui.showToast('Subiendo imagen...', 'warning');
    const uploadedUrl = await api.uploadImage(supabaseClient, imageFile);
    if (uploadedUrl) imageUrl = uploadedUrl;
  }

  const itemData = {
    restaurant_id: state.currentRestaurant.id,
    category_id: document.getElementById('itemCategory').value,
    name: document.getElementById('itemName').value,
    description: document.getElementById('itemDesc').value,
    price: parseFloat(document.getElementById('itemPrice').value),
    is_available: document.getElementById('itemAvailable').checked,
    is_featured: document.getElementById('itemFeatured')?.checked || false,
    image_url: imageUrl
  };
  
  if (id) {
    await supabaseClient.from('menu_items').update(itemData).eq('id', id);
    ui.showToast('Plato actualizado');
  } else {
    const { error } = await supabaseClient.from('menu_items').insert(itemData);
    if (error) {
      console.error('Insert error:', error);
      ui.showToast('Error al crear plato: ' + error.message, 'error');
    } else {
      ui.showToast('Plato creado');
    }
  }
  
  ui.closeItemModal();
  await initDashboard();
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  
  const logoFile = document.getElementById('settingsLogoFile').files[0];
  const bannerFile = document.getElementById('settingsBannerFile').files[0];
  let logoUrl = document.getElementById('settingsLogoUrl').value;
  let bannerUrl = document.getElementById('settingsBannerUrl').value;

  if (logoFile || bannerFile) {
    ui.showToast('Subiendo imágenes...', 'warning');
    if (logoFile) {
      const url = await api.uploadImage(supabaseClient, logoFile);
      if (url) logoUrl = url;
    }
    if (bannerFile) {
      const url = await api.uploadImage(supabaseClient, bannerFile);
      if (url) bannerUrl = url;
    }
  }

  const hours = {};
  ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].forEach(day => {
    hours[day] = {
      open: document.querySelector(`input[data-day="${day}"][data-type="open"]`).value,
      close: document.querySelector(`input[data-day="${day}"][data-type="close"]`).value,
      closed: document.querySelector(`input[data-day="${day}"][data-type="closed"]`).checked
    };
  });
  
  const settingsData = {
    name: document.getElementById('settingsRestaurantName').value,
    description: document.getElementById('settingsRestaurantDesc').value,
    phone: document.getElementById('settingsPhone').value,
    address: document.getElementById('settingsAddress').value,
    google_maps_url: document.getElementById('settingsMaps').value,
    whatsapp: document.getElementById('settingsWhatsapp').value,
    instagram: document.getElementById('settingsInstagram').value,
    facebook: document.getElementById('settingsFacebook').value,
    tiktok: document.getElementById('settingsTiktok').value,
    website: document.getElementById('settingsWebsite').value,
    primary_color: document.getElementById('settingsPrimaryColor').value,
    button_color: document.getElementById('settingsButtonColor').value,
    logo_url: logoUrl,
    banner_url: bannerUrl,
    opening_hours: hours
  };
  
  const { error } = await supabaseClient
    .from('restaurants')
    .update(settingsData)
    .eq('id', state.currentRestaurant.id);
    
  if (error) {
    ui.showToast('Error al guardar configuración', 'error');
  } else {
    ui.showToast('Configuración guardada exitosamente');
    await initDashboard();
  }
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

  // Close sidebar on mobile after selection
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && window.innerWidth < 1024) {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.add('hidden');
  }
}
