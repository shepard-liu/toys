"use client";
import styles from "./page.module.scss";

import tokenize from "@/utils/propositionLexer";
import parserUtils from "@/utils/propositionParser";
import { buildExprDag, evaluateExprDag } from "@/utils/propositionEvaluator";
import { useCallback, useEffect, useRef, useState } from "react";
import { Latex } from "@/app/latex";

export default function TruthTable() {
    const [errMsg, setErrMsg] = useState(null);
    const [exprValueData, setExprValueData] = useState(null);
    const [{ truthTableHead, truthTableBody }, setTruthTable] = useState({
        truthTableHead: [],
        truthTableBody: [],
    });
    const [prefs, setPrefs] = useState({
        showSteps: true,
        optimizeRender: true,
    });
    const formattedExpr = useRef("");
    const exprInputRef = useRef(null);

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
            var optmizedAst = parserUtils.optimize(ast);
            console.log("Optimizer --", performance.now() - start);
            var { dag, nodeMap } = buildExprDag(optmizedAst);
            console.log("DAG Builder --", performance.now() - start);
            var exprValueData = evaluateExprDag(dag, nodeMap);
            console.log("Evaluation --", performance.now() - start);
            console.log(exprValueData);
        } catch (err) {
            setErrMsg("Runtime error: ", err);
            return;
        }
        formattedExpr.current =
            exprValueData.table[exprValueData.table.length - 1].rawExpr;
        setErrMsg(null);
        setExprValueData(exprValueData);
    }, []);

    function buildTableForRender(valueTable) {
        const truthTableHead = valueTable.map((v) => ({
            expr: v.expr,
            rawExpr: v.rawExpr,
        }));
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

        return {
            truthTableHead,
            truthTableBody,
        };
    }

    useEffect(() => {
        if (!exprValueData) return;

        let rawTable = [];

        if (!prefs.showSteps) {
            rawTable = exprValueData.table.slice(
                0,
                exprValueData.identifierCount
            );
            rawTable.push(exprValueData.table[exprValueData.table.length - 1]);
        } else {
            rawTable = exprValueData.table;
        }

        setTruthTable(buildTableForRender(rawTable));
    }, [prefs, exprValueData]);

    const latexT = <Latex>T</Latex>;
    const latexF = <Latex>F</Latex>;

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
                    ref={exprInputRef}
                />
            </div>
            <div className={styles["err-msg"]}>{errMsg}</div>

            <div className={`${styles["controls"]} `}>
                <div className={`${styles["control-format"]} `}>
                    <button
                        onClick={() => {
                            exprInputRef.current.value = formattedExpr.current;
                        }}
                    >
                        Format Expression
                    </button>
                </div>
            </div>
            <div>Truth Table:</div>

            <div className={`${styles["prefs"]} `}>
                <div className={`${styles["prefs-show-steps"]} `}>
                    <span>Show steps</span>
                    <input
                        type="checkbox"
                        checked={prefs.showSteps}
                        data-checked={prefs.showSteps}
                        onChange={() =>
                            setPrefs({ ...prefs, showSteps: !prefs.showSteps })
                        }
                    />
                </div>{" "}
                <div className={`${styles["prefs-optimize-render"]} `}>
                    <span>Optimize render</span>
                    <input
                        type="checkbox"
                        checked={prefs.optimizeRender}
                        data-checked={prefs.optimizeRender}
                        onChange={() =>
                            setPrefs({
                                ...prefs,
                                optimizeRender: !prefs.optimizeRender,
                            })
                        }
                    />
                </div>
            </div>
            <div className={styles["table-wrapper"]}>
                <table className={styles["truth-table"]}>
                    <thead>
                        <tr className={styles["truth-table-header-row"]}>
                            {truthTableHead.map(({ expr, rawExpr }) => (
                                <th key={rawExpr}>
                                    {truthTableHead.length > 10 &&
                                    prefs.optimizeRender ? (
                                        <span>{rawExpr}</span>
                                    ) : (
                                        <Latex className={styles["math"]}>
                                            {expr}
                                        </Latex>
                                    )}
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
                                            Math.pow(2, 4) &&
                                        prefs.optimizeRender ? (
                                            <span>{v ? "T" : "F"}</span>
                                        ) : v ? (
                                            latexT
                                        ) : (
                                            latexF
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
