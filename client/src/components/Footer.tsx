import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <a
        href="https://buymeacoffee.com/japb"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        <span className={styles.icon}>☕</span>
        <span className={styles.text}>Buy me a coffee</span>
      </a>
    </footer>
  );
}
