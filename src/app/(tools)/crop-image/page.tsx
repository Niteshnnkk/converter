'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, cropImage, canvasToBlob, formatSize, getImageDimensions, splitImageGrid } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('crop-image')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';
type CropMode = 'freeform' | 'aspect' | 'circle' | 'grid';
const aspectPresets = [
    { label: 'Free', value: 0 },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:2', value: 3 / 2 },
    { label: '5:4', value: 5 / 4 },
    { label: '9:16', value: 9 / 16 },
];

export default function CropImagePage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [mode, setMode] = useState<CropMode>('freeform');
    const [aspect, setAspect] = useState(0);
    const [gridRows, setGridRows] = useState(3);
    const [gridCols, setGridCols] = useState(3);
    const [cropX, setCropX] = useState(0);
    const [cropY, setCropY] = useState(0);
    const [cropW, setCropW] = useState(0);
    const [cropH, setCropH] = useState(0);
    const [origDims, setOrigDims] = useState({ w: 0, h: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback(async (newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            const dims = await getImageDimensions(newFiles[0].file);
            setOrigDims(dims);
            setCropX(0); setCropY(0); setCropW(dims.w); setCropH(dims.h);
            const img = await loadImage(newFiles[0].file);
            setImgEl(img);
            setState('configure');
        }
    }, []);

    useEffect(() => {
        if (!imgEl || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const maxDisplay = 600;
        const scale = Math.min(maxDisplay / origDims.w, maxDisplay / origDims.h, 1);
        canvas.width = Math.round(origDims.w * scale);
        canvas.height = Math.round(origDims.h * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        // Draw crop overlay
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const sx = cropX * scale, sy = cropY * scale, sw = cropW * scale, sh = cropH * scale;
        ctx.clearRect(sx, sy, sw, sh);
        ctx.drawImage(imgEl, cropX, cropY, cropW, cropH, sx, sy, sw, sh);
        ctx.strokeStyle = '#6366F1';
        ctx.lineWidth = 2;
        if (mode === 'circle') {
            ctx.beginPath();
            ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.strokeRect(sx, sy, sw, sh);
        }
    }, [imgEl, cropX, cropY, cropW, cropH, origDims, mode]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scale = origDims.w / canvas.width;
        const x = Math.round((e.clientX - rect.left) * scale);
        const y = Math.round((e.clientY - rect.top) * scale);
        setIsDragging(true);
        setDragStart({ x, y });
        setCropX(x); setCropY(y); setCropW(0); setCropH(0);
    }, [origDims]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scale = origDims.w / canvas.width;
        let x2 = Math.round((e.clientX - rect.left) * scale);
        let y2 = Math.round((e.clientY - rect.top) * scale);
        x2 = Math.max(0, Math.min(origDims.w, x2));
        y2 = Math.max(0, Math.min(origDims.h, y2));
        let w = x2 - dragStart.x;
        let h = y2 - dragStart.y;
        if (aspect > 0 || mode === 'circle') {
            const a = aspect > 0 ? aspect : 1;
            h = Math.round(Math.abs(w) / a) * Math.sign(h || 1);
        }
        const fx = w >= 0 ? dragStart.x : dragStart.x + w;
        const fy = h >= 0 ? dragStart.y : dragStart.y + h;
        setCropX(fx); setCropY(fy); setCropW(Math.abs(w)); setCropH(Math.abs(h));
    }, [isDragging, dragStart, origDims, aspect, mode]);

    const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

    const handleProcess = useCallback(async () => {
        if (!imgEl) return;
        setState('processing');
        try {
            if (mode === 'grid') {
                const canvases = splitImageGrid(imgEl, gridRows, gridCols);
                // Download first tile as demo (user can use batch for all)
                const blob = await canvasToBlob(canvases[0], 'image/png');
                setResultBlob(blob);
                setResultName(`grid_1_of_${gridRows * gridCols}.png`);
                setResultSize(`${formatSize(blob.size)} — ${gridRows * gridCols} tiles`);
            } else {
                const canvas = cropImage(imgEl, cropX, cropY, cropW, cropH, mode === 'circle');
                const blob = await canvasToBlob(canvas, 'image/png');
                setResultBlob(blob);
                setResultName(`cropped_${cropW}x${cropH}.png`);
                setResultSize(`${formatSize(blob.size)} — ${cropW} × ${cropH} px`);
            }
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error cropping.'); }
    }, [imgEl, mode, cropX, cropY, cropW, cropH, gridRows, gridCols]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); setImgEl(null); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'configure' && (
                    <>
                        <div className={styles.optionGroup}>
                            <div className={styles.optionRow} style={{ marginBottom: '1rem' }}>
                                {(['freeform', 'aspect', 'circle', 'grid'] as CropMode[]).map((m) => (
                                    <div key={m} className={`${styles.optionCard} ${mode === m ? styles.active : ''}`} onClick={() => { setMode(m); if (m === 'circle') setAspect(1); }}>
                                        <h4>{m === 'freeform' ? 'Freeform' : m === 'aspect' ? 'Aspect Ratio' : m === 'circle' ? 'Circle' : 'Grid Split'}</h4>
                                    </div>
                                ))}
                            </div>
                            {mode === 'aspect' && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                    {aspectPresets.map((p) => (
                                        <button key={p.label} className={`btn ${aspect === p.value ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                            onClick={() => setAspect(p.value)}>{p.label}</button>
                                    ))}
                                </div>
                            )}
                            {mode === 'grid' && (
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.inputLabel}>Rows</label>
                                        <input type="number" className={styles.textInput} value={gridRows} onChange={(e) => setGridRows(Number(e.target.value))} min={1} max={10} />
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.inputLabel}>Columns</label>
                                        <input type="number" className={styles.textInput} value={gridCols} onChange={(e) => setGridCols(Number(e.target.value))} min={1} max={10} />
                                    </div>
                                </div>
                            )}
                            {mode !== 'grid' && (
                                <>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                        <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                            <label className={styles.inputLabel}>X</label>
                                            <input type="number" className={styles.textInput} value={cropX} onChange={(e) => setCropX(Number(e.target.value))} min={0} max={origDims.w} />
                                        </div>
                                        <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                            <label className={styles.inputLabel}>Y</label>
                                            <input type="number" className={styles.textInput} value={cropY} onChange={(e) => setCropY(Number(e.target.value))} min={0} max={origDims.h} />
                                        </div>
                                        <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                            <label className={styles.inputLabel}>Width</label>
                                            <input type="number" className={styles.textInput} value={cropW} onChange={(e) => setCropW(Number(e.target.value))} min={1} max={origDims.w} />
                                        </div>
                                        <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                            <label className={styles.inputLabel}>Height</label>
                                            <input type="number" className={styles.textInput} value={cropH} onChange={(e) => setCropH(Number(e.target.value))} min={1} max={origDims.h} />
                                        </div>
                                    </div>
                                    <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                                        style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'crosshair', display: 'block', margin: '0 auto' }} />
                                </>
                            )}
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{cropW} × {cropH} px selected</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>{mode === 'grid' ? 'Split Image' : 'Crop Image'}</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Cropping..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
