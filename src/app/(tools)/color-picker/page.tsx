'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, extractDominantColors, getPixelColor } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('color-picker')!;

function hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}
function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default function ColorPickerPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const [dominantColors, setDominantColors] = useState<string[]>([]);
    const [pickedColor, setPickedColor] = useState<{ hex: string; r: number; g: number; b: number } | null>(null);
    const [copied, setCopied] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFilesChange = useCallback(async (f: UploadedFile[]) => {
        setFiles(f);
        if (f.length > 0) {
            const img = await loadImage(f[0].file);
            setImgEl(img);
            const colors = extractDominantColors(img, 8);
            setDominantColors(colors);
        }
    }, []);

    useEffect(() => {
        if (!imgEl || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const maxDisplay = 600;
        const sc = Math.min(maxDisplay / imgEl.naturalWidth, maxDisplay / imgEl.naturalHeight, 1);
        canvas.width = Math.round(imgEl.naturalWidth * sc);
        canvas.height = Math.round(imgEl.naturalHeight * sc);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    }, [imgEl]);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!imgEl || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = imgEl.naturalWidth / canvas.width;
        const scaleY = imgEl.naturalHeight / canvas.height;
        const x = Math.round((e.clientX - rect.left) * scaleX);
        const y = Math.round((e.clientY - rect.top) * scaleY);
        const color = getPixelColor(imgEl, x, y);
        setPickedColor(color);
    }, [imgEl]);

    const copyText = useCallback((text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 1500);
    }, []);

    const handleStartOver = useCallback(() => { setFiles([]); setImgEl(null); setPickedColor(null); setDominantColors([]); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {!imgEl ? (
                    <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />
                ) : (
                    <>
                        <div className={styles.optionGroup}>
                            <h3 className={styles.optionTitle}>Click on image to pick a color</h3>
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <canvas ref={canvasRef} onClick={handleCanvasClick}
                                    style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'crosshair' }} />
                            </div>

                            {pickedColor && (
                                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>Picked Color</h4>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: pickedColor.hex, border: '2px solid var(--border)' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
                                            {(() => {
                                                const hsl = rgbToHsl(pickedColor.r, pickedColor.g, pickedColor.b); return (<>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: 600 }}>HEX:</span> <code>{pickedColor.hex}</code>
                                                        <button className="btn" style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }} onClick={() => copyText(pickedColor.hex, 'hex')}>
                                                            {copied === 'hex' ? '✓' : 'Copy'}
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: 600 }}>RGB:</span> <code>rgb({pickedColor.r}, {pickedColor.g}, {pickedColor.b})</code>
                                                        <button className="btn" style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }} onClick={() => copyText(`rgb(${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b})`, 'rgb')}>
                                                            {copied === 'rgb' ? '✓' : 'Copy'}
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: 600 }}>HSL:</span> <code>hsl({hsl.h}, {hsl.s}%, {hsl.l}%)</code>
                                                        <button className="btn" style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }} onClick={() => copyText(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}>
                                                            {copied === 'hsl' ? '✓' : 'Copy'}
                                                        </button>
                                                    </div>
                                                </>);
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <h4 style={{ margin: '0.5rem 0' }}>Dominant Colors (Auto-extracted)</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {dominantColors.map((c, i) => (
                                    <div key={i} onClick={() => copyText(c, 'dom' + i)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                                        <div style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: c, border: '1px solid var(--border)' }} />
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c}</span>
                                        {copied === ('dom' + i) && <div style={{ fontSize: '0.6rem', color: 'var(--primary)' }}>Copied!</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{files[0]?.file.name}</p>
                            <button className="btn btn-primary" onClick={handleStartOver}>Start Over</button>
                        </div>
                    </>
                )}
            </div></section>
        </main>
    );
}
