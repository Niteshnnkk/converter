import Link from 'next/link';
import { Zap, Github, Twitter, Linkedin, Youtube, Mail } from 'lucide-react';
import { categoryLabels, getToolsByCategory, type ToolCategory } from '@/lib/config/tools';
import { imageTools } from '@/lib/config/image-tools';
import styles from './Footer.module.css';

const footerCategories: ToolCategory[] = ['organize', 'edit', 'optimize', 'convert-to-pdf', 'convert-from-pdf', 'security'];

const companyLinks = [
    { name: 'About Us', href: '/about' },
    { name: 'Features', href: '/features' },
    { name: 'Press', href: '/press' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
];

const productLinks = [
    { name: 'Desktop App', href: '/desktop' },
    { name: 'Mobile App', href: '/mobile' },
    { name: 'Business', href: '/business' },
    { name: 'Education', href: '/education' },
    { name: 'Pricing', href: '/pricing' },
];

const supportLinks = [
    { name: 'Help Center', href: '/help' },
    { name: 'FAQ', href: '/faq' },
    { name: 'API Documentation', href: '/api-docs' },
    { name: 'Integrations', href: '/integrations' },
    { name: 'Security', href: '/security' },
];

const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms & Conditions', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
];

export default function Footer() {
    return (
        <footer className={styles.footer}>
            {/* Main Footer */}
            <div className={styles.mainFooter}>
                <div className={styles.container}>
                    <div className={styles.grid}>
                        {/* Brand Column */}
                        <div className={styles.brandCol}>
                            <Link href="/" className={styles.logo}>
                                <div className={styles.logoIcon}>
                                    <Zap size={18} />
                                </div>
                                <span className={styles.logoText}>
                                    iLove<span className={styles.logoPdf}>PDF</span>
                                </span>
                            </Link>
                            <p className={styles.brandDesc}>
                                Every tool you need to work with PDFs in one place. 100% free and easy to use.
                                Compress, merge, split, convert, and edit PDF files online.
                            </p>
                            <div className={styles.socialLinks}>
                                <a href="#" className={styles.socialLink} aria-label="Twitter"><Twitter size={18} /></a>
                                <a href="#" className={styles.socialLink} aria-label="LinkedIn"><Linkedin size={18} /></a>
                                <a href="#" className={styles.socialLink} aria-label="Youtube"><Youtube size={18} /></a>
                                <a href="#" className={styles.socialLink} aria-label="Github"><Github size={18} /></a>
                                <a href="#" className={styles.socialLink} aria-label="Email"><Mail size={18} /></a>
                            </div>
                        </div>

                        {/* Company Links */}
                        <div className={styles.linkCol}>
                            <h4 className={styles.colTitle}>Company</h4>
                            <ul className={styles.linkList}>
                                {companyLinks.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className={styles.footerLink}>{link.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Product Links */}
                        <div className={styles.linkCol}>
                            <h4 className={styles.colTitle}>Products</h4>
                            <ul className={styles.linkList}>
                                {productLinks.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className={styles.footerLink}>{link.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Support Links */}
                        <div className={styles.linkCol}>
                            <h4 className={styles.colTitle}>Support</h4>
                            <ul className={styles.linkList}>
                                {supportLinks.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className={styles.footerLink}>{link.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Tools Column */}
                        <div className={styles.linkCol}>
                            <h4 className={styles.colTitle}>Popular Tools</h4>
                            <ul className={styles.linkList}>
                                {['merge-pdf', 'compress-pdf', 'split-pdf', 'pdf-to-word', 'word-to-pdf', 'jpg-to-pdf', 'pdf-to-jpg', 'edit-pdf'].map((id) => {
                                    const tool = getToolsByCategory('organize')
                                        .concat(getToolsByCategory('edit'))
                                        .concat(getToolsByCategory('optimize'))
                                        .concat(getToolsByCategory('convert-to-pdf'))
                                        .concat(getToolsByCategory('convert-from-pdf'))
                                        .concat(getToolsByCategory('security'))
                                        .find((t) => t.id === id);
                                    if (!tool) return null;
                                    return (
                                        <li key={tool.id}>
                                            <Link href={tool.route} className={styles.footerLink}>{tool.name}</Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Image Tools Column */}
                        <div className={styles.linkCol}>
                            <h4 className={styles.colTitle}>Image Tools</h4>
                            <ul className={styles.linkList}>
                                {imageTools.slice(0, 8).map((tool) => (
                                    <li key={tool.id}>
                                        <Link href={tool.route} className={styles.footerLink}>{tool.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className={styles.bottomBar}>
                <div className={styles.container}>
                    <div className={styles.bottomInner}>
                        <p className={styles.copyright}>
                            © {new Date().getFullYear()} iLovePDF. All rights reserved.
                        </p>
                        <div className={styles.legalLinks}>
                            {legalLinks.map((link) => (
                                <Link key={link.href} href={link.href} className={styles.legalLink}>
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
