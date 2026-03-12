'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('color-picker')!; // reuse icon/color from existing
type PageState = 'upload' | 'draw' | 'done';

const SHAPES = ['freehand', 'line', 'rectangle', 'circle', 'arrow', 'text'] as const;
type Shape = typeof SHAPES[number];

export default function DrawingToolPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [drawing, setDrawing] = useState(false);
    const [shape, setShape] = useState<Shape>('freehand');
    const [color, setColor] = useState('#FF0000');
    const [lineWidth, setLineWidth] = useState(4);
    const [textInput, setTextInput] = useState('Hello');
    const [fontSize, setFontSize] = useState(32);
    const [paths, setPaths] = useState<{ type: Shape; points: { x: number; y: number }[]; color: string; lineWidth: number; text?: string; fontSize?: number }[]>([]);
    const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');
    const scaleRef = useRef(1);

    const handleFilesChange = useCallback(async (f: UploadedFile[]) => {
        setFiles(f);
        if (f.length > 0) {
            const img = await loadImage(f[0].file);
            setImgEl(img);
            setState('draw');
        }
    }, []);

    // Render canvas
    useEffect(() => {
        if (!imgEl || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const maxDisplay = 700;
        const sc = Math.min(maxDisplay / imgEl.naturalWidth, maxDisplay / imgEl.naturalHeight, 1);
        scaleRef.current = sc;
        canvas.width = Math.round(imgEl.naturalWidth * sc);
        canvas.height = Math.round(imgEl.naturalHeight * sc);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

        // Redraw all saved paths
        for (const p of paths) {
            drawShape(ctx, p);
        }
        // Draw current path
        if (currentPoints.length > 0) {
            drawShape(ctx, { type: shape, points: currentPoints, color, lineWidth, text: textInput, fontSize });
        }
    }, [imgEl, paths, currentPoints, shape, color, lineWidth, textInput, fontSize]);

    const drawShape = (ctx: CanvasRenderingContext2D, p: { type: Shape; points: { x: number; y: number }[]; color: string; lineWidth: number; text?: string; fontSize?: number }) => {
        ctx.strokeStyle = p.color;
        ctx.fillStyle = p.color;
        ctx.lineWidth = p.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (p.type === 'freehand' && p.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.points[0].x, p.points[0].y);
            for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y);
            ctx.stroke();
        } else if (p.type === 'line' && p.points.length === 2) {
            ctx.beginPath();
            ctx.moveTo(p.points[0].x, p.points[0].y);
            ctx.lineTo(p.points[1].x, p.points[1].y);
            ctx.stroke();
        } else if (p.type === 'rectangle' && p.points.length === 2) {
            const x = Math.min(p.points[0].x, p.points[1].x);
            const y = Math.min(p.points[0].y, p.points[1].y);
            const w = Math.abs(p.points[1].x - p.points[0].x);
            const h = Math.abs(p.points[1].y - p.points[0].y);
            ctx.strokeRect(x, y, w, h);
        } else if (p.type === 'circle' && p.points.length === 2) {
            const cx = (p.points[0].x + p.points[1].x) / 2;
            const cy = (p.points[0].y + p.points[1].y) / 2;
            const rx = Math.abs(p.points[1].x - p.points[0].x) / 2;
            const ry = Math.abs(p.points[1].y - p.points[0].y) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (p.type === 'arrow' && p.points.length === 2) {
            const [start, end] = p.points;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            // Arrowhead
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headLen = 15;
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        } else if (p.type === 'text' && p.points.length >= 1) {
            ctx.font = `bold ${p.fontSize || 32}px Arial`;
            ctx.fillText(p.text || 'Text', p.points[0].x, p.points[0].y);
        }
    };

    const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setDrawing(true);
        const pos = getPos(e);
        if (shape === 'text') {
            setPaths(prev => [...prev, { type: 'text', points: [pos], color, lineWidth, text: textInput, fontSize }]);
        } else {
            setCurrentPoints([pos]);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!drawing) return;
        const pos = getPos(e);
        if (shape === 'freehand') {
            setCurrentPoints(prev => [...prev, pos]);
        } else if (shape !== 'text') {
            setCurrentPoints(prev => [prev[0], pos]);
        }
    };

    const handleMouseUp = () => {
        if (!drawing) return;
        setDrawing(false);
        if (shape !== 'text' && currentPoints.length > 0) {
            setPaths(prev => [...prev, { type: shape, points: [...currentPoints], color, lineWidth }]);
        }
        setCurrentPoints([]);
    };

    const handleUndo = () => setPaths(prev => prev.slice(0, -1));
    const handleClearAll = () => setPaths([]);

    const handleSave = useCallback(async () => {
        if (!imgEl) return;
        // Render at full resolution
        const canvas = document.createElement('canvas');
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0);
        const sc = scaleRef.current;
        // Scale all drawings to full resolution
        for (const p of paths) {
            const scaled = { ...p, points: p.points.map(pt => ({ x: pt.x / sc, y: pt.y / sc })), lineWidth: p.lineWidth / sc, fontSize: (p.fontSize || 32) / sc };
            drawShape(ctx, scaled);
        }
        const blob = await canvasToBlob(canvas, 'image/png');
        setResultBlob(blob);
        setResultName('drawing.png');
        setResultSize(formatSize(blob.size));
        setState('done');
    }, [imgEl, paths]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); setImgEl(null); setPaths([]); }, []);

    return (
        <main>
            <ToolHero title="Drawing Tool" description="Draw shapes, arrows, text, and freehand annotations on your images" icon={tool.icon} color="#E11D48" bgColor="#FFF1F2" />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'draw' && (
                    <>
                        <div className={styles.optionGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <h3 className={styles.optionTitle} style={{ margin: 0 }}>Draw on Image</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn" onClick={handleUndo} style={{ fontSize: '0.8rem' }}>↩ Undo</button>
                                    <button className="btn" onClick={handleClearAll} style={{ fontSize: '0.8rem' }}>Clear All</button>
                                </div>
                            </div>

                            {/* Shape selector */}
                            <div className={styles.optionRow} style={{ flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                {SHAPES.map(s => (
                                    <div key={s} className={`${styles.optionCard} ${shape === s ? styles.active : ''}`}
                                        onClick={() => setShape(s)} style={{ minWidth: 80, textTransform: 'capitalize' }}>
                                        <h4 style={{ fontSize: '0.8rem' }}>{s === 'freehand' ? '✏️ Draw' : s === 'line' ? '📏 Line' : s === 'rectangle' ? '⬜ Rect' : s === 'circle' ? '⭕ Circle' : s === 'arrow' ? '➡️ Arrow' : '🔤 Text'}</h4>
                                    </div>
                                ))}
                            </div>

                            {/* Controls */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Color:</label>
                                    <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', cursor: 'pointer' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Width: {lineWidth}</label>
                                    <input type="range" min={1} max={20} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} style={{ width: 100 }} />
                                </div>
                                {shape === 'text' && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Text:</label>
                                            <input type="text" className={styles.textInput} value={textInput} onChange={e => setTextInput(e.target.value)} style={{ width: 120 }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Size: {fontSize}</label>
                                            <input type="range" min={12} max={80} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ width: 80 }} />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Canvas */}
                            <div style={{ textAlign: 'center', cursor: 'crosshair' }}>
                                <canvas
                                    ref={canvasRef}
                                    style={{ maxWidth: '100%', border: '2px solid var(--border)', borderRadius: '8px' }}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                />
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{paths.length} annotation{paths.length !== 1 ? 's' : ''}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleSave}>Save Drawing</button>
                        </div>
                    </>
                )}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
