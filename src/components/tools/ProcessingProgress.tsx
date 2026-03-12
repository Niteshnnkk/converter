'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './ProcessingProgress.module.css';

interface ProcessingProgressProps {
    isProcessing: boolean;
    label?: string;
    progress?: number;
}

export default function ProcessingProgress({ isProcessing, label = 'Processing your files...', progress: externalProgress }: ProcessingProgressProps) {
    const [progress, setProgress] = useState(externalProgress || 0);

    useEffect(() => {
        if (!isProcessing) {
            setProgress(0);
            return;
        }
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 15;
            });
        }, 300);
        return () => clearInterval(interval);
    }, [isProcessing]);

    if (!isProcessing) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                <div className={styles.spinner}>
                    <Loader2 size={32} />
                </div>
                <h3 className={styles.label}>{label}</h3>
                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${Math.min(progress, 95)}%` }} />
                </div>
                <span className={styles.percentage}>{Math.round(Math.min(progress, 95))}%</span>
            </div>
        </div>
    );
}
