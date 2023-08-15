/**
 *
 * @param {Number} n problem size
 * @returns {Array<Array<Number>>} the solutions
 */
export function solve(n, maxSteps = 1e5) {
    const tree = { parent: null };
    const solveArrays = [];
    const stepsCounter = { current: maxSteps };
    const startTime = performance.now();

    grow(tree, 0, n, solveArrays, stepsCounter);

    const endTime = performance.now();
    if (stepsCounter.current === 0) throw new Error("maximum steps reached.");
    return { solveArrays, elapsed: endTime - startTime };
}

function grow(tree, row, n, solveArrays, remainingSteps) {
    if (remainingSteps.current === 0) return;
    remainingSteps.current--;

    if (row === n) {
        const newSolution = Array(n).fill(0);
        let curRow = n;
        let curNode = tree;
        while (curNode.parent !== null) {
            newSolution[--curRow] = curNode.col;
            curNode = curNode.parent;
        }
        solveArrays.push(newSolution);
        return;
    }

    tree.children = Array(n).fill(null);

    for (let i = 0; i < n; ++i) {
        if (validateNewQueen(tree, row, i) === false) continue;
        tree.children[i] = { parent: tree, row, col: i };
        grow(tree.children[i], row + 1, n, solveArrays, remainingSteps);
    }

    if (tree.children.every((c) => c === null)) {
        tree.parent.children[tree.col] = null;
    }
}

function validateNewQueen(tree, row, col) {
    let curNode = tree;
    while (curNode.parent != null) {
        if (
            curNode.row + curNode.col === row + col ||
            curNode.row - curNode.col === row - col ||
            curNode.col === col
        ) {
            return false;
        }
        curNode = curNode.parent;
    }

    return true;
}
