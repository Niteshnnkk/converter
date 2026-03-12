'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { RotateCw } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('rotate-pdf')!;

type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function RotatePdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [rotation, setRotation] = useState(90);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) setState('configure');
    }, []);

    const handleRotate = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);
            const pages = pdf.getPages();
            pages.forEach((page) => {
                const currentRotation = page.getRotation().angle;
                page.setRotation(degrees(currentRotation + rotation));
            });
            const bytes = await pdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResultBlob(blob);
            setResultName('rotated.pdf');
            setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) {
            console.error('Rotate error:', err);
            setState('configure');
            alert('Error rotating PDF.');
        }
    }, [files, rotation]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const url = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resultName;
        a.click();
        URL.revokeObjectURL(url);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); }, []);
    const formatSize = (bytes: number) => { const k = 1024; const s = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]; };

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container">
                    {state === 'upload' && <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={handleFilesChange} />}
                    {state === 'configure' && (
                        <>
                            <div className={styles.optionGroup}>
                                <h3 className={styles.optionTitle}>Rotation Angle</h3>
                                <div className={styles.optionRow}>
                                    {[90, 180, 270].map((deg) => (
                                        <div key={deg} className={`${styles.optionCard} ${rotation === deg ? styles.active : ''}`} onClick={() => setRotation(deg)}>
                                            <h4>{deg}°</h4>
                                            <p>{deg === 90 ? 'Clockwise' : deg === 180 ? 'Flip' : 'Counter-clockwise'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button className="btn btn-primary btn-lg" onClick={handleRotate}><RotateCw size={18} /> Rotate PDF</button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Rotating your PDF..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
