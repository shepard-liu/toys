package nthqueen

import (
	"time"

	"golang.org/x/sync/semaphore"
)

type SolverContext struct {
	deadline   time.Time
	pool       *semaphore.Weighted
	signalChan chan SolverSignal
}

func (sctx SolverContext) Deadline() (deadline time.Time, ok bool) {
	return sctx.deadline, true
}
func (sctx SolverContext) Done() <-chan struct{} {
	return nil
}

func (sctx SolverContext) Err() error {
	return nil
}

func (sctx SolverContext) Value(key any) any {
	return nil
}
