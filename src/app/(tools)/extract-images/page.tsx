'use client';

import { useState, useCallback } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('extract-images')!;

type PageState = 'upload' | 'processing' | 'done';

export default function ExtractImagesPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [resultName, setResultName] = useState('');
    const [resultSize, setResultSize] = useState('');

    const handleExtract = useCallback(async () => {
        if (files.length === 0) return;
        setState('processing');

        try {
            const arrBuf = await files[0].file.arrayBuffer();
            const { PDFDocument, PDFName, PDFStream, PDFDict } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.load(arrBuf);

            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            let imageCount = 0;
            const pages = pdfDoc.getPages();

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const node = page.node;
                const resources = node.Resources();

                if (!resources) continue;

                const xObjects = resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
                if (!xObjects) continue;

                const entries = xObjects.entries();
                for (let j = 0; j < entries.length; j++) {
                    const [key, ref] = entries[j];

                    try {
                        const xObject = pdfDoc.context.lookupMaybe(ref, PDFStream);
                        if (!xObject) continue;

                        const subtype = xObject.dict.lookup(PDFName.of('Subtype'));
                        if (subtype === PDFName.of('Image')) {
                            // Basic extraction: if it's DCTDecode, it's a JPEG.
                            // If it's FlateDecode, we can try to get the raw uncompressed bytes but it lacks headers.
                            const filter = xObject.dict.lookup(PDFName.of('Filter'));
                            const filterName = filter instanceof PDFName ? filter.decodeText() :
                                (Array.isArray(filter) ? filter[0].decodeText() : null);

                            if (filterName === 'DCTDecode') {
                                // Getting raw un-decoded contents. Wait, pdf-lib doesn't expose getContents() un-decoded easily on PDFStream
                                // But xObject.contents provides the Uint8Array
                                const rawBytes = (xObject as any).contents;
                                if (rawBytes) {
                                    imageCount++;
                                    zip.file(`image_p${i + 1}_${imageCount}.jpg`, rawBytes);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to extract one image object", e);
                    }
                }
            }

            // Fallback for more robust extraction using pdfjs-dist if pdf-lib misses complex images
            if (imageCount === 0) {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const ops = await page.getOperatorList();

                    for (let j = 0; j < ops.fnArray.length; j++) {
                        const fn = ops.fnArray[j];
                        if (fn === pdfjsLib.OPS.paintImageXObject) {
                            const objId = ops.argsArray[j][0];
                            try {
                                const imgObj = await new Promise<any>((resolve, reject) => {
                                    // pdfjs 5.x uses page.objs.get(id) synchronously or sometimes returns a promise
                                    const result = page.objs.get(objId);
                                    if (result) resolve(result);
                                    else resolve(null);
                                });

                                if (imgObj) {
                                    const canvas = document.createElement('canvas');
                                    if (imgObj.data) {
                                        canvas.width = imgObj.width;
                                        canvas.height = imgObj.height;
                                        const ctx = canvas.getContext('2d')!;
                                        const imgData = new ImageData(new Uint8ClampedArray(imgObj.data), imgObj.width, imgObj.height);
                                        ctx.putImageData(imgData, 0, 0);

                                        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
                                        imageCount++;
                                        zip.file(`image_p${i}_${imageCount}.png`, blob);
                                    } else if (imgObj.bitmap) {
                                        canvas.width = imgObj.bitmap.width;
                                        canvas.height = imgObj.bitmap.height;
                                        const ctx = canvas.getContext('2d')!;
                                        ctx.drawImage(imgObj.bitmap, 0, 0);

                                        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
                                        imageCount++;
                                        zip.file(`image_p${i}_${imageCount}.png`, blob);
                                    }
                                }
                            } catch (e) {
                                console.warn("pdfjs extraction failed for obj", objId, e);
                            }
                        }
                    }
                }
            }

            if (imageCount === 0) {
                alert("No images found in this PDF.");
                setState('upload');
                return;
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            setResultBlob(zipBlob);

            const originalName = files[0].file.name.replace(/\.[^/.]+$/, "");
            setResultName(`${originalName}_images.zip`);
            setResultSize(formatSize(zipBlob.size));
            setState('done');

        } catch (err) {
            console.error('Image extraction error:', err);
            setState('upload');
            alert('Error extracting images from PDF.');
        }
    }, [files]);

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
                        <>
                            <FileUploader
                                accept=".pdf"
                                multiple={false}
                                files={files}
                                onFilesChange={setFiles}
                            />
                            {files.length > 0 && (
                                <div className={styles.actionBar}>
                                    <p className={styles.fileCount}>
                                        {files[0]?.file.name}
                                    </p>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleExtract}
                                    >
                                        Extract Images
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {state === 'processing' && (
                        <ProcessingProgress
                            isProcessing={true}
                            label="Finding and extracting image assets..."
                        />
                    )}

                    {state === 'done' && resultBlob && (
                        <div className={styles.resultContainer}>
                            <h3 className="text-xl font-bold mb-4">Images Extracted Successfully</h3>
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
