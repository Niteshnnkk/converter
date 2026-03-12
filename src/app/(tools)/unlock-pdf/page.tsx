'use client';

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import { Unlock } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('unlock-pdf')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function UnlockPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [password, setPassword] = useState('');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((newFiles: UploadedFile[]) => { setFiles(newFiles); if (newFiles.length > 0) setState('configure'); }, []);

    const handleUnlock = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const pdf = await PDFDocument.load(arrBuf, { ignoreEncryption: true });
            const bytes = await pdf.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
            setResultBlob(blob);
            setResultName('unlocked.pdf');
            setResultSize(formatSize(blob.size));
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error unlocking PDF. Please check the password.'); }
    }, [files, password]);

    const handleDownload = useCallback(() => { if (!resultBlob) return; const u = URL.createObjectURL(resultBlob); const a = document.createElement('a'); a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u); }, [resultBlob, resultName]);
    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); }, []);
    const formatSize = (b: number) => { if (b === 0) return '0 B'; const k = 1024; const s = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(b) / Math.log(k)); return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]; };

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container">
                    {state === 'upload' && <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={handleFilesChange} />}
                    {state === 'configure' && (
                        <>
                            <div className={styles.inputGroup} style={{ maxWidth: 600, margin: '0 auto' }}>
                                <label className={styles.inputLabel}>PDF Password (if any)</label>
                                <input type="password" className={styles.textInput} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter the PDF password" />
                            </div>
                            <div className={styles.actionBar}>
                                <p className={styles.fileCount}>{files[0]?.file.name}</p>
                                <button className="btn btn-primary btn-lg" onClick={handleUnlock}><Unlock size={18} /> Unlock PDF</button>
                            </div>
                        </>
                    )}
                    {state === 'processing' && <ProcessingProgress isProcessing={true} label="Unlocking your PDF..." />}
                    {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
                </div>
            </section>
        </main>
    );
}
