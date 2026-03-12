'use client';
import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, resizeImageFit, canvasToBlob, formatSize, socialMediaPresets } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('social-media-resize')!;
type PageState = 'upload' | 'configure' | 'processing' | 'done';

export default function SocialMediaResizePage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [selectedPreset, setSelectedPreset] = useState(socialMediaPresets[0]);
    const [selectedCategory, setSelectedCategory] = useState('YouTube');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback((f: UploadedFile[]) => { setFiles(f); if (f.length > 0) setState('configure'); }, []);
    const categories = [...new Set(socialMediaPresets.map(p => p.category))];
    const filtered = socialMediaPresets.filter(p => p.category === selectedCategory);

    const handleProcess = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');
        try {
            const img = await loadImage(files[0].file);
            const canvas = resizeImageFit(img, selectedPreset.width, selectedPreset.height, '#ffffff');
            const blob = await canvasToBlob(canvas, 'image/png');
            setResultBlob(blob);
            setResultName(`${selectedPreset.name.replace(/\s+/g, '_')}_${selectedPreset.width}x${selectedPreset.height}.png`);
            setResultSize(`${formatSize(blob.size)} — ${selectedPreset.width} × ${selectedPreset.height} px`);
            setState('done');
        } catch (err) { console.error(err); setState('configure'); alert('Error.'); }
    }, [files, selectedPreset]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'configure' && (
                    <>
                        <div className={styles.optionGroup}>
                            <h3 className={styles.optionTitle}>Select Platform</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                {categories.map((cat) => (
                                    <button key={cat}
                                        className={`btn ${selectedCategory === cat ? 'btn-primary' : ''}`}
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                        onClick={() => { setSelectedCategory(cat); setSelectedPreset(socialMediaPresets.find(p => p.category === cat)!); }}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <h3 className={styles.optionTitle}>Select Size</h3>
                            <div className={styles.optionRow} style={{ flexWrap: 'wrap' }}>
                                {filtered.map((p) => (
                                    <div key={p.name} className={`${styles.optionCard} ${selectedPreset.name === p.name ? styles.active : ''}`}
                                        onClick={() => setSelectedPreset(p)} style={{ minWidth: 150 }}>
                                        <h4 style={{ fontSize: '0.8rem' }}>{p.name}</h4>
                                        <p>{p.width} × {p.height}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.actionBar}>
                            <p className={styles.fileCount}>{selectedPreset.name} — {selectedPreset.width}×{selectedPreset.height}</p>
                            <button className="btn btn-primary btn-lg" onClick={handleProcess}>Resize</button>
                        </div>
                    </>
                )}
                {state === 'processing' && <ProcessingProgress isProcessing={true} label="Resizing for social media..." />}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
