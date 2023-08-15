package nthqueen_test

import (
	"fmt"
	"shep/toy-server/nthqueen"
	"testing"
)

func TestSolver(t *testing.T) {
	tests := []struct {
		problemSize uint64
		want        uint64
	}{
		{problemSize: 1, want: 1},
		{problemSize: 2, want: 0},
		{problemSize: 3, want: 0},
		{problemSize: 4, want: 2},
		{problemSize: 5, want: 10},
		{problemSize: 6, want: 4},
		{problemSize: 7, want: 40},
		{problemSize: 8, want: 92},
		{problemSize: 9, want: 352},
		{problemSize: 10, want: 724},
		{problemSize: 11, want: 2680},
		{problemSize: 12, want: 14200},
		{problemSize: 13, want: 73712},
		{problemSize: 14, want: 365596},
		{problemSize: 15, want: 2279184},
		{problemSize: 16, want: 14772512},
		{problemSize: 17, want: 95815104},
		{problemSize: 18, want: 666090624},
		{problemSize: 19, want: 4968057848},
		{problemSize: 20, want: 39029188884},
		{problemSize: 21, want: 314666222712},
		{problemSize: 22, want: 2691008701644},
		{problemSize: 23, want: 24233937684440},
		{problemSize: nthqueen.MAX_PROBLEM_SIZE + 1, want: 0},
		{problemSize: 100000, want: 0},
		{problemSize: 99999999, want: 0},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprint("Problem size ", tt.problemSize), func(t *testing.T) {
			if res, err := nthqueen.Solve(tt.problemSize); err != nil {
				if tt.problemSize <= nthqueen.MAX_PROBLEM_SIZE {
					t.Errorf("%d smaller than max problem size(%d) but got error:%s. Want: %d", tt.problemSize, nthqueen.MAX_PROBLEM_SIZE, err.Error(), tt.want)
				}
			} else if res != tt.want {
				t.Errorf("got: %d, want: %d", res, tt.want)
			}
		})
	}
}
