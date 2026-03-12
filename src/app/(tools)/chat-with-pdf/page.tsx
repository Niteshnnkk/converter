'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import { getToolById } from '@/lib/config/tools';
import { MessageCircle, Send, FileText, User, Bot, Sparkles } from 'lucide-react';
import styles from '../merge-pdf/page.module.css';

const tool = getToolById('chat-with-pdf')!;
type PageState = 'upload' | 'extracting' | 'chat';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

export default function ChatWithPdfPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<PageState>('upload');
    const [pdfText, setPdfText] = useState('');
    const [fileName, setFileName] = useState('');
    const [progress, setProgress] = useState(0);

    // Chat States
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (state === 'chat' && messages.length > 0) {
            scrollToBottom();
        }
    }, [messages, state]);

    const handleFilesChange = useCallback(async (newFiles: UploadedFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            setFileName(newFiles[0].file.name);
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

            for (let i = 1; i <= Math.min(numPages, 50); i++) { // Limit to 50 pages for memory
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                fullText += `${pageText}\n\n`;
                setProgress(Math.round((i / Math.min(numPages, 50)) * 100));
            }

            setPdfText(fullText.toLowerCase());

            // Add initial welcome message
            setMessages([
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: `Hello! I've read "${file.name}". You can ask me questions about its contents or ask for a summary. Note: This is an on-device local search assistant.`
                }
            ]);

            setState('chat');
        } catch (err) {
            console.error(err);
            alert("Error reading PDF document.");
            setFiles([]);
            setState('upload');
        }
    };

    const handleSend = () => {
        if (!input.trim()) return;

        // Add user message
        const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate thinking and local searching
        setTimeout(() => {
            const query = newUserMsg.content.toLowerCase();
            let response = '';

            if (query.includes('summary') || query.includes('summarize')) {
                const words = pdfText.split(/\s+/).slice(0, 100).join(' ');
                response = `**Summary Generation (Local Approximation):**\n\nThe document discusses topics related to: "${words}..."\n\n*(Connect to an AI API for full summarization capabilities)*`;
            }
            else {
                // Determine keywords from query (ignore common words)
                const stopwords = ['what', 'is', 'the', 'a', 'in', 'of', 'for', 'to', 'how', 'why', 'can', 'you', 'tell', 'me', 'about'];
                const keywords = query.split(/\s+/).filter(w => !stopwords.includes(w) && w.length > 3);

                if (keywords.length === 0) {
                    response = "I'm ready to help. What specific topic from the PDF would you like me to find?";
                } else {
                    // Extract a snippet containing the keyword
                    const foundKeyword = keywords.find(kw => pdfText.includes(kw));

                    if (foundKeyword) {
                        const index = pdfText.indexOf(foundKeyword);
                        const start = Math.max(0, index - 100);
                        const end = Math.min(pdfText.length, index + 200);
                        const snippet = pdfText.substring(start, end).replace(/\n/g, ' ');

                        response = `I found a relevant section mentioning **${foundKeyword}**:\n\n"...${snippet}..."`;
                    } else {
                        response = `I couldn't find any direct mentions of "${keywords.join(' ')}" in the first 50 pages of the document.`;
                    }
                }
            }

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: response }]);
            setIsTyping(false);
        }, 1000 + Math.random() * 1000); // 1-2s delay
    };

    const handleStartOver = () => {
        setFiles([]);
        setPdfText('');
        setMessages([]);
        setState('upload');
    };

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
            <section className={styles.workspace}>
                <div className="container overflow-hidden max-w-5xl mx-auto">
                    {state === 'upload' && (
                        <div className="max-w-3xl mx-auto mt-8">
                            <FileUploader accept=".pdf" multiple={false} files={files} onFilesChange={handleFilesChange} />

                            <div className="mt-12 bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex items-start gap-4">
                                <div className="p-3 bg-blue-50 rounded-full text-blue-500 shrink-0">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">How Chat with PDF Works</h3>
                                    <ul className="space-y-2 text-gray-600 text-sm">
                                        <li>✨ <strong>Instant Analysis:</strong> We read the text locally from your PDF instantly when you upload.</li>
                                        <li>🔒 <strong>Privacy First:</strong> The document contents do not leave your browser.</li>
                                        <li>💬 <strong>Interactive Search:</strong> Ask questions, find keywords, and request summaries based on the text context.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {state === 'extracting' && (
                        <div className="max-w-xl mx-auto mt-12">
                            <ProcessingProgress isProcessing={true} progress={progress} label={`Reading document... ${progress}%`} />
                        </div>
                    )}

                    {state === 'chat' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6 flex flex-col h-[70vh] min-h-[500px]">
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3 w-3/4">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <div className="truncate w-full">
                                        <h3 className="font-semibold text-gray-800 text-sm truncate">{fileName}</h3>
                                        <p className="text-xs text-gray-500">Document loaded ({pdfText.length} characters)</p>
                                    </div>
                                </div>
                                <button className="text-xs font-medium text-gray-500 hover:text-red-500 transition-colors bg-white px-3 py-1.5 rounded-md border border-gray-200" onClick={handleStartOver}>
                                    Close Chat
                                </button>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-blue-600 text-white shadow-sm'}`}>
                                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                        </div>
                                        <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                                            <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                        </div>
                                    </div>
                                ))}

                                {isTyping && (
                                    <div className="flex gap-4 max-w-[80%]">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                            <Bot size={16} />
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm rounded-tl-none">
                                            <div className="flex gap-1 items-center h-5">
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                                <div className="max-w-4xl mx-auto relative flex items-center">
                                    <input
                                        className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full py-3 pl-6 pr-14 text-sm transition-all"
                                        placeholder="Ask a question about the document..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        disabled={isTyping}
                                    />
                                    <button
                                        className={`absolute right-2 p-2 rounded-full transition-colors ${input.trim() && !isTyping ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'}`}
                                        onClick={handleSend}
                                        disabled={!input.trim() || isTyping}
                                    >
                                        <Send size={18} className="ml-0.5" />
                                    </button>
                                </div>
                                <p className="text-center text-[10px] text-gray-400 mt-2">
                                    Chat responses are currently generated via local browser processing. Not sent to server.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
