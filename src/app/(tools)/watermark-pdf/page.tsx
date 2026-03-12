'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Droplets } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('watermark-pdf')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function WatermarkPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => { setFiles(newFiles); if (newFiles.length > 0) setState('configure'); }, []);

    const handleWatermark = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);
            const font = await pdf.embedFont(StandardFonts.HelveticaBold);
            const pages = pdf.getPages();
            pages.forEach((page) => {
                const { width, height } = page.getSize();
                const fontSize = Math.min(width, height) * 0.08;
                page.drawText(watermarkText, {
                    x: width / 2 - (font.widthOfTextAtSize(watermarkText, fontSize) / 2),
                    y: height / 2,
                    size: fontSize,
                    font,
                    color: rgb(0.75, 0.75, 0.75),
                    opacity: 0.3,
                    rotate: degrees(-45),
                });
            });
            const bytes = await pdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResultBlob(blob);
            setResultName('watermarked.pdf');
            setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error adding watermark.'); }
    }, [files, watermarkText]);

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
                                <label className={styles.inputLabel}>Watermark Text</label>
                                <input type="text" className={styles.textInput} value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="Enter watermark text" />
                            </div>
                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button className="btn btn-primary btn-lg" onClick={handleWatermark}><Droplets size={18} /> Add Watermark</button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Adding watermark..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
