'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { PanelTop } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('header-footer-pdf')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

type Position =
    | 'top-left' | 'top-center' | 'top-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

export default function HeaderFooterPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [position, setPosition] = useState<Position>('top-center');
    const [textInput, setTextInput] = useState('');

    // Config state
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) setState('configure');
    }, []);

    const handleProcess = useCallback(async () => {
        if (files.length === 0 || !textInput.trim()) return;
        setState('processing');

        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);
            const font = await pdf.embedFont(StandardFonts.Helvetica);
            const pages = pdf.getPages();

            const fontSize = 11;

            pages.forEach((page) => {
                const { width, height } = page.getSize();
                const textWidth = font.widthOfTextAtSize(textInput, fontSize);

                let x = 30; // default left
                let y = 30; // default bottom

                // Calculate X
                if (position.includes('center')) {
                    x = (width / 2) - (textWidth / 2);
                } else if (position.includes('right')) {
                    x = width - textWidth - 30;
                }

                // Calculate Y
                if (position.includes('top')) {
                    y = height - 30 - fontSize;
                }

                page.drawText(textInput, {
                    x,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(0.2, 0.2, 0.2)
                });
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);
            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_header_footer.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error(err);
            setState('configure');
            alert('Error adding header/footer.');
        }
    }, [files, position, textInput]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = u;
        a.download = resultName;
        a.click();
        URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => {
        setFiles([]);
        setState('upload');
        setResultBlob(null);
        setTextInput('');
    }, []);

    const formatSize = (b: number) => {
        const k = 1024;
        const s = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
    };

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container">
                    {state === 'upload' && <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={handleFilesChange} />}
                    {state === 'configure' && (
                        <>
                            <div className={styles.optionGroup}>
                                <h3 className={styles.optionTitle}>Header / Footer Text</h3>
                                <input
                                    type="text"
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    placeholder="Enter text (e.g., Confidential - Do Not Distribute)"
                                    className="w-full px-4 py-3 mb-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />

                                <h3 className={styles.optionTitle}>Position</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as Position[]).map((pos) => (
                                        <div
                                            key={pos}
                                            className={`${styles.optionCard} ${position === pos ? styles.active : ''} text-center w-full`}
                                            onClick={() => setPosition(pos)}
                                            style={{ margin: 0 }}
                                        >
                                            <h4 className="text-sm m-0">
                                                {pos.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </h4>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={handleProcess}
                                    disabled={!textInput.trim()}
                                >
                                    <PanelTop size={18} /> Apply Header/Footer
                                </button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Applying text to pages..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
