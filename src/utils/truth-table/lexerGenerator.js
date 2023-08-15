/**
 * * Lexer Generator
 * @typedef {Record<string, string>} LexerRules
 * @typedef { { name: string, data: string, start: number, end: number} } Token
 */

/**
 *
 * @param {LexerRules} rules
 * @returns {(source: string) => Token[]}
 */
export function generateLexer(rules) {
    return function tokenize(source) {
        let ptr = 0;

        /**
         * @type {Token[]}
         */
        const tokens = [];

        while (ptr < source.length) {
            const remaining = source.slice(ptr);

            let matchLen = 0;

            for (const name in rules) {
                const rule = rules[name];
                const regex = new RegExp("^" + rule);
                const match = remaining.match(regex);

                if (match !== null) {
                    matchLen = match[0].length;

                    if (name !== "SKIP") {
                        tokens.push({
                            data: match[0],
                            start: ptr,
                            end: ptr + matchLen,
                            name,
                        });
                    }

                    break;
                }
            }

            if (matchLen === 0) {
                throwLexerError(ptr, source[ptr]);
            }

            ptr += matchLen;
        }

        return tokens;
    };
}

function throwLexerError(pos, character, matcher) {
    throw new Error(
        `Unexpected character '${character}' at position ${pos}` +
            (typeof matcher === "string"
                ? `when matching ${matcher} lexer rule.`
                : "")
    );
}
