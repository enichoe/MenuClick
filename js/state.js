/**
 * @fileoverview Global state management
 */

export const state = {
  currentUser: null,
  userRole: 'user', // 'user' or 'admin'
  currentRestaurant: null,
  currentMenu: null,
  categories: [],
  menuItems: [],
  editingCategoryId: null,
  editingItemId: null,
  confirmCallback: null,
  uploadedImageUrl: null,
  adminRestaurants: [],
  dashboardStats: { views: 0, scans: 0 },
  
  // Setters
  setUser(user) { this.currentUser = user; },
  setUserRole(role) { this.userRole = role || 'user'; },
  setRestaurant(restaurant) { this.currentRestaurant = restaurant; },
  setMenu(menu) { this.currentMenu = menu; },
  setCategories(cats) { this.categories = cats; },
  setItems(items) { this.menuItems = items; },
  setUploadedImageUrl(url) { this.uploadedImageUrl = url; },
  setAdminRestaurants(rests) { this.adminRestaurants = rests; },
  setDashboardStats(views, scans) { this.dashboardStats = { views, scans }; }
};
