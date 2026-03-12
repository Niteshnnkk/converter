'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Grid2x2 } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('n-up-pdf')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

type NUpConfig = 2 | 4;

export default function NUpPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [layout, setLayout] = useState<NUpConfig>(2);

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

            // A4 dimensions: [595.28, 841.89]
            const A4_W = PageSizes.A4[0];
            const A4_H = PageSizes.A4[1];

            if (layout === 2) {
                // 2-up: Landscape A4. Cell size is A4_H / 2 width, A4_W height
                for (let i = 0; i < embeddedPages.length; i += 2) {
                    const sheet = targetPdf.addPage([A4_H, A4_W]); // Landscape A4

                    const leftPage = embeddedPages[i];
                    const rightPage = i + 1 < embeddedPages.length ? embeddedPages[i + 1] : null;

                    const cellW = A4_H / 2;
                    const cellH = A4_W;

                    // Left
                    const leftScale = Math.min(cellW / leftPage.width, cellH / leftPage.height) * 0.9;
                    const lw = leftPage.width * leftScale;
                    const lh = leftPage.height * leftScale;
                    sheet.drawPage(leftPage, {
                        x: (cellW - lw) / 2,
                        y: (cellH - lh) / 2,
                        width: lw, height: lh
                    });

                    // Right
                    if (rightPage) {
                        const rightScale = Math.min(cellW / rightPage.width, cellH / rightPage.height) * 0.9;
                        const rw = rightPage.width * rightScale;
                        const rh = rightPage.height * rightScale;
                        sheet.drawPage(rightPage, {
                            x: cellW + (cellW - rw) / 2,
                            y: (cellH - rh) / 2,
                            width: rw, height: rh
                        });
                    }
                }
            } else if (layout === 4) {
                // 4-up: Portrait A4. Cell size is A4_W/2 width, A4_H/2 height
                for (let i = 0; i < embeddedPages.length; i += 4) {
                    const sheet = targetPdf.addPage([A4_W, A4_H]); // Portrait A4

                    const cellW = A4_W / 2;
                    const cellH = A4_H / 2;

                    const positions = [
                        { x: 0, y: cellH },      // Top-Left
                        { x: cellW, y: cellH },  // Top-Right
                        { x: 0, y: 0 },          // Bottom-Left
                        { x: cellW, y: 0 }       // Bottom-Right
                    ];

                    for (let j = 0; j < 4; j++) {
                        const pIdx = i + j;
                        if (pIdx >= embeddedPages.length) break;

                        const page = embeddedPages[pIdx];
                        const scale = Math.min(cellW / page.width, cellH / page.height) * 0.9;
                        const w = page.width * scale;
                        const h = page.height * scale;
                        const pos = positions[j];

                        sheet.drawPage(page, {
                            x: pos.x + (cellW - w) / 2,
                            y: pos.y + (cellH - h) / 2,
                            width: w, height: h
                        });
                    }
                }
            }

            const bytes = await targetPdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);
            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_${layout}up.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error(err);
            setState('configure');
            alert(`Error creating ${layout}-up PDF.`);
        }
    }, [files, layout]);

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
                                <h3 className={styles.optionTitle}>Pages per Sheet</h3>
                                <div className="grid grid-cols-2 gap-4 mb-6 max-w-sm mx-auto">
                                    <div
                                        className={`${styles.optionCard} ${layout === 2 ? styles.active : ''} text-center`}
                                        onClick={() => setLayout(2)}
                                        style={{ margin: 0 }}
                                    >
                                        <h4 className="text-xl m-0 font-bold">2-up</h4>
                                        <p className="text-sm text-gray-500 mt-1">Side by side</p>
                                    </div>
                                    <div
                                        className={`${styles.optionCard} ${layout === 4 ? styles.active : ''} text-center`}
                                        onClick={() => setLayout(4)}
                                        style={{ margin: 0 }}
                                    >
                                        <h4 className="text-xl m-0 font-bold">4-up</h4>
                                        <p className="text-sm text-gray-500 mt-1">2x2 grid</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 text-center">Output pages will be standard A4 size.</p>
                            </div>

                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button className="btn btn-primary btn-lg" onClick={handleProcess}>
                                    <Grid2x2 size={18} /> Generate {layout}-up PDF
                                </button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label={`Generating ${layout}-up layout...`} />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
