'use client';

import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('pdf-to-jpg')!;
type PageState = 'upload' | 'processing' | 'done';

export default function PdfToJpgPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleConvert = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d')!;
                await page.render({ canvasContext: ctx, viewport } as any).promise;
                const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
                zip.file(`page_${i}.jpg`, blob);
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            setResultBlob(zipBlob);
            setResultName('pdf_images.zip');
            setResultSize(formatSize(zipBlob.size));
            setState('done');
        } catch (err) { console.error(err); setState('upload'); alert('Error converting PDF to images.'); }
    }, [files]);

    const handleDownload = useCallback(() => { if (!resultBlob) return; const u = URL.createObjectURL(resultBlob); const a = document.createElement('a'); a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u); }, [resultBlob, resultName]);
    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); }, []);
    const formatSize = (b: number) => { if (b === 0) return '0 B'; const k = 1024; const s = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(b) / Math.log(k)); return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]; };

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container">
                    {state === 'upload' && (
                        <>
                            <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={setFiles} />
                            {files.length > 0 && (
                                <div className={styles.actionBar}>
                                    <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                    <button className="btn btn-primary btn-lg" onClick={handleConvert}>Convert to JPG</button>
                                </div>
                            )}
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Converting PDF to JPG..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
