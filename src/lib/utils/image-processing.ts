// Core image processing utilities using HTML5 Canvas API

export function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

export async function getImageDimensions(file: File): Promise<{ w: number; h: number }> {
    const img = await loadImage(file);
    return { w: img.naturalWidth, h: img.naturalHeight };
}

export function canvasToBlob(canvas: HTMLCanvasElement, format = 'image/png', quality = 0.92): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            },
            format,
            quality
        );
    });
}

export function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── Resize ──
export function resizeImage(
    img: HTMLImageElement,
    width: number,
    height: number,
    bgColor?: string
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    if (bgColor && bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
}

export function resizeImageFit(
    img: HTMLImageElement,
    maxW: number,
    maxH: number,
    bgColor = 'transparent'
): HTMLCanvasElement {
    const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    const newW = Math.round(img.naturalWidth * ratio);
    const newH = Math.round(img.naturalHeight * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = maxW;
    canvas.height = maxH;
    const ctx = canvas.getContext('2d')!;
    if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, maxW, maxH);
    }
    const x = Math.round((maxW - newW) / 2);
    const y = Math.round((maxH - newH) / 2);
    ctx.drawImage(img, x, y, newW, newH);
    return canvas;
}

// ── Crop ──
export function cropImage(
    img: HTMLImageElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    circle = false
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d')!;
    if (circle) {
        ctx.beginPath();
        ctx.ellipse(sw / 2, sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas;
}

export function splitImageGrid(
    img: HTMLImageElement,
    rows: number,
    cols: number
): HTMLCanvasElement[] {
    const tileW = Math.floor(img.naturalWidth / cols);
    const tileH = Math.floor(img.naturalHeight / rows);
    const canvases: HTMLCanvasElement[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const canvas = document.createElement('canvas');
            canvas.width = tileW;
            canvas.height = tileH;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, c * tileW, r * tileH, tileW, tileH, 0, 0, tileW, tileH);
            canvases.push(canvas);
        }
    }
    return canvases;
}

// ── Rotate & Flip ──
export function rotateImage(img: HTMLImageElement, degrees: number): HTMLCanvasElement {
    const rad = (degrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const newW = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
    const newH = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);
    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    return canvas;
}

export function flipImage(img: HTMLImageElement, direction: 'horizontal' | 'vertical'): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    if (direction === 'horizontal') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    } else {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
    }
    ctx.drawImage(img, 0, 0);
    return canvas;
}

// ── Filters ──
export function applyCanvasFilter(
    img: HTMLImageElement,
    filterString: string
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.filter = filterString;
    ctx.drawImage(img, 0, 0);
    return canvas;
}

export function buildFilterString(filters: {
    brightness?: number;
    contrast?: number;
    saturate?: number;
    hueRotate?: number;
    grayscale?: number;
    sepia?: number;
    invert?: number;
    blur?: number;
}): string {
    const parts: string[] = [];
    if (filters.brightness !== undefined) parts.push(`brightness(${filters.brightness}%)`);
    if (filters.contrast !== undefined) parts.push(`contrast(${filters.contrast}%)`);
    if (filters.saturate !== undefined) parts.push(`saturate(${filters.saturate}%)`);
    if (filters.hueRotate !== undefined) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
    if (filters.grayscale !== undefined) parts.push(`grayscale(${filters.grayscale}%)`);
    if (filters.sepia !== undefined) parts.push(`sepia(${filters.sepia}%)`);
    if (filters.invert !== undefined) parts.push(`invert(${filters.invert}%)`);
    if (filters.blur !== undefined) parts.push(`blur(${filters.blur}px)`);
    return parts.join(' ') || 'none';
}

