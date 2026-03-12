'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Shuffle } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('alternate-mix')!;
type PageState = 'upload' | 'processing' | 'done';

export default function AlternateMixPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        // Keep only first 2 files since mixing typically is between 2 docs (e.g. odds and evens scanned separately)
        if (newFiles.length > 2) {
            setFiles(newFiles.slice(0, 2));
            alert("This tool specifically alternates pages between 2 documents. Only the first two files will be used.");
        } else {
            setFiles(newFiles);
        }
    }, []);

    const handleProcess = useCallback(async () => {
        if (files.length < 2) {
            alert("Please upload exactly 2 files to mix them.");
            return;
        }
        setState('processing');

        try {
            const bufA = await files[0].file.arrayBuffer();
            const bufB = await files[1].file.arrayBuffer();

            const pdfA = await PDFDocument.load(bufA);
            const pdfB = await PDFDocument.load(bufB);

            const mergedPdf = await PDFDocument.create();

            const pagesA = pdfA.getPageCount();
            const pagesB = pdfB.getPageCount();
            const maxPages = Math.max(pagesA, pagesB);

            // Need to copy pages. 
            // pdf-lib's copyPages works nicely.
            for (let i = 0; i < maxPages; i++) {
                if (i < pagesA) {
                    const [copiedPageA] = await mergedPdf.copyPages(pdfA, [i]);
                    mergedPdf.addPage(copiedPageA);
                }
                if (i < pagesB) {
                    const [copiedPageB] = await mergedPdf.copyPages(pdfB, [i]);
                    mergedPdf.addPage(copiedPageB);
                }
            }

            const bytes = await mergedPdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);
            setResultName(`mixed_document.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error(err);
            setState('upload');
            alert('Error mixing PDFs. Ensure both files are valid PDFs.');
        }
    }, [files]);

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
                    {state === 'upload' && (
                        <>
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 max-w-2xl mx-auto rounded-r-md">
                                <p className="text-sm text-blue-700">
                                    <strong>How it works:</strong> Upload exactly 2 PDF files. The tool will merge them by taking Page 1 from File A, Page 1 from File B, Page 2 from File A, Page 2 from File B, and so on. Ideal for reconstructing double-sided scans.
                                </p>
                            </div>
                            <FileUploader accept=".pdf" multiple={true} files={files} onFilesChange={handleFilesChange} />

                            {files.length === 2 && (
                                <div className={styles.actionBar}>
                                    <p className={styles.fileCount}>2 files ready to mix</p>
                                    <button className="btn btn-primary btn-lg" onClick={handleProcess}>
                                        <Shuffle size={18} /> Alternate & Mix
                                    </button>
                                </div>
                            )}
                            {files.length === 1 && (
                                <div className="text-center mt-4 text-gray-500">
                                    Please upload 1 more file to proceed.
                                </div>
                            )}
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Mixing document pages..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
