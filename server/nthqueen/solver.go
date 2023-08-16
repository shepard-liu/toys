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

type cellParams struct {
	colBits       uint64
	slashBits     uint64
	bashSlashBits uint64
	row           uint64
}

func Solve(n uint64) (ans uint64, err error) {
	if n > MAX_PROBLEM_SIZE {
		err = fmt.Errorf("problem size exceeds limit(%d)", MAX_PROBLEM_SIZE)
		return
	}

	workingLevel, levelSize := determineWorkingLevel(n)

	taskParamChan := make(chan cellParams, levelSize)
	ansChan := make(chan uint64, levelSize)

	for i := uint64(0); i < MAX_THREADS; i++ {
		go growWorker(taskParamChan, n, ansChan)
	}

	remainingTasks := grow(0, 0, 0, 0, n, &ans, taskParamChan, workingLevel)

	fmt.Printf("Tasks created: %d \n", remainingTasks)

	if remainingTasks == 0 {
		return
	}

	for partial := range ansChan {
		ans += partial
		remainingTasks--
		// fmt.Printf("Ans received from worker: %d. remaining: %d\n", partial, remainingTasks)
		if remainingTasks == 0 {
			close(ansChan)
			close(taskParamChan)
		}
	}

	return
}

func growWorker(taskParamChan chan cellParams, n uint64, ansChan chan<- uint64) {
	for v := range taskParamChan {
		partialAns := uint64(0)
		grow(v.colBits, v.slashBits, v.bashSlashBits, v.row, n, &partialAns, nil, 0)
		ansChan <- partialAns
	}
}

func grow(colBits, slashBits, backslashBits uint64, row uint64, n uint64, pAns *uint64, paramChan chan cellParams, workerLevel uint64) (paramsSent uint64) {
	if row == n {
		// fmt.Printf("reporting solution\n")
		*pAns++
		return
	}

	for col := uint64(0); col < n; col++ {
		curColBit := uint64(1) << col
		curSlashBit := uint64(1) << (row + col)
		curBackSlashBit := uint64(1) << (row - col + n - 1)

		if colBits&curColBit != 0 || slashBits&curSlashBit != 0 || backslashBits&curBackSlashBit != 0 {
			continue
		}

		// fmt.Printf("reaching (%d,%d)\n", row, col)

		if paramChan != nil && workerLevel == row+1 {
			// fmt.Printf("sending tasks at (%d,%d)\n", row, col)
			paramChan <- cellParams{
				colBits:       colBits | curColBit,
				slashBits:     slashBits | curSlashBit,
				bashSlashBits: backslashBits | curBackSlashBit,
				row:           row + 1,
			}
			paramsSent++
		} else {
			paramsSent += grow(colBits|curColBit, slashBits|curSlashBit, backslashBits|curBackSlashBit, row+1, n, pAns, paramChan, workerLevel)
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
