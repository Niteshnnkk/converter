import styles from './page.module.css';
export default function Page() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.desc}>Tips, tutorials, and latest news about PDF tools</p>
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
