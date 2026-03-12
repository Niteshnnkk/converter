'use client';
import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, canvasToBlob, compressToTargetSize, increaseFileSize, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('compress-image')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';
type CompressMode = 'quality' | 'target-kb' | 'increase-kb';

export default function CompressImagePage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [mode, setMode] = useState<CompressMode>('quality');
    const [quality, setQuality] = useState(80);
    const [targetKB, setTargetKB] = useState(200);
    const [outputFormat, setOutputFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
    const [preset, setPreset] = useState<'extreme' | 'recommended' | 'less'>('recommended');
    const [originalSize, setOriginalSize] = useState(0);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            setOriginalSize(newFiles[0].file.size);
            setState('configure');
        }
    }, []);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const img = await loadImage(files[0].file);
            let blob: Blob;

            if (mode === 'quality') {
                let q = quality / 100;
                if (preset === 'extreme') q = 0.3;
                else if (preset === 'recommended') q = 0.7;
                else if (preset === 'less') q = 0.9;
                else q = quality / 100;

                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                blob = await canvasToBlob(canvas, outputFormat, q);
            } else if (mode === 'target-kb') {
                blob = await compressToTargetSize(img, targetKB, outputFormat);
            } else {
                blob = await increaseFileSize(img, targetKB);
            }

            const savedPercent = Math.round((1 - blob.size / originalSize) * 100);
            const ext = outputFormat === 'image/png' ? 'png' : outputFormat === 'image/webp' ? 'webp' : 'jpg';
            setResultBlob(blob);
            setResultName(`compressed.${ext}`);
            setResultSize(`${formatSize(blob.size)} (${mode === 'increase-kb' ? '+' : ''}${Math.abs(savedPercent)}% ${savedPercent > 0 ? 'smaller' : 'larger'})`);
            setState('done');
        } catch (err) {
            console.error(err);
            setState('configure');
            alert('Error compressing image.');
        }
    }, [files, mode, quality, targetKB, outputFormat, preset, originalSize]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'configure' && (
                    <>
                        <div className={styles.optionGroup}>
                            <h3 className={styles.optionTitle}>Original size: {formatSize(originalSize)}</h3>
                            <div className={styles.optionRow}>
                                <div className={`${styles.optionCard} ${mode === 'quality' ? styles.active : ''}`} onClick={() => setMode('quality')}>
                                    <h4>Quality Slider</h4><p>Control compression level</p>
                                </div>
                                <div className={`${styles.optionCard} ${mode === 'target-kb' ? styles.active : ''}`} onClick={() => setMode('target-kb')}>
                                    <h4>Target Size (KB)</h4><p>Compress to exact size</p>
                                </div>
                                <div className={`${styles.optionCard} ${mode === 'increase-kb' ? styles.active : ''}`} onClick={() => setMode('increase-kb')}>
                                    <h4>Increase Size</h4><p>Make file larger</p>
                                </div>
                            </div>

                            {mode === 'quality' && (
                                <>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                        {([
                                            { key: 'extreme' as const, label: 'Extreme', q: 30 },
                                            { key: 'recommended' as const, label: 'Recommended', q: 70 },
                                            { key: 'less' as const, label: 'Less', q: 90 },
                                        ]).map((p) => (
                                            <div key={p.key} className={`${styles.optionCard} ${preset === p.key ? styles.active : ''}`}
                                                onClick={() => { setPreset(p.key); setQuality(p.q); }}
                                                style={{ minWidth: 100 }}>
                                                <h4>{p.label}</h4>
                                                <p>{p.q}% quality</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                        <label className={styles.inputLabel}>Quality: {quality}%</label>
                                        <input type="range" min={1} max={100} value={quality} onChange={(e) => { setQuality(Number(e.target.value)); setPreset('recommended'); }} style={{ width: '100%' }} />
                                    </div>
                                </>
                            )}

                            {(mode === 'target-kb' || mode === 'increase-kb') && (
                                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                    <label className={styles.inputLabel}>{mode === 'increase-kb' ? 'Target minimum size' : 'Target maximum size'} (KB)</label>
                                    <input type="number" className={styles.textInput} value={targetKB} onChange={(e) => setTargetKB(Number(e.target.value))} min={1} />
                                </div>
                            )}

                            <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                <label className={styles.inputLabel}>Output Format</label>
                                <select className={styles.textInput} value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as typeof outputFormat)}>
                                    <option value="image/jpeg">JPEG (smallest, lossy)</option>
                                    <option value="image/webp">WebP (smaller, modern)</option>
                                    <option value="image/png">PNG (lossless, preserves transparency)</option>
                                </select>
                                {outputFormat === 'image/jpeg' && (
                                    <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.25rem' }}>
                                        ⚠ JPEG does not support transparency. Transparent areas will become white. Use PNG or WebP to preserve transparency.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>
                                {mode === 'increase-kb' ? 'Increase Size' : 'Compress Image'}
                            </button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Compressing your image..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
