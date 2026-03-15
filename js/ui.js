/**
 * @fileoverview UI rendering and interaction logic for Digital Menu View
 */

import { state } from './state.js';
import { trackItemView, loadDashboardData } from './api.js';
import { scrollToCategory } from './utils.js';

/**
 * Sanitize HTML to prevent XSS
 * @param {string} str - Raw string
 * @returns {string} - Sanitized string
 */
function sanitize(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Show a toast notification
 * @param {string} message - Message to show
 * @param {string} type - 'success', 'error', or 'warning'
 */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-circle'
  };
  
  toast.innerHTML = `
    <i data-lucide="${icons[type]}" class="w-5 h-5 ${type === 'success' ? 'text-accent' : type === 'error' ? 'text-red-500' : 'text-coral'}"></i>
    <span>${sanitize(message)}</span>
  `;
  
  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

/**
 * Show a confirmation modal
 */
export function showConfirm(title, message, callback) {
  const titleEl = document.getElementById('confirmTitle');
  const msgEl = document.getElementById('confirmMessage');
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  
  const confirmBtn = document.getElementById('confirmButton');
  if (confirmBtn) {
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', () => {
      callback();
      closeConfirmModal();
    });
  }
  
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.add('active');
}

export function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.remove('active');
}

export function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(viewId);
  if (view) view.classList.add('active');
}

export function showAuthModal(mode) {
  const modal = document.getElementById('authModal');
  const title = document.getElementById('authModalTitle');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (!modal) return;
  modal.classList.add('active');
  
  if (mode === 'login') {
    if (title) title.textContent = 'Iniciar Sesión';
    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
  } else {
    if (title) title.textContent = 'Crear Cuenta';
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
  }
}

export function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
}

/**
 * Render management menu (Dashboard)
 */
