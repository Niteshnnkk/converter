'use client';

import { useCallback, useState } from 'react';
import { Upload, X, FileText, Plus } from 'lucide-react';
import styles from './FileUploader.module.css';

export interface UploadedFile {
    file: File;
    id: string;
    preview?: string;
}

interface FileUploaderProps {
    accept?: string;
    multiple?: boolean;
    maxFiles?: number;
    onFilesChange: (files: UploadedFile[]) => void;
    files: UploadedFile[];
}

export default function FileUploader({
    accept = '.pdf',
    multiple = false,
    maxFiles = 20,
    onFilesChange,
    files,
}: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleFiles = useCallback(
        (fileList: FileList) => {
            const newFiles: UploadedFile[] = Array.from(fileList)
                .slice(0, maxFiles - files.length)
                .map((file) => ({
                    file,
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                }));
            onFilesChange([...files, ...newFiles]);
        },
        [files, maxFiles, onFilesChange]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        },
        [handleFiles]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        },
        [handleFiles]
    );

    const removeFile = useCallback(
        (id: string) => {
            onFilesChange(files.filter((f) => f.id !== id));
        },
        [files, onFilesChange]
    );

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (files.length === 0) {
        return (
            <div
                className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <input
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleInputChange}
                    className={styles.fileInput}
                    id="file-upload"
                />
                <label htmlFor="file-upload" className={styles.dropzoneLabel}>
                    <div className={styles.uploadIcon}>
                        <Upload size={28} />
                    </div>
                    <h3 className={styles.dropzoneTitle}>
                        {isDragging ? 'Drop files here' : 'Select PDF files'}
                    </h3>
                    <p className={styles.dropzoneDesc}>or drag and drop files here</p>
                    <button className={`btn btn-primary ${styles.selectBtn}`} type="button">
                        <Plus size={16} /> Select Files
                    </button>
                </label>
            </div>
        );
    }

    return (
        <div className={styles.fileListArea}>
            <div className={styles.fileList}>
                {files.map((f) => (
                    <div key={f.id} className={styles.fileItem}>
                        <div className={styles.fileIcon}>
                            <FileText size={20} />
                        </div>
                        <div className={styles.fileInfo}>
                            <span className={styles.fileName}>{f.file.name}</span>
                            <span className={styles.fileSize}>{formatFileSize(f.file.size)}</span>
                        </div>
                        <button
                            className={styles.removeBtn}
                            onClick={() => removeFile(f.id)}
                            aria-label="Remove file"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
            {multiple && files.length < maxFiles && (
                <label className={styles.addMore}>
                    <input
                        type="file"
                        accept={accept}
                        multiple
                        onChange={handleInputChange}
                        className={styles.fileInput}
                    />
                    <Plus size={16} />
                    Add more files
                </label>
            )}
        </div>
    );
}
