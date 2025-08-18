// Simple icon creator using Canvas API
// Run this in browser console on any page

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function createIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#0066cc');
  gradient.addColorStop(1, '#004499');
  ctx.fillStyle = gradient;
  
  // Rounded rectangle background
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  
  // Wave pattern
  ctx.fillStyle = 'rgba(0, 128, 255, 0.3)';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.7);
  ctx.quadraticCurveTo(size * 0.25, size * 0.6, size * 0.5, size * 0.7);
  ctx.quadraticCurveTo(size * 0.75, size * 0.8, size, size * 0.7);
  ctx.lineTo(size, size);
  ctx.lineTo(0, size);
  ctx.closePath();
  ctx.fill();
  
  // Main text "CB"
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.35}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CB', size / 2, size * 0.45);
  
  // Subtitle "DIVING"
  if (size >= 144) {
    ctx.font = `${size * 0.08}px Arial, sans-serif`;
    ctx.globalAlpha = 0.9;
    ctx.fillText('DIVING', size / 2, size * 0.65);
    ctx.globalAlpha = 1;
  }
  
  return canvas.toDataURL('image/png');
}

// Generate all icons
console.log('CalyBase PWA Icons - Copy these data URLs and save as PNG files:');
sizes.forEach(size => {
  const dataUrl = createIcon(size);
  console.log(`${size}x${size}: ${dataUrl}`);
});

console.log('To save: Right-click each data URL, "Open in new tab", then save the image');