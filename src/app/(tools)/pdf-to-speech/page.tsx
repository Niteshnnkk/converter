'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import { getToolById } from '@/lib/config/tools';
import { Volume2, Play, Pause, Square, Settings } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('pdf-to-speech')!;
type PageState = 'upload' | 'extracting' | 'player';

export default function PdfToSpeechPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [text, setText] = useState('');
    const [progress, setProgress] = useState(0);

    // Speech States
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>('');
    const [rate, setRate] = useState(1);
    const [pitch, setPitch] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Refs
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        const loadVoices = () => {
            const availVoices = window.speechSynthesis.getVoices();
            if (availVoices.length > 0) {
                setVoices(availVoices);
                setSelectedVoice(availVoices[0]?.voiceURI || '');
            }
        };

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const handleFilesChange = useCallback(async (newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            extractText(newFiles[0].file);
        }
    }, []);

    const extractText = async (file: File) => {
        setState('extracting');
        setProgress(0);

        try {
            const arrBuf = await file.arrayBuffer();
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;
            const numPages = pdf.numPages;

            let fullText = '';

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
                setProgress(Math.round((i / numPages) * 100));
            }

            setText(fullText);
            setState('player');
        } catch (err) {
            console.error(err);
            alert("Error extracting text from PDF.");
            setFiles([]);
            setState('upload');
        }
    };

    const handlePlay = () => {
        if (!('speechSynthesis' in window)) {
            alert("Your browser does not support text to speech.");
            return;
        }

        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
            setIsPlaying(true);
            return;
        }

        // Stop any current reading
        window.speechSynthesis.cancel();

        // Find voice
        const voice = voices.find(v => v.voiceURI === selectedVoice);

        // Chunk the text to prevent TTS from cutting out on very long strings
        // Due to browser limits, it's often better to chunk by sentences/paragraphs.
        // For simplicity in this tool, we will send it as one block, but if needed it should be queued.
        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) utterance.voice = voice;
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };

        utterance.onerror = (e) => {
            if (e.error !== 'canceled') console.error('Speech error', e);
            setIsPlaying(false);
            setIsPaused(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);

        setIsPlaying(true);
        setIsPaused(false);
    };

    const handlePause = () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            setIsPaused(true);
            setIsPlaying(false);
        }
    };

    const handleStop = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
    };

    const handleStartOver = () => {
        handleStop();
        setFiles([]);
        setText('');
        setState('upload');
    };

    return (
        <main>
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container overflow-hidden">
                    {state === 'upload' && (
                        <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={handleFilesChange} />
                    )}

                    {state === 'extracting' && (
                        <ProcessingProgress isProcessing={true} label={`Extracting text... ${progress}%`} />
                    )}

                    {state === 'player' && (
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Settings Sidebar */}
                            <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-6">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Volume2 className="text-amber-500" size={20} /> Audio Settings
                                    </h3>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-gray-700">Voice</label>
                                        <select
                                            className="w-full border p-2 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-amber-500"
                                            value={selectedVoice}
                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                            disabled={isPlaying && !isPaused}
                                        >
                                            {voices.map((v, i) => (
                                                <option key={i} value={v.voiceURI}>{v.name} ({v.lang})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                                            <label>Speed</label>
                                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{rate}x</span>
                                        </div>
                                        <input
                                            type="range" min="0.5" max="2" step="0.1"
                                            value={rate}
                                            onChange={(e) => setRate(parseFloat(e.target.value))}
                                            className="w-full accent-amber-500"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                                            <label>Pitch</label>
                                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{pitch}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="2" step="0.1"
                                            value={pitch}
                                            onChange={(e) => setPitch(parseFloat(e.target.value))}
                                            className="w-full accent-amber-500"
                                        />
                                    </div>
                                </div>

                                <button className="btn btn-outline w-full" onClick={handleStartOver}>
                                    Upload Different PDF
                                </button>
                            </div>

                            {/* Player / Content area */}
                            <div className="flex-grow flex flex-col gap-4">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                    <div className="flex flex-wrap items-center justify-center gap-4">
                                        {!isPlaying ? (
                                            <button
                                                className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105"
                                                onClick={handlePlay}
                                                title="Play"
                                            >
                                                <Play size={32} className="ml-1" />
                                            </button>
                                        ) : (
                                            <button
                                                className="w-16 h-16 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-600 flex items-center justify-center shadow-md border-2 border-amber-300 transition-transform hover:scale-105"
                                                onClick={handlePause}
                                                title="Pause"
                                            >
                                                <Pause size={32} />
                                            </button>
                                        )}

                                        <button
                                            className="w-12 h-12 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-500 flex items-center justify-center border transition-colors"
                                            onClick={handleStop}
                                            disabled={!isPlaying && !isPaused}
                                            title="Stop"
                                        >
                                            <Square size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
                                    <div className="bg-gray-50 p-3 border-b border-gray-100 font-medium text-sm text-gray-500 flex justify-between items-center">
                                        <span>Extracted Text</span>
                                        <span>{text.length} characters</span>
                                    </div>
                                    <textarea
                                        className="w-full h-full p-6 text-gray-700 resize-none outline-none leading-relaxed font-sans"
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        placeholder="No text extracted. PDF might be empty or scanned."
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
