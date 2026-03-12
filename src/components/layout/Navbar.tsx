'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Menu,
    X,
    ChevronDown,
    Zap,
} from 'lucide-react';
import { tools, categoryLabels, type ToolCategory, getToolsByCategory } from '@/lib/config/tools';
import styles from './Navbar.module.css';

const navCategories: ToolCategory[] = [
    'organize',
    'edit',
    'optimize',
    'convert-to-pdf',
    'convert-from-pdf',
    'security',
];

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsMobileOpen(false);
        setActiveDropdown(null);
    }, [pathname]);

    return (
        <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href="/" className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <Zap size={20} />
                    </div>
                    <span className={styles.logoText}>
                        iLove<span className={styles.logoPdf}>PDF</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className={styles.desktopNav}>
                    <div
                        className={styles.navItem}
                        onMouseEnter={() => setActiveDropdown('tools')}
                        onMouseLeave={() => setActiveDropdown(null)}
                    >
                        <button className={styles.navBtn}>
                            All PDF Tools <ChevronDown size={14} />
                        </button>

                        {activeDropdown === 'tools' && (
                            <div className={styles.megaMenu}>
                                <div className={styles.megaMenuInner}>
                                    {navCategories.map((cat) => (
                                        <div key={cat} className={styles.megaCol}>
                                            <h4 className={styles.megaColTitle}>{categoryLabels[cat]}</h4>
                                            <ul className={styles.megaList}>
                                                {getToolsByCategory(cat).map((tool) => (
                                                    <li key={tool.id}>
                                                        <Link href={tool.route} className={styles.megaLink}>
                                                            <span
                                                                className={styles.megaIcon}
                                                                style={{ backgroundColor: tool.bgColor, color: tool.color }}
                                                            >
                                                                <tool.icon size={14} />
                                                            </span>
                                                            <span className={styles.megaName}>{tool.name}</span>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Link href="/compress-pdf" className={styles.navLink}>Compress</Link>
                    <Link href="/merge-pdf" className={styles.navLink}>Merge</Link>
                    <Link href="/split-pdf" className={styles.navLink}>Split</Link>
                    <Link href="/pricing" className={styles.navLink}>Pricing</Link>
                </nav>

                {/* Right Side */}
                <div className={styles.rightSide}>
                    <Link href="/login" className={styles.loginBtn}>Log in</Link>
                    <Link href="/signup" className={`btn btn-primary ${styles.signupBtn}`}>Sign up</Link>
                    <button
                        className={styles.mobileToggle}
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            {isMobileOpen && (
                <div className={styles.mobileNav}>
                    <div className={styles.mobileNavInner}>
                        <div className={styles.mobileSection}>
                            <h4 className={styles.mobileSectionTitle}>PDF Tools</h4>
                            {navCategories.map((cat) => (
                                <div key={cat} className={styles.mobileCategory}>
                                    <h5 className={styles.mobileCatTitle}>{categoryLabels[cat]}</h5>
                                    {getToolsByCategory(cat).map((tool) => (
                                        <Link key={tool.id} href={tool.route} className={styles.mobileLink}>
                                            <span
                                                className={styles.megaIcon}
                                                style={{ backgroundColor: tool.bgColor, color: tool.color }}
                                            >
                                                <tool.icon size={14} />
                                            </span>
                                            {tool.name}
                                        </Link>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className={styles.mobileDivider} />
                        <Link href="/pricing" className={styles.mobileLink}>Pricing</Link>
                        <Link href="/login" className={styles.mobileLink}>Log in</Link>
                        <Link href="/signup" className={`btn btn-primary ${styles.mobileSignup}`}>Sign up free</Link>
                    </div>
                </div>
            )}
        </header>
    );
}
