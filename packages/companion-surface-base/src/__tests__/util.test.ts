import { describe, expect, test } from 'vitest'
import { StableDeviceIdGenerator } from '../util.js'

describe('StableDeviceIdGenerator', () => {
	test('generates different IDs for different uniqueness keys', () => {
		const generator = new StableDeviceIdGenerator()

		const id1 = generator.generateId('1234:5678', '/dev/hidraw0')
		const id2 = generator.generateId('1234:9999', '/dev/hidraw1')

		expect(id1).not.toBe(id2)
		expect(id1).toHaveLength(40) // SHA1 hex digest length
		expect(id2).toHaveLength(40)
	})

	test('generates different IDs for same uniqueness key with different paths', () => {
		const generator = new StableDeviceIdGenerator()

		const id1 = generator.generateId('1234:5678', '/dev/hidraw0')
		const id2 = generator.generateId('1234:5678', '/dev/hidraw1')

		expect(id1).not.toBe(id2)
	})

	test('returns same ID for same device path on repeated calls', () => {
		const generator = new StableDeviceIdGenerator()

		const id1 = generator.generateId('1234:5678', '/dev/hidraw0')
		const id2 = generator.generateId('1234:5678', '/dev/hidraw0')

		expect(id1).toBe(id2)
	})

	test('handles missing device path parameter', () => {
		const generator = new StableDeviceIdGenerator()

		const id1 = generator.generateId('1234:5678')
		const id2 = generator.generateId('1234:5678')

		// Without path, each call should generate a new ID
		expect(id1).not.toBe(id2)
		expect(id1).toHaveLength(40)
		expect(id2).toHaveLength(40)
	})

	test('generates stable IDs with counter increment', () => {
		const generator = new StableDeviceIdGenerator()

		const id1 = generator.generateId('1234:5678', '/dev/hidraw0')
		const id2 = generator.generateId('1234:5678', '/dev/hidraw1')
		const id3 = generator.generateId('1234:5678', '/dev/hidraw2')

		// All should be unique
		expect(new Set([id1, id2, id3]).size).toBe(3)
	})

	test('separate instances have independent state', () => {
		const generator1 = new StableDeviceIdGenerator()
		const generator2 = new StableDeviceIdGenerator()

		const id1 = generator1.generateId('1234:5678', '/dev/hidraw0')
		const id2 = generator2.generateId('1234:5678', '/dev/hidraw1')

		// Same inputs in different instances should produce same ID
		expect(id1).toBe(id2)
	})

	test('handles multiple devices with same uniqueness key in batch', () => {
		const generator = new StableDeviceIdGenerator()

		// Simulate 3 identical devices (same vendor/product) with different paths
		const ids = [
			generator.generateId('1234:5678', '/dev/hidraw0'),
			generator.generateId('1234:5678', '/dev/hidraw1'),
			generator.generateId('1234:5678', '/dev/hidraw2'),
		]

		// All should be unique
		expect(new Set(ids).size).toBe(3)

		// Requesting same path again should return cached ID
		expect(generator.generateId('1234:5678', '/dev/hidraw1')).toBe(ids[1])
	})

	test('handles mixed scenarios with and without device paths', () => {
		const generator = new StableDeviceIdGenerator()

		const withPath1 = generator.generateId('1234:5678', '/dev/hidraw0')
		const withoutPath1 = generator.generateId('1234:5678')
		const withPath2 = generator.generateId('1234:5678', '/dev/hidraw1')
		const withoutPath2 = generator.generateId('1234:5678')

		// All should be unique
		expect(new Set([withPath1, withoutPath1, withPath2, withoutPath2]).size).toBe(4)

		// Cached path should return same ID
		expect(generator.generateId('1234:5678', '/dev/hidraw0')).toBe(withPath1)
	})

	test('handles undefined device path (same as omitted)', () => {
		const generator = new StableDeviceIdGenerator()

		const id1 = generator.generateId('1234:5678', undefined)
		const id2 = generator.generateId('1234:5678', undefined)

		// Should generate different IDs when path is undefined
		expect(id1).not.toBe(id2)
	})

	test('generates valid hex SHA1 hashes', () => {
		const generator = new StableDeviceIdGenerator()

		const id = generator.generateId('1234:5678', '/dev/hidraw0')

		// Should be 40 character hex string
		expect(id).toMatch(/^[0-9a-f]{40}$/)
	})

	test('deduplicates multiple endpoints of same device', () => {
		const generator = new StableDeviceIdGenerator()

		// Simulate same device with multiple HID endpoints (same path)
		const id1 = generator.generateId('1234:5678', '/dev/hidraw0')
		const id2 = generator.generateId('1234:5678', '/dev/hidraw0')
		const id3 = generator.generateId('1234:5678', '/dev/hidraw0')

		expect(id1).toBe(id2)
		expect(id2).toBe(id3)
	})

	test('handles empty uniqueness key', () => {
		const generator = new StableDeviceIdGenerator()

		const id1 = generator.generateId('', '/dev/hidraw0')
		const id2 = generator.generateId('', '/dev/hidraw1')

		expect(id1).not.toBe(id2)
		expect(id1).toHaveLength(40)
	})

	test('real-world scenario: 2 identical Stream Decks', () => {
		const generator = new StableDeviceIdGenerator()

		// Same vendor:product, different USB paths
		const deck1 = generator.generateId('4057:96', '/dev/hidraw0')
		const deck2 = generator.generateId('4057:96', '/dev/hidraw1')

		expect(deck1).not.toBe(deck2)
		expect(deck1).toHaveLength(40)
		expect(deck2).toHaveLength(40)

		// Re-enumerating same devices should return same IDs
		expect(generator.generateId('4057:96', '/dev/hidraw0')).toBe(deck1)
		expect(generator.generateId('4057:96', '/dev/hidraw1')).toBe(deck2)
	})
})
