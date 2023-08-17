package nqueens_test

import (
	"shep/toy-server/nqueens"
	"testing"
	"time"
)

func TestSolver(t *testing.T) {
	tests := []struct {
		problemSize int
		want        int
	}{
		{problemSize: 8, want: 92},
		{problemSize: 9, want: 352},
		{problemSize: 10, want: 724},
		{problemSize: 11, want: 2680},
		{problemSize: 12, want: 14200},
		{problemSize: 13, want: 73712},
		{problemSize: 14, want: 365596},
		{problemSize: 15, want: 2279184},
		{problemSize: 16, want: 14772512},
	}

	for _, tt := range tests {
		start := time.Now()
		if res, _ := nqueens.Solve(tt.problemSize); res != tt.want {
			t.Fatalf("got: %d, want: %d", res, tt.want)
		} else {
			t.Logf("Problem_size_%d test got %d in %d ms", tt.problemSize, res, time.Now().UnixMilli()-start.UnixMilli())

		}

	}
}
