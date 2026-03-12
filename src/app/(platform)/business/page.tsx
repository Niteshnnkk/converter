import styles from './page.module.css';
export default function Page() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>Business Solutions</h1>
          <p className={styles.desc}>PDF tools for teams and enterprises</p>
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
