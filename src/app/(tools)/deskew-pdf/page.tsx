'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { RotateCw } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('deskew-pdf')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function DeskewPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [angle, setAngle] = useState<number>(0);

    // Config state
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) setState('configure');
    }, []);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');

        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const sourcePdf = await PDFDocument.load(arrBuf);
            const targetPdf = await PDFDocument.create();

            const pages = sourcePdf.getPages();
            const embeddedPages = await targetPdf.embedPages(pages);

            // Convert angle to radians for math
            const rad = (angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            for (let i = 0; i < embeddedPages.length; i++) {
                const ep = embeddedPages[i];
                const sheet = targetPdf.addPage([ep.width, ep.height]);

                // We want to rotate around the center of the page
                const cx = ep.width / 2;
                const cy = ep.height / 2;

                // Calculate the new origin (bottom-left corner) after rotation
                // relative to the center
                const nx = -cx * cos - (-cy) * sin;
                const ny = -cx * sin + (-cy) * cos;

                // Translate back to absolute coordinates
                const drawX = cx + nx;
                const drawY = cy + ny;

                // Draw the embedded page with the required rotation
                sheet.drawPage(ep, {
                    x: drawX,
                    y: drawY,
                    width: ep.width,
                    height: ep.height,
                    rotate: degrees(-angle), // Negative because pdf-lib rotates counter-clockwise?
                });
            }

            const bytes = await targetPdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);
            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_deskewed.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error(err);
            setState('configure');
            alert(`Error deskewing PDF.`);
        }
    }, [files, angle]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = u;
        a.download = resultName;
        a.click();
        URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => {
        setFiles([]);
        setState('upload');
        setResultBlob(null);
        setAngle(0);
    }, []);

    const formatSize = (b: number) => {
        const k = 1024;
        const s = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
    };

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container">
                    {state === 'upload' && <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={handleFilesChange} />}
                    {state === 'configure' && (
                        <>
                            <div className={styles.optionGroup}>
                                <h3 className={styles.optionTitle}>Rotation Angle (Degrees)</h3>

                                <div className="flex flex-col items-center justify-center max-w-md mx-auto mb-8">
                                    <div className="text-4xl font-bold text-gray-800 mb-6">
                                        {angle > 0 ? '+' : ''}{angle.toFixed(1)}°
                                    </div>
                                    <input
                                        type="range"
                                        min="-10"
                                        max="10"
                                        step="0.1"
                                        value={angle}
                                        onChange={(e) => setAngle(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="w-full flex justify-between text-sm text-gray-500 mt-2">
                                        <span>-10° (Left)</span>
                                        <span>0°</span>
                                        <span>+10° (Right)</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 text-center">
                                    Use the slider to finely rotate the pages and correct tilt from scanned documents.
                                </p>
                            </div>

                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button className="btn btn-primary btn-lg" onClick={handleProcess}>
                                    <RotateCw size={18} /> Apply Rotation
                                </button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label={`Deskewing document by ${angle}°...`} />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
