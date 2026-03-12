'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Hash } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('add-page-numbers')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function PageNumbersPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'bottom-left'>('bottom-center');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => { setFiles(newFiles); if (newFiles.length > 0) setState('configure'); }, []);

    const handleAddNumbers = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);
            const font = await pdf.embedFont(StandardFonts.Helvetica);
            const pages = pdf.getPages();
            pages.forEach((page, index) => {
                const { width } = page.getSize();
                const text = `${index + 1}`;
                const fontSize = 12;
                let x = width / 2 - font.widthOfTextAtSize(text, fontSize) / 2;
                if (position === 'bottom-right') x = width - 50;
                if (position === 'bottom-left') x = 30;
                page.drawText(text, { x, y: 30, size: fontSize, font, color: rgb(0.3, 0.3, 0.3) });
            });
            const pdfBytes = await pdf.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
            setResultBlob(blob);
            setResultName('numbered.pdf');
            setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error adding page numbers.'); }
    }, [files, position]);

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
                            <div className={styles.optionGroup}>
                                <h3 className={styles.optionTitle}>Number Position</h3>
                                <div className={styles.optionRow}>
                                    {(['bottom-left', 'bottom-center', 'bottom-right'] as const).map((pos) => (
                                        <div key={pos} className={`${styles.optionCard} ${position === pos ? styles.active : ''}`} onClick={() => setPosition(pos)}>
                                            <h4>{pos.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h4>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button className="btn btn-primary btn-lg" onClick={handleAddNumbers}><Hash size={18} /> Add Page Numbers</button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Adding page numbers..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
