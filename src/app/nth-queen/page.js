"use client";
import { solve } from "@/utils/nth-queen/solver";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.scss";

const DEFAULT_PROBLEM_SIZE = 8;
const MAX_PROBLEM_SIZE = 20;
const MIN_PROBLEM_SIZE = 1;

export default function NthQueen() {
    const [size, setSize] = useState(DEFAULT_PROBLEM_SIZE);

    const [{ solutions, elapsed }, setSolutionState] = useState({
        solutions: [],
        elapsed: undefined,
    });

    const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);

    useEffect(() => {
        try {
            var { solveArrays, elapsed } = solve(size, 1e7);
        } catch (err) {
            console.log("Solver Error:", err);
        }
        setSolutionState({ solutions: solveArrays ?? [], elapsed });
        setCurrentSolutionIndex(0);
    }, [size]);

    const handleChangeSize = (ev) => {
        setSize(Number(ev.currentTarget.value));
    };

    const handleDecrementIndex = () =>
        setCurrentSolutionIndex(
            currentSolutionIndex === 0
                ? currentSolutionIndex
                : currentSolutionIndex - 1
        );
    const handleIncrementIndex = () =>
        setCurrentSolutionIndex(
            currentSolutionIndex === solutions.length - 1
                ? currentSolutionIndex
                : currentSolutionIndex + 1
        );

    const currentSolution = solutions[currentSolutionIndex];

    return (
        <main>
            <h1 style={{ textAlign: "center" }}>N-th Queen Problem</h1>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                }}
            >
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <span>n = &nbsp;</span>
                    <input
                        type="number"
                        min={MIN_PROBLEM_SIZE}
                        max={MAX_PROBLEM_SIZE}
                        value={size}
                        onChange={handleChangeSize}
                    />
                    {elapsed !== undefined ? (
                        <span>&nbsp;{elapsed.toFixed(2)}ms</span>
                    ) : null}
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                    {currentSolution === undefined ? (
                        "There is none solutions or solver fails in recursion."
                    ) : (
                        <table className={styles["solution-table"]}>
                            <tbody>
                                {Array(size)
                                    .fill()
                                    .map((_, row) => (
                                        <tr key={`${size}@${row}`}>
                                            {Array(size)
                                                .fill()
                                                .map((_, col) => (
                                                    <td
                                                        key={col}
                                                        data-filled={
                                                            currentSolution[
                                                                row
                                                            ] === col
                                                        }
                                                    ></td>
                                                ))}
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div
                    style={{
                        userSelect: "none",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <span
                        onClick={handleDecrementIndex}
                        style={{ cursor: "pointer" }}
                    >
                        {"<-"}&nbsp;
                    </span>
                    <span>{`${currentSolutionIndex + 1}/${
                        solutions.length
                    }`}</span>
                    <span
                        onClick={handleIncrementIndex}
                        style={{ cursor: "pointer" }}
                    >
                        &nbsp;{"->"}
                    </span>
                </div>
            </div>
        </main>
    );
}
