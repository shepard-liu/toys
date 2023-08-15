/**
 * @typedef { { name: string, data: string, start: number, end: number} } Token
 * @typedef { { type: string, start: number | undefined, end: number | undefined, children: (AST | Token)[] } } AST
 * @typedef { (matcher: Matcher) => {err:ParserError, ast: AST} } ParserFunction
 * @typedef { Record<string, ParserFunction> } ParserFunctionMap
 * @typedef { Record<string, Array< Array<string> | "Empty" > } NonTerminalParserRules
 * @typedef { Record<string, Array< string > } TerminalParserRules
 * @typedef { { parse: (tokens: Token[]) => AST, setDebugMode: (enabled: boolean) => void } } GrammarParser
 * @typedef {(node: AST | Token, parent: AST, childIndex: number) => void} OptimizeVisitor
 */

import { cloneDeep } from "lodash";

let debugMode = false;

/**
 *
 * @param {TerminalParserRules} terminalRules
 * @param {NonTerminalParserRules} nonTerminalRules
 * @param {string} startRule
 * @returns {{
 * parserMap: ParserFunctionMap,
 * parser: GrammarParser,
 * optimize: (ast: AST, visit: OptimizeVisitor) => AST
 * }}
 */
export function generateParserTools(
    terminalRules,
    nonTerminalRules,
    startRule
) {
    /**
     * @type {ParserFunctionMap}
     */
    const parserMap = {};

    for (const [name, body] of Object.entries(terminalRules)) {
        parserMap[name] = getTerminalParser(name, body);
    }

    for (const [name, body] of Object.entries(nonTerminalRules)) {
        parserMap[name] = getNonTerminalParser(name, body, parserMap);
    }

    return {
        parserMap,
        parser: {
            parse(tokens) {
                const matcher = new Matcher(tokens);
                const { ast, err } = parserMap[startRule](matcher);
                if (err) throw new Error("Parser Error.");
                return ast;
            },
            setDebugMode(enabled) {
                debugMode = enabled;
            },
        },
        optimize(ast, visit) {
            const clonedAst = cloneDeep(ast);

            /**
             * @param {AST} ast
             * @param {AST} parent
             * @param {number} childIndex
             */
            function walk(ast, parent, childIndex) {
                if (ast.children) {
                    for (let i = 0; i < ast.children.length; ++i) {
                        walk(ast.children[i], ast, i);
                    }
                }
                visit(ast, parent, childIndex);
            }

            walk(clonedAst, null, null);

            return clonedAst;
        },
    };
}

/**
 *
 * @param {string} type
 * @param {string[]} symbolNames
 * @returns {ParserFunction}
 */
function getTerminalParser(type, symbolNames) {
    return function (matcher) {
        if (debugMode) printGrammarRule(type, symbolNames);

        for (const symbol of symbolNames) {
            const { err, token } = matcher.match(symbol);
            if (err === null) {
                if (debugMode)
                    console.log(
                        `Terminal Rule <${type}> Matched ${symbol}("${token.data}")`
                    );
                return { err: null, ast: buildAstFromChild(type, [token]) };
            }
        }

        if (debugMode) console.log(`Terminal Rule <${type}> Failed to Match`);
        return { ast: null, err: "No matching terminal" };
    };
}

/**
 *
 * @param {string} type Grammar rule name
 * @param {NonTerminalParserRules[string]} body Grammar rule body
 * @param {ParserFunctionMap} parserMap
 * @returns {ParserFunction}
 */
function getNonTerminalParser(type, body, parserMap) {
    let hasEpsilon = false;

    for (const rule of body) {
        if (rule === "Empty") {
            hasEpsilon = true;
        } else if (
            Array.isArray(rule) &&
            rule.every((v) => typeof v === "string")
        ) {
        } else {
            console.error(`Error generating parser for <${type}>`);
            throw new Error("Invalid parser rule.");
        }
    }

    return function (matcher) {
        if (debugMode) printGrammarRule(type, body);

        /**
         * @type {AST[]}
         */
        let childAsts = [];

        for (const ruleTerm of body) {
            if (ruleTerm === "Empty") continue;

            matcher.pushState();

            for (const rule of ruleTerm) {
                const parseRule = parserMap[rule];
                const { ast, err } = parseRule(matcher);
                if (err) {
                    childAsts = [];
                    break;
                }
                childAsts.push(ast);
            }

            matcher.popState(childAsts.length === 0);

            if (childAsts.length > 0) break;
        }

        if (childAsts.length > 0) {
            return { err: null, ast: buildAstFromChild(type, childAsts) };
        } else if (hasEpsilon) {
            return {
                err: null,
                ast: buildAstFromChild(type, [
                    {
                        children: [],
                        start: undefined,
                        end: undefined,
                        type: "Empty",
                    },
                ]),
            };
        } else {
            return { err: `Failed to parse rule <${type}>`, ast: null };
        }
    };
}

/**
 *
 * @param {string} type
 * @param {(AST | Token)[]} children
 * @returns {AST}
 */
function buildAstFromChild(type, children) {
    let start = undefined,
        end = undefined;

    for (let i = 0; i < children.length; ++i) {
        if (children[i].start !== undefined) {
            start = children[i].start;
            break;
        }
    }
    for (let i = children.length - 1; i >= 0; --i) {
        if (children[i].end !== undefined) {
            end = children[i].end;
            break;
        }
    }

    return {
        type,
        children,
        start,
        end,
    };
}

class Matcher {
    /**
     * @type {Token[]}
     */
    #tokens = [];
    #index = 0;
    #states = [];

    /**
     * @param {Token[]} tokens
     */
    constructor(tokens) {
        this.#tokens = tokens;
    }

    match(symbol) {
        if (typeof symbol !== "string")
            throw new Error(
                "name of the symbol to match must be a valid string"
            );
        if (this.#index >= this.#tokens.length)
            return { token: null, err: "End of symbol sequence" };

        const lookahead = this.#tokens[this.#index];

        if (lookahead.name === symbol) {
            ++this.#index;
            return { token: lookahead, err: null };
        } else return { token: null, err: "Symbol not match" };
    }

    pushState() {
        this.#states.push(this.#index);
    }

    popState(restore) {
        const state = this.#states.pop();
        if (restore) this.#index = state;
    }

    get lookahead() {
        return this.#tokens[this.#index];
    }
}

/**
 *
 * @param {string} name
 * @param {(string[] | "Empty" | string)[]} body
 */
function printGrammarRule(name, body) {
    let string = `<${name}> ::= `;
    const prefixLen = string.length - 2;

    for (const [index, ruleTerm] of body.entries()) {
        if (ruleTerm === "Empty") string += "ε";
        else if (Array.isArray(ruleTerm))
            string += ruleTerm.map((v) => `<${v}>`).join(" ");
        else string += ruleTerm;

        if (index !== body.length - 1)
            string += "\n" + Array(prefixLen).fill(" ").join("") + "| ";
    }

    console.log(string);
}
