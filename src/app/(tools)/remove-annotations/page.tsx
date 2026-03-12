'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, PDFName } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('remove-annotations')!;

type PageState = 'upload' | 'processing' | 'done';

export default function RemoveAnnotationsPage() {
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
            const pdfDoc = await PDFDocument.load(arrBuf);

            const pages = pdfDoc.getPages();
            let annotationsRemoved = false;

            for (let i = 0; i < pages.length; i++) {
                const pageNode = pages[i].node;
                if (pageNode.has(PDFName.of('Annots'))) {
                    pageNode.delete(PDFName.of('Annots'));
                    annotationsRemoved = true;
                }
            }

            if (!annotationsRemoved) {
                alert("No annotations found in this PDF.");
                setState('upload');
                return;
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);

            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_clean.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error('Remove annotations error:', err);
            setState('upload');
            alert('Error removing annotations from PDF. The file might be corrupted or protected.');
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
                                        Remove Annotations
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress
                            isProcessing={true}
                            label="Stripping annotations from document..."
                        />
                    )}

                    {state === 'done' && resultBlob && (
                        <div className={styles.resultContainer}>
                            <h3 className="text-xl font-bold mb-4">Annotations Removed Successfully</h3>
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
