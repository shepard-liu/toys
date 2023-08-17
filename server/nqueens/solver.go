package nqueens

import (
	"fmt"
	"runtime"
)

const (
	MAX_PROBLEM_SIZE = 32
)

var (
	MAX_THREADS = runtime.NumCPU() * 2
)

// parameters for new workers
type cellParams struct {
	colBits       int
	slashBits     int
	bashSlashBits int
	row           int
}

// Solve() searches the solution space of n-th queen problem in parallel.
func Solve(n int) (ans int, err error) {

	// MAX_PROBLEM_SIZE is 32 because the diagonals need 2n-1 bits to encode while uint64 has only 64 bits.
	if n > MAX_PROBLEM_SIZE {
		err = fmt.Errorf("problem size exceeds limit(%d)", MAX_PROBLEM_SIZE)
		return
	}

	workingLevel, levelSize := getWorkingLevel(n)

	// levelSize of tasks will be created in total
	// so we need the buffered channel in this size
	taskParamChan := make(chan cellParams, levelSize)
	ansChan := make(chan int, levelSize)

	// create a (real) pool of workers waiting on new tasks
	for i := 0; i < MAX_THREADS; i++ {
		go solverWorker(taskParamChan, n, ansChan)
	}

	// kickstart the search
	remaining := grow(0, 0, 0, 0, n, &ans, taskParamChan, workingLevel)

	if remaining == 0 {
		return
	}

	for partial := range ansChan {
		ans += partial
		remaining--
		if remaining == 0 {
			close(ansChan)
			close(taskParamChan)
		}
	}

	return
}

// solverWorker needs a channel to receive task parameters and a channel to send computed answers(partial)
func solverWorker(taskParamChan chan cellParams, n int, ansChan chan<- int) {
	for v := range taskParamChan {
		partialAns := 0
		// there's no need to sync access to variable partialAns here as only the current worker thread modifies it.
		// return value of grow() is dropped because no new tasks will be created.
		grow(v.colBits, v.slashBits, v.bashSlashBits, v.row, n, &partialAns, nil, 0)
		ansChan <- partialAns
	}
}

// grow() recursively searches in the solution space(a tree) and validate for satisfaction.
//
//		0 1 2 3 4 -> columns
//	0	☐ ☐ ☐ ☐ ☐		      /	<-slash diagonal direction	\	<- backslash diagonal direction
//	1	☐ ☐ ☐ ☐ ☐		    /								  \
//	2	☐ ☐ ☐ ☐ ☐		  /										\
//	3	☐ ☐ ☐ ☐ ☐	    /										  \
//	4	☐ ☐ ☐ ☐ ☐     /											    \
//	↓
//	rows
//
// On reaching the working level row, the function sends the task parameters through the paramChan
// to continue the search instead of going deeper down on the same goroutine.
func grow(
	colBits, slashBits, backslashBits int,
	row int, n int, pAns *int,
	paramChan chan cellParams, workingLevel int,
) (paramsSent int) {
	if row == n {
		*pAns++
		return
	}

	available := (1<<n - 1) &^ (colBits | slashBits | backslashBits)
	for available != 0 {
		pos := available & (-available)

		// create new tasks only on the working level
		if paramChan != nil && workingLevel == row+1 {
			paramChan <- cellParams{
				colBits:       colBits | pos,
				slashBits:     (slashBits | pos) << 1,
				bashSlashBits: (backslashBits | pos) >> 1,
				row:           row + 1,
			}
			paramsSent++
		} else {
			paramsSent += grow(colBits|pos, (slashBits|pos)<<1, (backslashBits|pos)>>1,
				row+1, n, pAns,
				paramChan, workingLevel,
			)
		}

		available &^= pos
	}

	return
}

func getWorkingLevel(n int) (level int, levelSize int) {
	branchesSum := 1
	for i := 0; i < n; i++ {
		branchesSum *= n

		if branchesSum >= MAX_THREADS {
			level, levelSize = i, branchesSum
			return
		}
	}
	return
}
