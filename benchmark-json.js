const crypto = require('crypto')

// Create test data
function createTestData() {
	return {
		// A couple of 1kb buffers
		buffer1: crypto.randomBytes(1024),
		buffer2: crypto.randomBytes(1024),

		// 100kb "jpeg" (simulated with random data)
		jpeg1: crypto.randomBytes(100 * 1024).toString('base64'),
		jpeg2: crypto.randomBytes(100 * 1024).toString('base64'),

		// Some other typical data
		metadata: {
			timestamp: Date.now(),
			type: 'test',
			nested: {
				value: 'some string',
				number: 42,
			},
		},
	}
}

// Benchmark JSON.stringify
function benchmark(iterations = 100) {
	const data = createTestData()

	// console.log('Test data size breakdown:')
	// console.log(`- buffer1: ${data.buffer1.length} bytes`)
	// console.log(`- buffer2: ${data.buffer2.length} bytes`)
	// console.log(`- jpeg1: ${data.jpeg1.length} bytes`)
	// console.log(`- jpeg2: ${data.jpeg2.length} bytes`)
	// console.log(
	// 	`- Total raw data: ~${(data.buffer1.length + data.buffer2.length + data.jpeg1.length + data.jpeg2.length) / 1024}kb\n`,
	// )

	// Warmup
	for (let i = 0; i < 10; i++) {
		JSON.stringify(data)
	}

	// Actual benchmark
	const times = []
	for (let i = 0; i < iterations; i++) {
		const start = process.hrtime.bigint()
		const result = JSON.stringify(data)
		const end = process.hrtime.bigint()

		const timeMs = Number(end - start) / 1_000_000
		times.push(timeMs)

		if (i === 0) {
			console.log(`Stringified size: ${result.length} bytes (${(result.length / 1024).toFixed(2)}kb)\n`)
		}
	}

	// Calculate statistics
	times.sort((a, b) => a - b)
	const avg = times.reduce((a, b) => a + b, 0) / times.length
	const min = times[0]
	const max = times[times.length - 1]
	const median = times[Math.floor(times.length / 2)]
	const p95 = times[Math.floor(times.length * 0.95)]
	const p99 = times[Math.floor(times.length * 0.99)]

	console.log(`Results over ${iterations} iterations:`)
	console.log(`- Average: ${avg.toFixed(3)}ms`)
	console.log(`- Median:  ${median.toFixed(3)}ms`)
	console.log(`- Min:     ${min.toFixed(3)}ms`)
	console.log(`- Max:     ${max.toFixed(3)}ms`)
	console.log(`- P95:     ${p95.toFixed(3)}ms`)
	console.log(`- P99:     ${p99.toFixed(3)}ms`)
}

console.log('JSON.stringify Performance Benchmark\n')
console.log('='.repeat(50))
benchmark()
