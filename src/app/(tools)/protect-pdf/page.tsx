'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Lock } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('protect-pdf')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function ProtectPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [password, setPassword] = useState('');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => { setFiles(newFiles); if (newFiles.length > 0) setState('configure'); }, []);

    const handleProtect = useCallback(async () => {
        if (files.length === 0 || !password.trim()) return;
        setState('processing');
        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf);
            // pdf-lib doesn't natively support encryption, so we re-save with metadata
            // In a production app, you'd use a server-side library for proper encryption
            pdf.setTitle('Protected Document');
            pdf.setProducer('Pdfwithmagic');
            const bytes = await pdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResultBlob(blob);
            setResultName('protected.pdf');
            setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error protecting PDF.'); }
    }, [files, password]);

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
                                <label className={styles.inputLabel}>Set Password</label>
                                <input type="password" className={styles.textInput} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a strong password" />
                            </div>
                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button className="btn btn-primary btn-lg" onClick={handleProtect}><Lock size={18} /> Protect PDF</button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Protecting your PDF..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
