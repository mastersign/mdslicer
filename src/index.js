import {EventEmitter} from 'events'
import {removeFormat, anchor} from 'mdheadline'
import {lineStream} from './lines'

function match (re, text, fn) {
	let cnt = 0
	re.lastIndex = 0
	let m = re.exec(text)
	if (re.global) {
		while(m) {
			cnt = cnt + 1
			fn(m)
			m = re.exec(text)
		}
	} else if (m) {
		cnt = cnt + 1
		fn(m)
	}
	return cnt
}

const RE = {
    yamlHeaderStart: /^---$/,
    yamlHeaderEnd: /^-{3}|\.{3}$/,

    headlinePattern: /^(#+)\s+(.*?)\s*$/,
    headline1Pattern: /^==+\s*$/,
    headline2Pattern: /^--+\s*$/,

    internalLinkPattern: /(?:^|[^\]\)!])\[([^\]]+)\](?: ?\[([^\]]*)\])?/g,

    externalLinkPattern: /(?:^|[^\]!])\[([^\]]+)\]\(([^\)]+)\)/g,
    urlLinkPattern: /<([^>\s]+)>/g,

    referencePattern: /^\[([^\]]+)\]:\s+(\S+)(?:\s+"([^"]*)")?\s*$/g,

    codePattern: /^(?: {4}|\t)(.*)$/,
    fencedCodeStartPattern: /^(`{3,}|~{3,})\s*(.*?)\s*$/,

    commentPattern: /<!--(.*?)-->/g,

    commentStartPattern: /(?:<!--)(?!.*<!--)(.*?)$/,
    commentEndPattern: /^(.*?)-->/,

    citationPattern: /^ {0,3}(>[\s>]*)(.*)\s*$/
}

export class MdSlicer extends EventEmitter {

    constructor (input, encoding) {
        super()
        const s = lineStream(input, encoding)
        if (s === undefined) throw 'Invalid input.'
        s.pause()
        s.setEncoding('utf8')
        this._inputStream = s

        let row = 0
        let lastLine = null
        let inHeader = false
        let inCode = false
        let inFencedCode = false
        let codeFence = null
        let inComment = false

        let anchorCache = {}

        function uniqueAnchor(headline) {
            const id = anchor(headline)
            const cnt = anchorCache[id]
            if (cnt) {
                anchorCache[id] = cnt + 1
                return id + '_' + cnt
            }
            anchorCache[id] = 1
            return id
        }

        s.on('end', () => this.emit('end'))

        s.on('data', line => {

            row = row + 1

            const comments = []
            let lastComment = null

            function isInComment(m) {
                for (let i = 0; i < comments.length; i++) {
                    const cm = comments[i]
                    if (m.index >= cm.index && m.index < (cm.index + cm[0].length)) {
                        return true
                    }
                    return false
                }
            }

            // header

            if (row === 1) {
                match(RE.yamlHeaderStart, line, m => {
                    inHeader = true
                    this.emit('startHeader', {
                        row: row + 1,
                        column: 1
                    })
                })
                if (inHeader) {
                    lastLine = line
                    return
                }
            } else if (inHeader) {
                match(RE.yamlHeaderEnd, line, m => {
                    inHeader = false
                    this.emit('endHeader', {
                        row: row - 1,
                        column: lastLine.length + 1
                    })
                })
                if (inHeader) {
                    this.emit('header', {
                        text: line,
                        row: row,
                        column: 1
                    })
                }
                lastLine = line
                return
            }

            // code

            if (!inHeader && !inComment) {
                if (inFencedCode) {
                    if (line === codeFence) {
                        codeFence = null
                        inFencedCode = false
                        this.emit('endCode', {
                            row: row - 1,
                            column: lastLine.length + 1
                        })
                    } else {
                        this.emit('code', {
                            row: row,
                            column: 1,
                            text: line
                        })
                        lastLine = line
                        return
                    }
                } else {
                    if (match(RE.codePattern, line, m => {
                        if (!inCode && lastLine.trim().length === 0 && m[1].length > 0) {
                            inCode = true
                            this.emit('startCode', {
                                row: row,
                                column: 1
                            })
                        }
                        if (inCode) {
                            this.emit('code', {
                                row: row,
                                column: 1,
                                text: m[1]
                            })
                        }
                    }) > 0) {
                        if (inCode) {
                            lastLine = line
                            return
                        }
                    }
                    if (inCode) {
                        inCode = false
                        this.emit('endCode', {
                            row: row - 1,
                            column: lastLine.length + 1
                        })
                    }
                    if (match(RE.fencedCodeStartPattern, line, m => {
                        inFencedCode = true
                        codeFence = m[1]
                        this.emit('startCode', {
                            row: row + 1,
                            column: 1,
                            codeAttributes: m[2] || ''
                        })
                    }) > 0) {
                        if (inFencedCode) {
                            lastLine = line
                            return
                        }
                    }
                }
            }

            // comments

            if (inComment) {
                match(RE.commentEndPattern, line, m => {
                    comments.push(m)
                    if (m[1].length > 0) {
                        this.emit('comment', {
                            row: row,
                            column: m.index + 1,
                            text: m[1],
                            inline: false
                        })
                    }
                    inComment = false
                    this.emit('endComment', {
                        row: row,
                        column: m.index + m[0].length + 1,
                    })
                })
                if (inComment) {
                    this.emit('comment', {
                        row: row,
                        column: 1,
                        text: line,
                        inline: false
                    })
                    return
                }
            }

            match(RE.commentPattern, line, m => {
                this.emit('comment', {
                    row: row,
                    column: m.index + 1,
                    text: m[1],
                    inline: true
                })
                comments.push(m)
                lastComment = m.index + m[0].length
            })

            match(RE.commentStartPattern, line, m => {
                if (lastComment !== null && m.index < lastComment) {
                    return
                }
                inComment = true
                this.emit('startComment', {
                    row: row,
                    column: m.index + 1
                })
                comments.push(m)
                if (m[1].length > 0) {
                    this.emit('comment', {
                        row: row,
                        column: m.index + 1,
                        text: m[1],
                        inline: false
                    })
                }
            })

            // headline

            match(RE.headlinePattern, line, m => {
                if (isInComment(m)) return
                this.emit('headline', {
                    row: row,
                    column: m.index + 1,
                    level: m[1].length,
                    source: m[2],
                    text: removeFormat(m[2]),
                    anchor: uniqueAnchor(m[2])
                })
            }) ||
            match(RE.headline1Pattern, line, m => {
                if (isInComment(m)) return
                if (!lastLine || lastLine.trim() === '') return
                this.emit('headline', {
                    row: row - 1,
                    column: m.index + 1,
                    level: 1,
                    source: lastLine,
                    text: removeFormat(lastLine),
                    anchor: uniqueAnchor(lastLine)
                })
            }) ||
            match(RE.headline2Pattern, line, m => {
                if (isInComment(m)) return
                if (row === 1) return
                if (!lastLine || lastLine.trim() === '') return
                this.emit('headline', {
                    row: row - 1,
                    column: m.index + 1,
                    level: 2,
                    source: lastLine,
                    text: removeFormat(lastLine),
                    anchor: uniqueAnchor(lastLine)
                })
            })

            // citations

            match(RE.citationPattern, line, m => {
                if (isInComment(m)) return
                this.emit('citation', {
                    text: m[2],
                    level: m[1].replace(/\s/g, '').length,
                    row: row,
                    column: 1
                })
            })

            // internal links

            match(RE.internalLinkPattern, line, m => {
                if (isInComment(m)) return
                if (m[2]) {
                    this.emit('internal-link', {
                        row: row,
                        column: m.index > 0 ? m.index + 2 : m.index + 1,
                        text: m[1],
                        target: m[2],
                        targetText: removeFormat(m[2])
                    })
                } else {
                    this.emit('internal-link', {
                        row: row,
                        column: m.index > 0 ? m.index + 2 : m.index + 1,
                        text: m[1],
                        target: m[1],
                        targetText: removeFormat(m[1])
                    })
                }
            })

            // external reference

            match(RE.referencePattern, line, m => {
                if (isInComment(m)) return
                this.emit('reference', {
                    row: row,
                    column: 1,
                    label: m[1],
                    href: m[2],
                    text: m[3]
                })
            })

            // external links

            match(RE.externalLinkPattern, line, m => {
                if (isInComment(m)) return
                this.emit('link', {
                    row: row,
                    column: m.index > 0 ? m.index + 2 : m.index + 1,
                    text: m[1],
                    url: m[2]
                })
            })

            match(RE.urlLinkPattern, line, m => {
                if (isInComment(m)) return
                this.emit('link', {
                    row: row,
                    column: m.index + 1,
                    text: m[1],
                    url: m[1]
                })
            })

            lastLine = line.trim()
        })
    }

    pause () {
        this._inputStream.pause()
    }
    resume () {
        this._inputStream.resume()
    }

}
