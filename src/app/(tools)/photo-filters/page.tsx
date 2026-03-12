'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, applyCanvasFilter, buildFilterString, applyPixelFilter, applyDuotone, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('photo-filters')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function PhotoFiltersPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturate, setSaturate] = useState(100);
    const [hueRotate, setHueRotate] = useState(0);
    const [grayscale, setGrayscale] = useState(0);
    const [sepia, setSepia] = useState(0);
    const [invert, setInvert] = useState(0);
    const [blur, setBlur] = useState(0);
    const [pixelEffect, setPixelEffect] = useState<'none' | 'sharpen' | 'emboss' | 'vignette' | 'pixelate' | 'noise-reduction' | 'duotone'>('none');
    const [pixelIntensity, setPixelIntensity] = useState(50);
    const [duoColor1, setDuoColor1] = useState('#001a33');
    const [duoColor2, setDuoColor2] = useState('#ff6600');
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const previewRef = useRef<HTMLCanvasElement>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback(async (f: UploadedFile[]) => {
        setFiles(f); if (f.length > 0) { const img = await loadImage(f[0].file); setImgEl(img); setState('configure'); }
    }, []);

    // Live preview
    useEffect(() => {
        if (!imgEl || !previewRef.current) return;
        const canvas = previewRef.current;
        const maxDisplay = 500;
        const sc = Math.min(maxDisplay / imgEl.naturalWidth, maxDisplay / imgEl.naturalHeight, 1);
        canvas.width = Math.round(imgEl.naturalWidth * sc);
        canvas.height = Math.round(imgEl.naturalHeight * sc);
        const ctx = canvas.getContext('2d')!;
        const filterStr = buildFilterString({ brightness, contrast, saturate, hueRotate, grayscale, sepia, invert, blur });
        ctx.filter = filterStr;
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
    }, [imgEl, brightness, contrast, saturate, hueRotate, grayscale, sepia, invert, blur]);

    const resetFilters = useCallback(() => {
        setBrightness(100); setContrast(100); setSaturate(100); setHueRotate(0);
        setGrayscale(0); setSepia(0); setInvert(0); setBlur(0); setPixelEffect('none');
    }, []);

    const handleProcess = useCallback(async () => {
        if (!imgEl) return;
        setState('processing');
        try {
            const filterStr = buildFilterString({ brightness, contrast, saturate, hueRotate, grayscale, sepia, invert, blur });
            let canvas = applyCanvasFilter(imgEl, filterStr);
            // Apply pixel-level effects if selected
            if (pixelEffect === 'duotone') {
                const tempImg = new Image();
                tempImg.src = canvas.toDataURL();
                await new Promise(r => { tempImg.onload = r; });
                canvas = applyDuotone(tempImg as HTMLImageElement, duoColor1, duoColor2);
            } else if (pixelEffect !== 'none') {
                const tempImg = new Image();
                tempImg.src = canvas.toDataURL();
                await new Promise(r => { tempImg.onload = r; });
                canvas = applyPixelFilter(tempImg as HTMLImageElement, pixelEffect, pixelIntensity);
            }
            const blob = await canvasToBlob(canvas, 'image/png');
            setResultBlob(blob); setResultName('filtered.png'); setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error.'); }
    }, [imgEl, brightness, contrast, saturate, hueRotate, grayscale, sepia, invert, blur, pixelEffect, pixelIntensity, duoColor1, duoColor2]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); setImgEl(null); resetFilters(); }, [resetFilters]);

    const sliders = [
        { label: 'Brightness', value: brightness, set: setBrightness, min: 0, max: 200, default: 100 },
        { label: 'Contrast', value: contrast, set: setContrast, min: 0, max: 200, default: 100 },
        { label: 'Saturation', value: saturate, set: setSaturate, min: 0, max: 200, default: 100 },
        { label: 'Hue Rotate', value: hueRotate, set: setHueRotate, min: 0, max: 360, default: 0 },
        { label: 'Grayscale', value: grayscale, set: setGrayscale, min: 0, max: 100, default: 0 },
        { label: 'Sepia', value: sepia, set: setSepia, min: 0, max: 100, default: 0 },
        { label: 'Invert', value: invert, set: setInvert, min: 0, max: 100, default: 0 },
        { label: 'Blur', value: blur, set: setBlur, min: 0, max: 20, default: 0 },
    ];
    const pixelFilters = [
        { label: 'None', value: 'none' as const },
        { label: 'Sharpen', value: 'sharpen' as const },
        { label: 'Emboss', value: 'emboss' as const },
        { label: 'Vignette', value: 'vignette' as const },
        { label: 'Pixelate', value: 'pixelate' as const },
        { label: 'Noise Reduce', value: 'noise-reduction' as const },
        { label: 'Duotone', value: 'duotone' as const },
    ];

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'configure' && (
                    <>
                        <div className={styles.optionGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 className={styles.optionTitle} style={{ margin: 0 }}>Adjustments</h3>
                                <button className="btn" onClick={resetFilters} style={{ fontSize: '0.8rem' }}>Reset All</button>
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <canvas ref={previewRef} style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                {sliders.map(s => (
                                    <div key={s.label}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-heading)' }}>{s.label}: {s.value}{s.label === 'Hue Rotate' ? '°' : s.label === 'Blur' ? 'px' : '%'}</label>
                                        <input type="range" min={s.min} max={s.max} value={s.value} onChange={e => s.set(Number(e.target.value))} style={{ width: '100%' }} />
                                    </div>
                                ))}
                            </div>
                            <h3 className={styles.optionTitle} style={{ marginTop: '1.5rem' }}>Pixel Effects</h3>
                            <div className={styles.optionRow} style={{ flexWrap: 'wrap' }}>
                                {pixelFilters.map(f => (
                                    <div key={f.value} className={`${styles.optionCard} ${pixelEffect === f.value ? styles.active : ''}`}
                                        onClick={() => setPixelEffect(f.value)} style={{ minWidth: 100 }}>
                                        <h4 style={{ fontSize: '0.8rem' }}>{f.label}</h4>
                                    </div>
                                ))}
                            </div>
                            {pixelEffect !== 'none' && pixelEffect !== 'duotone' && (
                                <div className={styles.inputGroup} style={{ marginTop: '0.75rem' }}>
                                    <label className={styles.inputLabel}>Effect Intensity: {pixelIntensity}</label>
                                    <input type="range" min={1} max={100} value={pixelIntensity} onChange={e => setPixelIntensity(Number(e.target.value))} style={{ width: '100%' }} />
                                </div>
                            )}
                            {pixelEffect === 'duotone' && (
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center' }}>
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.inputLabel}>Shadow Color</label>
                                        <input type="color" value={duoColor1} onChange={e => setDuoColor1(e.target.value)} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }} />
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.inputLabel}>Highlight Color</label>
                                        <input type="color" value={duoColor2} onChange={e => setDuoColor2(e.target.value)} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Apply Filters</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Applying filters..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