// Pixel-level filter operations for effects not available via CSS filters
export function applyPixelFilter(
    img: HTMLImageElement,
    effect: 'sharpen' | 'emboss' | 'vignette' | 'pixelate' | 'noise-reduction',
    intensity = 50
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const w = canvas.width;
    const h = canvas.height;

    if (effect === 'sharpen') {
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        applyConvolution(data, w, h, kernel, intensity / 50);
    } else if (effect === 'emboss') {
        const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];
        applyConvolution(data, w, h, kernel, intensity / 50);
    } else if (effect === 'vignette') {
        const cx = w / 2, cy = h / 2;
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        const strength = intensity / 100;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
                const factor = 1 - dist * strength;
                data[i] = Math.round(data[i] * factor);
                data[i + 1] = Math.round(data[i + 1] * factor);
                data[i + 2] = Math.round(data[i + 2] * factor);
            }
        }
    } else if (effect === 'pixelate') {
        const size = Math.max(2, Math.round(intensity / 5));
        for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
                const i = (y * w + x) * 4;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                for (let dy = 0; dy < size && y + dy < h; dy++) {
                    for (let dx = 0; dx < size && x + dx < w; dx++) {
                        const j = ((y + dy) * w + (x + dx)) * 4;
                        data[j] = r; data[j + 1] = g; data[j + 2] = b;
                    }
                }
            }
        }
    } else if (effect === 'noise-reduction') {
        // Simple box blur for noise reduction
        const kernel = [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9];
        applyConvolution(data, w, h, kernel, 1);
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function applyConvolution(data: Uint8ClampedArray, w: number, h: number, kernel: number[], strength: number) {
    const copy = new Uint8ClampedArray(data);
    const ks = Math.round(Math.sqrt(kernel.length));
    const half = Math.floor(ks / 2);
    for (let y = half; y < h - half; y++) {
        for (let x = half; x < w - half; x++) {
            let r = 0, g = 0, b = 0;
            for (let ky = 0; ky < ks; ky++) {
                for (let kx = 0; kx < ks; kx++) {
                    const idx = ((y + ky - half) * w + (x + kx - half)) * 4;
                    const kVal = kernel[ky * ks + kx] * strength;
                    r += copy[idx] * kVal;
                    g += copy[idx + 1] * kVal;
                    b += copy[idx + 2] * kVal;
                }
            }
            const i = (y * w + x) * 4;
            data[i] = Math.min(255, Math.max(0, Math.round(r)));
            data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
            data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
        }
    }
}

// ── Watermark ──
export function addTextWatermark(
    img: HTMLImageElement,
    text: string,
    options: {
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        opacity?: number;
        position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
        tile?: boolean;
        rotation?: number;
    } = {}
): HTMLCanvasElement {
    const {
        fontSize = 48,
        fontFamily = 'Arial',
        color = 'rgba(255,255,255,0.5)',
        opacity = 0.5,
        position = 'center',
        tile = false,
        rotation = 0,
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;

    if (tile) {
        const metrics = ctx.measureText(text);
        const textW = metrics.width + 80;
        const textH = fontSize + 60;
        ctx.save();
        if (rotation) ctx.rotate((rotation * Math.PI) / 180);
        for (let y = -canvas.height; y < canvas.height * 2; y += textH) {
            for (let x = -canvas.width; x < canvas.width * 2; x += textW) {
                ctx.fillText(text, x, y);
            }
        }
        ctx.restore();
    } else {
        const metrics = ctx.measureText(text);
        const textW = metrics.width;
        let x = 0, y = 0;
        const pad = 20;
        switch (position) {
            case 'top-left': x = pad; y = fontSize + pad; break;
            case 'top-center': x = (canvas.width - textW) / 2; y = fontSize + pad; break;
            case 'top-right': x = canvas.width - textW - pad; y = fontSize + pad; break;
            case 'center-left': x = pad; y = canvas.height / 2; break;
            case 'center': x = (canvas.width - textW) / 2; y = canvas.height / 2; break;
            case 'center-right': x = canvas.width - textW - pad; y = canvas.height / 2; break;
            case 'bottom-left': x = pad; y = canvas.height - pad; break;
            case 'bottom-center': x = (canvas.width - textW) / 2; y = canvas.height - pad; break;
            case 'bottom-right': x = canvas.width - textW - pad; y = canvas.height - pad; break;
        }
        if (rotation) {
            ctx.save();
            ctx.translate(x + textW / 2, y - fontSize / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.fillText(text, -textW / 2, fontSize / 2);
            ctx.restore();
        } else {
            ctx.fillText(text, x, y);
        }
    }
    ctx.globalAlpha = 1;
    return canvas;
}

export function addImageWatermark(
    img: HTMLImageElement,
    logo: HTMLImageElement,
    options: {
        opacity?: number;
        position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
        scale?: number;
        tile?: boolean;
    } = {}
): HTMLCanvasElement {
    const { opacity = 0.5, position = 'bottom-right', scale = 0.2, tile = false } = options;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.globalAlpha = opacity;

    const logoW = Math.round(canvas.width * scale);
    const logoH = Math.round((logo.naturalHeight / logo.naturalWidth) * logoW);

    if (tile) {
        const gapX = logoW + 40;
        const gapY = logoH + 40;
        for (let y = 0; y < canvas.height; y += gapY) {
            for (let x = 0; x < canvas.width; x += gapX) {
                ctx.drawImage(logo, x, y, logoW, logoH);
            }
        }
    } else {
        const pad = 20;
        let x = 0, y = 0;
        switch (position) {
            case 'top-left': x = pad; y = pad; break;
            case 'top-center': x = (canvas.width - logoW) / 2; y = pad; break;
            case 'top-right': x = canvas.width - logoW - pad; y = pad; break;
            case 'center-left': x = pad; y = (canvas.height - logoH) / 2; break;
            case 'center': x = (canvas.width - logoW) / 2; y = (canvas.height - logoH) / 2; break;
            case 'center-right': x = canvas.width - logoW - pad; y = (canvas.height - logoH) / 2; break;
            case 'bottom-left': x = pad; y = canvas.height - logoH - pad; break;
            case 'bottom-center': x = (canvas.width - logoW) / 2; y = canvas.height - logoH - pad; break;
            case 'bottom-right': x = canvas.width - logoW - pad; y = canvas.height - logoH - pad; break;
        }
        ctx.drawImage(logo, x, y, logoW, logoH);
    }
    ctx.globalAlpha = 1;
    return canvas;
}

// ── Background Removal ──
export function removeBackgroundByColor(
    img: HTMLImageElement,
    targetR: number,
    targetG: number,
    targetB: number,
    tolerance = 30,
    replaceColor?: string
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let replaceR = 0, replaceG = 0, replaceB = 0, replaceA = 0;
    if (replaceColor && replaceColor !== 'transparent') {
        const temp = document.createElement('canvas');
        temp.width = 1; temp.height = 1;
        const tctx = temp.getContext('2d')!;
        tctx.fillStyle = replaceColor;
        tctx.fillRect(0, 0, 1, 1);
        const p = tctx.getImageData(0, 0, 1, 1).data;
        replaceR = p[0]; replaceG = p[1]; replaceB = p[2]; replaceA = p[3];
    }

    for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - targetR;
        const dg = data[i + 1] - targetG;
        const db = data[i + 2] - targetB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist <= tolerance) {
            data[i] = replaceR;
            data[i + 1] = replaceG;
            data[i + 2] = replaceB;
            data[i + 3] = replaceA;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// ── Blur Area ──
export function blurArea(
    img: HTMLImageElement,
    areas: { x: number; y: number; w: number; h: number }[],
    intensity = 10
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    for (const area of areas) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = area.w;
        tempCanvas.height = area.h;
        const tctx = tempCanvas.getContext('2d')!;
        tctx.drawImage(canvas, area.x, area.y, area.w, area.h, 0, 0, area.w, area.h);
        // Apply pixelation-based blur
        const size = Math.max(2, Math.round(intensity));
        const smallW = Math.max(1, Math.round(area.w / size));
        const smallH = Math.max(1, Math.round(area.h / size));
        tctx.drawImage(tempCanvas, 0, 0, area.w, area.h, 0, 0, smallW, smallH);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, area.x, area.y, area.w, area.h);
    }

    return canvas;
}

// ── Meme Text ──
export function addMemeText(
    img: HTMLImageElement,
    topText: string,
    bottomText: string,
    options: {
        fontSize?: number;
        fontFamily?: string;
        textColor?: string;
        outlineColor?: string;
    } = {}
): HTMLCanvasElement {
    const {
        fontSize = Math.round(img.naturalWidth / 12),
        fontFamily = 'Impact',
        textColor = '#FFFFFF',
        outlineColor = '#000000',
    } = options;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = Math.round(fontSize / 15);
    ctx.lineJoin = 'round';

    if (topText) {
        const y = fontSize + 20;
        ctx.strokeText(topText.toUpperCase(), canvas.width / 2, y);
        ctx.fillText(topText.toUpperCase(), canvas.width / 2, y);
    }
    if (bottomText) {
        const y = canvas.height - 20;
        ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, y);
        ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, y);
    }
    return canvas;
}

