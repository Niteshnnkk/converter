'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Merge, GripVertical } from 'lucide-react';
import styles from './page.module.css';

const tool = getToolById('merge-pdf')!;

type PageState = 'upload' | 'processing' | 'done';

export default function MergePdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleMerge = useCallback(async () => {
        if (files.length < 2) return;
        setState('processing');

        try {
            const mergedPdf = await PDFDocument.create();

            for (const f of files) {
                const arrBuf = await f.file.arrayBuffer();
                const pdf = await PDFDocument.load(arrBuf);
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach((page) => mergedPdf.addPage(page));
            }

            const mergedBytes = await mergedPdf.save();
            const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);
            setResultName('merged.pdf');
            setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) {
            console.error('Merge error:', err);
            setState('upload');
            alert('Error merging files. Please try again.');
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
                                multiple={true}
                                files={files}
                                onFilesChange={setFiles}
                            />
                            {files.length >= 2 && (
                                <div className={styles.actionBar}>
                                    <p className={styles.fileCount}>{files.length} files selected</p>
                                    <button className="btn btn-primary btn-lg" onClick={handleMerge}>
                                        <Merge size={18} /> Merge PDF
                                    </button>
                                </div>
                            )}
                            {files.length === 1 && (
                                <p className={styles.hint}>Add at least 2 files to merge</p>
                            )}
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress isProcessing={true} label="Merging your PDF files..." />
                    )}

                    {state === 'done' && resultBlob && (
                        <DownloadCard
                            fileName={resultName}
                            fileSize={resultSize}
                            onDownload={handleDownload}
                            onStartOver={handleStartOver}
                        />
                    )}
                </div>
            </section>
        </main>
    );
}
