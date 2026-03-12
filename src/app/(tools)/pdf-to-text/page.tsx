'use client';

import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('pdf-to-text')!;

type PageState = 'upload' | 'processing' | 'done';

export default function PdfToTextPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleConvert = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');

        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                // Ensure proper spacing between text segments
                let lastY;
                let text = '';
                for (const item of content.items as any[]) {
                    if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
                        text += '\n';
                    } else if (lastY !== undefined) {
                        text += ' ';
                    }
                    text += item.str;
                    lastY = item.transform[5];
                }

                fullText += `--- Page ${i} ---\n\n${text}\n\n`;
            }

            const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
            setResultBlob(blob);

            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_extracted.txt`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error('Text extraction error:', err);
            setState('upload');
            alert('Error extracting text. Make sure the PDF is not encrypted or heavily image-based.');
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
        const sizes = ['B', 'KB', 'MB'];
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
                                multiple={false}
                                files={files}
                                onFilesChange={setFiles}
                            />
                            {files.length > 0 && (
                                <div className={styles.actionBar}>
                                    <p className={styles.fileCount}>
                                        {files[0]?.file.name}
                                    </p>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleConvert}
                                    >
                                        Extract Text
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress
                            isProcessing={true}
                            label="Extracting text from document..."
                        />
                    )}

                    {state === 'done' && resultBlob && (
                        <div className={styles.resultContainer}>
                            <DownloadCard
                                fileName={resultName}
                                fileSize={resultSize}
                                onDownload={handleDownload}
                                onStartOver={handleStartOver}
                            />
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
