/**
 * * Proposition Parser Grammar
 *
 * BasicConnective ::= and | or | xor
 *
 * ConditionalConnective ::= conditional | biconditional
 *
 * LeftParenthesis ::= lparen
 *
 * RightParenthesis ::= rparen
 *
 * NOTConnective ::= not
 *
 * ParenthesisExpression ::= LeftParenthesis Expression RightParenthesis
 *
 * UnaryExpression ::= NotConnective PrimaryExpression
 *
 * PrimaryExpression ::= identifier
 *                     | ParenthesisExpression
 *                     | UnaryExpression
 *
 * BasicExpressionRest ::= BasicConnnective PrimaryExpression BasicExpressionRest | ε
 *
 * BasicExpression ::= PrimaryExpression BasicExpressionRest
 *
 * ConditionalExpressionRest ::= ConditionalConnective BasicExpression ConditionalExpressionRest | ε
 *
 * ConditionalExpression ::= BasicExpression ConditionalExpressionRest
 *
 * Expression ::= ConditionalExpression
 *
 * Program ::= Expression
 */

import { generateParserTools } from "./parserGenerator";

/**
 * @type {TerminalParserRules}
 */
const terminalRules = {
    Identifier: ["identifier"],
    NOTConnective: ["not"],
    BasicConnective: ["and", "or", "xor"],
    ConditionalConnective: ["conditional", "biconditional"],
    LeftParenthesis: ["lparen"],
    RightParenthesis: ["rparen"],
};

/**
 * @type {NonTerminalParserRules}
 */
const nonTerminalRules = {
    UnaryExpression: [["NOTConnective", "PrimaryExpression"]],
    ParenthesisExpression: [
        ["LeftParenthesis", "Expression", "RightParenthesis"],
    ],
    PrimaryExpression: [
        ["Identifier"],
        ["UnaryExpression"],
        ["ParenthesisExpression"],
    ],
    BasicExpressionRest: [
        ["BasicConnective", "PrimaryExpression", "BasicExpressionRest"],
        "Empty",
    ],
    BasicExpression: [["PrimaryExpression", "BasicExpressionRest"]],
    ConditionalExpressionRest: [
        [
            "ConditionalConnective",
            "BasicExpression",
            "ConditionalExpressionRest",
        ],
        "Empty",
    ],
    ConditionalExpression: [["BasicExpression", "ConditionalExpressionRest"]],
    Expression: [["ConditionalExpression"]],
    Program: [["Expression"]],
};

export const parserUtils = generateParserTools(
    terminalRules,
    nonTerminalRules,
    "Program"
);
/**
 * @type {import('./parserGenerator').OptimizeVisitor}
 */
export function optimizeVisitor(node, parent, childIndex) {
    if (node.data !== undefined) {
        // node.hash = node.name  node.data
        return;
    }

    const newChildren = [];

    for (let i = 0; i < node.children.length; ++i) {
        const child = node.children[i];

        if (child.children?.length === 0) {
            continue;
        }

        if (
            ["BasicExpressionRest", "ConditionalExpressionRest"].includes(
                child.type
            )
        ) {
            newChildren.push(...child.children);
        } else {
            newChildren.push(child);
        }
    }

    if (
        parent !== null &&
        newChildren.length === 1 &&
        newChildren[0].data === undefined
    ) {
        parent.children[childIndex] = newChildren[0];
        return;
    } else {
        node.children = newChildren;
    }

    if (["BasicExpression", "ConditionalExpression"].includes(node.type)) {
        let currentNode = {
            children: newChildren.slice(0, 3),
            type: node.type,
            start: newChildren[0].start,
            end: newChildren[2].end,
        };
        let ptr = 3;

        while (ptr < newChildren.length) {
            currentNode = {
                children: [currentNode, newChildren[ptr], newChildren[ptr + 1]],
                type: node.type,
                start: currentNode.start,
                end: newChildren[ptr + 1].end,
            };
            ptr += 2;
        }

        Object.assign(node, currentNode);
    }
}
