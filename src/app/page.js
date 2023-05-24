import Link from "next/link";

export const metadata = {
    title: "Truth Table",
    description: "Proposition evaluator toy.",
};

export default function Home() {
    return (
        <main>
            <Link href="/toys/truth-table">Truth Table</Link>
        </main>
    );
}
