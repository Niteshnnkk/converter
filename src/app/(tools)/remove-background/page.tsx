'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, removeBackgroundByColor, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('remove-background')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function RemoveBackgroundPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [targetColor, setTargetColor] = useState({ r: 255, g: 255, b: 255 });
    const [tolerance, setTolerance] = useState(30);
    const [replaceWith, setReplaceWith] = useState<'transparent' | 'color'>('transparent');
    const [replaceColor, setReplaceColor] = useState('#00ff00');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback(async (f: UploadedFile[]) => {
        setFiles(f);
        if (f.length > 0) { const img = await loadImage(f[0].file); setImgEl(img); setState('configure'); }
    }, []);

    useEffect(() => {
        if (!imgEl || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const maxDisplay = 500;
        const sc = Math.min(maxDisplay / imgEl.naturalWidth, maxDisplay / imgEl.naturalHeight, 1);
        canvas.width = Math.round(imgEl.naturalWidth * sc);
        canvas.height = Math.round(imgEl.naturalHeight * sc);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    }, [imgEl]);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
        const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));
        const ctx = canvas.getContext('2d')!;
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        setTargetColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
    }, []);

    const handleProcess = useCallback(async () => {
        if (!imgEl) return;
        setState('processing');
        try {
            const replace = replaceWith === 'transparent' ? 'transparent' : replaceColor;
            const canvas = removeBackgroundByColor(imgEl, targetColor.r, targetColor.g, targetColor.b, tolerance, replace);
            const blob = await canvasToBlob(canvas, 'image/png');
            setResultBlob(blob);
            setResultName('no_bg.png');
            setResultSize(`${formatSize(blob.size)}`);
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error.'); }
    }, [imgEl, targetColor, tolerance, replaceWith, replaceColor]);

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
                            <h3 className={styles.optionTitle}>Click on the background color to remove</h3>
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <canvas ref={canvasRef} onClick={handleCanvasClick}
                                    style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'crosshair' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.875rem' }}>Selected color:</span>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8, border: '2px solid var(--border)',
                                    backgroundColor: `rgb(${targetColor.r},${targetColor.g},${targetColor.b})`
                                }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    RGB({targetColor.r}, {targetColor.g}, {targetColor.b})
                                </span>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Tolerance: {tolerance}</label>
                                <input type="range" min={1} max={150} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} style={{ width: '100%' }} />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Higher = removes more similar colors</p>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <label className={styles.inputLabel}>Replace with:</label>
                                <div className={styles.optionRow}>
                                    <div className={`${styles.optionCard} ${replaceWith === 'transparent' ? styles.active : ''}`} onClick={() => setReplaceWith('transparent')}>
                                        <h4>Transparent</h4>
                                    </div>
                                    <div className={`${styles.optionCard} ${replaceWith === 'color' ? styles.active : ''}`} onClick={() => setReplaceWith('color')}>
                                        <h4>Solid Color</h4>
                                    </div>
                                </div>
                                {replaceWith === 'color' && (
                                    <input type="color" value={replaceColor} onChange={(e) => setReplaceColor(e.target.value)}
                                        style={{ marginTop: '0.5rem', height: 36, border: 'none', cursor: 'pointer' }} />
                                )}
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Remove Background</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Removing background..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
