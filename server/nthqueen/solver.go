package nthqueen

import (
	"errors"
)

const (
	MAX_PROBLEM_SIZE = 32
	MAX_THREADS      = 64
)

func Solve(n uint64) (ans uint64, err error) {
	if n > MAX_PROBLEM_SIZE {
		err = errors.New("problem size exceeds limit(32)")
		return
	}
	ch := make(chan uint64, 1)
	go grow(0, 0, 0, 0, n, ch)

	return
}

func grow(colBits, slashBits, backslashBits uint64, row uint64, n uint64, ch chan uint64) {
	if row == n {
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

		grow(colBits|curColBit, slashBits|curSlashBit, backslashBits|curBackSlashBit, row+1, n, pAns)
	}

}
