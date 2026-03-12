// Script to generate remaining tool and info page files
const fs = require('fs');
const path = require('path');

const toolsDir = path.join(__dirname, 'src', 'app', '(tools)');
const infoDir = path.join(__dirname, 'src', 'app', '(info)');
const platformDir = path.join(__dirname, 'src', 'app', '(platform)');
const authDir = path.join(__dirname, 'src', 'app', '(auth)');

// Tool pages that need creation (with their tool IDs)
const toolPages = [
    { dir: 'edit-pdf', id: 'edit-pdf', action: 'Edit PDF' },
    { dir: 'sign-pdf', id: 'sign-pdf', action: 'Sign PDF' },
    { dir: 'redact-pdf', id: 'redact-pdf', action: 'Redact PDF' },
    { dir: 'compare-pdf', id: 'compare-pdf', action: 'Compare PDF' },
    { dir: 'translate-pdf', id: 'translate-pdf', action: 'Translate PDF' },
    { dir: 'repair-pdf', id: 'repair-pdf', action: 'Repair PDF' },
    { dir: 'ocr-pdf', id: 'ocr-pdf', action: 'OCR PDF' },
    { dir: 'scan-to-pdf', id: 'scan-to-pdf', action: 'Scan to PDF' },
    { dir: 'word-to-pdf', id: 'word-to-pdf', action: 'Convert to PDF' },
    { dir: 'powerpoint-to-pdf', id: 'powerpoint-to-pdf', action: 'Convert to PDF' },
    { dir: 'excel-to-pdf', id: 'excel-to-pdf', action: 'Convert to PDF' },
    { dir: 'html-to-pdf', id: 'html-to-pdf', action: 'Convert to PDF' },
    { dir: 'pdf-to-word', id: 'pdf-to-word', action: 'Convert to Word' },
    { dir: 'pdf-to-powerpoint', id: 'pdf-to-powerpoint', action: 'Convert to PPT' },
    { dir: 'pdf-to-excel', id: 'pdf-to-excel', action: 'Convert to Excel' },
    { dir: 'pdf-to-pdfa', id: 'pdf-to-pdfa', action: 'Convert to PDF/A' },
];

const toolTemplate = (id, action, acceptExt = '.pdf') => `'use client';
import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolHero from '@/components/tools/ToolHero';
import FileUploader, { type UploadedFile } from '@/components/tools/FileUploader';
import ProcessingProgress from '@/components/tools/ProcessingProgress';
import DownloadCard from '@/components/tools/DownloadCard';
import { getToolById } from '@/lib/config/tools';
import styles from '../merge-pdf/page.module.css';
const tool = getToolById('${id}')!;
type PageState = 'upload' | 'processing' | 'done';
export default function ToolPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [state, setState] = useState<PageState>('upload');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState('');
  const [resultSize, setResultSize] = useState('');
  const handleProcess = useCallback(async () => {
    if (files.length === 0) return; setState('processing');
    try {
      const arrBuf = await files[0].file.arrayBuffer();
      const pdf = await PDFDocument.load(arrBuf);
      const bytes = await pdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      setResultBlob(blob); setResultName('result.pdf');
      setResultSize(((blob.size / 1024).toFixed(1)) + ' KB'); setState('done');
    } catch (err) { console.error(err); setState('upload'); alert('Error processing file.'); }
  }, [files]);
  const handleDownload = useCallback(() => { if (!resultBlob) return; const u = URL.createObjectURL(resultBlob); const a = document.createElement('a'); a.href = u; a.download = resultName; a.click(); URL.revokeObjectURL(u); }, [resultBlob, resultName]);
  const handleStartOver = useCallback(() => { setFiles([]); setState('upload'); setResultBlob(null); }, []);
  return (
    <main>
      <ToolHero title={tool.name} description={tool.description} icon={tool.icon} color={tool.color} bgColor={tool.bgColor} />
      <section className={styles.workspace}><div className="container">
        {state === 'upload' && (<><FileUploader accept="${acceptExt}" multiple={false} files={files} onFilesChange={setFiles} />
          {files.length > 0 && (<div className={styles.actionBar}><p className={styles.fileCount}>{files[0]?.file.name}</p>
            <button className="btn btn-primary btn-lg" onClick={handleProcess}>${action}</button></div>)}</>)}
        {state === 'processing' && <ProcessingProgress isProcessing={true} label="Processing..." />}
        {state === 'done' && resultBlob && <DownloadCard fileName={resultName} fileSize={resultSize} onDownload={handleDownload} onStartOver={handleStartOver} />}
      </div></section>
    </main>
  );
}
`;

// Info pages
const infoPages = [
    { dir: 'pricing', title: 'Pricing', desc: 'Choose the perfect plan for your PDF needs' },
    { dir: 'features', title: 'Features', desc: 'Explore all the powerful features of iLovePDF' },
    { dir: 'about', title: 'About Us', desc: 'Learn about our mission to make PDF tools accessible to everyone' },
    { dir: 'contact', title: 'Contact Us', desc: 'Get in touch with our team' },
    { dir: 'blog', title: 'Blog', desc: 'Tips, tutorials, and latest news about PDF tools' },
    { dir: 'press', title: 'Press', desc: 'Media resources and press releases' },
    { dir: 'faq', title: 'FAQ', desc: 'Frequently asked questions about our services' },
    { dir: 'help', title: 'Help Center', desc: 'Find answers and documentation for all our tools' },
    { dir: 'security', title: 'Security', desc: 'How we protect your files and data' },
    { dir: 'privacy', title: 'Privacy Policy', desc: 'Our commitment to your privacy' },
    { dir: 'terms', title: 'Terms & Conditions', desc: 'Terms of service for using iLovePDF' },
    { dir: 'cookies', title: 'Cookie Policy', desc: 'How we use cookies on our website' },
];

