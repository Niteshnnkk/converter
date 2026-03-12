'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('flatten-pdf')!;

type PageState = 'upload' | 'processing' | 'done';

export default function FlattenPdfPage() {
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

            let flattened = false;
            try {
                const form = pdfDoc.getForm();

                // Only flatten if there's actually a form or fields
                if (form.getFields().length > 0) {
                    form.flatten();
                    flattened = true;
                }
            } catch (e) {
                console.warn('Form flattening error or no form found:', e);
            }

            if (!flattened) {
                // If there were no form fields, we just return the document as is (or alert the user)
                alert("This PDF doesn't contain any fillable form fields to flatten, or they are already flattened.");
                setState('upload');
                return;
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);

            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_flattened.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error('Flatten PDF error:', err);
            setState('upload');
            alert('Error flattening PDF. The file might be corrupted or protected.');
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
                                        Flatten PDF
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress
                            isProcessing={true}
                            label="Flattening form fields and annotations..."
                        />
                    )}

                    {state === 'done' && resultBlob && (
                        <div className={styles.resultContainer}>
                            <h3 className="text-xl font-bold mb-4">PDF Flattened Successfully</h3>
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
