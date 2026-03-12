'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Image } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('jpg-to-pdf')!;
type PageState = 'upload' | 'processing' | 'done';

export default function JpgToPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleConvert = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const pdf = await PDFDocument.create();
            for (const f of files) {
                const arrBuf = await f.file.arrayBuffer();
                const isJpg = f.file.type === 'image/jpeg' || f.file.name.toLowerCase().endsWith('.jpg') || f.file.name.toLowerCase().endsWith('.jpeg');
                const isPng = f.file.type === 'image/png' || f.file.name.toLowerCase().endsWith('.png');
                let image;
                if (isPng) image = await pdf.embedPng(arrBuf);
                else image = await pdf.embedJpg(arrBuf);
                const page = pdf.addPage([image.width, image.height]);
                page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            }
            const bytes = await pdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResultBlob(blob);
            setResultName('images.pdf');
            setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('upload'); alert('Error converting images to PDF.'); }
    }, [files]);

    const handleDownload = useCallback(() => { if (!resultBlob) return; const u = URL.createObjectURL(resultBlob); const a = document.createElement('a'); a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u); }, [resultBlob, resultName]);
    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); }, []);
    const formatSize = (b: number) => { if (b === 0) return '0 B'; const k = 1024; const s = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(b) / Math.log(k)); return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]; };

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container">
                    {state === 'upload' && (
                        <>
                            <FileUploader accept=".jpg,.jpeg,.png" multiple={true} files={files} onFilesChange={setFiles} />
                            {files.length > 0 && (
                                <div className={styles.actionBar}>
                                    <p className={styles.fileCount}>{files.length} image(s) selected</p>
                                    <button className="btn btn-primary btn-lg" onClick={handleConvert}><Image size={18} /> Convert to PDF</button>
                                </div>
                            )}
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Converting images to PDF..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
