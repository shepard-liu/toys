import Link from "next/link";
import styles from "./page.module.scss";

export const metadata = {
    title: "Truth Table",
    description: "Proposition evaluator toy.",
};

export default function Home() {
    return (
        <main className={styles.page}>
            <Link href="/truth-table">Truth Table</Link>
            <Link href="/nth-queen">N-th Queen</Link>
        </main>
    );
}
