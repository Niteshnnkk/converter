'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, PDFName } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('pdf-cleaner')!;

type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function PdfCleanerPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    // Config states
    const [stripMetadata, setStripMetadata] = useState(true);
    const [removeAnnotations, setRemoveAnnotations] = useState(true);
    const [flattenForms, setFlattenForms] = useState(true);

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) setState('configure');
    }, []);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');

        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrBuf);
            let modified = false;

            if (stripMetadata) {
                pdfDoc.setTitle('');
                pdfDoc.setAuthor('');
                pdfDoc.setSubject('');
                pdfDoc.setKeywords([]);
                pdfDoc.setProducer('');
                pdfDoc.setCreator('');
                modified = true;
            }

            if (flattenForms) {
                try {
                    const form = pdfDoc.getForm();
                    form.flatten();
                    modified = true;
                } catch (e) {
                    console.warn("No form to flatten or error flattening", e);
                }
            }

            if (removeAnnotations) {
                const pages = pdfDoc.getPages();
                for (let i = 0; i < pages.length; i++) {
                    const pageNode = pages[i].node;
                    if (pageNode.has(PDFName.of('Annots'))) {
                        pageNode.delete(PDFName.of('Annots'));
                        modified = true;
                    }
                }
            }

            if (!modified) {
                // Just resave
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);

            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_sanitized.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error('PDF Cleaner error:', err);
            setState('configure');
            alert('Error cleaning PDF. The file might be corrupted or protected.');
        }
    }, [files, stripMetadata, removeAnnotations, flattenForms]);

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
                                <h3 className={styles.optionTitle}>Cleaning Options</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={stripMetadata}
                                            onChange={(e) => setStripMetadata(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-gray-700">Strip Metadata (Author, Title, Subject)</span>
                                    </label>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={removeAnnotations}
                                            onChange={(e) => setRemoveAnnotations(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-gray-700">Remove All Annotations & Comments</span>
                                    </label>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={flattenForms}
                                            onChange={(e) => setFlattenForms(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-gray-700">Flatten Form Fields (Make uneditable)</span>
                                    </label>
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
                                    Clean PDF File
                                </button>
                            </div>
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress
                            isProcessing={true}
                            label="Sanitizing document..."
                        />
                    )}

                    {state === 'done' && resultBlob && (
                        <div className={styles.resultContainer}>
                            <h3 className="text-xl font-bold mb-4">PDF Cleaned Successfully</h3>
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