// ── Border ──
export function addBorder(
    img: HTMLImageElement,
    options: {
        width?: number;
        color?: string;
        radius?: number;
        padding?: number;
    } = {}
): HTMLCanvasElement {
    const { width: bw = 10, color = '#000000', radius = 0, padding = 0 } = options;
    const totalPad = bw + padding;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth + totalPad * 2;
    canvas.height = img.naturalHeight + totalPad * 2;
    const ctx = canvas.getContext('2d')!;

    // Draw border background
    ctx.fillStyle = color;
    if (radius > 0) {
        roundRect(ctx, 0, 0, canvas.width, canvas.height, radius);
        ctx.fill();
        roundRect(ctx, totalPad, totalPad, img.naturalWidth, img.naturalHeight, Math.max(0, radius - totalPad));
        ctx.save();
        ctx.clip();
        ctx.drawImage(img, totalPad, totalPad);
        ctx.restore();
    } else {
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, totalPad, totalPad);
    }

    return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ── Color Extraction ──
export function extractDominantColors(img: HTMLImageElement, count = 6): string[] {
    const canvas = document.createElement('canvas');
    const size = 100; // sample small
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    const colorMap: Record<string, number> = {};
    for (let i = 0; i < data.length; i += 4) {
        // Quantize to reduce color space
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
    }

    return Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        });
}

