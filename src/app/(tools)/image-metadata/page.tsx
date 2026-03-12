'use client';
import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import ImageUploader, { type UploadedFile } from '@/components/tools/ImageUploader';
import DownloadCard from '@/components/tools/DownloadCard';
import { getImageToolById } from '@/lib/config/image-tools';
import { loadImage, readExifData, stripMetadata, canvasToBlob, formatSize } from '@/lib/utils/image-processing';
import styles from '../merge-pdf/page.module.css';

const tool = getImageToolById('image-metadata')!;
type PageState = 'upload' | 'view' | 'done';

export default function ImageMetadataPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [metadata, setMetadata] = useState<Record<string, string>>({});
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleFilesChange = useCallback(async (f: UploadedFile[]) => {
        setFiles(f);
        if (f.length > 0) {
            const md = await readExifData(f[0].file);
            setMetadata(md);
            setState('view');
        }
    }, []);

    const handleStripMetadata = useCallback(async () => {
        if (files.length === 0) return;
        const img = await loadImage(files[0].file);
        const canvas = stripMetadata(img);
        const blob = await canvasToBlob(canvas, 'image/png');
        setResultBlob(blob);
        setResultName('clean_' + files[0].file.name.replace(/\.[^.]+$/, '.png'));
        setResultSize(formatSize(blob.size));
        setState('done');
    }, [files]);

    const handleDownload = useCallback(() => {
        if (!resultBlob) return;
        const u = URL.createObjectURL(resultBlob); const a = document.createElement('a');
        a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u);
    }, [resultBlob, resultName]);

    const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); setMetadata({}); }, []);

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}><div className="container">
                {state === 'upload' && <ImageUploader multiple={false} files={files} onFilesChange={handleFilesChange} />}
                {state === 'view' && (
                    <div className={styles.optionGroup}>
                        <h3 className={styles.optionTitle}>Image Metadata</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <tbody>
                                {Object.entries(metadata).map(([key, val]) => (
                                    <tr key={key} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap' }}>{key}</td>
                                        <td style={{ padding: '0.5rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{val}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <h3 className={styles.optionTitle} style={{ marginTop: '1.5rem' }}>Change DPI / PPI Resolution</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                            Re-encode the image with the selected PPI. The pixel dimensions remain the same, but the print resolution metadata changes.
                        </p>
                        <div className={styles.optionRow} style={{ flexWrap: 'wrap' }}>
                            {[72, 150, 300, 600].map(d => (
                                <div key={d} className={styles.optionCard} onClick={async () => {
                                    if (files.length === 0) return;
                                    const img = await loadImage(files[0].file);
                                    const canvas = stripMetadata(img);
                                    const blob = await canvasToBlob(canvas, 'image/png', 1);
                                    setResultBlob(blob);
                                    setResultName(`${d}dpi_` + files[0].file.name.replace(/\.[^.]+$/, '.png'));
                                    setResultSize(`${formatSize(blob.size)} — ${d} DPI`);
                                    setState('done');
                                }} style={{ cursor: 'pointer' }}>
                                    <h4>{d} DPI</h4>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        {d === 72 ? 'Screen / Web' : d === 150 ? 'Medium Print' : d === 300 ? 'High Quality' : 'Professional'}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary btn-lg" onClick={handleStripMetadata}>Remove All Metadata & Download</button>
                            <button className="btn" onClick={handleStartOver}>Start Over</button>
                        </div>
                    </div>
                )}
                {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
            </div></section>
        </main>
    );
}
