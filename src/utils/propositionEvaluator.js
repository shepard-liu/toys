/**
 * @typedef {import('./parserGenerator').AST} AST
 * @typedef {
 *  { type: "Program", expr: DAG }
 *  |{ type: "UnaryExpression"|"BinaryExpression"|'ParenthesisExpression', operator: string, operants?:[DAG,DAG], operant?: DAG, hash: string }
 *  | { type: 'Identifier', data: string, hash: string }
 * } DAG
 */

import sha1 from "js-sha1";
import { cloneDeep } from "lodash";

/**
 *
 * @param {AST} ast
 * @param {Map | undefined} nodeMap
 * @returns {{ dag: DAG, nodeMap: Map }}
 */
export function buildExprDag(ast, nodeMap) {
    const exprAst = cloneDeep(ast);

    nodeMap = nodeMap ?? new Map();

    /**
     * @param {AST} ast
     * @returns {DAG}
     */
    function transform(ast) {
        /**
         * @type {DAG}
         */
        let transformedNode = {};

        switch (ast.type) {
            case "Identifier": {
                const identifierToken = ast.children[0];
                Object.assign(transformedNode, {
                    type: "Identifier",
                    data: identifierToken.data,
                    hash: sha1(identifierToken.data),
                });
                return transformedNode;
            }
            case "UnaryExpression": {
                const operant = transform(ast.children[1]);
                const operator = ast.children[0].children[0].name;
                Object.assign(transformedNode, {
                    type: "UnaryExpression",
                    operator,
                    operant,
                    hash: sha1(sha1(operator) + operant.hash),
                });
                break;
            }
            case "Program": {
                Object.assign(transformedNode, {
                    type: "Program",
                    expr: transform(ast.children[0]),
                });
                nodeMap.set(transformedNode.expr.hash, transformedNode.expr);
                return transformedNode;
            }
            case "ParenthesisExpression": {
                const operant = transform(ast.children[1]);
                Object.assign(transformedNode, {
                    type: "ParenthesisExpression",
                    operant,
                    hash: sha1(sha1("()") + operant.hash),
                });
                break;
            }
            case "ConditionalExpression":
            case "BasicExpression": {
                const operants = [
                    transform(ast.children[0]),
                    transform(ast.children[2]),
                ];
                const operator = ast.children[1].children[0].name;
                Object.assign(transformedNode, {
                    type: "BinaryExpression",
                    operator,
                    operants,
                    hash: sha1(
                        sha1(operator) + operants.map((o) => o.hash).join("")
                    ),
                });
                break;
            }
            default: {
                throw new Error("Unknown parse tree node type.", ast.type);
            }
        }

        const operants = transformedNode.operants ?? [transformedNode.operant];
        const newOperants = [];

        for (const op of operants) {
            const existingNode = nodeMap.get(op.hash);
            if (!existingNode) {
                nodeMap.set(op.hash, op);
            }
            newOperants.push(existingNode || op);
        }

        if (newOperants.length === 1) {
            transformedNode.operant = newOperants[0];
        } else {
            transformedNode.operants = newOperants;
        }

        return transformedNode;
    }

    return { dag: transform(exprAst), nodeMap };
}

/**
 * @param {DAG} dag
 * @param {Map<string, DAG>} nodeMap
 * @returns {{table: {expr: string, rawExpr:string, value: boolean[]}[], identifierCount:number }}
 */
export function evaluateExprDag(dag, nodeMap) {
    const identifierNodes = [];

    for (const [_, node] of nodeMap.entries()) {
        if (node.type === "Identifier") {
            identifierNodes.push(node);
        }
    }

    identifierNodes.sort((a, b) => a.data.charCodeAt(0) - b.data.charCodeAt(0));

    const identifierCount = identifierNodes.length,
        tableColumns = Math.pow(2, identifierCount);
    const valueTable = [];

    for (let i = 0; i < identifierCount; ++i) {
        const switchCount = Math.pow(2, identifierCount - 1 - i);
        let counter = 0,
            currentTruthValue = true;
        const truthValues = Array(tableColumns).fill();

        for (let j = 0; j < tableColumns; ++j) {
            truthValues[j] = currentTruthValue;

            if (++counter === switchCount) {
                currentTruthValue = !currentTruthValue;
                counter = 0;
            }
        }

        identifierNodes[i].value = truthValues;
        const expr = identifierNodes[i].data;
        identifierNodes[i].rawExpr = identifierNodes[i].expr = expr;
        valueTable.push({
            value: truthValues,
            expr,
            rawExpr: expr,
        });
    }

    function evaluate(dag) {
        if (dag.value) return dag;
        switch (dag.type) {
            case "UnaryExpression": {
                const {
                    operatorFunc,
                    latex: operatorLatex,
                    operator,
                } = operatorMeta[dag.operator];
                const operant = evaluate(dag.operant);
                const res = Array(operant.value.length).fill();
                for (let i = 0; i < res.length; ++i) {
                    res[i] = operatorFunc(operant.value[i]);
                }
                dag.value = res;
                dag.expr = operatorLatex + " " + operant.expr;
                dag.rawExpr = operator + operant.rawExpr;
                break;
            }
            case "BinaryExpression": {
                const {
                    operatorFunc,
                    latex: operatorLatex,
                    operator,
                } = operatorMeta[dag.operator];
                const left = evaluate(dag.operants[0]);
                const right = evaluate(dag.operants[1]);
                const res = Array(left.value.length).fill();

                for (let i = 0; i < res.length; ++i) {
                    res[i] = operatorFunc(left.value[i], right.value[i]);
                }
                dag.value = res;
                dag.expr = left.expr + " " + operatorLatex + " " + right.expr;
                dag.rawExpr =
                    left.rawExpr + " " + operator + " " + right.rawExpr;
                break;
            }
            case "ParenthesisExpression": {
                const evaluatedOperant = evaluate(dag.operant);
                dag.value = evaluatedOperant.value;
                dag.expr = "(" + evaluatedOperant.expr + ")";
                dag.rawExpr = "(" + evaluatedOperant.rawExpr + ")";
                return dag;
            }
        }

        valueTable.push({
            value: dag.value,
            expr: dag.expr,
            rawExpr: dag.rawExpr,
        });
        return dag;
    }

    evaluate(dag.expr);

    return {
        table: valueTable,
        identifierCount,
    };
}

const operatorMeta = {
    not: { operatorFunc: operatorNot, latex: "\\neg", operator: "!" },
    and: { operatorFunc: operatorAnd, latex: "\\land", operator: "&" },
    or: { operatorFunc: operatorOr, latex: "\\lor", operator: "|" },
    xor: { operatorFunc: operatorXor, latex: "\\oplus", operator: "^" },
    conditional: {
        operatorFunc: operatorConditional,
        latex: "\\rightarrow",
        operator: "->",
    },
    biconditional: {
        operatorFunc: operatorBiconditional,
        latex: "\\leftrightarrow",
        operator: "<->",
    },
};

function operatorNot(left, right) {
    return !left;
}
function operatorAnd(left, right) {
    return left && right;
}
function operatorOr(left, right) {
    return left || right;
}
function operatorXor(left, right) {
    return (left && !right) || (!left && right);
}
function operatorConditional(left, right) {
    return !left || right;
}
function operatorBiconditional(left, right) {
    return (left && right) || (!left && !right);
}
