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
        <h1 className={styles.title}>Log In</h1>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%'}}>Log In</button>
          <p className={styles.link}>Don&apos;t have an account? <Link href="/signup">Sign Up</Link></p>
          <p className={styles.link}><Link href="/forgot-password">Forgot password?</Link></p>
          
          
        </form>
      </div>
    </main>
  );
}
