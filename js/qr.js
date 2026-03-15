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
    
    // Detección robusta de la librería (puede estar como QRCode o qrcode)
    const qrLib = window.QRCode || window.qrcode || (typeof QRCode !== 'undefined' ? QRCode : (typeof qrcode !== 'undefined' ? qrcode : null));
    
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
 * Open a print window for the QR code with business details (Half-legal/Medio Oficio format)
 */
export function printQR() {
  const canvas = document.querySelector('#mainQR canvas');
  if (canvas && state.currentRestaurant) {
    const r = state.currentRestaurant;
    const printWindow = window.open('', '_blank');
    
    const qrImage = canvas.toDataURL('image/png');
    // Generamos el enlace absoluto para logo.png
    const logoUrl = window.location.origin + '/logo.png';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir QR - ${r.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'DM Sans', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fdfdfd; }
            .print-card { 
              width: 148mm; /* Medio Oficio aprox */
              height: 210mm; /* A5 / Medio Oficio vertical */
              padding: 20mm;
              display: flex;
              flex-direction: column; 
              align-items: center; 
              justify-content: center;
              border: 1px solid #eee;
              text-align: center;
              box-sizing: border-box;
            }
            .business-name { font-family: 'Space Grotesk', sans-serif; font-size: 32pt; font-weight: bold; margin-bottom: 5mm; color: #000; }
            .business-phone { font-size: 18pt; color: #555; margin-bottom: 15mm; }
            .qr-image { width: 80mm; height: 80mm; margin-bottom: 15mm; }
            .footer { display: flex; flex-direction: column; align-items: center; gap: 3mm; }
            .app-logo { width: 30mm; }
            .tagline { font-size: 10pt; color: #888; text-transform: uppercase; letter-spacing: 2pt; }
            @media print {
              body { background: white; }
              .print-card { border: none; }
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="print-card">
            <div class="business-name">${r.name.toUpperCase()}</div>
            <div class="business-phone">${r.phone ? 'TELÉFONO: ' + r.phone : 'ESCANEAME PARA VER EL MENÚ'}</div>
            
            <img src="${qrImage}" class="qr-image">
            
            <div class="footer">
              <div class="tagline">TECNOLOGÍA POR</div>
              <img src="${logoUrl}" class="app-logo">
              <div style="font-size: 8pt; color: #aaa; margin-top: 2mm;">www.menuclick.com</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
