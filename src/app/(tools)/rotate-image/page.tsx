'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, rotateImage, flipImage, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('rotate-image')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function RotateImagePage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [angle, setAngle] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const previewRef = useRef<HTMLCanvasElement>(null);
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
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
        const sc = Math.min(maxDisplay / imgEl.naturalWidth, maxDisplay / imgEl.naturalHeight, 1);
        const w = Math.round(imgEl.naturalWidth * sc);
        const h = Math.round(imgEl.naturalHeight * sc);
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate((angle * Math.PI) / 180);
        if (flipH) ctx.scale(-1, 1);
        if (flipV) ctx.scale(1, -1);
        ctx.drawImage(imgEl, -w / 2, -h / 2, w, h);
        ctx.restore();
    }, [imgEl, angle, flipH, flipV]);

    const handleProcess = useCallback(async () => {
        if (!imgEl) return;
        setState('processing');
        try {
            let result = imgEl;
            let canvas: HTMLCanvasElement;
            if (angle !== 0) {
                canvas = rotateImage(imgEl, angle);
            } else {
                canvas = document.createElement('canvas');
                canvas.width = imgEl.naturalWidth; canvas.height = imgEl.naturalHeight;
                canvas.getContext('2d')!.drawImage(imgEl, 0, 0);
            }
            if (flipH || flipV) {
                const temp = new Image();
                temp.src = canvas.toDataURL();
                await new Promise(r => { temp.onload = r; });
                if (flipH) canvas = flipImage(temp as HTMLImageElement, 'horizontal');
                if (flipV) {
                    const temp2 = new Image();
                    temp2.src = canvas.toDataURL();
                    await new Promise(r => { temp2.onload = r; });
                    canvas = flipImage(temp2 as HTMLImageElement, 'vertical');
                }
            }
            const blob = await canvasToBlob(canvas, 'image/png');
            setResultBlob(blob);
            setResultName(`rotated_${angle}deg.png`);
            setResultSize(`${formatSize(blob.size)} — ${canvas.width} × ${canvas.height} px`);
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error.'); }
    }, [imgEl, angle, flipH, flipV]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); setImgEl(null); setAngle(0); setFlipH(false); setFlipV(false); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'configure' && (
                    <>
                        <div className={styles.optionGroup}>
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <canvas ref={previewRef} style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                            <h3 className={styles.optionTitle}>Quick Rotate</h3>
                            <div className={styles.optionRow}>
                                {[90, 180, 270].map((a) => (
                                    <div key={a} className={`${styles.optionCard} ${angle === a ? styles.active : ''}`}
                                        onClick={() => setAngle(a)}>
                                        <h4>{a}°</h4>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                <label className={styles.inputLabel}>Custom Angle: {angle}°</label>
                                <input type="range" min={0} max={359} value={angle} onChange={(e) => setAngle(Number(e.target.value))} style={{ width: '100%' }} />
                            </div>
                            <h3 className={styles.optionTitle} style={{ marginTop: '1rem' }}>Flip</h3>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={flipH} onChange={(e) => setFlipH(e.target.checked)} /> Horizontal
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={flipV} onChange={(e) => setFlipV(e.target.checked)} /> Vertical
                                </label>
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Apply</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Processing..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
