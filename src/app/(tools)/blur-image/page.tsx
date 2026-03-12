'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, blurArea, applyCanvasFilter, buildFilterString, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('blur-image')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';
type BlurMode = 'area' | 'full';

export default function BlurImagePage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [mode, setMode] = useState<BlurMode>('area');
    const [intensity, setIntensity] = useState(15);
    const [areas, setAreas] = useState<{ x: number; y: number; w: number; h: number }[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(1);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback(async (f: UploadedFile[]) => {
        setFiles(f); if (f.length > 0) { const img = await loadImage(f[0].file); setImgEl(img); setState('configure'); }
    }, []);

    useEffect(() => {
        if (!imgEl || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const maxDisplay = 600;
        const sc = Math.min(maxDisplay / imgEl.naturalWidth, maxDisplay / imgEl.naturalHeight, 1);
        setScale(sc);
        canvas.width = Math.round(imgEl.naturalWidth * sc);
        canvas.height = Math.round(imgEl.naturalHeight * sc);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        // Draw existing blur areas
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        areas.forEach(a => {
            ctx.strokeRect(a.x * sc, a.y * sc, a.w * sc, a.h * sc);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
            ctx.fillRect(a.x * sc, a.y * sc, a.w * sc, a.h * sc);
        });
        ctx.setLineDash([]);
    }, [imgEl, areas, scale]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (mode !== 'area') return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / scale);
        const y = Math.round((e.clientY - rect.top) / scale);
        setIsDrawing(true);
        setDrawStart({ x, y });
    }, [mode, scale]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || mode !== 'area') return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x2 = Math.round((e.clientX - rect.left) / scale);
        const y2 = Math.round((e.clientY - rect.top) / scale);
        const newArea = {
            x: Math.min(drawStart.x, x2), y: Math.min(drawStart.y, y2),
            w: Math.abs(x2 - drawStart.x), h: Math.abs(y2 - drawStart.y)
        };
        // Update preview with temp area
        if (canvasRef.current && imgEl) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
            [...areas, newArea].forEach(a => {
                ctx.strokeRect(a.x * scale, a.y * scale, a.w * scale, a.h * scale);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
                ctx.fillRect(a.x * scale, a.y * scale, a.w * scale, a.h * scale);
            });
            ctx.setLineDash([]);
        }
    }, [isDrawing, drawStart, mode, scale, areas, imgEl]);

    const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const rect = canvasRef.current!.getBoundingClientRect();
        const x2 = Math.round((e.clientX - rect.left) / scale);
        const y2 = Math.round((e.clientY - rect.top) / scale);
        const w = Math.abs(x2 - drawStart.x), h = Math.abs(y2 - drawStart.y);
        if (w > 5 && h > 5) {
            setAreas(prev => [...prev, { x: Math.min(drawStart.x, x2), y: Math.min(drawStart.y, y2), w, h }]);
        }
    }, [isDrawing, drawStart, scale]);

    const handleProcess = useCallback(async () => {
        if (!imgEl) return;
        setState('processing');
        try {
            let canvas: HTMLCanvasElement;
            if (mode === 'full') {
                canvas = applyCanvasFilter(imgEl, buildFilterString({ blur: intensity }));
            } else {
                canvas = blurArea(imgEl, areas, intensity);
            }
            const blob = await canvasToBlob(canvas, 'image/png');
            setResultBlob(blob);
            setResultName('blurred.png');
            setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error.'); }
    }, [imgEl, mode, areas, intensity]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); setImgEl(null); setAreas([]); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'configure' && (
                    <>
                        <div className={styles.optionGroup}>
                            <div className={styles.optionRow} style={{ marginBottom: '1rem' }}>
                                <div className={`${styles.optionCard} ${mode === 'area' ? styles.active : ''}`} onClick={() => setMode('area')}>
                                    <h4>Blur Area</h4><p>Draw rectangles to blur</p>
                                </div>
                                <div className={`${styles.optionCard} ${mode === 'full' ? styles.active : ''}`} onClick={() => setMode('full')}>
                                    <h4>Full Blur</h4><p>Blur entire image</p>
                                </div>
                            </div>
                            {mode === 'area' && (
                                <>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        Draw rectangles on areas you want to blur (faces, license plates, etc.)
                                    </p>
                                    <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => setIsDrawing(false)}
                                        style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'crosshair', display: 'block', margin: '0 auto 1rem' }} />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn" onClick={() => setAreas([])} style={{ fontSize: '0.8rem' }}>Clear All Areas</button>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>{areas.length} area(s) selected</span>
                                    </div>
                                </>
                            )}
                            <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                <label className={styles.inputLabel}>Blur Intensity: {intensity}</label>
                                <input type="range" min={1} max={50} value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ width: '100%' }} />
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess} disabled={mode === 'area' && areas.length === 0}>Apply Blur</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Applying blur..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
