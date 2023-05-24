"use client";
import styles from "./page.module.scss";

import tokenize from "@/utils/propositionLexer";
import { optimizeVisitor, parserUtils } from "@/utils/propositionParser";
import { buildExprDag, evaluateExprDag } from "@/utils/propositionEvaluator";
import { useCallback, useState } from "react";
import { Latex } from "@/app/latex";

export default function TruthTable() {
    const [errMsg, setErrMsg] = useState(null);
    const [{ truthTableHead, truthTableBody }, setTruthTable] = useState({
        truthTableHead: [],
        truthTableBody: [],
    });

    const handleInput = useCallback((ev) => {
        const expr = ev.currentTarget.value;
        const start = performance.now();

        try {
            var tokens = tokenize(expr);
            console.log("Lexer --", performance.now() - start);
        } catch (err) {
            setErrMsg("Lexer error: " + err);
            return;
        }

        if (tokens.length === 0) return;
        try {
            var ast = parserUtils.parser.parse(tokens);
            console.log("Parser --", performance.now() - start);
            if (ast.end !== tokens[tokens.length - 1].end)
                throw new Error("Parse Error");
        } catch (err) {
            setErrMsg("Syntax error: " + err);
            return;
        }

        try {
            var optmizedAst = parserUtils.optimize(ast, optimizeVisitor);
            console.log("Optimizer --", performance.now() - start);
            var { dag, nodeMap } = buildExprDag(optmizedAst);
            console.log("DAG Builder --", performance.now() - start);
            var valueTable = evaluateExprDag(dag, nodeMap);
            console.log("Evaluation --", performance.now() - start);
        } catch (err) {
            setErrMsg("Runtime error: ", err);
            return;
        }

        setErrMsg(null);

        const truthTableHead = valueTable.map((v) => v.expr);
        const truthTableBody = [],
            rows = valueTable[0].value.length,
            cols = valueTable.length;
        for (let i = 0; i < rows; ++i) {
            const truthTableRow = [];
            for (let j = 0; j < cols; ++j) {
                truthTableRow.push(valueTable[j].value[i]);
            }
            truthTableBody.push(truthTableRow);
        }
        setTruthTable({ truthTableHead, truthTableBody });
    }, []);

    return (
        <main className={styles["main"]}>
            <label id="expr-input">Proposition Expression:</label>
            <div className={styles["input-wrapper"]}>
                <input
                    aria-labelledby="expr-input"
                    className={styles["expr-input"]}
                    placeholder="p & q | r <-> (s -> p) ^ q"
                    data-error={Boolean(errMsg)}
                    onInput={handleInput}
                />
            </div>
            <div className={styles["err-msg"]}>{errMsg}</div>
            <div>Truth Table:</div>
            <div className={styles["table-wrapper"]}>
                <table className={styles["truth-table"]}>
                    <thead>
                        <tr className={styles["truth-table-header-row"]}>
                            {truthTableHead.map((expr) => (
                                <th key={expr}>
                                    <Latex className={styles["math"]}>
                                        {expr}
                                    </Latex>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {truthTableBody.map((row, idx) => (
                            <tr
                                key={idx}
                                className={styles["truth-table-body-row"]}
                            >
                                {row.map((v, idx) => (
                                    <td key={idx}>
                                        {truthTableBody.length >
                                        Math.pow(2, 4) ? (
                                            <span>{v ? "T" : "F"}</span>
                                        ) : (
                                            <Latex>{v ? "T" : "F"}</Latex>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