const platformPages = [
    { dir: 'desktop', title: 'Desktop App', desc: 'Download iLovePDF for Windows and Mac' },
    { dir: 'mobile', title: 'Mobile App', desc: 'Get iLovePDF on iOS and Android' },
    { dir: 'business', title: 'Business Solutions', desc: 'PDF tools for teams and enterprises' },
    { dir: 'education', title: 'Education', desc: 'Special plans for students and teachers' },
    { dir: 'workflows', title: 'Workflows', desc: 'Automate your PDF tasks' },
    { dir: 'api-docs', title: 'API Documentation', desc: 'Integrate PDF tools into your applications' },
    { dir: 'api-pricing', title: 'API Pricing', desc: 'Pricing plans for our developer API' },
    { dir: 'integrations', title: 'Integrations', desc: 'Connect iLovePDF with your favorite tools' },
];

const infoTemplate = (title, desc) => `import styles from './page.module.css';
export default function Page() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>${title}</h1>
          <p className={styles.desc}>${desc}</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className="container">
          <div className={styles.card}>
            <p>This page is under construction. Check back soon for updates.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
`;

const infoCss = `.page { min-height: 60vh; }
.hero { padding: 5rem 0 2.5rem; text-align: center; background: var(--bg-alt); border-bottom: 1px solid var(--border-light); }
.title { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.75rem; }
.desc { font-size: 1.125rem; color: var(--text-muted); max-width: 560px; margin: 0 auto; }
.content { padding: 3rem 0 5rem; }
.card { max-width: 800px; margin: 0 auto; padding: 2rem; background: var(--bg-main); border: 1px solid var(--border); border-radius: 1rem; text-align: center; color: var(--text-muted); }
`;

// Auth pages
const authPages = [
    { dir: 'login', title: 'Log In' },
    { dir: 'signup', title: 'Sign Up' },
    { dir: 'forgot-password', title: 'Forgot Password' },
];

const authTemplate = (title) => `'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
export default function Page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <main className={styles.page}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>${title}</h1>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          ${title !== 'Forgot Password' ? `<div className={styles.field}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>` : ''}
          <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%'}}>${title}</button>
          ${title === 'Log In' ? `<p className={styles.link}>Don&apos;t have an account? <Link href="/signup">Sign Up</Link></p>
          <p className={styles.link}><Link href="/forgot-password">Forgot password?</Link></p>` : ''}
          ${title === 'Sign Up' ? `<p className={styles.link}>Already have an account? <Link href="/login">Log In</Link></p>` : ''}
          ${title === 'Forgot Password' ? `<p className={styles.link}>Remember your password? <Link href="/login">Log In</Link></p>` : ''}
        </form>
      </div>
    </main>
  );
}
`;

const authCss = `.page { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
.formCard { width: 100%; max-width: 420px; padding: 2.5rem; background: var(--bg-main); border: 1px solid var(--border); border-radius: 1.25rem; box-shadow: var(--shadow-card); }
.title { font-size: 1.5rem; font-weight: 800; text-align: center; margin-bottom: 1.5rem; }
.form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.field label { font-size: 0.875rem; font-weight: 600; color: var(--text-heading); }
.field input { padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 0.5rem; font-size: 0.875rem; transition: border-color 0.15s; }
.field input:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(0,119,194,0.1); }
.link { text-align: center; font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem; }
.link a { color: var(--primary); font-weight: 600; }
`;

// Generate all files
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Tool pages
toolPages.forEach(({ dir, id, action }) => {
    const fullDir = path.join(toolsDir, dir);
    if (!fs.existsSync(path.join(fullDir, 'page.tsx'))) {
        ensureDir(fullDir);
        const ext = ['word-to-pdf'].includes(id) ? '.doc,.docx' :
            ['excel-to-pdf'].includes(id) ? '.xls,.xlsx' :
                ['powerpoint-to-pdf'].includes(id) ? '.ppt,.pptx' :
                    ['html-to-pdf'].includes(id) ? '.html,.htm' :
                        '.pdf';
        fs.writeFileSync(path.join(fullDir, 'page.tsx'), toolTemplate(id, action, ext));
        console.log(`Created: ${dir}/page.tsx`);
    }
});

// Info pages
infoPages.forEach(({ dir, title, desc }) => {
    const fullDir = path.join(infoDir, dir);
    ensureDir(fullDir);
    fs.writeFileSync(path.join(fullDir, 'page.tsx'), infoTemplate(title, desc));
    fs.writeFileSync(path.join(fullDir, 'page.module.css'), infoCss);
    console.log(`Created: (info)/${dir}`);
});

// Platform pages
platformPages.forEach(({ dir, title, desc }) => {
    const fullDir = path.join(platformDir, dir);
    ensureDir(fullDir);
    fs.writeFileSync(path.join(fullDir, 'page.tsx'), infoTemplate(title, desc));
    fs.writeFileSync(path.join(fullDir, 'page.module.css'), infoCss);
    console.log(`Created: (platform)/${dir}`);
});

// Auth pages
authPages.forEach(({ dir, title }) => {
    const fullDir = path.join(authDir, dir);
    ensureDir(fullDir);
    fs.writeFileSync(path.join(fullDir, 'page.tsx'), authTemplate(title));
    fs.writeFileSync(path.join(fullDir, 'page.module.css'), authCss);
    console.log(`Created: (auth)/${dir}`);
});

console.log('\\nDone! All pages generated.');
