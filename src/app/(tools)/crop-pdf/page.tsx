'use client';
import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';
const tool = getToolById('crop-pdf')!;
type PageState = 'upload' | 'processing' | 'done';
export default function CropPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');
    const handleProcess = useCallback(async () => {
        if (files.length === 0) return; setState('processing');
        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);
            const pages = pdf.getPages();
            pages.forEach((page) => { const { width, height } = page.getSize(); const margin = 20; page.setCropBox(margin, margin, width - margin * 2, height - margin * 2); });
            const bytes = await pdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResultBlob(blob); setResultName('cropped.pdf');
            setResultSize(`${(blob.size / 1024).toFixed(1)} KB`); setState('done');
        } catch (err) { console.error(err); setState('upload'); alert('Error cropping PDF.'); }
    }, [files]);
    const handleDownload = useCallback(() => { if (!resultBlob) return; const u = URL.createObjectURL(resultBlob); const a = document.createElement('a'); a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u); }, [resultBlob, resultName]);
    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); }, []);
    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && (<><FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={setFiles} />
                    {files.length > 0 && (<div className={styles.actionBar}><p className={styles.fileCount}>{files[0]?.file.name}</p>
                        <button className="btn btn-primary btn-lg" onClick={handleProcess}>Crop PDF</button></div>)}</>)}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Cropping your PDF..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
