'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, addMemeText, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('meme-generator')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function MemeGeneratorPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [topText, setTopText] = useState('TOP TEXT');
    const [bottomText, setBottomText] = useState('BOTTOM TEXT');
    const [fontSize, setFontSize] = useState(0); // 0 = auto
    const [fontFamily, setFontFamily] = useState('Impact');
    const [textColor, setTextColor] = useState('#ffffff');
    const [outlineColor, setOutlineColor] = useState('#000000');
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
        const maxDisplay = 500;
        const sc = Math.min(maxDisplay / imgEl.naturalWidth, maxDisplay / imgEl.naturalHeight, 1);
        canvas.width = Math.round(imgEl.naturalWidth * sc);
        canvas.height = Math.round(imgEl.naturalHeight * sc);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        const fs = fontSize || Math.round(canvas.width / 12);
        ctx.font = `bold ${fs}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = textColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = Math.round(fs / 15);
        ctx.lineJoin = 'round';
        if (topText) {
            const y = fs + 10;
            ctx.strokeText(topText.toUpperCase(), canvas.width / 2, y);
            ctx.fillText(topText.toUpperCase(), canvas.width / 2, y);
        }
        if (bottomText) {
            const y = canvas.height - 10;
            ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, y);
            ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, y);
        }
    }, [imgEl, topText, bottomText, fontSize, fontFamily, textColor, outlineColor]);

    const handleProcess = useCallback(async () => {
        if (!imgEl) return;
        setState('processing');
        try {
            const canvas = addMemeText(imgEl, topText, bottomText, {
                fontSize: fontSize || undefined, fontFamily, textColor, outlineColor
            });
            const blob = await canvasToBlob(canvas, 'image/png');
            setResultBlob(blob); setResultName('meme.png'); setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error.'); }
    }, [imgEl, topText, bottomText, fontSize, fontFamily, textColor, outlineColor]);

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
                                <canvas ref={previewRef} style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 150 }}>
                                    <label className={styles.inputLabel}>Top Text</label>
                                    <input type="text" className={styles.textInput} value={topText} onChange={e => setTopText(e.target.value)} />
                                </div>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 150 }}>
                                    <label className={styles.inputLabel}>Bottom Text</label>
                                    <input type="text" className={styles.textInput} value={bottomText} onChange={e => setBottomText(e.target.value)} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 100 }}>
                                    <label className={styles.inputLabel}>Font</label>
                                    <select className={styles.textInput} value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                                        <option value="Impact">Impact</option>
                                        <option value="Arial Black">Arial Black</option>
                                        <option value="Comic Sans MS">Comic Sans</option>
                                    </select>
                                </div>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 80 }}>
                                    <label className={styles.inputLabel}>Size (0=auto)</label>
                                    <input type="number" className={styles.textInput} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} min={0} max={200} />
                                </div>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 60 }}>
                                    <label className={styles.inputLabel}>Text</label>
                                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }} />
                                </div>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 60 }}>
                                    <label className={styles.inputLabel}>Outline</label>
                                    <input type="color" value={outlineColor} onChange={e => setOutlineColor(e.target.value)} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }} />
                                </div>
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Generate Meme</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Creating meme..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
