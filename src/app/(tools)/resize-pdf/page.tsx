'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('resize-pdf')!;

type PageState = 'upload' | 'configure' | 'processing' | 'done';

const STANDARD_SIZES = {
    'A4': PageSizes.A4,          // [595.28, 841.89]
    'Letter': PageSizes.Letter,  // [612, 792]
    'Legal': PageSizes.Legal,    // [612, 1008]
    'A3': PageSizes.A3,          // [841.89, 1190.55]
    'A5': PageSizes.A5,          // [419.53, 595.28]
};

export default function ResizePdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const [targetSize, setTargetSize] = useState<keyof typeof STANDARD_SIZES>('A4');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) setState('configure');
    }, []);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');

        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrBuf);
            const newPdf = await PDFDocument.create();

            const pages = pdfDoc.getPages();
            const embeddedPages = await newPdf.embedPages(pages);

            const [targetWidth, targetHeight] = STANDARD_SIZES[targetSize];

            for (let i = 0; i < embeddedPages.length; i++) {
                const embeddedPage = embeddedPages[i];
                const newPage = newPdf.addPage([targetWidth, targetHeight]);

                // Calculate scale to fit while maintaining aspect ratio
                const widthScale = targetWidth / embeddedPage.width;
                const heightScale = targetHeight / embeddedPage.height;
                const scale = Math.min(widthScale, heightScale);

                const scaledWidth = embeddedPage.width * scale;
                const scaledHeight = embeddedPage.height * scale;

                // Center the page
                const x = (targetWidth - scaledWidth) / 2;
                const y = (targetHeight - scaledHeight) / 2;

                newPage.drawPage(embeddedPage, {
                    x,
                    y,
                    width: scaledWidth,
                    height: scaledHeight
                });
            }

            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);

            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_resized.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error('Resize error:', err);
            setState('configure');
            alert('Error resizing PDF pages. The file might be corrupted or protected.');
        }
    }, [files, targetSize]);

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
                        <FileUploader
                            accept=".pdf"
                            multiple={false}
                            files={files}
                            onFilesChange={handleFilesChange}
                        />
                    )}

                    {state === 'configure' && (
                        <>
                            <div className={styles.optionGroup}>
                                <h3 className={styles.optionTitle}>Target Page Size</h3>
                                <div className={styles.optionRow}>
                                    {Object.keys(STANDARD_SIZES).map((sizeKey) => (
                                        <div
                                            key={sizeKey}
                                            className={`${styles.optionCard} ${targetSize === sizeKey ? styles.active : ''}`}
                                            onClick={() => setTargetSize(sizeKey as keyof typeof STANDARD_SIZES)}
                                            style={{ minWidth: '100px', cursor: 'pointer' }}
                                        >
                                            <h4 className="text-center">{sizeKey}</h4>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-500 mt-4 text-center">
                                    Pages will be scaled down or up to fit the target size while maintaining their aspect ratio. Padding may be added to center the content.
                                </p>
                            </div>

                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>
                                    {files[0]?.file.name}
                                </p>
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={handleProcess}
                                >
                                    Resize Pages
                                </button>
                            </div>
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress
                            isProcessing={true}
                            label={`Scaling pages to ${targetSize} size...`}
                        />
                    )}

                    {state === 'done' && resultBlob && (
                        <div className={styles.resultContainer}>
                            <h3 className="text-xl font-bold mb-4">PDF Resized Successfully</h3>
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
