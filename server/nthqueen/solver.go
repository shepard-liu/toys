package nthqueen

import (
	"fmt"
	"math"
	"runtime"
)

const (
	MAX_PROBLEM_SIZE = 32
)

var (
	MAX_THREADS = uint64(runtime.NumCPU() * 2)
)

// parameters for new workers
type cellParams struct {
	colBits       uint64
	slashBits     uint64
	bashSlashBits uint64
	row           uint64
}

// Solve() searches the solution space of n-th queen problem in parallel.
func Solve(n uint64) (ans uint64, err error) {

	// MAX_PROBLEM_SIZE is 32 because the diagonals need 2n-1 bits to encode while uint64 has only 64 bits.
	if n > MAX_PROBLEM_SIZE {
		err = fmt.Errorf("problem size exceeds limit(%d)", MAX_PROBLEM_SIZE)
		return
	}

	workingLevel, levelSize := determineWorkingLevel(n)

	// levelSize tasks will be created in total
	// so we need the buffered channel of this size
	taskParamChan := make(chan cellParams, levelSize)
	ansChan := make(chan uint64, levelSize)

	// create a (real) pool of workers waiting on new tasks
	for i := uint64(0); i < MAX_THREADS; i++ {
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
func solverWorker(taskParamChan chan cellParams, n uint64, ansChan chan<- uint64) {
	for v := range taskParamChan {
		partialAns := uint64(0)
		// there's no need to sync access to variable partialAns here as only the current worker thread modifies it.
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
	colBits, slashBits, backslashBits uint64,
	row uint64, n uint64, pAns *uint64,
	paramChan chan cellParams, workingLevel uint64,
) (paramsSent uint64) {
	if row == n {
		*pAns++
		return
	}

	for col := uint64(0); col < n; col++ {
		curColBit := uint64(1) << col
		curSlashBit := uint64(1) << (row + col)
		curBackSlashBit := uint64(1) << (row - col + n - 1)

		// if true, the current search path is dropped and will try subsequent position on the same row
		if colBits&curColBit != 0 || slashBits&curSlashBit != 0 || backslashBits&curBackSlashBit != 0 {
			continue
		}

		// create new tasks only on the working level
		if paramChan != nil && workingLevel == row+1 {
			paramChan <- cellParams{
				colBits:       colBits | curColBit,
				slashBits:     slashBits | curSlashBit,
				bashSlashBits: backslashBits | curBackSlashBit,
				row:           row + 1,
			}
			paramsSent++
		} else {
			paramsSent += grow(colBits|curColBit, slashBits|curSlashBit, backslashBits|curBackSlashBit, row+1, n, pAns, paramChan, workingLevel)
		}
	}

	return
}

func determineWorkingLevel(n uint64) (level uint64, levelSize uint64) {
	for i := uint64(0); i < n; i++ {
		levelSize := uint64(math.Pow(float64(n), float64(i)))

		if levelSize >= MAX_THREADS {
			return i, levelSize
		}
	}
	return
}
