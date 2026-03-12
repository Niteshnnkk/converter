'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
export default function Page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <main className={styles.page}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>Forgot Password</h1>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          
          <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%'}}>Forgot Password</button>
          
          
          <p className={styles.link}>Remember your password? <Link href="/login">Log In</Link></p>
        </form>
      </div>
    </main>
  );
}
