'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Scissors } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('split-pdf')!;

type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function SplitPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [splitMode, setSplitMode] = useState<'all' | 'range'>('all');
    const [rangeInput, setRangeInput] = useState('');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) setState('configure');
    }, []);

    const handleSplit = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');

        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);
            const totalPages = pdf.getPageCount();

            if (splitMode === 'all') {
                // Split each page into separate PDF
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();

                for (let i = 0; i < totalPages; i++) {
                    const newPdf = await PDFDocument.create();
                    const [page] = await newPdf.copyPages(pdf, [i]);
                    newPdf.addPage(page);
                    const bytes = await newPdf.save();
                    zip.file(`page_${i + 1}.pdf`, bytes);
                }

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                setResultBlob(zipBlob);
                setResultName('split_pages.zip');
                setResultSize(formatSize(zipBlob.size));
            } else {
                // Split by range (e.g., "1-3, 5, 7-10")
                const ranges = parseRanges(rangeInput, totalPages);
                const newPdf = await PDFDocument.create();
                const pageIndices = ranges.flatMap((r) =>
                    Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i - 1)
                );
                const pages = await newPdf.copyPages(pdf, pageIndices);
                pages.forEach((page) => newPdf.addPage(page));
                const bytes = await newPdf.save();
                const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
                setResultBlob(blob);
                setResultName('split_result.pdf');
                setResultSize(formatSize(blob.size));
            }

            setState('done');
        } catch (err) {
            console.error('Split error:', err);
            setState('configure');
            alert('Error splitting PDF. Please check your page ranges.');
        }
    }, [files, splitMode, rangeInput]);

    const parseRanges = (input: string, maxPages: number) => {
        return input.split(',').map((part) => {
            const trimmed = part.trim();
            if (trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(Number);
                return { start: Math.max(1, start), end: Math.min(maxPages, end) };
            }
            const num = Number(trimmed);
            return { start: Math.max(1, num), end: Math.min(maxPages, num) };
        });
    };

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
        setRangeInput('');
    }, []);

    const formatSize = (bytes: number) => {
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
                        <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={handleFilesChange} />
                    )}

                    {state === 'configure' && (
                        <>
                            <div className={styles.optionGroup}>
                                <h3 className={styles.optionTitle}>Split Mode</h3>
                                <div className={styles.optionRow}>
                                    <div
                                        className={`${styles.optionCard} ${splitMode === 'all' ? styles.active : ''}`}
                                        onClick={() => setSplitMode('all')}
                                    >
                                        <h4>Split All Pages</h4>
                                        <p>Each page becomes a separate PDF</p>
                                    </div>
                                    <div
                                        className={`${styles.optionCard} ${splitMode === 'range' ? styles.active : ''}`}
                                        onClick={() => setSplitMode('range')}
                                    >
                                        <h4>Custom Range</h4>
                                        <p>Extract specific page ranges</p>
                                    </div>
                                </div>

                                {splitMode === 'range' && (
                                    <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                                        <label className={styles.inputLabel}>Page Range (e.g., 1-3, 5, 7-10)</label>
                                        <input
                                            type="text"
                                            className={styles.textInput}
                                            value={rangeInput}
                                            onChange={(e) => setRangeInput(e.target.value)}
                                            placeholder="e.g., 1-3, 5, 7-10"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button className="btn btn-primary btn-lg" onClick={handleSplit}>
                                    <Scissors size={18} /> Split PDF
                                </button>
                            </div>
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress isProcessing={true} label="Splitting your PDF..." />
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