export function renderMenuContent() {
  const container = document.getElementById('menuContent');
  const emptyState = document.getElementById('emptyMenuState');
  if (!container) return;
  
  if (state.categories.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  
  if (emptyState) emptyState.classList.add('hidden');
  
  container.innerHTML = state.categories.map(category => {
    const categoryItems = state.menuItems.filter(item => item.category_id === category.id);
    
    return `
      <div class="category-block animate-fadeIn">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display font-semibold text-xl">${sanitize(category.name)}</h3>
            ${category.description ? `<p class="text-sm text-surface-500">${sanitize(category.description)}</p>` : ''}
          </div>
          <div class="flex gap-2">
            <button onclick="window.app.ui.editCategory('${category.id}')" class="p-2 hover:bg-surface-400 rounded-lg transition-colors">
              <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button onclick="window.app.ui.deleteCategory('${category.id}')" class="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
        
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${categoryItems.map(item => `
            <div class="menu-item-card ${!item.is_available ? 'opacity-50' : ''}">
              <div class="aspect-video bg-surface-400 relative">
                ${item.image_url 
                  ? `<img src="${item.image_url}" alt="${sanitize(item.name)}" class="w-full h-full object-cover">`
                  : `<div class="w-full h-full flex items-center justify-center"><i data-lucide="image" class="w-8 h-8 text-surface-500"></i></div>`
                }
              </div>
              <div class="p-4">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <h4 class="font-semibold">${sanitize(item.name)}</h4>
                  <span class="text-accent font-bold">S/ ${parseFloat(item.price).toFixed(2)}</span>
                </div>
                <p class="text-sm text-surface-500 line-clamp-2 mb-3">${sanitize(item.description)}</p>
                <div class="flex gap-2">
                  <button onclick="window.app.ui.editItem('${item.id}')" class="flex-1 btn-secondary text-sm py-2">
                    <i data-lucide="edit-2" class="w-4 h-4 inline mr-1"></i> Editar
                  </button>
                  <button onclick="window.app.ui.deleteItem('${item.id}')" class="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
          <button onclick="window.app.ui.showItemModal('${category.id}')" class="border-2 border-dashed border-surface-400 rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:border-accent hover:bg-accent/5 transition-all min-h-[150px]">
            <i data-lucide="plus" class="w-8 h-8 text-surface-500"></i>
            <span class="text-surface-500">Nuevo plato</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Render Public Menu View
 */
export function renderPublicMenu(restaurant, publicCategories, publicItems, supabase) {
  // 1. Personalización de colores
  if (restaurant.primary_color) {
    document.documentElement.style.setProperty('--accent', restaurant.primary_color);
  }
  
  // 2. Banner y Logo
  const bannerEl = document.getElementById('publicMenuBanner');
  const bannerImg = document.getElementById('publicBannerImg');
  const logoContainer = document.getElementById('publicMenuLogo');

  if (restaurant.banner_url && bannerEl && bannerImg) {
    bannerImg.src = restaurant.banner_url;
    bannerEl.classList.remove('hidden');
    if (logoContainer) {
      logoContainer.classList.remove('mt-8');
      logoContainer.classList.add('-mt-16');
    }
  } else {
    if (bannerEl) bannerEl.classList.add('hidden');
    if (logoContainer) {
      logoContainer.classList.remove('-mt-16');
      logoContainer.classList.add('mt-8');
    }
  }

  const logoImg = document.getElementById('publicLogoImg');
  const logoIcon = document.getElementById('publicLogoIcon');
  if (restaurant.logo_url && logoImg) {
    logoImg.src = restaurant.logo_url;
    logoImg.classList.remove('hidden');
    if (logoIcon) logoIcon.classList.add('hidden');
  }

  // 3. Información Básica
  const titleEl = document.getElementById('publicMenuTitle');
  if (titleEl) titleEl.textContent = restaurant.name;
  
  const descEl = document.getElementById('publicMenuDesc');
  if (descEl) descEl.textContent = restaurant.description || '';

  const addressEl = document.getElementById('publicAddress');
  if (addressEl) addressEl.textContent = restaurant.address || 'Dirección no disponible';

  const mapsLink = document.getElementById('publicMapsLink');
  if (mapsLink && restaurant.google_maps_url) {
    mapsLink.href = restaurant.google_maps_url;
    mapsLink.classList.remove('hidden');
  }

  // 4. Redes Sociales
  const socialContainer = document.getElementById('socialLinks');
  if (socialContainer) {
    const socials = [
      { id: 'whatsapp', icon: 'message-circle', color: 'bg-green-500', url: restaurant.whatsapp ? `https://wa.me/${restaurant.whatsapp.replace(/\D/g,'')}` : null },
      { id: 'instagram', icon: 'instagram', color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500', url: restaurant.instagram ? `https://instagram.com/${restaurant.instagram.replace('@','')}` : null },
      { id: 'facebook', icon: 'facebook', color: 'bg-blue-600', url: restaurant.facebook ? (restaurant.facebook.startsWith('http') ? restaurant.facebook : `https://facebook.com/${restaurant.facebook}`) : null },
      { id: 'tiktok', icon: 'music', color: 'bg-black', url: restaurant.tiktok ? `https://tiktok.com/@${restaurant.tiktok.replace('@','')}` : null },
      { id: 'website', icon: 'globe', color: 'bg-cyan-500', url: restaurant.website }
    ];

    socialContainer.innerHTML = socials
      .filter(s => s.url)
      .map(s => `
        <a href="${s.url}" target="_blank" class="w-10 h-10 ${s.color} rounded-full flex items-center justify-center text-white shadow-lg transform hover:scale-110 transition-transform">
          <i data-lucide="${s.icon}" class="w-5 h-5"></i>
        </a>
      `).join('');
  }

  // 5. Horarios
  const hoursList = document.getElementById('publicHoursList');
  if (hoursList && restaurant.opening_hours) {
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    hoursList.innerHTML = days.map(day => {
      const h = restaurant.opening_hours[day];
      if (!h) return '';
      return `
        <div class="flex justify-between gap-4">
          <span class="capitalize font-medium">${day}</span>
          <span>${h.closed ? '<span class="text-red-500">Cerrado</span>' : `${h.open} - ${h.close}`}</span>
        </div>
      `;
    }).join('');
  }

  // 6. Categorías (Tabs)
  const tabsContainer = document.getElementById('categoryTabs');
  if (tabsContainer) {
    tabsContainer.innerHTML = publicCategories.map((cat, index) => `
      <button 
        onclick="window.app.utils.scrollToCategory('${cat.id}')" 
        class="category-tab px-5 py-2.5 rounded-full text-sm font-bold transition-all ${index === 0 ? 'active' : ''}"
        data-category-id="${cat.id}"
      >
        ${sanitize(cat.name)}
      </button>
    `).join('');
  }
  
  // 7. Platos
  const itemsContainer = document.getElementById('publicMenuItems');
  const emptyState = document.getElementById('publicMenuEmpty');
  if (!itemsContainer) return;
  
  if (publicCategories.length === 0 || publicItems.length === 0) {
    itemsContainer.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  
  if (emptyState) emptyState.classList.add('hidden');
  
  itemsContainer.innerHTML = publicCategories.map(category => {
    const categoryItems = publicItems.filter(item => item.category_id === category.id);
    if (categoryItems.length === 0) return '';
    
    return `
      <div id="category-${category.id}" class="mb-12 scroll-mt-24">
        <h2 class="font-display text-2xl font-bold mb-6 text-white border-l-4 border-accent pl-4">${sanitize(category.name)}</h2>
        <div class="grid gap-6">
          ${categoryItems.map(item => `
            <div class="public-menu-item flex gap-4 p-4 card bg-surface-100 hover:border-accent/40 transition-all border-surface-400 group" onclick="window.app.api.trackItemView(window.app.supabaseClient, '${item.id}')">
              ${item.image_url ? `
                <img src="${item.image_url}" alt="${sanitize(item.name)}" class="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-2xl flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
              ` : `
                <div class="w-24 h-24 sm:w-32 sm:h-32 bg-surface-400 rounded-2xl flex-shrink-0 flex items-center justify-center">
                  <i data-lucide="utensils" class="w-10 h-10 text-surface-500"></i>
                </div>
              `}
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-bold text-lg sm:text-xl text-white group-hover:text-accent transition-colors">${sanitize(item.name)}</h3>
                  <span class="text-accent font-bold text-xl" style="${restaurant.primary_color ? `color: ${restaurant.primary_color}` : ''}">S/ ${parseFloat(item.price).toFixed(2)}</span>
                </div>
                <p class="text-sm text-surface-500 line-clamp-2 mt-2 leading-relaxed">${sanitize(item.description)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Modals
 */
export function showCategoryModal(categoryId = null) {
  const modal = document.getElementById('categoryModal');
  const title = document.getElementById('categoryModalTitle');
  const form = document.getElementById('categoryForm');
  
  state.editingCategoryId = categoryId;
  
  if (categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    if (title) title.textContent = 'Editar Categoría';
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDesc').value = category.description || '';
  } else {
    if (title) title.textContent = 'Nueva Categoría';
    if (form) form.reset();
    document.getElementById('categoryId').value = '';
  }
  if (modal) modal.classList.add('active');
}

export function showItemModal(categoryId = null, itemId = null) {
  const modal = document.getElementById('itemModal');
  const title = document.getElementById('itemModalTitle');
  const form = document.getElementById('itemForm');
  const categorySelect = document.getElementById('itemCategory');
  
  state.editingItemId = itemId;
  state.setUploadedImageUrl(null);
  
  if (categorySelect) {
    categorySelect.innerHTML = `
      <option value="">Seleccionar categoría</option>
      ${state.categories.map(c => `<option value="${c.id}">${sanitize(c.name)}</option>`).join('')}
    `;
  }
  
  if (itemId) {
    const item = state.menuItems.find(i => i.id === itemId);
    if (title) title.textContent = 'Editar Plato';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemCategory').value = item.category_id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemDesc').value = item.description || '';
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemAvailable').checked = item.is_available;
    document.getElementById('itemFeatured').checked = item.is_featured;
    
    const urlInput = document.getElementById('itemImageUrl');
    if (urlInput) urlInput.value = item.image_url || '';
    
    if (item.image_url) {
      state.setUploadedImageUrl(item.image_url);
      const prev = document.getElementById('itemImagePreviewImg');
      if (prev) prev.src = item.image_url;
      document.getElementById('itemImagePreview').classList.remove('hidden');
      document.getElementById('itemImageZone').classList.add('hidden');
    }
  } else {
    if (title) title.textContent = 'Nuevo Plato';
    if (form) form.reset();
    document.getElementById('itemId').value = '';
    const urlInput = document.getElementById('itemImageUrl');
    if (urlInput) urlInput.value = '';
    if (categoryId && categorySelect) categorySelect.value = categoryId;
    const preview = document.getElementById('itemImagePreview');
    if (preview) preview.classList.add('hidden');
    const zone = document.getElementById('itemImageZone');
    if (zone) zone.classList.remove('hidden');
  }
  if (modal) modal.classList.add('active');
}

export function closeItemModal() {
  const modal = document.getElementById('itemModal');
  if (modal) modal.classList.remove('active');
}

export function closeCategoryModal() {
  const modal = document.getElementById('categoryModal');
  if (modal) modal.classList.remove('active');
}

/**
 * Admin Renders
 */
export function renderAdminRestaurants(restaurants) {
  const tbody = document.getElementById('adminRestaurantsTable');
  if (!tbody) return;
  
  tbody.innerHTML = restaurants.map(r => `
    <tr class="border-t border-surface-400 hover:bg-surface-200">
      <td class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-surface-400 flex items-center justify-center">
            <i data-lucide="store" class="w-5 h-5"></i>
          </div>
          <div>
            <p class="font-medium">${sanitize(r.name)}</p>
            <p class="text-xs text-surface-500">/${sanitize(r.slug)}</p>
          </div>
        </div>
      </td>
      <td class="p-4 text-sm">${r.profiles?.email || '-'}</td>
      <td class="p-4">
        <span class="px-2 py-1 rounded-full text-xs font-medium ${r.plan === 'pro' ? 'bg-accent/20 text-accent' : r.plan === 'business' ? 'bg-coral/20 text-coral' : 'bg-surface-400 text-surface-500'}">
          ${r.plan || 'free'}
        </span>
      </td>
      <td class="p-4">
        <span class="flex items-center gap-2 text-sm">
          <span class="w-2 h-2 rounded-full ${r.is_active ? 'bg-accent' : 'bg-red-500'}"></span>
          ${r.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td class="p-4 text-sm text-surface-500">${new Date(r.created_at).toLocaleDateString()}</td>
      <td class="p-4">
        <div class="flex gap-2">
          <button onclick="window.app.api.toggleRestaurantStatus(window.app.supabaseClient, '${r.id}', ${!r.is_active}).then(() => window.app.initAdmin())" class="p-2 hover:bg-surface-400 rounded-lg">
            <i data-lucide="${r.is_active ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>
          </button>
          <button onclick="window.app.ui.adminDeleteRestaurant('${r.id}')" class="p-2 hover:bg-red-500/10 text-red-500 rounded-lg">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Functional Wrappers
 */
export function editCategory(id) { showCategoryModal(id); }
export function deleteCategory(id) {
  const category = state.categories.find(c => c.id === id);
  showConfirm( 'Eliminar categoría', `¿Estás seguro de eliminar "${category.name}"?`, async () => {
    await window.app.supabaseClient.from('categories').delete().eq('id', id);
    showToast('Categoría eliminada');
    loadDashboardData(window.app.supabaseClient).then(() => renderMenuContent());
  });
}

export function editItem(id) { showItemModal(null, id); }
export function deleteItem(id) {
  const item = state.menuItems.find(i => i.id === id);
  showConfirm('Eliminar plato', `¿Eliminar "${item.name}"?`, async () => {
    await window.app.supabaseClient.from('menu_items').delete().eq('id', id);
    showToast('Plato eliminado');
    loadDashboardData(window.app.supabaseClient).then(() => renderMenuContent());
  });
}

export function adminDeleteRestaurant(id) {
  showConfirm('Eliminar Negocio', 'Acción irreversible.', async () => {
    await window.app.supabaseClient.from('restaurants').delete().eq('id', id);
    showToast('Negocio eliminado');
    window.app.initAdmin();
  });
}
/**
 * Setup image preview for file inputs
 * @param {string} inputId - ID of file input
 * @param {string} previewImgId - ID of img element for preview
 * @param {string} containerId - ID of container to show/hide
 */
export function setupImagePreview(inputId, previewImgId, containerId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewImgId);
  const container = document.getElementById(containerId);
  
  if (input && preview && container) {
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.src = e.target.result;
          container.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
    });
  }
}
