'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Cloud,
  MonitorSmartphone,
  Star,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { tools, categoryLabels, type ToolCategory, getToolsByCategory } from '@/lib/config/tools';
import { imageTools, imageCategoryLabels, imageCategories, getImageToolsByCategory, type ImageToolCategory } from '@/lib/config/image-tools';
import styles from './page.module.css';

const featureHighlights = [
  { icon: Shield, title: 'Secure', desc: '256-bit SSL encryption' },
  { icon: Zap, title: 'Fast', desc: 'Process files in seconds' },
  { icon: Cloud, title: 'Cloud Based', desc: 'No software to install' },
  { icon: MonitorSmartphone, title: 'All Devices', desc: 'Works everywhere' },
];

const categories: ToolCategory[] = [
  'organize',
  'edit',
  'optimize',
  'convert-to-pdf',
  'convert-from-pdf',
  'security',
];

const stats = [
  { number: '50M+', label: 'Users worldwide' },
  { number: '500M+', label: 'Files processed' },
  { number: '30+', label: 'PDF tools' },
  { number: '100%', label: 'Free to use' },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function HomePage() {
  return (
    <main>


      {/* Feature Strip */}
      {/* <section className={styles.featureStrip}>
        <div className="container">
          <div className={styles.featureGrid}>
            {featureHighlights.map((f, i) => (
              <motion.div
                key={f.title}
                className={styles.featureItem}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <div className={styles.featureIcon}>
                  <f.icon size={22} />
                </div>
                <div>
                  <h4 className={styles.featureTitle}>{f.title}</h4>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

      {/* All Tools Section */}
      <section className={`section ${styles.toolsSection}`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Free All PDF Tools You&apos;ll Ever Need</h2>
            <p>30+ powerful tools to handle any PDF task — all in one place</p>
          </div>

          {categories.map((cat) => (
            <div key={cat} className={styles.categoryBlock}>
              <h3 className={styles.categoryTitle}>{categoryLabels[cat]}</h3>
              <motion.div
                className={styles.toolGrid}
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-50px' }}
              >
                {getToolsByCategory(cat).map((tool) => (
                  <motion.div key={tool.id} variants={item}>
                    <Link href={tool.route} className={styles.toolCard}>
                      <div
                        className={styles.toolIcon}
                        style={{ backgroundColor: tool.bgColor, color: tool.color }}
                      >
                        <tool.icon size={24} />
                      </div>
                      <h4 className={styles.toolName}>{tool.name}</h4>
                      <p className={styles.toolDesc}>{tool.description}</p>
                      <span className={styles.toolArrow}>
                        <ArrowRight size={16} />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      </section>

      {/* Image Tools Section */}
      <section className={`section ${styles.toolsSection}`} style={{ paddingTop: 0 }}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Free Image Tools</h2>
            <p>Resize, compress, crop, convert, and edit images — all in one place</p>
          </div>

          {imageCategories.map((cat) => (
            <div key={cat} className={styles.categoryBlock}>
              <h3 className={styles.categoryTitle}>{imageCategoryLabels[cat]}</h3>
              <motion.div
                className={styles.toolGrid}
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-50px' }}
              >
                {getImageToolsByCategory(cat).map((tool) => (
                  <motion.div key={tool.id} variants={item}>
                    <Link href={tool.route} className={styles.toolCard}>
                      <div
                        className={styles.toolIcon}
                        style={{ backgroundColor: tool.bgColor, color: tool.color }}
                      >
                        <tool.icon size={24} />
                      </div>
                      <h4 className={styles.toolName}>{tool.name}</h4>
                      <p className={styles.toolDesc}>{tool.description}</p>
                      <span className={styles.toolArrow}>
                        <ArrowRight size={16} />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className={`section section-alt ${styles.statsSection}`}>
        <div className="container">
          <div className={styles.statsGrid}>
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className={styles.statItem}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <span className={styles.statNumber}>{stat.number}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={`section grid-bg`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>How It Works</h2>
            <p>Process your PDF files in three simple steps</p>
          </div>
          <div className={styles.stepsGrid}>
            {[
              { num: '01', title: 'Select Your Tool', desc: 'Choose from 30+ PDF tools for your exact task' },
              { num: '02', title: 'Upload Your Files', desc: 'Drag and drop or browse to upload your PDFs' },
              { num: '03', title: 'Download Result', desc: 'Get your processed file instantly, ready to share' },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                className={styles.stepCard}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                <span className={styles.stepNum}>{step.num}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className="container">
          <motion.div
            className={styles.ctaCard}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className={styles.ctaTitle}>Ready to Get Started?</h2>
            <p className={styles.ctaDesc}>
              Join millions of users who trust us with their PDF tasks every day.
            </p>
            <div className={styles.ctaChecks}>
              <span><CheckCircle2 size={16} /> No registration required</span>
              <span><CheckCircle2 size={16} /> 100% free to use</span>
              <span><CheckCircle2 size={16} /> Secure & private</span>
            </div>
            <Link href="/merge-pdf" className="btn btn-primary btn-lg">
              Start Processing PDFs <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
