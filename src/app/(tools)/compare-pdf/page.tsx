'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import { getToolById } from '@/lib/config/tools';
import { GitCompare } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('compare-pdf')!;
type PageState = 'upload' | 'compare';
type CompareMode = 'side-by-side' | 'overlay';

export default function ComparePdfPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [state, setState] = useState<PageState>('upload');
  const [mode, setMode] = useState<CompareMode>('side-by-side');

  const [pdfA, setPdfA] = useState<any>(null);
  const [pdfB, setPdfB] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [maxPages, setMaxPages] = useState(0);
  const [scale, setScale] = useState(1.0);

  // Canvas Refs
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);

  const renderTaskARef = useRef<any>(null);
  const renderTaskBRef = useRef<any>(null);

  const handleFilesChange = useCallback(async (newFiles: UploadedFile[]) => {
    if (newFiles.length > 2) {
      setFiles(newFiles.slice(0, 2));
      alert("Please upload exactly 2 files to compare.");
    } else {
      setFiles(newFiles);
    }
  }, []);

  const processFiles = async () => {
    if (files.length !== 2) return;

    try {
      const bufA = await files[0].file.arrayBuffer();
      const bufB = await files[1].file.arrayBuffer();

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const docA = await pdfjsLib.getDocument({ data: bufA }).promise;
      const docB = await pdfjsLib.getDocument({ data: bufB }).promise;

      setPdfA(docA);
      setPdfB(docB);
      setMaxPages(Math.max(docA.numPages, docB.numPages));
      setPageNum(1);
      setState('compare');
    } catch (err) {
      console.error(err);
      alert("Could not load PDFs for comparison.");
      setFiles([]);
    }
  };

  const renderPages = useCallback(async () => {
    if (state !== 'compare') return;

    // Render A
    let imgDataA: ImageData | null = null;
    let imgDataB: ImageData | null = null;
    let widthA = 0, heightA = 0;
    let widthB = 0, heightB = 0;

    if (pdfA && pageNum <= pdfA.numPages && canvasARef.current) {
      try {
        const pageA = await pdfA.getPage(pageNum);
        const viewportA = pageA.getViewport({ scale });
        imgDataA = await renderToCanvas(pageA, viewportA, canvasARef.current, renderTaskARef);
        widthA = viewportA.width;
        heightA = viewportA.height;
      } catch (e) {
        // Ignore cancel
      }
    }

    if (pdfB && pageNum <= pdfB.numPages && canvasBRef.current) {
      try {
        const pageB = await pdfB.getPage(pageNum);
        const viewportB = pageB.getViewport({ scale });
        imgDataB = await renderToCanvas(pageB, viewportB, canvasBRef.current, renderTaskBRef);
        widthB = viewportB.width;
        heightB = viewportB.height;
      } catch (e) {
        // Ignore cancel
      }
    }

    // Handle overlay rendering if we are in overlay mode
    if (mode === 'overlay' && canvasOverlayRef.current && imgDataA && imgDataB) {
      const overlayCanvas = canvasOverlayRef.current;
      const maxWidth = Math.max(widthA, widthB);
      const maxHeight = Math.max(heightA, heightB);

      overlayCanvas.width = maxWidth;
      overlayCanvas.height = maxHeight;
      const ctxX = overlayCanvas.getContext('2d')!;

      ctxX.fillStyle = 'white';
      ctxX.fillRect(0, 0, maxWidth, maxHeight);

      // Draw A with multiply or difference
      ctxX.globalCompositeOperation = 'source-over';
      ctxX.drawImage(canvasARef.current!, 0, 0);

      ctxX.globalCompositeOperation = 'difference';
      ctxX.drawImage(canvasBRef.current!, 0, 0);

      // To make difference obvious: identical regions will be black
      // We can invert it so identical is white, differences are dark/colored
      ctxX.globalCompositeOperation = 'difference';
      ctxX.fillStyle = 'white';
      ctxX.fillRect(0, 0, maxWidth, maxHeight);
      ctxX.globalCompositeOperation = 'source-over';
    }

  }, [pdfA, pdfB, pageNum, scale, mode, state]);

  const renderToCanvas = async (page: any, viewport: any, canvas: HTMLCanvasElement, taskRef: any): Promise<ImageData> => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (taskRef.current) await taskRef.current.cancel();

    taskRef.current = page.render({ canvasContext: ctx, viewport });
    await taskRef.current.promise;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (state === 'compare') {
      renderPages();
    }
  }, [state, renderPages]);

  const handleStartOver = () => {
    setFiles([]);
    setPdfA(null);
    setPdfB(null);
    setState('upload');
  };

  return (
    <main>
      <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
      <section className={styles.workspace}>
        <div className="container overflow-hidden">
          {state === 'upload' && (
            <>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-8 max-w-2xl mx-auto rounded-r-md">
                <p className="text-sm text-purple-700">
                  <strong>How it works:</strong> Upload 2 PDF files. The tool will render pages and allow you to compare them side-by-side or as a visual diff overlay.
                </p>
              </div>
              <FileUploader accept=".pdf" multiple={true} files={files} onFilesChange={handleFilesChange} />

              {files.length === 2 && (
                <div className={styles.actionBar}>
                  <p className={styles.fileCount}>2 files ready (A and B)</p>
                  <button className="btn btn-primary btn-lg" onClick={processFiles}>
                    <GitCompare size={18} /> Start Comparison
                  </button>
                </div>
              )}
            </>
          )}

          {state === 'compare' && (
            <div className="flex flex-col gap-6">
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200" onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1}>Prev Page</button>
                  <span className="text-sm font-medium px-2">Page {pageNum} of {maxPages}</span>
                  <button className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200" onClick={() => setPageNum(p => Math.min(maxPages, p + 1))} disabled={pageNum >= maxPages}>Next Page</button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      className={`px-4 py-1.5 text-sm rounded-md transition-colors ${mode === 'side-by-side' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setMode('side-by-side')}
                    >Side by Side</button>
                    <button
                      className={`px-4 py-1.5 text-sm rounded-md transition-colors ${mode === 'overlay' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setMode('overlay')}
                    >Visual Diff</button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Zoom</span>
                    <input type="range" min="0.5" max="2.5" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-24" />
                  </div>

                  <button className="btn btn-outline ml-auto" onClick={handleStartOver}>
                    Close Compare
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-auto min-h-[600px] p-6 relative">
                {mode === 'side-by-side' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-max mx-auto justify-items-center">
                    {/* A */}
                    <div className="flex flex-col items-center">
                      <div className="bg-white px-4 py-2 border-b-2 border-primary-500 font-medium mb-4 w-full text-center sticky top-0 z-10 shadow-sm rounded-t-lg truncate">
                        File A: {files[0]?.file.name || 'Original'}
                      </div>
                      <div className="shadow-lg mx-auto bg-white flex items-center justify-center min-h-[400px] min-w-[300px]">
                        {pageNum > (pdfA?.numPages || 0) ? (
                          <span className="text-gray-400">No page {pageNum} in this document</span>
                        ) : (
                          <canvas ref={canvasARef} className="block" />
                        )}
                      </div>
                    </div>

                    {/* B */}
                    <div className="flex flex-col items-center">
                      <div className="bg-white px-4 py-2 border-b-2 border-purple-500 font-medium mb-4 w-full text-center sticky top-0 z-10 shadow-sm rounded-t-lg truncate">
                        File B: {files[1]?.file.name || 'Modified'}
                      </div>
                      <div className="shadow-lg mx-auto bg-white flex items-center justify-center min-h-[400px] min-w-[300px]">
                        {pageNum > (pdfB?.numPages || 0) ? (
                          <span className="text-gray-400">No page {pageNum} in this document</span>
                        ) : (
                          <canvas ref={canvasBRef} className="block" />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-start relative w-full h-full">
                    {/* Hidden A & B to keep refs working */}
                    <canvas ref={canvasARef} className="hidden" />
                    <canvas ref={canvasBRef} className="hidden" />

                    <div className="mb-4 text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm">
                      Differences are highlighted. Pure white means identical.
                    </div>

                    <div className="shadow-lg mx-auto bg-white mt-4">
                      <canvas ref={canvasOverlayRef} className="block" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
