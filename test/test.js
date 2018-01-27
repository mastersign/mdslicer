import {ok, deepEqual} from 'assert'
import {createReadStream} from 'fs'
import {MdSlicer} from '../src/index'

function checkObjectArray (result, expected) {
    ok(result, 'result should be truthy')
    ok(result instanceof Array, 'result should be an array')
    deepEqual(result, expected, 'result does not match expected data')
}

describe('MdSlicer', () => {

    it('headlines', done => {
        const expected = [
            { source: "Main Headline",
            text: "Main Headline",
            anchor: "main-headline",
            level: 1,
            row: 8, column: 1 },
            { source: "Subsection",
            text: "Subsection",
            anchor: "subsection",
            level: 2,
            row: 11, column: 1 },
            { source: "(01) Headline {#first_hl}",
            text: "(01) Headline",
            anchor: "first_hl",
            level: 1,
            row: 20, column: 1 },
            { source: "1.2 _Headline_ **2**",
            text: "1.2 Headline 2",
            anchor: "headline-2",
            level: 2, row: 22, column: 1 },
            { source: "Headline <http://www.endoftheinternet.com/>",
            text: "Headline http://www.endoftheinternet.com/",
            anchor: "headline-httpwww.endoftheinternet.com",
            level: 3,
            row: 25, column: 1 },
            { source: "Headline [hl1](#first_hl), [hl1][(01) Headline], [(01) Headline][], [(01) Headline] - []",
            text: "Headline hl1, hl1, (01) Headline, (01) Headline - []",
            anchor: "headline-hl1-hl1-01-headline-01-headline---",
            level: 1,
            row: 27, column: 1 },
            { source: "the last headline",
            text: "the last headline",
            anchor: "the-last-headline",
            level: 4,
            row: 33, column: 1 },
            { source: "Subsection",
            text: "Subsection",
            anchor: "subsection_1",
            level: 2,
            row: 35, column: 1 },
            { source: "Subsection",
            text: "Subsection",
            anchor: "subsection_2",
            level: 2,
            row: 37, column: 1 }
        ]

        const p = new MdSlicer(createReadStream('test/data/headlines.md'))
        const result = []
        p.on('headline', hl => { result.push(hl) })
        p.on('end', () => {
            checkObjectArray(result, expected)
            done()
        })
        p.resume()
    })

    it ('headlines with YAML header', done => {
        const expected = [
            { source: 'Headline 1',
            text: 'Headline 1',
            anchor: 'headline-1',
            level: 1,
            row: 15, column: 1 },
            { source: 'Headline 2',
            text: 'Headline 2',
            anchor: 'headline-2',
            level: 1,
            row: 21, column: 1 }
        ]
        const p = new MdSlicer(createReadStream('test/data/yaml-header.md'))
        const result = []
        p.on('headline', hl => { result.push(hl) })
        p.on('end', function () {
            checkObjectArray(result, expected)
            done()
        })
        p.resume()
    })

    it('internal links', done => {
        const expected = [
            { target: 'Headline', targetText: 'Headline', text: 'First Headline', row: 3, column: 1 },
            { target: 'Headline', targetText: 'Headline', text: 'Headline', row: 4, column: 5 },
            { target: 'Headline', targetText: 'Headline', text: 'Headline', row: 5, column: 5 },
            { target: 'Headline', targetText: 'Headline', text: 'links', row: 7, column: 10 },
            { target: 'Headline', targetText: 'Headline', text: 'one', row: 7, column: 31 },
            { target: 'Headline', targetText: 'Headline', text: 'Headline', row: 7, column: 47 },
            { target: 'Headline', targetText: 'Headline', text: 'last', row: 9, column: 23 },
            { target: 'Headline', targetText: 'Headline', text: 'very last 1', row: 15, column: 28 },
            { target: 'Headline', targetText: 'Headline', text: 'very last 2', row: 17, column: 25 }
        ]

        const p = new MdSlicer(createReadStream('test/data/internal-links.md'))
        const result = []
        p.on('internal-link', hl => { result.push(hl) })
        p.on('end', () => {
            checkObjectArray(result, expected)
            done()
        })
        p.resume()
    })

    it('links', done => {
        const expected = [
            { text: 'http://www.theendoftheinternet.com/',
            url: 'http://www.theendoftheinternet.com/',
            row: 1, column: 12 },
            { text: 'mailto:link@xyz.com', url: 'mailto:link@xyz.com',
            row: 3, column: 23 },
            { text: 'URL', url: '../test.html', row: 4, column: 5 },
            { text: 'link', url: 'ftp://link', row: 8, column: 1 },
            { text: 'hidden', url: 'hidden.txt', row: 8, column: 43 },
            { text: 'http://www.example.com', url: 'http://www.example.com', row: 13, column: 1 },
            { text: 'link', url: 'link.txt', row: 18, column: 13 },
            { text: 'file://link2.txt', url: 'file://link2.txt', row: 18, column: 31 }
        ]

        const p = new MdSlicer(createReadStream('test/data/links.md'))
        const result = []
        p.on('link', hl => { result.push(hl) })
        p.on('end', () => {
            checkObjectArray(result, expected)
            done()
        })
        p.resume()
    })

    it('code', done => {
        const expected = [
            { typ: 'start', row: 9, column: 1 },
            { text: '<code 1>', row: 9, column: 1 },
            { text: '', row: 10, column: 1 },
            { text: '// <code 3>', row: 11, column: 1 },
            { text: '  <code 3.1>', row: 12, column: 1 },
            { text: '    <code 3.1.1>', row: 13, column: 1 },
            { typ: 'end', row: 13, column: 21 },
            { typ: 'start', row: 15, column: 1 },
            { text: '<code 4>', row: 15, column: 1 },
            { text: '# <code 5>', row: 16, column: 1 },
            { text: '', row: 17, column: 1 },
            { typ: 'end', row: 17, column: 2 },
            { typ: 'start', row: 22, column: 1, codeAttributes: '' },
            { text: 'simple', row: 22, column: 1 },
            { text: '', row: 23, column: 1 },
            { text: 'fenced code', row: 24, column: 1 },
            { typ: 'end', row: 24, column: 12 },
            { typ: 'start', row: 28, column: 1, codeAttributes: '' },
            { text: '~~~', row: 28, column: 1 },
            { text: 'more fenced code', row: 29, column: 1 },
            { text: '~~~', row: 30, column: 1 },
            { typ: 'end', row: 30, column: 4 },
            { typ: 'start', row: 34, column: 1, codeAttributes: 'js' },
            { text: 'function() { /* fenced code with attributes */ }', row: 34, column: 1 },
            { typ: 'end', row: 34, column: 49 }
        ]

        const p = new MdSlicer(createReadStream('test/data/code.md'))
        const result = []
        p.on('code', hl => { result.push(hl) })
        p.on('startCode', e => { e.typ = 'start'; result.push(e) })
        p.on('endCode', e => { e.typ = 'end'; result.push(e) })
        p.on('end', () => {
            checkObjectArray(result, expected)
            done()
        })
        p.resume()
    })

    it('comments', done => {
        const expected = [
            { text: ' a comment', inline: true, row: 2, column: 22 },
            { text: '@', inline: true, row: 2, column: 44 },
            { text: ' Comment 1 ', inline: true, row: 6, column: 1 },
            { text: ' Comment 2 ', inline: true, row: 7, column: 1 },
            { text: ' Comment 3 ', inline: true, row: 7, column: 19 },
            { typ: 'start', row: 9, column: 1 },
            { text: ' Start', inline: false, row: 9, column: 1 },
            { text: 'This is a comment --', inline: false, row: 10, column: 1 },
            { text: 'with no end -> ', inline: false, row: 11, column: 1 },
            { text: 'This is end ', inline: false, row: 12, column: 1 },
            { typ: 'end', row: 12, column: 16 },
            { typ: 'start', row: 14, column: 1 },
            { text: 'Whats going on', inline: false, row: 15, column: 1 },
            { text: '', inline: false, row: 16, column: 1 },
            { text: '\tcomment no code', inline: false, row: 17, column: 1 },
            { text: '\tcomment 2 no code', inline: false, row: 18, column: 1 },
            { text: '', inline: false, row: 19, column: 1 },
            { typ: 'end', row: 20, column: 4 },
            { text: 'comment', inline: true, row: 22, column: 9 },
            { typ: 'start', row: 22, column: 28 },
            { text: 'multiline ', inline: false, row: 23, column: 1 },
            { typ: 'end', row: 23, column: 14 }
        ]

        const p = new MdSlicer(createReadStream('test/data/comments.md'))
        const result = []
        p.on('comment', hl => { result.push(hl) })
        p.on('startComment', e => { e.typ = 'start'; result.push(e) })
        p.on('endComment', e => { e.typ = 'end'; result.push(e) })
        p.on('end', () => {
            checkObjectArray(result, expected)
            done()
        })
        p.resume()
    })

    it('citations', done => {
        const expected = [
            { text: 'This is a single line citation.', level: 1, row: 3, column: 1},
            { text: 'One citation paragraph.', level: 1, row: 7, column: 1 },
            { text: 'Another citation paragraph,', level: 1, row: 9, column: 1 },
            { text: 'with a second line.', level: 1, row: 10, column: 1 },
            { text: 'Quote', level: 1, row: 14, column: 1 },
            { text: 'without whitespace.', level: 1, row: 15, column: 1 },
            { text: 'This is double quoted', level: 2, row: 19, column: 1 },
            { text: 'with two lines in the paragraph.', level: 2, row: 20, column: 1 },
            { text: 'This is triple quoted', level: 3, row: 24, column: 1 },
            { text: 'with two lines in the paragraph.', level: 3, row: 25, column: 1 }
        ]

        const p = new MdSlicer(createReadStream('test/data/citations.md'))
        const result = []
        p.on('citation', cite => { result.push(cite) })
        p.on('end', () => {
            checkObjectArray(result, expected)
            done()
        })
        p.resume()
    })

    it('header', done => {
        const expected = [
            { typ: 'start', row: 2, column: 1 },
            { text: '# a comment', row: 2, column: 1 },
            { text: 'author: John Smith', row: 3, column: 1},
            { text: 'date: 2015-12-08', row: 4, column: 1 },
            { text: 'tags:', row: 5, column: 1 },
            { text: ' - Tag 1', row: 6, column: 1 },
            { text: ' - Tag 2', row: 7, column: 1 },
            { text: 'lang: en', row: 8, column: 1 },
            { typ: 'end', row: 8, column: 9 }
        ]

        const p = new MdSlicer(createReadStream('test/data/yaml-header.md'))
        const result = []
        p.on('startHeader', h => { h.typ = 'start'; result.push(h) })
        p.on('header', h => { result.push(h) })
        p.on('endHeader', h => { h.typ = 'end'; result.push(h) })
        p.on('end', () => {
            checkObjectArray(result, expected)
            done()
        })
        p.resume()
    })

})