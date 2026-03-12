'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, addTextWatermark, addImageWatermark, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('add-watermark')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';
type WatermarkType = 'text' | 'image';
const positions = ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const;

export default function AddWatermarkPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [type, setType] = useState<WatermarkType>('text');
    const [text, setText] = useState('Your Watermark');
    const [fontSize, setFontSize] = useState(48);
    const [fontFamily, setFontFamily] = useState('Arial');
    const [textColor, setTextColor] = useState('#ffffff');
    const [opacity, setOpacity] = useState(50);
    const [position, setPosition] = useState<typeof positions[number]>('center');
    const [tile, setTile] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoScale, setLogoScale] = useState(20);
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');
    const previewRef = useRef<HTMLCanvasElement>(null);

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
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        // Draw watermark preview
        ctx.globalAlpha = opacity / 100;
        ctx.font = `bold ${Math.round(fontSize * sc)}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        if (type === 'text' && text) {
            const metrics = ctx.measureText(text);
            const tw = metrics.width;
            const pad = 10;
            let x = pad, y = fontSize * sc;
            switch (position) {
                case 'top-center': x = (canvas.width - tw) / 2; break;
                case 'top-right': x = canvas.width - tw - pad; break;
                case 'center-left': y = canvas.height / 2; break;
                case 'center': x = (canvas.width - tw) / 2; y = canvas.height / 2; break;
                case 'center-right': x = canvas.width - tw - pad; y = canvas.height / 2; break;
                case 'bottom-left': y = canvas.height - pad; break;
                case 'bottom-center': x = (canvas.width - tw) / 2; y = canvas.height - pad; break;
                case 'bottom-right': x = canvas.width - tw - pad; y = canvas.height - pad; break;
            }
            ctx.fillText(text, x, y);
        }
        ctx.globalAlpha = 1;
    }, [imgEl, text, fontSize, fontFamily, textColor, opacity, position, type]);

    const handleProcess = useCallback(async () => {
        if (!imgEl) return;
        setState('processing');
        try {
            let canvas: HTMLCanvasElement;
            if (type === 'text') {
                canvas = addTextWatermark(imgEl, text, { fontSize, fontFamily, color: textColor, opacity: opacity / 100, position, tile, rotation });
            } else if (logoFile) {
                const logo = await loadImage(logoFile);
                canvas = addImageWatermark(imgEl, logo, { opacity: opacity / 100, position, scale: logoScale / 100, tile });
            } else {
                alert('Please upload a logo image.'); setState('configure'); return;
            }
            const blob = await canvasToBlob(canvas, 'image/png');
            setResultBlob(blob); setResultName('watermarked.png'); setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error.'); }
    }, [imgEl, type, text, fontSize, fontFamily, textColor, opacity, position, tile, rotation, logoFile, logoScale]);

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
                                <div className={`${styles.optionCard} ${type === 'text' ? styles.active : ''}`} onClick={() => setType('text')}><h4>Text Watermark</h4></div>
                                <div className={`${styles.optionCard} ${type === 'image' ? styles.active : ''}`} onClick={() => setType('image')}><h4>Image / Logo</h4></div>
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <canvas ref={previewRef} style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                            {type === 'text' && (
                                <>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.inputLabel}>Watermark Text</label>
                                        <input type="text" className={styles.textInput} value={text} onChange={e => setText(e.target.value)} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                        <div className={styles.inputGroup} style={{ flex: 1, minWidth: 100 }}>
                                            <label className={styles.inputLabel}>Font Size</label>
                                            <input type="number" className={styles.textInput} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} min={8} max={200} />
                                        </div>
                                        <div className={styles.inputGroup} style={{ flex: 1, minWidth: 100 }}>
                                            <label className={styles.inputLabel}>Font</label>
                                            <select className={styles.textInput} value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                                                <option value="Arial">Arial</option>
                                                <option value="Impact">Impact</option>
                                                <option value="Georgia">Georgia</option>
                                                <option value="Courier New">Courier New</option>
                                                <option value="Times New Roman">Times New Roman</option>
                                            </select>
                                        </div>
                                        <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                            <label className={styles.inputLabel}>Color</label>
                                            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }} />
                                        </div>
                                    </div>
                                    <div className={styles.inputGroup} style={{ marginTop: '0.75rem' }}>
                                        <label className={styles.inputLabel}>Rotation: {rotation}°</label>
                                        <input type="range" min={-45} max={45} value={rotation} onChange={e => setRotation(Number(e.target.value))} style={{ width: '100%' }} />
                                    </div>
                                </>
                            )}
                            {type === 'image' && (
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Logo / Watermark Image</label>
                                    <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setLogoFile(e.target.files[0]); }} className={styles.textInput} />
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <label className={styles.inputLabel}>Logo Size: {logoScale}%</label>
                                        <input type="range" min={5} max={80} value={logoScale} onChange={e => setLogoScale(Number(e.target.value))} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            )}
                            <div className={styles.inputGroup} style={{ marginTop: '0.75rem' }}>
                                <label className={styles.inputLabel}>Opacity: {opacity}%</label>
                                <input type="range" min={5} max={100} value={opacity} onChange={e => setOpacity(Number(e.target.value))} style={{ width: '100%' }} />
                            </div>
                            <div style={{ marginTop: '0.75rem' }}>
                                <label className={styles.inputLabel}>Position</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.3rem', maxWidth: 200 }}>
                                    {positions.map(p => (
                                        <button key={p} className={`btn ${position === p ? 'btn-primary' : ''}`}
                                            style={{ padding: '0.3rem', fontSize: '0.65rem' }} onClick={() => setPosition(p)}>
                                            {p.replace('-', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginTop: '0.75rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={tile} onChange={e => setTile(e.target.checked)} />
                                Tile / Repeat (Mosaic Pattern)
                            </label>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Add Watermark</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Adding watermark..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
