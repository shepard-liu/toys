import { generateLexer } from "./lexerGenerator";

const lexerRules = {
    SKIP: "\\s+",
    identifier: "[a-z]",
    not: "!",
    and: "&",
    or: "\\|",
    xor: "\\^",
    conditional: "->",
    biconditional: "<->",
    lparen: "\\(",
    rparen: "\\)",
};

export default generateLexer(lexerRules);