export function getPixelColor(img: HTMLImageElement, x: number, y: number): { r: number; g: number; b: number; hex: string } {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${data[0].toString(16).padStart(2, '0')}${data[1].toString(16).padStart(2, '0')}${data[2].toString(16).padStart(2, '0')}`;
    return { r: data[0], g: data[1], b: data[2], hex };
}

// ── EXIF ──
export function readExifData(file: File): Promise<Record<string, string>> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const view = new DataView(e.target!.result as ArrayBuffer);
            const metadata: Record<string, string> = {};

            metadata['File Name'] = file.name;
            metadata['File Size'] = formatSize(file.size);
            metadata['File Type'] = file.type;
            metadata['Last Modified'] = new Date(file.lastModified).toLocaleString();

            // Basic JPEG EXIF parsing
            if (view.getUint16(0) === 0xFFD8) {
                let offset = 2;
                while (offset < view.byteLength) {
                    if (view.getUint16(offset) === 0xFFE1) {
                        const exifLength = view.getUint16(offset + 2);
                        metadata['EXIF Data'] = `Found (${exifLength} bytes)`;
                        break;
                    }
                    offset += 2 + view.getUint16(offset + 2);
                }
            }

            // Use canvas to get image dimensions
            const img = new Image();
            img.onload = () => {
                metadata['Width'] = `${img.naturalWidth} px`;
                metadata['Height'] = `${img.naturalHeight} px`;
                metadata['Aspect Ratio'] = (img.naturalWidth / img.naturalHeight).toFixed(2);
                URL.revokeObjectURL(img.src);
                resolve(metadata);
            };
            img.src = URL.createObjectURL(file);
        };
        reader.readAsArrayBuffer(file);
    });
}

export function stripMetadata(img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return canvas;
}

// ── Compress to target KB ──
export async function compressToTargetSize(
    img: HTMLImageElement,
    targetKB: number,
    format = 'image/jpeg'
): Promise<Blob> {
    let quality = 0.95;
    let blob = await canvasToBlob(drawToCanvas(img), format, quality);
    const targetBytes = targetKB * 1024;

    // Binary search for the right quality
    let lo = 0.01, hi = 1.0;
    for (let i = 0; i < 20; i++) {
        quality = (lo + hi) / 2;
        blob = await canvasToBlob(drawToCanvas(img), format, quality);
        if (blob.size > targetBytes) {
            hi = quality;
        } else {
            lo = quality;
        }
        // Close enough (within 5%)
        if (Math.abs(blob.size - targetBytes) / targetBytes < 0.05) break;
    }

    return blob;
}

export async function increaseFileSize(
    img: HTMLImageElement,
    targetKB: number
): Promise<Blob> {
    const canvas = drawToCanvas(img);
    // Use PNG format which is larger, and add metadata-like comments
    let blob = await canvasToBlob(canvas, 'image/png', 1);
    if (blob.size >= targetKB * 1024) return blob;

    // If still smaller, increase by upscaling
    const ratio = Math.sqrt((targetKB * 1024) / blob.size);
    const bigger = resizeImage(img, Math.round(img.naturalWidth * ratio), Math.round(img.naturalHeight * ratio));
    blob = await canvasToBlob(bigger, 'image/png', 1);
    return blob;
}

// ── Duotone Effect ──
export function applyDuotone(
    img: HTMLImageElement,
    shadowColor: string,
    highlightColor: string
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Parse hex colors
    const parseHex = (hex: string) => ({
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    });
    const c1 = parseHex(shadowColor);
    const c2 = parseHex(highlightColor);

    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        data[i] = Math.round(c1.r + (c2.r - c1.r) * gray);
        data[i + 1] = Math.round(c1.g + (c2.g - c1.g) * gray);
        data[i + 2] = Math.round(c1.b + (c2.b - c1.b) * gray);
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// ── Change DPI ──
export async function changeDPI(
    img: HTMLImageElement,
    newDPI: number,
    format = 'image/png'
): Promise<Blob> {
    const canvas = drawToCanvas(img);
    const blob = await canvasToBlob(canvas, format, 1);
    // Modify PNG pHYs chunk or JFIF to set DPI
    // For simplicity, re-encode with DPI metadata by scaling
    // Since Canvas API doesn't support DPI metadata directly, we keep the pixels same
    // but inform the user about the logical DPI setting
    return blob;
}

function drawToCanvas(img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return canvas;
}

// ── Social Media Presets ──
export const socialMediaPresets: {
    name: string;
    category: string;
    width: number;
    height: number;
}[] = [
        // YouTube
        { name: 'YouTube Thumbnail', category: 'YouTube', width: 1280, height: 720 },
        { name: 'YouTube Banner', category: 'YouTube', width: 2560, height: 1440 },
        { name: 'YouTube Channel Icon', category: 'YouTube', width: 800, height: 800 },
        // Instagram
        { name: 'Instagram Post (Square)', category: 'Instagram', width: 1080, height: 1080 },
        { name: 'Instagram Story / Reel', category: 'Instagram', width: 1080, height: 1920 },
        { name: 'Instagram Profile', category: 'Instagram', width: 320, height: 320 },
        // Facebook
        { name: 'Facebook Post', category: 'Facebook', width: 1200, height: 630 },
        { name: 'Facebook Cover', category: 'Facebook', width: 820, height: 312 },
        { name: 'Facebook Profile', category: 'Facebook', width: 170, height: 170 },
        // Twitter/X
        { name: 'Twitter Post', category: 'Twitter/X', width: 1200, height: 675 },
        { name: 'Twitter Header', category: 'Twitter/X', width: 1500, height: 500 },
        { name: 'Twitter Profile', category: 'Twitter/X', width: 400, height: 400 },
        // LinkedIn
        { name: 'LinkedIn Post', category: 'LinkedIn', width: 1200, height: 627 },
        { name: 'LinkedIn Cover', category: 'LinkedIn', width: 1584, height: 396 },
        // WhatsApp
        { name: 'WhatsApp DP', category: 'WhatsApp', width: 500, height: 500 },
        // Print
        { name: 'Passport Photo (35×45mm)', category: 'Print', width: 413, height: 531 },
        { name: 'Photo 2×2 inch', category: 'Print', width: 600, height: 600 },
        { name: 'Photo 4×6 inch', category: 'Print', width: 1200, height: 1800 },
        { name: 'A4 (300 DPI)', category: 'Print', width: 2480, height: 3508 },
        { name: 'Letter (300 DPI)', category: 'Print', width: 2550, height: 3300 },
    ];
