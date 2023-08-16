package nthqueen

import (
	"fmt"

	"golang.org/x/sync/semaphore"
)

const (
	MAX_PROBLEM_SIZE = 32
	MAX_THREADS      = 64
)

type SolverSignal int

const (
	WORKER_START SolverSignal = iota
	WORKER_FINISH
	SOLUTION_FOUND
)

func Solve(n uint64) (ans uint64, err error) {
	if n > MAX_PROBLEM_SIZE {
		err = fmt.Errorf("problem size exceeds limit(%d)", MAX_PROBLEM_SIZE)
		return
	}

	ctx := SolverContext{
		signalChan: make(chan SolverSignal, MAX_THREADS),
		pool:       semaphore.NewWeighted(MAX_THREADS),
	}

	ctx.pool.Acquire(ctx, 1)
	ctx.signalChan <- WORKER_START
	go func() {
		grow(0, 0, 0, 0, n, ctx)
		ctx.signalChan <- WORKER_FINISH
		ctx.pool.Release(1)
	}()

	worker_num := 0

	for s := range ctx.signalChan {
		switch s {
		case WORKER_START:
			worker_num++
		case WORKER_FINISH:
			worker_num--
		case SOLUTION_FOUND:
			ans++
		}
		if worker_num == 0 {
			close(ctx.signalChan)
		}
	}

	return
}

func grow(colBits, slashBits, backslashBits uint64, row uint64, n uint64, ctx SolverContext) {
	if row == n {
		ctx.signalChan <- SOLUTION_FOUND
		return
	}

	for col := uint64(0); col < n; col++ {
		curColBit := uint64(1) << col
		curSlashBit := uint64(1) << (row + col)
		curBackSlashBit := uint64(1) << (row - col + n - 1)

		if colBits&curColBit != 0 || slashBits&curSlashBit != 0 || backslashBits&curBackSlashBit != 0 {
			continue
		}

		growWrapper := func(onNewWorker bool) {
			grow(colBits|curColBit, slashBits|curSlashBit, backslashBits|curBackSlashBit, row+1, n, ctx)
			if onNewWorker {
				ctx.signalChan <- WORKER_FINISH
				ctx.pool.Release(1)
			}
		}

		if ctx.pool.TryAcquire(1) {
			ctx.signalChan <- WORKER_START
			go growWrapper(true)
		} else {

			growWrapper(false)
		}
	}
}
