'use client';
import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('convert-image')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

const formatOptions = [
    { value: 'image/png', label: 'PNG', ext: 'png' },
    { value: 'image/jpeg', label: 'JPG / JPEG', ext: 'jpg' },
    { value: 'image/webp', label: 'WebP', ext: 'webp' },
    { value: 'image/bmp', label: 'BMP', ext: 'bmp' },
    { value: 'image/gif', label: 'GIF', ext: 'gif' },
];

export default function ConvertImagePage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [targetFormat, setTargetFormat] = useState('image/png');
    const [quality, setQuality] = useState(92);
    const [showBase64, setShowBase64] = useState(false);
    const [base64String, setBase64String] = useState('');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((f: UploadedFile[]) => { setFiles(f); if (f.length > 0) setState('configure'); }, []);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const img = await loadImage(files[0].file);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            // For JPEG, fill white bg (no transparency)
            if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0);
            const blob = await canvasToBlob(canvas, targetFormat, quality / 100);
            const ext = formatOptions.find(f => f.value === targetFormat)!.ext;
            setResultBlob(blob);
            setResultName(`converted.${ext}`);
            setResultSize(`${formatSize(blob.size)} — ${ext.toUpperCase()}`);

            if (showBase64) {
                const reader = new FileReader();
                reader.onload = () => setBase64String(reader.result as string);
                reader.readAsDataURL(blob);
            }
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error converting.'); }
    }, [files, targetFormat, quality, showBase64]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); setBase64String(''); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'configure' && (
                    <>
                        <div className={styles.optionGroup}>
                            <h3 className={styles.optionTitle}>Source: {files[0]?.file.type || 'Unknown'}</h3>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Convert to:</label>
                                <div className={styles.optionRow}>
                                    {formatOptions.map((f) => (
                                        <div key={f.value} className={`${styles.optionCard} ${targetFormat === f.value ? styles.active : ''}`}
                                            onClick={() => setTargetFormat(f.value)}>
                                            <h4>{f.label}</h4><p>.{f.ext}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {(targetFormat === 'image/jpeg' || targetFormat === 'image/webp') && (
                                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                    <label className={styles.inputLabel}>Quality: {quality}%</label>
                                    <input type="range" min={1} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} style={{ width: '100%' }} />
                                </div>
                            )}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginTop: '1rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={showBase64} onChange={(e) => setShowBase64(e.target.checked)} />
                                Also generate Base64 string
                            </label>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Convert</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Converting..." />}
                {state === 'done' && resultBlob && (
                    <>
                        <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />
                        {base64String && (
                            <div className={styles.optionGroup} style={{ marginTop: '1rem' }}>
                                <h3 className={styles.optionTitle}>Base64 String</h3>
                                <textarea readOnly value={base64String} style={{ width: '100%', height: 120, fontSize: '0.7rem', fontFamily: 'monospace', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem' }} />
                                <button className="btn" style={{ marginTop: '0.5rem' }} onClick={() => { navigator.clipboard.writeText(base64String); }}>Copy to Clipboard</button>
                            </div>
                        )}
                    </>
                )}
            </div></section>
        </main>
    );
}
