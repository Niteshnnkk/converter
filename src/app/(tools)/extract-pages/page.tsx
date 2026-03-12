'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { FileOutput } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('extract-pages')!;

type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function ExtractPagesPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [pagesToExtract, setPagesToExtract] = useState('');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) setState('configure');
    }, []);

    const handleExtract = useCallback(async () => {
        if (files.length === 0 || !pagesToExtract.trim()) return;
        setState('processing');
        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);
            const totalPages = pdf.getPageCount();
            const indices = pagesToExtract.split(',').map(s => parseInt(s.trim()) - 1).filter(n => n >= 0 && n < totalPages);
            const newPdf = await PDFDocument.create();
            const pages = await newPdf.copyPages(pdf, indices);
            pages.forEach(page => newPdf.addPage(page));
            const bytes = await newPdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResultBlob(blob);
            setResultName('extracted.pdf');
            setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) {
            console.error(err);
            setState('configure');
            alert('Error extracting pages.');
        }
    }, [files, pagesToExtract]);

    const handleDownload = useCallback(() => { if (!resultBlob) return; const u = URL.createObjectURL(resultBlob); const a = document.createElement('a'); a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u); }, [resultBlob, resultName]);
    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); }, []);
    const formatSize = (b: number) => { const k = 1024; const s = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(b) / Math.log(k)); return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]; };

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container">
                    {state === 'upload' && <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={handleFilesChange} />}
                    {state === 'configure' && (
                        <>
                            <div className={styles.inputGroup} style={{ maxWidth: 600, margin: '0 auto' }}>
                                <label className={styles.inputLabel}>Pages to extract (e.g., 1, 3, 5)</label>
                                <input type="text" className={styles.textInput} value={pagesToExtract} onChange={(e) => setPagesToExtract(e.target.value)} placeholder="e.g., 1, 3, 5" />
                            </div>
                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button className="btn btn-primary btn-lg" onClick={handleExtract}><FileOutput size={18} /> Extract Pages</button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Extracting pages..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
