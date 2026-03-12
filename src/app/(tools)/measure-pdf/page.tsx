'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import { getToolById } from '@/lib/config/tools';
import { Ruler } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('measure-pdf')!;
type PageState = 'upload' | 'measure';
type Point = { x: number, y: number };

export default function MeasurePdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [pdf, setPdf] = useState<any>(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.5);

    // Measurement states
    const [points, setPoints] = useState<Point[]>([]);
    const [distance, setDistance] = useState<number | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);

    const handleFilesChange = useCallback(async (newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            try {
                const arrBuf = await newFiles[0].file.arrayBuffer();
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

                const loadedPdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;
                setPdf(loadedPdf);
                setNumPages(loadedPdf.numPages);
                setPageNum(1);
                setState('measure');
            } catch (err) {
                console.error(err);
                alert("Could not load PDF for measuring.");
                setFiles([]);
            }
        }
    }, []);

    const renderPage = useCallback(async () => {
        if (!pdf || !canvasRef.current) return;

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d')!;

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            if (renderTaskRef.current) {
                await renderTaskRef.current.cancel();
            }

            const renderContext = { canvasContext: ctx, viewport };
            renderTaskRef.current = page.render(renderContext);
            await renderTaskRef.current.promise;

            // Draw existing points if any
            if (points.length > 0) {
                drawMeasurements(ctx, points);
            }
        } catch (err) {
            // Ignore render cancellations
            if (err instanceof Error && err.name === 'RenderingCancelledException') return;
            console.error('Error rendering page:', err);
        }
    }, [pdf, pageNum, scale, points]);

    useEffect(() => {
        if (state === 'measure') {
            renderPage();
        }
    }, [state, renderPage]);

    const drawMeasurements = (ctx: CanvasRenderingContext2D, pts: Point[]) => {
        ctx.strokeStyle = '#EF4444';
        ctx.fillStyle = '#EF4444';
        ctx.lineWidth = 2;

        pts.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        if (pts.length === 2) {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.stroke();
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // Handle CSS scaling vs internal resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        let newPoints = [...points];
        if (newPoints.length >= 2) {
            newPoints = [{ x, y }];
            setDistance(null);
        } else {
            newPoints.push({ x, y });
        }

        setPoints(newPoints);

        // Re-render immediately to draw points over the PDF
        // (Fastest is just draw on top of currently rendered canvas)
        if (newPoints.length === 1 || newPoints.length === 2) {
            const ctx = canvas.getContext('2d')!;
            drawMeasurements(ctx, newPoints);

            if (newPoints.length === 2) {
                const dx = newPoints[1].x - newPoints[0].x;
                const dy = newPoints[1].y - newPoints[0].y;
                const pxDist = Math.hypot(dx, dy);

                // Convert px to PDF points (1 pt = 1/72 inch). pdf.js renders at 72dpi when scale=1
                // So at scale=1, 1px = 1pt. Therefore distance in pt = pxDist / scale
                const ptDist = pxDist / scale;
                // Convert to INCHES and CM
                const inchDist = ptDist / 72;
                const cmDist = inchDist * 2.54;

                setDistance(ptDist);
            }
        }
    };

    const handleStartOver = useCallback(() => {
        setFiles([]);
        setPdf(null);
        setPoints([]);
        setDistance(null);
        setState('upload');
    }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container overflow-hidden">
                    {state === 'upload' && <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={handleFilesChange} />}

                    {state === 'measure' && (
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Toolbar Sidebar */}
                            <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <Ruler className="text-primary-600" size={20} /> Measure Tools
                                    </h3>

                                    <p className="text-sm text-gray-500 mb-4">
                                        Click exactly two points on the document to measure the distance between them.
                                    </p>

                                    {distance !== null && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg mb-4">
                                            <p className="text-xs text-red-800 font-semibold mb-1">Distance:</p>
                                            <p className="text-lg font-mono text-red-900">{distance.toFixed(2)} pt</p>
                                            <p className="text-sm text-red-700">{(distance / 72).toFixed(3)} inches</p>
                                            <p className="text-sm text-red-700">{((distance / 72) * 2.54).toFixed(3)} cm</p>
                                        </div>
                                    )}

                                    <button
                                        className="btn btn-outline w-full mb-2"
                                        onClick={() => { setPoints([]); setDistance(null); renderPage(); }}
                                        disabled={points.length === 0}
                                    >
                                        Clear Measurement
                                    </button>
                                </div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="font-semibold text-sm mb-3">View Options</h3>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <button className="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200" onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1}>Prev Page</button>
                                        <span className="text-xs text-gray-500">{pageNum} / {numPages}</span>
                                        <button className="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200" onClick={() => setPageNum(p => Math.min(numPages, p + 1))} disabled={pageNum >= numPages}>Next Page</button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500">Zoom</label>
                                        <input type="range" min="0.5" max="3" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full" />
                                    </div>
                                </div>

                                <button className="btn w-full mt-auto" onClick={handleStartOver}>
                                    Start Over
                                </button>
                            </div>

                            {/* PDF Canvas Area */}
                            <div className="flex-grow bg-gray-100 rounded-xl border border-gray-200 overflow-auto min-h-[600px] flex justify-center items-start p-6">
                                <div className="shadow-lg relative inline-block">
                                    <canvas
                                        ref={canvasRef}
                                        onClick={handleCanvasClick}
                                        className="cursor-crosshair bg-white max-w-full h-auto block"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
