'use client';

import { Download, RefreshCw, Share2, CheckCircle2 } from 'lucide-react';
import styles from './DownloadCard.module.css';

interface DownloadCardProps {
    fileName: string;
    fileSize: string;
    onDownload: () => void;
    onStartOver: () => void;
}

export default function DownloadCard({ fileName, fileSize, onDownload, onStartOver }: DownloadCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.successIcon}>
                <CheckCircle2 size={48} />
            </div>
            <h2 className={styles.title}>Files are ready!</h2>
            <p className={styles.subtitle}>Your processed file is ready to download</p>

            <div className={styles.fileInfo}>
                <span className={styles.fileName}>{fileName}</span>
                <span className={styles.fileSize}>{fileSize}</span>
            </div>

            <button className={`btn btn-primary btn-lg ${styles.downloadBtn}`} onClick={onDownload}>
                <Download size={18} />
                Download File
            </button>

            <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={onStartOver}>
                    <RefreshCw size={16} />
                    Start over
                </button>
                <button className={styles.actionBtn}>
                    <Share2 size={16} />
                    Share
                </button>
            </div>
        </div>
    );
}
