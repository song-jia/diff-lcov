var parse = require('lcov-parse');

// handle cli
cli();

function cli() {
    const args = getParameters();
    const originPath = args.origin;
    const targetPath = args.target;

    diffCoverage(originPath, targetPath);

    function getParameters() {
        const args = {
            origin: '',
            target: ''
        };

        process.argv.forEach(arg => {
            if (/--origin=/i.test(arg)) {
                const matches = arg.match(/--origin=(.*)/i)
                args.origin = matches[1]
            }

            if (/--target=/i.test(arg)) {
                const matches = arg.match(/--target=(.*)/i)
                args.target = matches[1]
            }
        });

        return args;
    }
}



function diffCoverage(original, target) {
    Promise.all([parsePromise(original), parsePromise(target)])
        .then(([origin, target]) => {
            outputSummary(origin, target);
            outputDetails(origin, target);
        });
}

function outputSummary(origin, target) {
    const reporter = cliReporter();
    const originLine = getLinesInfo(origin);
    const targetLine = getLinesInfo(target);
    const targetPercentage = calcPercent(targetLine.hit, targetLine.found);
    const originPercentage = calcPercent(originLine.hit, originLine.found);
    const info = {
        line: {
            found: targetLine.found,
            foundDiff: diff(targetLine.found, originLine.found),
            hit: targetLine.hit,
            hitDiff: diff(targetLine.hit, originLine.hit),
            percent: targetPercentage,
            percentDiff: diff(targetPercentage, originPercentage),
        }
    };

    reporter.outputSummary(info);

    function getLinesInfo(data) {
        let found = 0;
        let hit = 0;

        data.forEach(f => {
            found += f.lines.found;
            hit += f.lines.hit;
        });

        return {
            found,
            hit
        };
    }
}

function outputDetails(origin, target) {
    const changedFiles = [];
    const reporter = cliReporter();

    target.forEach(record => {
        const originRecord = origin.find(r => r.file === record.file);
        const percent = calcPercent(record.lines.hit, record.lines.found);

        // new record
        if (!originRecord) {
            changedFiles.push({
                file: `${record.file} <add>`,
                lineFound: record.lines.found,
                lineFoundDiff: record.lines.found,
                lineHit: record.lines.hit,
                lineHitDiff: record.lines.hit,
                linePercent: percent,
                linePercentDiff: percent,
            });
        }
        // changed record
        else if (originRecord.lines.found !== record.lines.found || originRecord.lines.hit !== record.lines.hit) {
            const originPercent = calcPercent(originRecord.lines.hit, originRecord.lines.found);
            changedFiles.push({
                file: record.file,
                lineFound: record.lines.found,
                lineFoundDiff: diff(record.lines.found, originRecord.lines.found),
                lineHit: record.lines.hit,
                lineHitDiff: diff(record.lines.hit, originRecord.lines.hit),
                linePercent: percent,
                linePercentDiff: diff(percent, originPercent)
            });
        }
    });

    // removed record
    origin.forEach(record => {
        const targetRecord = target.find(r => r.file === record.file);
        const percent = calcPercent(record.lines.hit, record.lines.found);

        if (!targetRecord) {
            changedFiles.push({
                file: `${record.file} <delete>`,
                lineFound: record.lines.found,
                lineFoundDiff: 0 - record.lines.found,
                lineHit: record.lines.hit,
                lineHitDiff: 0 - record.lines.hit,
                linePercent: percent,
                linePercentDiff: 0 - percent,
            });
        }
    });

    changedFiles.sort((f1, f2) => f1.file.localeCompare(f2.file));

    reporter.outputDetails(changedFiles);
}

function diff(a, b) {
    return Math.round((a - b) * 100) / 100;
}

function calcPercent(num, amount) {
    const p = Math.round(num / amount * 10000);
    return p / 100;
}

function parsePromise(path) {
    return new Promise((resolve, reject) => {
        parse(path, function (err, data) {
            if (err) {
                reject(err);
                return;
            }

            resolve(data);
        });
    });
}

function cliReporter() {
    const styles = {
        reset: '\x1b[0m',
        bright: "\x1b[1m",
        dim: "\x1b[2m",
        underscore: "\x1b[4m",
        blink: "\x1b[5m",
        reverse: "\x1b[7m",
        hidden: "\x1b[8m",

        fg: {
            black: "\x1b[30m",
            red: "\x1b[31m",
            green: '\x1b[32m',
            yellow: "\x1b[33m",
            blue: "\x1b[34m",
            magenta: "\x1b[35m",
            cyan: "\x1b[36m",
            white: "\x1b[37m",
            crimson: "\x1b[38m" // Scarlet
        },
        bg: {
            black: "\x1b[40m",
            red: "\x1b[41m",
            green: "\x1b[42m",
            yellow: "\x1b[43m",
            blue: "\x1b[44m",
            magenta: "\x1b[45m",
            cyan: "\x1b[46m",
            white: "\x1b[47m",
            crimson: "\x1b[48m"
        }
    };

    function outputDiff(diff) {
        return diff ? `${diffColor(diff)}(${diffSign(diff)}${Math.abs(diff)})${styles.reset}` : '';

        function diffSign(num) {
            if (num > 0) {
                return '+';//'\u2191';'+';
            }

            if (num < 0) {
                return '-';//'\u2193';'-';
            }

            return '';
        }

        function diffColor(num) {
            if (num > 0) {
                return styles.fg.green;
            }

            if (num < 0) {
                return styles.fg.red;
            }
        }
    }

    function outputSummary(summary) {
        const line = summary.line;
        console.log(styleTitle('Summary'));
        console.log(`${styleTitle('Total lines:')} ${line.found}${outputDiff(line.foundDiff)}`);
        console.log(`${styleTitle('Covered lines:')} ${line.hit}${outputDiff(line.hitDiff)}`);
        console.log(`${styleTitle('Coverage:')} ${line.percent}${outputDiff(line.percentDiff)}${styles.reset}%`);
    }

    function styleTitle(text) {
        return `${styles.bg.cyan}${styles.fg.black}${text}${styles.reset}`;
    }

    function formatColumn(outputs, col, pad = 0) {
        let width = 0;

        outputs.forEach(l => {
            width = Math.max(l[col].length, width);
        });
        width += pad;

        outputs.forEach(l => {
            l[col] = l[col].padEnd(width);
        });
    }

    function outputDetails(details) {
        const outputs = details.map(f => {
            return [
                f.file,
                `${f.linePercent}${outputDiff(f.linePercentDiff)}%`,
                `${f.lineHit}${outputDiff(f.lineHitDiff)}/${f.lineFound}${outputDiff(f.lineFoundDiff)}`,
            ];
        });

        formatColumn(outputs, 0, 2);
        formatColumn(outputs, 1, 2);
        formatColumn(outputs, 2, 2);

        console.log(styleTitle('Details'));
        outputs.forEach(l => {
            console.log(`${styles.reset}${l[0]}${l[1]}${l[2]}`);
        });
    }
    return {
        outputSummary,
        outputDetails,
    };
}

module.exports = {
    diffCoverage,
}