#!/usr/bin/env python3
"""Cognivision Voice Intelligence - CPU Benchmark CLI Runner

Measures latency, throughput, and Real-Time Factor (RTF) across iterations on CPU.
"""

import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.services.benchmark_service import benchmark_service

def main():
    print("=" * 60)
    print("COGNIVISION VOICE INTELLIGENCE - CPU BENCHMARK RUNNER")
    print("=" * 60)

    res = benchmark_service.run_benchmark(num_iterations=20)
    lat = res["latency"]

    print(f"Target Processor:     {res['processor']}")
    print(f"PyTorch Version:      {res['torch_version']} (CPU AVX2)")
    print(f"Audio Sample Length:  {res['audio_duration_seconds']} seconds")
    print(f"Benchmark Iterations: {res['iterations']}")
    print("-" * 60)
    print(f"Mean Latency:         {lat['mean_ms']} ms")
    print(f"Min Latency:          {lat['min_ms']} ms")
    print(f"Max Latency:          {lat['max_ms']} ms")
    print(f"p95 Latency:          {lat['p95_ms']} ms")
    print(f"Real-Time Factor:     {res['real_time_factor']}x")
    print(f"Throughput:           {res['throughput_samples_per_second']} samples/sec")
    print(f"Efficiency Summary:   {res['real_time_factor_explanation']}")
    print("=" * 60)

if __name__ == "__main__":
    main()
