'use client';
import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('html-to-image')!;
type PageState = 'input' | 'processing' | 'done';

export default function HtmlToImagePage() {
    const [state, setState] = useState<PageState>('input');
    const [htmlContent, setHtmlContent] = useState('<div style="padding:40px; background:linear-gradient(135deg,#667eea,#764ba2); color:white; font-family:Arial; border-radius:16px;">\n  <h1>Hello World!</h1>\n  <p>This HTML will be converted to an image.</p>\n</div>');
    const [bgColor, setBgColor] = useState('#ffffff');
    const [widthPx, setWidthPx] = useState(800);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleProcess = useCallback(async () => {
        setState('processing');
        try {
            // Create an offscreen container
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.width = `${widthPx}px`;
            container.style.backgroundColor = bgColor;
            container.innerHTML = htmlContent;
            document.body.appendChild(container);

            // Use html2canvas-like approach with SVG foreignObject
            const svgData = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${container.offsetWidth}" height="${container.offsetHeight}">
                    <foreignObject width="100%" height="100%">
                        <div xmlns="http://www.w3.org/1999/xhtml" style="background:${bgColor}">
                            ${htmlContent}
                        </div>
                    </foreignObject>
                </svg>`;

            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                document.body.removeChild(container);

                canvas.toBlob((blob) => {
                    if (blob) {
                        setResultBlob(blob);
                        setResultName('html-screenshot.png');
                        setResultSize(formatSize(blob.size));
                        setState('done');
                    }
                }, 'image/png');
            };
            img.onerror = () => {
                document.body.removeChild(container);
                alert('Error rendering HTML. Make sure your HTML is valid.');
                setState('input');
            };
            img.src = url;
        } catch (err) {
            console.error(err);
            setState('input');
            alert('Error converting HTML to image.');
        }
    }, [htmlContent, bgColor, widthPx]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setState('input'); setResultBlob(null); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'input' && (
                    <>
                        <div className={styles.optionGroup}>
                            <h3 className={styles.optionTitle}>Paste Your HTML Code</h3>
                            <textarea
                                className={styles.textInput}
                                value={htmlContent}
                                onChange={(e) => setHtmlContent(e.target.value)}
                                rows={12}
                                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                placeholder="<div>Your HTML here...</div>"
                            />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 120 }}>
                                    <label className={styles.inputLabel}>Width (px)</label>
                                    <input type="number" className={styles.textInput} value={widthPx} onChange={(e) => setWidthPx(Number(e.target.value))} min={100} max={3000} />
                                </div>
                                <div className={styles.inputGroup} style={{ flex: 1, minWidth: 120 }}>
                                    <label className={styles.inputLabel}>Background</label>
                                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: '100%', height: 36, border: 'none', cursor: 'pointer' }} />
                                </div>
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>HTML to PNG</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Convert to Image</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Rendering HTML..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
