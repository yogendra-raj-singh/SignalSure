import * as THREE from 'three';

export interface WebGLCapabilitiesInfo {
  supported: boolean;
  isSoftwareGl: boolean;
}

export function probeWebGLCapabilities(): WebGLCapabilitiesInfo {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: false };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext | null;

    if (!gl) {
      return { supported: false, isSoftwareGl: false };
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const rendererStr = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
      rendererStr
    );

    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: false };
  }
}

export function createCoreSurfaceBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#a8a8a8';
    ctx.lineWidth = 1;
    const step = 16;
    for (let x = 0; x <= size; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#c8c8c8';
    for (let x = 0; x < size; x += step * 2) {
      for (let y = 0; y < size; y += step * 2) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createRadialBaseTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 8, cx, cx, cx);
    grad.addColorStop(0, 'rgba(0, 240, 200, 0.24)');
    grad.addColorStop(0.45, 'rgba(0, 180, 152, 0.08)');
    grad.addColorStop(1, 'rgba(3, 8, 8, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(0, 240, 200, 0.22)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cx, cx * 0.62, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
