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
            @page { 
              margin: 0; 
              size: portrait; /* Forzamos retrato sin especificar tamaño exacto para mayor compatibilidad */
            }
            html, body { 
              margin: 0; 
              padding: 0; 
              width: 100%;
              height: 100%;
              overflow: hidden;
              background: #fff;
              -webkit-print-color-adjust: exact;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: 'DM Sans', sans-serif;
            }
            .print-card {
              width: 100%;
              max-width: 148mm;
              height: 100vh;
              max-height: 210mm;
              padding: 10mm 15mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-around; /* Distribución uniforme */
              text-align: center;
              box-sizing: border-box;
              background: #fff;
              page-break-after: avoid;
            }
            .header { margin-top: 0; }
            .business-name { 
              font-family: 'Space Grotesk', sans-serif; 
              font-size: 32pt; 
              font-weight: 800; 
              color: #111; 
              margin: 0;
              line-height: 1;
              text-transform: uppercase;
              word-wrap: break-word;
            }
            .business-info {
              font-size: 13pt;
              color: #666;
              margin-top: 2mm;
              font-weight: 500;
              letter-spacing: 0.5mm;
            }
            
            .qr-wrapper {
              padding: 6mm;
              background: #fff;
              border-radius: 35px;
              border: 5px solid #10b981;
              margin: 5mm 0;
              display: inline-block;
            }
            .qr-image {
              width: 75mm;
              height: 75mm;
              display: block;
            }
            
            .cta-title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 16pt;
              font-weight: 800;
              color: #10b981;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.8mm;
            }
            .cta-subtitle {
              font-size: 11pt;
              color: #444;
              margin: 2mm auto 0;
              max-width: 90%;
            }
            
            .footer {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 3mm;
              width: 100%;
            }
            .tagline {
              font-size: 8pt;
              color: #999;
              font-weight: 700;
              letter-spacing: 0.2rem;
              text-transform: uppercase;
            }
            .app-logo {
              width: 50mm;
              height: auto;
              object-contain: contain;
            }
            
            @media print {
              body, .print-card { 
                margin: 0; 
                border: none;
                box-shadow: none;
              }
              .qr-wrapper { 
                border-color: #10b981 !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 500);">
          <div class="print-card">
            <div class="header">
              <h1 class="business-name">${r.name}</h1>
              <p class="business-info">${r.phone ? '☎️ ' + r.phone : 'DISFRUTA NUESTRO MENÚ'}</p>
            </div>
            
            <div class="qr-wrapper">
              <img src="${qrImage}" class="qr-image">
            </div>
            
            <div class="cta-container">
              <h2 class="cta-title">Escanea el Código QR</h2>
              <p class="cta-subtitle">Para ver nuestra carta digital y precios actualizados directamente en tu celular.</p>
            </div>
            
            <div class="footer">
              <div class="tagline">Tecnología por</div>
              <img src="${logoUrl}" class="app-logo">
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
