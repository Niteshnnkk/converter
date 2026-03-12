'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('edit-metadata')!;

type PageState = 'upload' | 'configure' | 'processing' | 'done';

interface MetadataParams {
    title: string;
    author: string;
    subject: string;
    keywords: string;
    producer: string;
    creator: string;
}

export default function EditMetadataPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');
    const [pdfBuf, setPdfBuf] = useState<ArrayBuffer | null>(null);

    const [meta, setMeta] = useState<MetadataParams>({
        title: '', author: '', subject: '', keywords: '', producer: '', creator: ''
    });

    const handleFilesChange = useCallback(async (newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            try {
                const arrBuf = await newFiles[0].file.arrayBuffer();
                setPdfBuf(arrBuf);
                const pdfDoc = await PDFDocument.load(arrBuf);

                setMeta({
                    title: pdfDoc.getTitle() || '',
                    author: pdfDoc.getAuthor() || '',
                    subject: pdfDoc.getSubject() || '',
                    keywords: pdfDoc.getKeywords() ? (Array.isArray(pdfDoc.getKeywords()) ? (pdfDoc.getKeywords() as any).join(', ') : pdfDoc.getKeywords() as any) : '',
                    producer: pdfDoc.getProducer() || '',
                    creator: pdfDoc.getCreator() || ''
                });

                setState('configure');
            } catch (err) {
                console.error("Failed to load PDF metadata", err);
                alert("Could not read PDF metadata. It may be encrypted.");
                setFiles([]);
            }
        }
    }, []);

    const handleProcess = useCallback(async () => {
        if (!pdfBuf || files.length === 0) return;
        setState('processing');

        try {
            const pdfDoc = await PDFDocument.load(pdfBuf);

            pdfDoc.setTitle(meta.title);
            pdfDoc.setAuthor(meta.author);
            pdfDoc.setSubject(meta.subject);

            if (meta.keywords.trim()) {
                const kwArray = meta.keywords.split(',').map(k => k.trim()).filter(k => k);
                pdfDoc.setKeywords(kwArray);
            } else {
                pdfDoc.setKeywords([]);
            }

            pdfDoc.setProducer(meta.producer);
            pdfDoc.setCreator(meta.creator);

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);

            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_metadata.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error('Edit metadata error:', err);
            setState('configure');
            alert('Error updating PDF metadata.');
        }
    }, [files, pdfBuf, meta]);

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
        setPdfBuf(null);
        setState('upload');
        setResultBlob(null);
    }, []);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMeta(prev => ({ ...prev, [name]: value }));
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
                        <FileUploader
                            accept=".pdf"
                            multiple={false}
                            files={files}
                            onFilesChange={handleFilesChange}
                        />
                    )}

                    {state === 'configure' && (
                        <>
                            <div className={styles.optionGroup}>
                                <h3 className={styles.optionTitle}>Document Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Title</label>
                                        <input
                                            type="text" name="title" value={meta.title} onChange={handleInputChange}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="Document Title"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Author</label>
                                        <input
                                            type="text" name="author" value={meta.author} onChange={handleInputChange}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="Author Name"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Subject</label>
                                        <input
                                            type="text" name="subject" value={meta.subject} onChange={handleInputChange}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="Subject"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Keywords (comma separated)</label>
                                        <input
                                            type="text" name="keywords" value={meta.keywords} onChange={handleInputChange}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="keyword1, keyword2"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Creator</label>
                                        <input
                                            type="text" name="creator" value={meta.creator} onChange={handleInputChange}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="Application that created the original document"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Producer</label>
                                        <input
                                            type="text" name="producer" value={meta.producer} onChange={handleInputChange}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="PDF conversion utility"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>
                                    {files[0]?.file.name}
                                </p>
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={handleProcess}
                                >
                                    Update Metadata
                                </button>
                            </div>
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress
                            isProcessing={true}
                            label="Updating document metadata..."
                        />
                    )}

                    {state === 'done' && resultBlob && (
                        <div className={styles.resultContainer}>
                            <h3 className="text-xl font-bold mb-4">Metadata Updated Successfully</h3>
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
