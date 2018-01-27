import {equal, deepEqual} from 'assert'
import {createReadStream} from 'streamifier'
import {lineStream} from '../src/lines'

describe('lineStream', function () {

	it('from null', done => {
		equal(lineStream(null), undefined)
		done()
	})

	it('from undefined', done => {
		equal(lineStream(), undefined)
		done()
	})

	it('from string (flow)', done => {
		const text = 'Hallo Welt\r\n Was geht? \n\nUnd tschüß.'
		const expects = ['Hallo Welt', ' Was geht? ', '', 'Und tschüß.']

		const result = []
		const s = lineStream(text)
		s.on('data', line => {
			result.push(line)
		})
		s.on('end', () => {
			deepEqual(result, expects)
			done()
		})
	})

	it('from string (non-flow)', done => {
		const text = 'Hallo Welt\r\n Was geht? \n\nUnd tschüß.'
		const expects = ['Hallo Welt', ' Was geht? ', '', 'Und tschüß.']

		const result = []
		const s = lineStream(text)
		function doRead() {
			let line = s.read()
			if (line !== null) {
				result.push(line)
				return true
			} else {
				return false
			}
		}
		s.on('readable', () => { while(doRead()) {} })
		s.on('end', () => {
			deepEqual(result, expects)
			done()
		})
	})

	it('from buffer (flow)', done => {
		const buffer = new Buffer('Hallo Welt\r\n Was geht? \n\nUnd tschüß.\n', 'utf8')
		const expects = ['Hallo Welt', ' Was geht? ', '', 'Und tschüß.', '']

		const result = []
		const s = lineStream(buffer, 'utf8')
		s.on('data', line => result.push(line))
		s.on('end', () => {
			deepEqual(result, expects)
			done()
		})
	})

	it('from buffer (non-flow)', done => {
		const buffer = new Buffer('Hallo Welt\r\n Was geht? \n\nUnd tschüß.\n', 'utf8')
		const expects = ['Hallo Welt', ' Was geht? ', '', 'Und tschüß.', '']

		const result = []
		const s = lineStream(buffer)
		function doRead () {
			let line = s.read()
			if (line !== null) {
				result.push(line)
				return true
			} else {
				return false
			}
		}
		s.on('readable', () => { while(doRead()) {} })
		s.on('end', () => {
			deepEqual(result, expects)
			done()
		})
	})

	it('from stream (flow)', done => {
		const stream = createReadStream('Hallo Welt\r\n Was geht? \n\nUnd tschüß.\n', { encoding: 'utf8' })
		const expects = ['Hallo Welt', ' Was geht? ', '', 'Und tschüß.', '']

		const result = []
		const s = lineStream(stream)
		s.on('data', line => result.push(line))
		s.on('end', () => {
			deepEqual(result, expects)
			done()
		})
	})

	it('from stream (non-flow)', done => {
		const stream = createReadStream('Hallo Welt\r\n Was geht? \n\nUnd tschüß.\n', { encoding: 'utf8' })
		const expects = ['Hallo Welt', ' Was geht? ', '', 'Und tschüß.', '']

		const result = []
		const s = lineStream(stream)
		function doRead () {
			let line = s.read()
			if (line !== null) {
				result.push(line)
				return true
			} else {
				return false
			}
		}
		s.on('readable', () => { while(doRead()) {} })
		s.on('end', () => {
			deepEqual(result, expects)
			done()
		})
	})

})