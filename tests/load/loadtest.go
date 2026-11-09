package main

import (
	"flag"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

type BenchmarkStats struct {
	TotalRequests uint64
	SuccessCount  uint64
	ErrorCount    uint64
	Durations     []time.Duration
	Mu            sync.Mutex
}

func main() {
	targetURL := flag.String("url", "http://localhost:8080", "Base URL of Travel Doodles API")
	concurrency := flag.Int("concurrency", 15, "Number of concurrent simulated users")
	durationSec := flag.Int("duration", 10, "Duration of benchmark run in seconds")
	flag.Parse()

	fmt.Println("================================================================")
	fmt.Printf("Travel Doodles Load Benchmark (2 vCPU / 4 GB VPS Profile)\n")
	fmt.Printf("Target URL:    %s\n", *targetURL)
	fmt.Printf("Concurrency:   %d workers\n", *concurrency)
	fmt.Printf("Duration:      %d seconds\n", *durationSec)
	fmt.Println("================================================================")

	stats := &BenchmarkStats{
		Durations: make([]time.Duration, 0, 100000),
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 50,
			IdleConnTimeout:     30 * time.Second,
		},
	}

	stopCh := make(chan struct{})
	var wg sync.WaitGroup

	startTime := time.Now()

	// Scenario endpoints
	scenarios := []struct {
		name   string
		weight int
		fn     func(client *http.Client, baseURL string) (int, error)
	}{
		{
			name:   "Global Map Discovery (Zoom 3)",
			weight: 30,
			fn: func(c *http.Client, base string) (int, error) {
				resp, err := c.Get(base + "/api/v1/posts/map?bbox=-180,-60,180,75&zoom=3")
				if err != nil {
					return 0, err
				}
				defer resp.Body.Close()
				_, _ = io.Copy(io.Discard, resp.Body)
				return resp.StatusCode, nil
			},
		},
		{
			name:   "Dense City Panning (Paris Zoom 14)",
			weight: 25,
			fn: func(c *http.Client, base string) (int, error) {
				resp, err := c.Get(base + "/api/v1/posts/map?bbox=2.25,48.80,2.40,48.90&zoom=14")
				if err != nil {
					return 0, err
				}
				defer resp.Body.Close()
				_, _ = io.Copy(io.Discard, resp.Body)
				return resp.StatusCode, nil
			},
		},
		{
			name:   "Repeated Cached Tile (Zoom 6)",
			weight: 25,
			fn: func(c *http.Client, base string) (int, error) {
				resp, err := c.Get(base + "/api/v1/posts/map?bbox=2.0,48.0,3.0,49.0&zoom=6")
				if err != nil {
					return 0, err
				}
				defer resp.Body.Close()
				_, _ = io.Copy(io.Discard, resp.Body)
				return resp.StatusCode, nil
			},
		},
		{
			name:   "Public Posts List",
			weight: 15,
			fn: func(c *http.Client, base string) (int, error) {
				resp, err := c.Get(base + "/api/v1/posts?limit=20")
				if err != nil {
					return 0, err
				}
				defer resp.Body.Close()
				_, _ = io.Copy(io.Discard, resp.Body)
				return resp.StatusCode, nil
			},
		},
		{
			name:   "Health & Observability Probe",
			weight: 5,
			fn: func(c *http.Client, base string) (int, error) {
				resp, err := c.Get(base + "/healthz")
				if err != nil {
					return 0, err
				}
				defer resp.Body.Close()
				_, _ = io.Copy(io.Discard, resp.Body)
				return resp.StatusCode, nil
			},
		},
	}

	// Calculate total weight
	totalWeight := 0
	for _, sc := range scenarios {
		totalWeight += sc.weight
	}

	for i := 0; i < *concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			localDurations := make([]time.Duration, 0, 2000)

			for {
				select {
				case <-stopCh:
					stats.Mu.Lock()
					stats.Durations = append(stats.Durations, localDurations...)
					stats.Mu.Unlock()
					return
				default:
					// Select scenario by weight
					r := rand.Intn(totalWeight)
					var chosen func(c *http.Client, base string) (int, error)
					accum := 0
					for _, sc := range scenarios {
						accum += sc.weight
						if r < accum {
							chosen = sc.fn
							break
						}
					}

					reqStart := time.Now()
					code, err := chosen(client, *targetURL)
					duration := time.Since(reqStart)

					atomic.AddUint64(&stats.TotalRequests, 1)
					if err == nil && code < 400 {
						atomic.AddUint64(&stats.SuccessCount, 1)
						localDurations = append(localDurations, duration)
					} else {
						atomic.AddUint64(&stats.ErrorCount, 1)
					}
				}
			}
		}(i)
	}

	time.Sleep(time.Duration(*durationSec) * time.Second)
	close(stopCh)
	wg.Wait()

	totalTime := time.Since(startTime)

	PrintReport(stats, totalTime)
}

func PrintReport(s *BenchmarkStats, elapsed time.Duration) {
	total := atomic.LoadUint64(&s.TotalRequests)
	success := atomic.LoadUint64(&s.SuccessCount)
	errCount := atomic.LoadUint64(&s.ErrorCount)
	rps := float64(total) / elapsed.Seconds()

	fmt.Println("\n---------------------- Benchmark Results -----------------------")
	fmt.Printf("Elapsed Time:       %.2fs\n", elapsed.Seconds())
	fmt.Printf("Total Requests:     %d\n", total)
	fmt.Printf("Successful (2xx):   %d (%.2f%%)\n", success, float64(success)/float64(total)*100.0)
	fmt.Printf("Failed (4xx/5xx):   %d (%.2f%%)\n", errCount, float64(errCount)/float64(total)*100.0)
	fmt.Printf("Throughput:         %.1f req/sec\n", rps)

	if len(s.Durations) > 0 {
		sort.Slice(s.Durations, func(i, j int) bool {
			return s.Durations[i] < s.Durations[j]
		})

		p50 := s.Durations[int(float64(len(s.Durations))*0.50)]
		p90 := s.Durations[int(float64(len(s.Durations))*0.90)]
		p95 := s.Durations[int(float64(len(s.Durations))*0.95)]
		p99 := s.Durations[int(float64(len(s.Durations))*0.99)]
		min := s.Durations[0]
		max := s.Durations[len(s.Durations)-1]

		var totalDuration time.Duration
		for _, d := range s.Durations {
			totalDuration += d
		}
		avg := totalDuration / time.Duration(len(s.Durations))

		fmt.Println("\n--- Latency Percentiles ---")
		fmt.Printf("Min:                %s\n", min)
		fmt.Printf("Average:            %s\n", avg)
		fmt.Printf("p50 (Median):       %s\n", p50)
		fmt.Printf("p90:                %s\n", p90)
		fmt.Printf("p95:                %s\n", p95)
		fmt.Printf("p99:                %s\n", p99)
		fmt.Printf("Max:                %s\n", max)
	}
	fmt.Println("----------------------------------------------------------------")
}
