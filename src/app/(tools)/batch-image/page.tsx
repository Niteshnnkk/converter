'use client';
import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, resizeImage, addTextWatermark, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('batch-image')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';
type BatchOp = 'resize' | 'convert' | 'watermark' | 'compress';

export default function BatchImagePage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [operation, setOperation] = useState<BatchOp>('resize');
    const [resizeW, setResizeW] = useState(800);
    const [resizeH, setResizeH] = useState(600);
    const [format, setFormat] = useState('image/jpeg');
    const [quality, setQuality] = useState(85);
    const [watermarkText, setWatermarkText] = useState('Watermark');
    const [watermarkOpacity, setWatermarkOpacity] = useState(50);
    const [namePrefix, setNamePrefix] = useState('');
    const [nameSuffix, setNameSuffix] = useState('');
    const [compressQuality, setCompressQuality] = useState(60);
    const [progress, setProgress] = useState(0);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((f: UploadedFile[]) => { setFiles(f); if (f.length > 0) setState('configure'); }, []);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const blobs: { name: string; blob: Blob }[] = [];
            for (let i = 0; i < files.length; i++) {
                setProgress(Math.round(((i + 1) / files.length) * 100));
                const img = await loadImage(files[i].file);
                let canvas: HTMLCanvasElement;
                let ext = 'png';

                if (operation === 'resize') {
                    canvas = resizeImage(img, resizeW, resizeH);
                    const blob = await canvasToBlob(canvas, 'image/png');
                    blobs.push({ name: buildName(i, 'resized', 'png'), blob });
                } else if (operation === 'convert') {
                    canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d')!;
                    if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
                    ctx.drawImage(img, 0, 0);
                    ext = format.includes('jpeg') ? 'jpg' : format.includes('webp') ? 'webp' : 'png';
                    const blob = await canvasToBlob(canvas, format, quality / 100);
                    blobs.push({ name: buildName(i, 'converted', ext), blob });
                } else if (operation === 'watermark') {
                    canvas = addTextWatermark(img, watermarkText, {
                        opacity: watermarkOpacity / 100, position: 'center', fontSize: Math.round(img.naturalWidth / 12),
                    });
                    const blob = await canvasToBlob(canvas, 'image/png');
                    blobs.push({ name: buildName(i, 'watermarked', 'png'), blob });
                } else if (operation === 'compress') {
                    canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d')!;
                    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    const blob = await canvasToBlob(canvas, 'image/jpeg', compressQuality / 100);
                    blobs.push({ name: buildName(i, 'compressed', 'jpg'), blob });
                }
            }

            // If single file, just download directly
            if (blobs.length === 1) {
                setResultBlob(blobs[0].blob);
                setResultName(blobs[0].name);
                setResultSize(formatSize(blobs[0].blob.size));
            } else {
                // Create a zip-like download (download all individually via combined blob)
                // For simplicity without JSZip, download first file and show count
                setResultBlob(blobs[0].blob);
                setResultName(blobs[0].name);
                setResultSize(`${blobs.length} files processed — ${formatSize(blobs.reduce((s, b) => s + b.blob.size, 0))} total`);
                // Auto-download all files
                for (const item of blobs) {
                    const u = URL.createObjectURL(item.blob);
                    const a = document.createElement('a');
                    a.href = u; a.download = item.name; a.click();
                    URL.revokeObjectURL(u);
                    await new Promise(r => setTimeout(r, 300)); // delay between downloads
                }
            }
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error during batch processing.'); }
    }, [files, operation, resizeW, resizeH, format, quality, watermarkText, watermarkOpacity, namePrefix, nameSuffix, compressQuality]);

    const buildName = (i: number, defaultPrefix: string, ext: string) => {
        const pre = namePrefix || defaultPrefix;
        const suf = nameSuffix ? `_${nameSuffix}` : '';
        return `${pre}_${i + 1}${suf}.${ext}`;
    };

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); setProgress(0); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={true} maxFiles={50} files={files} onFilesChange={handleFilesChange} />}
                {state === 'configure' && (
                    <>
                        <div className={styles.optionGroup}>
                            <h3 className={styles.optionTitle}>{files.length} images selected</h3>
                            <div className={styles.optionRow} style={{ marginBottom: '1rem' }}>
                                <div className={`${styles.optionCard} ${operation === 'resize' ? styles.active : ''}`} onClick={() => setOperation('resize')}>
                                    <h4>Batch Resize</h4><p>Same dimensions for all</p>
                                </div>
                                <div className={`${styles.optionCard} ${operation === 'convert' ? styles.active : ''}`} onClick={() => setOperation('convert')}>
                                    <h4>Batch Convert</h4><p>Change format</p>
                                </div>
                                <div className={`${styles.optionCard} ${operation === 'watermark' ? styles.active : ''}`} onClick={() => setOperation('watermark')}>
                                    <h4>Batch Watermark</h4><p>Add text to all</p>
                                </div>
                                <div className={`${styles.optionCard} ${operation === 'compress' ? styles.active : ''}`} onClick={() => setOperation('compress')}>
                                    <h4>Batch Compress</h4><p>Reduce file sizes</p>
                                </div>
                            </div>
                            {operation === 'resize' && (
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div className={styles.inputGroup} style={{ flex: 1, minWidth: 120 }}>
                                        <label className={styles.inputLabel}>Width (px)</label>
                                        <input type="number" className={styles.textInput} value={resizeW} onChange={e => setResizeW(Number(e.target.value))} min={1} />
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1, minWidth: 120 }}>
                                        <label className={styles.inputLabel}>Height (px)</label>
                                        <input type="number" className={styles.textInput} value={resizeH} onChange={e => setResizeH(Number(e.target.value))} min={1} />
                                    </div>
                                </div>
                            )}
                            {operation === 'convert' && (
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.inputLabel}>Target Format</label>
                                        <select className={styles.textInput} value={format} onChange={e => setFormat(e.target.value)}>
                                            <option value="image/png">PNG</option>
                                            <option value="image/jpeg">JPG</option>
                                            <option value="image/webp">WebP</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1 }}>
                                        <label className={styles.inputLabel}>Quality: {quality}%</label>
                                        <input type="range" min={1} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            )}
                            {operation === 'watermark' && (
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div className={styles.inputGroup} style={{ flex: 2, minWidth: 150 }}>
                                        <label className={styles.inputLabel}>Watermark Text</label>
                                        <input type="text" className={styles.textInput} value={watermarkText} onChange={e => setWatermarkText(e.target.value)} />
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1, minWidth: 120 }}>
                                        <label className={styles.inputLabel}>Opacity: {watermarkOpacity}%</label>
                                        <input type="range" min={5} max={100} value={watermarkOpacity} onChange={e => setWatermarkOpacity(Number(e.target.value))} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            )}
                            {operation === 'compress' && (
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Compression Quality: {compressQuality}%</label>
                                    <input type="range" min={5} max={95} value={compressQuality} onChange={e => setCompressQuality(Number(e.target.value))} style={{ width: '100%' }} />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Lower = smaller file, less quality</p>
                                </div>
                            )}

                            <h3 className={styles.optionTitle} style={{ marginTop: '1rem' }}>Output Naming</h3>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 120 }}>
                                    <label className={styles.inputLabel}>Filename Prefix</label>
                                    <input type="text" className={styles.textInput} value={namePrefix} onChange={e => setNamePrefix(e.target.value)} placeholder="e.g. photo" />
                                </div>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 120 }}>
                                    <label className={styles.inputLabel}>Filename Suffix</label>
                                    <input type="text" className={styles.textInput} value={nameSuffix} onChange={e => setNameSuffix(e.target.value)} placeholder="e.g. edited" />
                                </div>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                Preview: {namePrefix || 'prefix'}_1{nameSuffix ? `_${nameSuffix}` : ''}.ext
                            </p>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files.length} images</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Process All</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label={`Processing... ${progress}%`} />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
