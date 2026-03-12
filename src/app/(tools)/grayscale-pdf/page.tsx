'use client';

import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('grayscale-pdf')!;

type PageState = 'upload' | 'processing' | 'done';

export default function GrayscalePdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');

        try {
            const arrBuf = await files[0].file.arrayBuffer();

            // We use pdfjs to render pages to images, then pdf-lib to pack them back
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;

            const { PDFDocument } = await import('pdf-lib');
            const resultPdf = await PDFDocument.create();

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);

                // Use scale 2 for decent print/reading quality
                const scale = 2;
                const viewport = page.getViewport({ scale });

                // Create an offscreen canvas to render the original page
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

                const renderContext: any = { canvasContext: ctx, viewport };
                await page.render(renderContext).promise;

                // Convert to Grayscale
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let j = 0; j < data.length; j += 4) {
                    const r = data[j];
                    const g = data[j + 1];
                    const b = data[j + 2];
                    // Luminance formula
                    const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    data[j] = data[j + 1] = data[j + 2] = v;
                }
                ctx.putImageData(imageData, 0, 0);

                // Get JPEG blob to keep size reasonable
                const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85));
                const imgBuf = await blob.arrayBuffer();

                // Embed into new PDF
                const image = await resultPdf.embedJpg(imgBuf);
                const pdfPage = resultPdf.addPage([viewport.width / scale, viewport.height / scale]);

                pdfPage.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: viewport.width / scale,
                    height: viewport.height / scale,
                });
            }

            const pdfBytes = await resultPdf.save();
            const outputBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(outputBlob);

            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_grayscale.pdf`);
            setResultSize(formatSize(outputBlob.size));
            setState('done');

        } catch (err) {
            console.error('Grayscale PDF error:', err);
            setState('upload');
            alert('Error converting PDF to grayscale.');
        }
    }, [files]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resultName;
        a.click();
        URL.revokeObjectURL(url);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => {
        setFiles([]);
        setState('upload');
        setResultBlob(null);
    }, []);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <main>
            <ToolHero
                title={tool.name}
                description={tool.description}
                icon={tool.icon}
                color={tool.color}
                bgColor={tool.bgColor}
            />

            <section className={styles.workspace}>
                <div className="container">
                    {state === 'upload' && (
                        <>
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8 max-w-2xl mx-auto rounded-r-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-amber-700">
                                            <strong>Note:</strong> Converting to grayscale directly in the browser requires rasterizing pages to images. This means the resulting PDF will have its text converted to images, removing selectability and potentially increasing file size.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <FileUploader
                                accept=".pdf"
                                multiple={false}
                                files={files}
                                onFilesChange={setFiles}
                            />
                            {files.length > 0 && (
                                <div className={styles.actionBar}>
                                    <p className={styles.fileCount}>
                                        {files[0]?.file.name}
                                    </p>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleProcess}
                                    >
                                        Convert to Grayscale
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress
                            isProcessing={true}
                            label="Converting document pages to grayscale..."
                        />
                    )}

                    {state === 'done' && resultBlob && (
                        <div className={styles.resultContainer}>
                            <h3 className="text-xl font-bold mb-4">Converted to Grayscale Successfully</h3>
                            <DownloadCard
                                fileName={resultName}
                                fileSize={resultSize}
                                onDownload={handleDownload}
                                onStartOver={handleStartOver}
                            />
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
