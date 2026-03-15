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
  
  // Usamos el formato compatible con Vercel pero también soportamos el fallback
  const menuUrl = `${BASE_URL}/menu/${state.currentRestaurant.slug}`;
  const containers = ['dashboardQR', 'mainQR'];
  
  containers.forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    
    // El objeto global de la librería es QRCode
    const qrLib = window.QRCode || (typeof QRCode !== 'undefined' ? QRCode : null);
    
    if (qrLib) {
      container.innerHTML = '';
      const canvas = document.createElement('canvas');
      container.appendChild(canvas);
      
      qrLib.toCanvas(canvas, menuUrl, {
        width: id === 'mainQR' ? 240 : 120,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      }, (error) => {
        if (error) {
          console.error('QR Generation Error:', error);
          container.innerHTML = '<p class="text-xs text-red-500">Error al generar QR</p>';
        }
      });
    } else {
      console.error('QRCode library not found');
      container.innerHTML = '<p class="text-xs text-red-500">Librería QR no cargada</p>';
    }
  });
}

/**
 * Download the main dashboard QR as an image
 */
export function downloadQR() {
  const canvas = document.querySelector('#mainQR canvas');
  if (canvas && state.currentRestaurant) {
    try {
      const link = document.createElement('a');
      link.download = `menu-qr-${state.currentRestaurant.slug}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download failed', e);
      alert('No se pudo descargar la imagen directamente. Intente click derecho -> Guardar imagen.');
    }
  } else {
    alert('QR no generado. Intente recargar la página.');
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
