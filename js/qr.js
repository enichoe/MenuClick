/**
 * @fileoverview QR Code generation and management
 */

import { state } from './state.js';
import { BASE_URL } from './config.js';

/**
 * Generate a demo QR for the landing page hero section
 */
export function generateHeroQR() {
  const container = document.getElementById('heroQR');
  if (container && typeof QRCode !== 'undefined') {
    QRCode.toCanvas(document.createElement('canvas'), 'https://example.com/menu/demo', {
      width: 80,
      margin: 0,
      color: { dark: '#000000', light: '#ffffff' }
    }, (error, canvas) => {
      if (!error) {
        container.innerHTML = '';
        container.appendChild(canvas);
      }
    });
  }
}

/**
 * Generate QR codes for the dashboard
 */
export function generateDashboardQR() {
  if (!state.currentRestaurant) return;
  
  const menuUrl = `${BASE_URL}/menu/${state.currentRestaurant.slug}`;
  const containers = ['dashboardQR', 'mainQR'];
  
  containers.forEach(id => {
    const container = document.getElementById(id);
    if (container && typeof QRCode !== 'undefined') {
      QRCode.toCanvas(document.createElement('canvas'), menuUrl, {
        width: id === 'mainQR' ? 192 : 96,
        margin: 0,
        color: { dark: '#000000', light: '#ffffff' }
      }, (error, canvas) => {
        if (!error) {
          container.innerHTML = '';
          container.appendChild(canvas);
        }
      });
    }
  });
}

/**
 * Download the main dashboard QR as an image
 */
export function downloadQR() {
  const canvas = document.querySelector('#mainQR canvas');
  if (canvas && state.currentRestaurant) {
    const link = document.createElement('a');
    link.download = `qr-${state.currentRestaurant.slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}

/**
 * Open a print window for the QR code
 */
export function printQR() {
  const canvas = document.querySelector('#mainQR canvas');
  if (canvas && state.currentRestaurant) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>QR - ${state.currentRestaurant.name}</title></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;">
          <img src="${canvas.toDataURL('image/png')}" style="max-width:300px;">
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}
