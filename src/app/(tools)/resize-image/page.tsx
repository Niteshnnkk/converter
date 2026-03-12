'use client';
import { useState, useCallback, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, resizeImage, resizeImageFit, canvasToBlob, formatSize, getImageDimensions } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('resize-image')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';
type ResizeMode = 'pixels' | 'percentage' | 'width-only' | 'height-only' | 'physical' | 'longest-edge' | 'shortest-edge' | 'upscale';
const upscaleFactors = [2, 4, 8];

export default function ResizeImagePage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [mode, setMode] = useState<ResizeMode>('pixels');
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
    const [percentage, setPercentage] = useState(50);
    const [edgeSize, setEdgeSize] = useState(1200);
    const [upscaleFactor, setUpscaleFactor] = useState(2);
    const [lockAspect, setLockAspect] = useState(true);
    const [bgColor, setBgColor] = useState('#ffffff');
    const [useBgFill, setUseBgFill] = useState(false);
    const [dpi, setDpi] = useState(300);
    const [physicalW, setPhysicalW] = useState(4);
    const [physicalH, setPhysicalH] = useState(6);
    const [physicalUnit, setPhysicalUnit] = useState<'inches' | 'cm' | 'mm'>('inches');
    const [originalDims, setOriginalDims] = useState({ w: 0, h: 0 });
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback(async (newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            const dims = await getImageDimensions(newFiles[0].file);
            setOriginalDims(dims);
            setWidth(dims.w);
            setHeight(dims.h);
            setState('configure');
        }
    }, []);

    const handleWidthChange = useCallback((val: number) => {
        setWidth(val);
        if (lockAspect && originalDims.w > 0) {
            setHeight(Math.round((val / originalDims.w) * originalDims.h));
        }
    }, [lockAspect, originalDims]);

    const handleHeightChange = useCallback((val: number) => {
        setHeight(val);
        if (lockAspect && originalDims.h > 0) {
            setWidth(Math.round((val / originalDims.h) * originalDims.w));
        }
    }, [lockAspect, originalDims]);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const img = await loadImage(files[0].file);
            let targetW = width, targetH = height;

            if (mode === 'percentage') {
                targetW = Math.round(originalDims.w * percentage / 100);
                targetH = Math.round(originalDims.h * percentage / 100);
            } else if (mode === 'width-only') {
                targetW = width;
                targetH = Math.round((width / originalDims.w) * originalDims.h);
            } else if (mode === 'height-only') {
                targetH = height;
                targetW = Math.round((height / originalDims.h) * originalDims.w);
            } else if (mode === 'physical') {
                const multiplier = physicalUnit === 'inches' ? 1 : physicalUnit === 'cm' ? 1 / 2.54 : 1 / 25.4;
                targetW = Math.round(physicalW * multiplier * dpi);
                targetH = Math.round(physicalH * multiplier * dpi);
            } else if (mode === 'longest-edge') {
                if (originalDims.w >= originalDims.h) {
                    targetW = edgeSize;
                    targetH = Math.round((edgeSize / originalDims.w) * originalDims.h);
                } else {
                    targetH = edgeSize;
                    targetW = Math.round((edgeSize / originalDims.h) * originalDims.w);
                }
            } else if (mode === 'shortest-edge') {
                if (originalDims.w <= originalDims.h) {
                    targetW = edgeSize;
                    targetH = Math.round((edgeSize / originalDims.w) * originalDims.h);
                } else {
                    targetH = edgeSize;
                    targetW = Math.round((edgeSize / originalDims.h) * originalDims.w);
                }
            } else if (mode === 'upscale') {
                targetW = originalDims.w * upscaleFactor;
                targetH = originalDims.h * upscaleFactor;
            }

            let canvas: HTMLCanvasElement;
            if (useBgFill && !lockAspect) {
                canvas = resizeImageFit(img, targetW, targetH, bgColor);
            } else {
                canvas = resizeImage(img, targetW, targetH, useBgFill ? bgColor : undefined);
            }

            const isTransparent = files[0].file.type === 'image/png';
            const blob = await canvasToBlob(canvas, isTransparent ? 'image/png' : 'image/jpeg', 0.95);
            const ext = isTransparent ? 'png' : 'jpg';
            setResultBlob(blob);
            setResultName(`resized_${targetW}x${targetH}.${ext}`);
            setResultSize(`${formatSize(blob.size)} — ${targetW} × ${targetH} px`);
            setState('done');
        } catch (err) {
            console.error(err);
            setState('configure');
            alert('Error resizing image.');
        }
    }, [files, mode, width, height, percentage, lockAspect, useBgFill, bgColor, dpi, physicalW, physicalH, physicalUnit, originalDims, edgeSize, upscaleFactor]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click();
        URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => {
        setFiles([]); setState('upload'); setResultBlob(null);
    }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'configure' && (
                    <>
                        <div className={styles.optionGroup}>
                            <h3 className={styles.optionTitle}>Original: {originalDims.w} × {originalDims.h} px</h3>
                            <div className={styles.optionRow} style={{ flexWrap: 'wrap' }}>
                                {(['pixels', 'percentage', 'width-only', 'height-only', 'physical', 'longest-edge', 'shortest-edge', 'upscale'] as ResizeMode[]).map((m) => (
                                    <div key={m} className={`${styles.optionCard} ${mode === m ? styles.active : ''}`} onClick={() => setMode(m)} style={{ minWidth: 90 }}>
                                        <h4 style={{ fontSize: '0.75rem' }}>{m === 'pixels' ? 'By Pixels' : m === 'percentage' ? 'By %' : m === 'width-only' ? 'Width Only' : m === 'height-only' ? 'Height Only' : m === 'physical' ? 'Physical' : m === 'longest-edge' ? 'Longest Edge' : m === 'shortest-edge' ? 'Shortest Edge' : 'Upscale'}</h4>
                                    </div>
                                ))}
                            </div>

                            {mode === 'pixels' && (
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                    <div className={styles.inputGroup} style={{ flex: 1, minWidth: 120 }}>
                                        <label className={styles.inputLabel}>Width (px)</label>
                                        <input type="number" className={styles.textInput} value={width} onChange={(e) => handleWidthChange(Number(e.target.value))} min={1} />
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1, minWidth: 120 }}>
                                        <label className={styles.inputLabel}>Height (px)</label>
                                        <input type="number" className={styles.textInput} value={height} onChange={(e) => handleHeightChange(Number(e.target.value))} min={1} />
                                    </div>
                                </div>
                            )}

                            {mode === 'percentage' && (
                                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                    <label className={styles.inputLabel}>Scale: {percentage}%</label>
                                    <input type="range" min={1} max={500} value={percentage} onChange={(e) => setPercentage(Number(e.target.value))} style={{ width: '100%' }} />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Result: {Math.round(originalDims.w * percentage / 100)} × {Math.round(originalDims.h * percentage / 100)} px
                                    </p>
                                </div>
                            )}

                            {mode === 'width-only' && (
                                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                    <label className={styles.inputLabel}>Width (px) — Height auto-calculated</label>
                                    <input type="number" className={styles.textInput} value={width} onChange={(e) => setWidth(Number(e.target.value))} min={1} />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Result: {width} × {Math.round((width / originalDims.w) * originalDims.h)} px
                                    </p>
                                </div>
                            )}

                            {mode === 'height-only' && (
                                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                    <label className={styles.inputLabel}>Height (px) — Width auto-calculated</label>
                                    <input type="number" className={styles.textInput} value={height} onChange={(e) => setHeight(Number(e.target.value))} min={1} />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Result: {Math.round((height / originalDims.h) * originalDims.w)} × {height} px
                                    </p>
                                </div>
                            )}

                            {mode === 'physical' && (
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                    <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                        <label className={styles.inputLabel}>Width</label>
                                        <input type="number" className={styles.textInput} value={physicalW} onChange={(e) => setPhysicalW(Number(e.target.value))} min={0.1} step={0.1} />
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                        <label className={styles.inputLabel}>Height</label>
                                        <input type="number" className={styles.textInput} value={physicalH} onChange={(e) => setPhysicalH(Number(e.target.value))} min={0.1} step={0.1} />
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                        <label className={styles.inputLabel}>Unit</label>
                                        <select className={styles.textInput} value={physicalUnit} onChange={(e) => setPhysicalUnit(e.target.value as 'inches' | 'cm' | 'mm')}>
                                            <option value="inches">Inches</option>
                                            <option value="cm">CM</option>
                                            <option value="mm">MM</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                        <label className={styles.inputLabel}>DPI</label>
                                        <input type="number" className={styles.textInput} value={dpi} onChange={(e) => setDpi(Number(e.target.value))} min={72} />
                                    </div>
                                </div>
                            )}

                            {mode === 'longest-edge' && (
                                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                    <label className={styles.inputLabel}>Longest Edge (px)</label>
                                    <input type="number" className={styles.textInput} value={edgeSize} onChange={(e) => setEdgeSize(Number(e.target.value))} min={1} />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Result: {originalDims.w >= originalDims.h
                                            ? `${edgeSize} × ${Math.round((edgeSize / originalDims.w) * originalDims.h)}`
                                            : `${Math.round((edgeSize / originalDims.h) * originalDims.w)} × ${edgeSize}`} px
                                    </p>
                                </div>
                            )}

                            {mode === 'shortest-edge' && (
                                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                    <label className={styles.inputLabel}>Shortest Edge (px)</label>
                                    <input type="number" className={styles.textInput} value={edgeSize} onChange={(e) => setEdgeSize(Number(e.target.value))} min={1} />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Result: {originalDims.w <= originalDims.h
                                            ? `${edgeSize} × ${Math.round((edgeSize / originalDims.w) * originalDims.h)}`
                                            : `${Math.round((edgeSize / originalDims.h) * originalDims.w)} × ${edgeSize}`} px
                                    </p>
                                </div>
                            )}

                            {mode === 'upscale' && (
                                <div style={{ marginTop: '1rem' }}>
                                    <label className={styles.inputLabel}>Upscale Factor</label>
                                    <div className={styles.optionRow}>
                                        {upscaleFactors.map((f) => (
                                            <div key={f} className={`${styles.optionCard} ${upscaleFactor === f ? styles.active : ''}`} onClick={() => setUpscaleFactor(f)}>
                                                <h4>{f}x</h4>
                                                <p style={{ fontSize: '0.7rem' }}>{originalDims.w * f} × {originalDims.h * f}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
                                    Lock Aspect Ratio
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={useBgFill} onChange={(e) => setUseBgFill(e.target.checked)} />
                                    Background Fill
                                </label>
                                {useBgFill && (
                                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ height: 32, border: 'none', cursor: 'pointer' }} />
                                )}
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Resize Image</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Resizing your image..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
