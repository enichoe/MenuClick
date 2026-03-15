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
  const menuUrl = `${BASE_URL}/menu.html?s=${state.currentRestaurant.slug}`;
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
          <title>Menú QR - ${r.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            @page { margin: 0; size: A5 portrait; }
            body { 
              margin: 0; 
              padding: 0; 
              font-family: 'DM Sans', sans-serif; 
              background: #fff;
              -webkit-print-color-adjust: exact;
            }
            .print-card {
              width: 148mm;
              height: 210mm;
              padding: 15mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              text-align: center;
              box-sizing: border-box;
              background: #fff;
            }
            .header { margin-top: 5mm; }
            .business-name { 
              font-family: 'Space Grotesk', sans-serif; 
              font-size: 34pt; 
              font-weight: 800; 
              color: #111; 
              margin: 0;
              line-height: 1.1;
              text-transform: uppercase;
            }
            .business-info {
              font-size: 14pt;
              color: #666;
              margin-top: 4mm;
              font-weight: 500;
              letter-spacing: 0.5mm;
            }
            
            .main-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%;
            }
            
            .qr-wrapper {
              position: relative;
              padding: 8mm;
              background: #fff;
              border-radius: 40px;
              border: 5px solid #10b981;
              margin: 12mm 0;
              box-shadow: 0 10mm 30mm rgba(16, 185, 129, 0.1);
            }
            .qr-image {
              width: 80mm;
              height: 80mm;
              display: block;
            }
            
            .cta-container {
              margin-top: 5mm;
            }
            .cta-title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 18pt;
              font-weight: 800;
              color: #10b981;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.8mm;
            }
            .cta-subtitle {
              font-size: 12pt;
              color: #444;
              margin-top: 3mm;
              max-width: 90%;
            }
            
            .footer {
              margin-bottom: 5mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4mm;
              width: 100%;
            }
            .footer-line {
              width: 50mm;
              height: 1px;
              background: #eee;
              margin-bottom: 2mm;
            }
            .tagline {
              font-size: 9pt;
              color: #999;
              font-weight: 700;
              letter-spacing: 0.25rem;
              text-transform: uppercase;
            }
            .app-logo {
              width: 60mm;
              opacity: 1;
              filter: grayscale(0.1);
            }
            
            @media print {
              body { background: white; }
              .print-card { border: none; }
              .qr-wrapper { border-color: #10b981 !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 500);">
          <div class="print-card">
            <div class="header">
              <h1 class="business-name">${r.name}</h1>
              <p class="business-info">${r.phone ? '☎️ ' + r.phone : 'DISFRUTA NUESTRO MENÚ'}</p>
            </div>
            
            <div class="main-content">
              <div class="qr-wrapper">
                <img src="${qrImage}" class="qr-image">
              </div>
              
              <div class="cta-container">
                <h2 class="cta-title">Escanea el Código QR</h2>
                <p class="cta-subtitle">Para ver nuestra carta digital y precios actualizados directamente en tu celular.</p>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-line"></div>
              <div class="tagline">Tecnología Impulsada por</div>
              <img src="${logoUrl}" class="app-logo">
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
