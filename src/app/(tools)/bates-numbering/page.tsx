'use client';

import { useState, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Stamp } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('bates-numbering')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export default function BatesNumberingPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [position, setPosition] = useState<Position>('bottom-right');
    const [prefix, setPrefix] = useState('BATES-');
    const [startIndex, setStartIndex] = useState(1);
    const [padding, setPadding] = useState(6);

    // Config state
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) setState('configure');
    }, []);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');

        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);
            const font = await pdf.embedFont(StandardFonts.CourierBold); // Bates is usually monospaced
            const pages = pdf.getPages();

            const fontSize = 12;

            let currentIndex = startIndex;

            pages.forEach((page) => {
                const { width, height } = page.getSize();

                const numberStr = currentIndex.toString().padStart(padding, '0');
                const batesStr = `${prefix}${numberStr}`;
                const textWidth = font.widthOfTextAtSize(batesStr, fontSize);

                let x = 30; // default left
                let y = 30; // default bottom

                if (position.includes('right')) x = width - textWidth - 30;
                if (position.includes('top')) y = height - 30 - fontSize;

                page.drawText(batesStr, {
                    x, y, size: fontSize, font, color: rgb(0, 0, 0) // Solid black for Bates
                });

                currentIndex++;
            });

            const bytes = await pdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });

            setResultBlob(blob);
            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_bates.pdf`);
            setResultSize(formatSize(blob.size));
            setState('done');

        } catch (err) {
            console.error(err);
            setState('configure');
            alert('Error applying Bates numbering.');
        }
    }, [files, position, prefix, startIndex, padding]);

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
                                <h3 className={styles.optionTitle}>Bates Formatting</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Prefix</label>
                                        <input
                                            type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Start Number</label>
                                        <input
                                            type="number" min="1" value={startIndex} onChange={(e) => setStartIndex(parseInt(e.target.value) || 1)}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Zero Padding (Digits)</label>
                                        <input
                                            type="number" min="1" max="10" value={padding} onChange={(e) => setPadding(parseInt(e.target.value) || 6)}
                                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded text-center">
                                    <span className="text-sm text-gray-500">Preview: </span>
                                    <strong className="font-mono text-lg">{`${prefix}${startIndex.toString().padStart(padding, '0')}`}</strong>
                                </div>

                                <h3 className={styles.optionTitle}>Position</h3>
                                <div className="grid grid-cols-2 gap-4 mb-6 max-w-xl">
                                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as Position[]).map((pos) => (
                                        <div
                                            key={pos}
                                            className={`${styles.optionCard} ${position === pos ? styles.active : ''} text-center`}
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
                                <button className="btn btn-primary btn-lg" onClick={handleProcess}>
                                    <Stamp size={18} /> Apply Bates Stamp
                                </button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Applying Bates stamps..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
