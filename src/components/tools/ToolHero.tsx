'use client';

import { type LucideIcon } from 'lucide-react';
import styles from './ToolHero.module.css';

interface ToolHeroProps {
    title: string;
    description: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
}

export default function ToolHero({ title, description, icon: Icon, color, bgColor }: ToolHeroProps) {
    return (
        <section className={`${styles.hero} grid-bg`}>
            <div className={styles.content}>
                <div className={styles.iconWrap} style={{ backgroundColor: bgColor, color: color }}>
                    <Icon size={32} />
                </div>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.desc}>{description}</p>
            </div>
        </section>
    );
}
