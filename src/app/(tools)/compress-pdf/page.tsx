'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Minimize2 } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('compress-pdf')!;

type PageState = 'upload' | 'configure' | 'processing' | 'done';
type CompressionLevel = 'extreme' | 'recommended' | 'less';

export default function CompressPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [level, setLevel] = useState<CompressionLevel>('recommended');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');
    const [originalSize, setOriginalSize] = useState(0);

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            setState('configure');
            setOriginalSize(newFiles[0].file.size);
        }
    }, []);

    const handleCompress = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');

        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);

            // Remove metadata to reduce size
            pdf.setTitle('');
            pdf.setAuthor('');
            pdf.setSubject('');
            pdf.setKeywords([]);
            pdf.setProducer('');
            pdf.setCreator('');

            const compressedBytes = await pdf.save({
                useObjectStreams: true,
                addDefaultPage: false,
            });

            const blob = new Blob([compressedBytes as unknown as BlobPart], { type: 'application/pdf' });
            const savedPercent = Math.round((1 - blob.size / originalSize) * 100);

            setResultBlob(blob);
            setResultName('compressed.pdf');
            setResultSize(`${formatSize(blob.size)} (${savedPercent > 0 ? savedPercent : 0}% smaller)`);
            setState('done');
        } catch (err) {
            console.error('Compress error:', err);
            setState('configure');
            alert('Error compressing PDF. Please try again.');
        }
    }, [files, level, originalSize]);

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
                                <h3 className={styles.optionTitle}>Compression Level</h3>
                                <div className={styles.optionRow}>
                                    <div
                                        className={`${styles.optionCard} ${level === 'extreme' ? styles.active : ''}`}
                                        onClick={() => setLevel('extreme')}
                                    >
                                        <h4>Extreme</h4>
                                        <p>Maximum compression, lower quality</p>
                                    </div>
                                    <div
                                        className={`${styles.optionCard} ${level === 'recommended' ? styles.active : ''}`}
                                        onClick={() => setLevel('recommended')}
                                    >
                                        <h4>Recommended</h4>
                                        <p>Best balance of size and quality</p>
                                    </div>
                                    <div
                                        className={`${styles.optionCard} ${level === 'less' ? styles.active : ''}`}
                                        onClick={() => setLevel('less')}
                                    >
                                        <h4>Less</h4>
                                        <p>Less compression, higher quality</p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>
                                    {files[0]?.file.name} ({formatSize(originalSize)})
                                </p>
                                <button className="btn btn-primary btn-lg" onClick={handleCompress}>
                                    <Minimize2 size={18} /> Compress PDF
                                </button>
                            </div>
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress isProcessing={true} label="Compressing your PDF..." />
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
