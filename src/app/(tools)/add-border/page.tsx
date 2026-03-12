'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, addBorder, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('add-border')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function AddBorderPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [borderWidth, setBorderWidth] = useState(20);
    const [borderColor, setBorderColor] = useState('#000000');
    const [borderRadius, setBorderRadius] = useState(0);
    const [padding, setPadding] = useState(0);
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const previewRef = useRef<HTMLCanvasElement>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback(async (f: UploadedFile[]) => {
        setFiles(f); if (f.length > 0) { const img = await loadImage(f[0].file); setImgEl(img); setState('configure'); }
    }, []);

    useEffect(() => {
        if (!imgEl || !previewRef.current) return;
        const canvas = previewRef.current;
        const maxDisplay = 400;
        const totalPad = borderWidth + padding;
        const fullW = imgEl.naturalWidth + totalPad * 2;
        const fullH = imgEl.naturalHeight + totalPad * 2;
        const sc = Math.min(maxDisplay / fullW, maxDisplay / fullH, 1);
        canvas.width = Math.round(fullW * sc);
        canvas.height = Math.round(fullH * sc);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = borderColor;
        if (borderRadius > 0) {
            ctx.beginPath();
            const r = borderRadius * sc;
            ctx.roundRect(0, 0, canvas.width, canvas.height, r);
            ctx.fill();
        } else {
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const tp = totalPad * sc;
        ctx.drawImage(imgEl, tp, tp, canvas.width - tp * 2, canvas.height - tp * 2);
    }, [imgEl, borderWidth, borderColor, borderRadius, padding]);

    const handleProcess = useCallback(async () => {
        if (!imgEl) return;
        setState('processing');
        try {
            const canvas = addBorder(imgEl, { width: borderWidth, color: borderColor, radius: borderRadius, padding });
            const blob = await canvasToBlob(canvas, 'image/png');
            setResultBlob(blob); setResultName('bordered.png'); setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error.'); }
    }, [imgEl, borderWidth, borderColor, borderRadius, padding]);

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
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <canvas ref={previewRef} style={{ maxWidth: '100%', border: '1px solid var(--border-light)', borderRadius: '8px' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                <div>
                                    <label className={styles.inputLabel}>Border Width: {borderWidth}px</label>
                                    <input type="range" min={1} max={100} value={borderWidth} onChange={e => setBorderWidth(Number(e.target.value))} style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label className={styles.inputLabel}>Border Radius: {borderRadius}px</label>
                                    <input type="range" min={0} max={100} value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label className={styles.inputLabel}>Padding: {padding}px</label>
                                    <input type="range" min={0} max={50} value={padding} onChange={e => setPadding(Number(e.target.value))} style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label className={styles.inputLabel}>Border Color</label>
                                    <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                {['#000000', '#ffffff', '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#EC4899', '#8B5CF6'].map(c => (
                                    <div key={c} onClick={() => setBorderColor(c)} style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: c, border: `2px solid ${borderColor === c ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer' }} />
                                ))}
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Add Border</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Adding border..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
