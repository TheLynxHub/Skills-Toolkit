import { __commonJSMin } from "../../rolldown-runtime.mjs";
import "node:util";
import { stdin, stdout } from "node:process";
import * as l from "node:readline";
import l__default from "node:readline";
import { ReadStream } from "node:tty";
const getCodePointsLength = (() => {
	const SURROGATE_PAIR_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
	return (input) => {
		let surrogatePairsNr = 0;
		SURROGATE_PAIR_RE.lastIndex = 0;
		while (SURROGATE_PAIR_RE.test(input)) surrogatePairsNr += 1;
		return input.length - surrogatePairsNr;
	};
})();
const isFullWidth = (x) => {
	return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
};
const isWideNotCJKTNotEmoji = (x) => {
	return x === 8987 || x === 9001 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12771 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 19903 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
};
const ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u001b\]8;[^;]*;.*?(?:\u0007|\u001b\u005c)/y;
const CONTROL_RE = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y;
const CJKT_WIDE_RE = /(?:(?![\uFF61-\uFF9F\uFF00-\uFFEF])[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Tangut}]){1,1000}/uy;
const TAB_RE = /\t{1,1000}/y;
const EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[\u{E0061}-\u{E007A}]{2}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,3}\u{E007F}|(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})(?:\u200D(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F\u20E3?))*/uy;
const LATIN_RE = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y;
const MODIFIER_RE = /\p{M}+/gu;
const NO_TRUNCATION$1 = {
	limit: Infinity,
	ellipsis: ""
};
const getStringTruncatedWidth = (input, truncationOptions = {}, widthOptions = {}) => {
	const LIMIT = truncationOptions.limit ?? Infinity;
	const ELLIPSIS = truncationOptions.ellipsis ?? "";
	const ELLIPSIS_WIDTH = truncationOptions?.ellipsisWidth ?? (ELLIPSIS ? getStringTruncatedWidth(ELLIPSIS, NO_TRUNCATION$1, widthOptions).width : 0);
	const ANSI_WIDTH = 0;
	const CONTROL_WIDTH = widthOptions.controlWidth ?? 0;
	const TAB_WIDTH = widthOptions.tabWidth ?? 8;
	const EMOJI_WIDTH = widthOptions.emojiWidth ?? 2;
	const FULL_WIDTH_WIDTH = 2;
	const REGULAR_WIDTH = widthOptions.regularWidth ?? 1;
	const WIDE_WIDTH = widthOptions.wideWidth ?? FULL_WIDTH_WIDTH;
	const PARSE_BLOCKS = [
		[LATIN_RE, REGULAR_WIDTH],
		[ANSI_RE, ANSI_WIDTH],
		[CONTROL_RE, CONTROL_WIDTH],
		[TAB_RE, TAB_WIDTH],
		[EMOJI_RE, EMOJI_WIDTH],
		[CJKT_WIDE_RE, WIDE_WIDTH]
	];
	let indexPrev = 0;
	let index = 0;
	let length = input.length;
	let lengthExtra = 0;
	let truncationEnabled = false;
	let truncationIndex = length;
	let truncationLimit = Math.max(0, LIMIT - ELLIPSIS_WIDTH);
	let unmatchedStart = 0;
	let unmatchedEnd = 0;
	let width = 0;
	let widthExtra = 0;
	outer: while (true) {
		if (unmatchedEnd > unmatchedStart || index >= length && index > indexPrev) {
			const unmatched = input.slice(unmatchedStart, unmatchedEnd) || input.slice(indexPrev, index);
			lengthExtra = 0;
			for (const char of unmatched.replaceAll(MODIFIER_RE, "")) {
				const codePoint = char.codePointAt(0) || 0;
				if (isFullWidth(codePoint)) widthExtra = FULL_WIDTH_WIDTH;
				else if (isWideNotCJKTNotEmoji(codePoint)) widthExtra = WIDE_WIDTH;
				else widthExtra = REGULAR_WIDTH;
				if (width + widthExtra > truncationLimit) truncationIndex = Math.min(truncationIndex, Math.max(unmatchedStart, indexPrev) + lengthExtra);
				if (width + widthExtra > LIMIT) {
					truncationEnabled = true;
					break outer;
				}
				lengthExtra += char.length;
				width += widthExtra;
			}
			unmatchedStart = unmatchedEnd = 0;
		}
		if (index >= length) break outer;
		for (let i = 0, l = PARSE_BLOCKS.length; i < l; i++) {
			const [BLOCK_RE, BLOCK_WIDTH] = PARSE_BLOCKS[i];
			BLOCK_RE.lastIndex = index;
			if (BLOCK_RE.test(input)) {
				lengthExtra = BLOCK_RE === CJKT_WIDE_RE ? getCodePointsLength(input.slice(index, BLOCK_RE.lastIndex)) : BLOCK_RE === EMOJI_RE ? 1 : BLOCK_RE.lastIndex - index;
				widthExtra = lengthExtra * BLOCK_WIDTH;
				if (width + widthExtra > truncationLimit) truncationIndex = Math.min(truncationIndex, index + Math.floor((truncationLimit - width) / BLOCK_WIDTH));
				if (width + widthExtra > LIMIT) {
					truncationEnabled = true;
					break outer;
				}
				width += widthExtra;
				unmatchedStart = indexPrev;
				unmatchedEnd = index;
				index = indexPrev = BLOCK_RE.lastIndex;
				continue outer;
			}
		}
		index += 1;
	}
	return {
		width: truncationEnabled ? truncationLimit : width,
		index: truncationEnabled ? truncationIndex : length,
		truncated: truncationEnabled,
		ellipsed: truncationEnabled && LIMIT >= ELLIPSIS_WIDTH
	};
};
const NO_TRUNCATION = {
	limit: Infinity,
	ellipsis: "",
	ellipsisWidth: 0
};
const fastStringWidth = (input, options = {}) => {
	return getStringTruncatedWidth(input, NO_TRUNCATION, options).width;
};
const ESC = "\x1B";
const CSI = "";
const END_CODE = 39;
const ANSI_ESCAPE_BELL = "\x07";
const ANSI_CSI = "[";
const ANSI_OSC = "]";
const ANSI_SGR_TERMINATOR = "m";
const ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
const GROUP_REGEX = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`, "y");
const getClosingCode = (openingCode) => {
	if (openingCode >= 30 && openingCode <= 37) return 39;
	if (openingCode >= 90 && openingCode <= 97) return 39;
	if (openingCode >= 40 && openingCode <= 47) return 49;
	if (openingCode >= 100 && openingCode <= 107) return 49;
	if (openingCode === 1 || openingCode === 2) return 22;
	if (openingCode === 3) return 23;
	if (openingCode === 4) return 24;
	if (openingCode === 7) return 27;
	if (openingCode === 8) return 28;
	if (openingCode === 9) return 29;
	if (openingCode === 0) return 0;
};
const wrapAnsiCode = (code) => `${ESC}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
const wrapAnsiHyperlink = (url) => `${ESC}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`;
const wrapWord = (rows, word, columns) => {
	const characters = word[Symbol.iterator]();
	let isInsideEscape = false;
	let isInsideLinkEscape = false;
	let lastRow = rows.at(-1);
	let visible = lastRow === void 0 ? 0 : fastStringWidth(lastRow);
	let currentCharacter = characters.next();
	let nextCharacter = characters.next();
	let rawCharacterIndex = 0;
	while (!currentCharacter.done) {
		const character = currentCharacter.value;
		const characterLength = fastStringWidth(character);
		if (visible + characterLength <= columns) rows[rows.length - 1] += character;
		else {
			rows.push(character);
			visible = 0;
		}
		if (character === ESC || character === CSI) {
			isInsideEscape = true;
			isInsideLinkEscape = word.startsWith(ANSI_ESCAPE_LINK, rawCharacterIndex + 1);
		}
		if (isInsideEscape) {
			if (isInsideLinkEscape) {
				if (character === ANSI_ESCAPE_BELL) {
					isInsideEscape = false;
					isInsideLinkEscape = false;
				}
			} else if (character === ANSI_SGR_TERMINATOR) isInsideEscape = false;
		} else {
			visible += characterLength;
			if (visible === columns && !nextCharacter.done) {
				rows.push("");
				visible = 0;
			}
		}
		currentCharacter = nextCharacter;
		nextCharacter = characters.next();
		rawCharacterIndex += character.length;
	}
	lastRow = rows.at(-1);
	if (!visible && lastRow !== void 0 && lastRow.length && rows.length > 1) rows[rows.length - 2] += rows.pop();
};
const stringVisibleTrimSpacesRight = (string) => {
	const words = string.split(" ");
	let last = words.length;
	while (last) {
		if (fastStringWidth(words[last - 1])) break;
		last--;
	}
	if (last === words.length) return string;
	return words.slice(0, last).join(" ") + words.slice(last).join("");
};
const exec = (string, columns, options = {}) => {
	if (options.trim !== false && string.trim() === "") return "";
	let returnValue = "";
	let escapeCode;
	let escapeUrl;
	const words = string.split(" ");
	let rows = [""];
	let rowLength = 0;
	for (let index = 0; index < words.length; index++) {
		const word = words[index];
		if (options.trim !== false) {
			const row = rows.at(-1) ?? "";
			const trimmed = row.trimStart();
			if (row.length !== trimmed.length) {
				rows[rows.length - 1] = trimmed;
				rowLength = fastStringWidth(trimmed);
			}
		}
		if (index !== 0) {
			if (rowLength >= columns && (options.wordWrap === false || options.trim === false)) {
				rows.push("");
				rowLength = 0;
			}
			if (rowLength || options.trim === false) {
				rows[rows.length - 1] += " ";
				rowLength++;
			}
		}
		const wordLength = fastStringWidth(word);
		if (options.hard && wordLength > columns) {
			const remainingColumns = columns - rowLength;
			const breaksStartingThisLine = 1 + Math.floor((wordLength - remainingColumns - 1) / columns);
			if (Math.floor((wordLength - 1) / columns) < breaksStartingThisLine) rows.push("");
			wrapWord(rows, word, columns);
			rowLength = fastStringWidth(rows.at(-1) ?? "");
			continue;
		}
		if (rowLength + wordLength > columns && rowLength && wordLength) {
			if (options.wordWrap === false && rowLength < columns) {
				wrapWord(rows, word, columns);
				rowLength = fastStringWidth(rows.at(-1) ?? "");
				continue;
			}
			rows.push("");
			rowLength = 0;
		}
		if (rowLength + wordLength > columns && options.wordWrap === false) {
			wrapWord(rows, word, columns);
			rowLength = fastStringWidth(rows.at(-1) ?? "");
			continue;
		}
		rows[rows.length - 1] += word;
		rowLength += wordLength;
	}
	if (options.trim !== false) rows = rows.map((row) => stringVisibleTrimSpacesRight(row));
	const preString = rows.join("\n");
	let inSurrogate = false;
	for (let i = 0; i < preString.length; i++) {
		const character = preString[i];
		returnValue += character;
		if (!inSurrogate) {
			inSurrogate = character >= "\ud800" && character <= "\udbff";
			if (inSurrogate) continue;
		} else inSurrogate = false;
		if (character === ESC || character === CSI) {
			GROUP_REGEX.lastIndex = i + 1;
			const groups = GROUP_REGEX.exec(preString)?.groups;
			if (groups?.code !== void 0) {
				const code = Number.parseFloat(groups.code);
				escapeCode = code === END_CODE ? void 0 : code;
			} else if (groups?.uri !== void 0) escapeUrl = groups.uri.length === 0 ? void 0 : groups.uri;
		}
		if (preString[i + 1] === "\n") {
			if (escapeUrl) returnValue += wrapAnsiHyperlink("");
			const closingCode = escapeCode ? getClosingCode(escapeCode) : void 0;
			if (escapeCode && closingCode) returnValue += wrapAnsiCode(closingCode);
		} else if (character === "\n") {
			if (escapeCode && getClosingCode(escapeCode)) returnValue += wrapAnsiCode(escapeCode);
			if (escapeUrl) returnValue += wrapAnsiHyperlink(escapeUrl);
		}
	}
	return returnValue;
};
const CRLF_OR_LF = /\r?\n/;
function wrapAnsi(string, columns, options) {
	return String(string).normalize().split(CRLF_OR_LF).map((line) => exec(line, columns, options)).join("\n");
}
var require_src = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const ESC = "\x1B";
	const CSI = `${ESC}[`;
	const beep = "\x07";
	const cursor = {
		to(x, y) {
			if (!y) return `${CSI}${x + 1}G`;
			return `${CSI}${y + 1};${x + 1}H`;
		},
		move(x, y) {
			let ret = "";
			if (x < 0) ret += `${CSI}${-x}D`;
			else if (x > 0) ret += `${CSI}${x}C`;
			if (y < 0) ret += `${CSI}${-y}A`;
			else if (y > 0) ret += `${CSI}${y}B`;
			return ret;
		},
		up: (count = 1) => `${CSI}${count}A`,
		down: (count = 1) => `${CSI}${count}B`,
		forward: (count = 1) => `${CSI}${count}C`,
		backward: (count = 1) => `${CSI}${count}D`,
		nextLine: (count = 1) => `${CSI}E`.repeat(count),
		prevLine: (count = 1) => `${CSI}F`.repeat(count),
		left: `${CSI}G`,
		hide: `${CSI}?25l`,
		show: `${CSI}?25h`,
		save: `${ESC}7`,
		restore: `${ESC}8`
	};
	module.exports = {
		cursor,
		scroll: {
			up: (count = 1) => `${CSI}S`.repeat(count),
			down: (count = 1) => `${CSI}T`.repeat(count)
		},
		erase: {
			screen: `${CSI}2J`,
			up: (count = 1) => `${CSI}1J`.repeat(count),
			down: (count = 1) => `${CSI}J`.repeat(count),
			line: `${CSI}2K`,
			lineEnd: `${CSI}K`,
			lineStart: `${CSI}1K`,
			lines(count) {
				let clear = "";
				for (let i = 0; i < count; i++) clear += this.line + (i < count - 1 ? cursor.up() : "");
				if (count) clear += cursor.left;
				return clear;
			}
		},
		beep
	};
}));
var import_src = require_src();
function findCursor(s, o, l) {
	if (!l.some((r) => !r.disabled)) return s;
	const t = s + o, n = Math.max(l.length - 1, 0), e = t < 0 ? n : t > n ? 0 : t;
	return l[e]?.disabled ? findCursor(e, o < 0 ? -1 : 1, l) : e;
}
const settings = {
	actions: /* @__PURE__ */ new Set([
		"up",
		"down",
		"left",
		"right",
		"space",
		"enter",
		"cancel"
	]),
	aliases: /* @__PURE__ */ new Map([
		["k", "up"],
		["j", "down"],
		["h", "left"],
		["l", "right"],
		["", "cancel"],
		["escape", "cancel"]
	]),
	messages: {
		cancel: "Canceled",
		error: "Something went wrong"
	},
	withGuide: true,
	date: {
		monthNames: [...[
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		]],
		messages: {
			required: "Please enter a valid date",
			invalidMonth: "There are only 12 months in a year",
			invalidDay: (n, e) => `There are only ${n} days in ${e}`,
			afterMin: (n) => `Date must be on or after ${n.toISOString().slice(0, 10)}`,
			beforeMax: (n) => `Date must be on or before ${n.toISOString().slice(0, 10)}`
		}
	}
};
function isActionKey(n, e) {
	if (typeof n == "string") return settings.aliases.get(n) === e;
	for (const s of n) if (s !== void 0 && isActionKey(s, e)) return true;
	return false;
}
function diffLines(i, s) {
	if (i === s) return;
	const e = i.split(`
`), t = s.split(`
`), r = Math.max(e.length, t.length), f = [];
	for (let n = 0; n < r; n++) e[n] !== t[n] && f.push(n);
	return {
		lines: f,
		numLinesBefore: e.length,
		numLinesAfter: t.length,
		numLines: r
	};
}
const R = globalThis.process.platform.startsWith("win");
const CANCEL_SYMBOL = Symbol("clack:cancel");
function isCancel(e) {
	return e === CANCEL_SYMBOL;
}
function setRawMode(e, r) {
	const o = e;
	o.isTTY && o.setRawMode(r);
}
function block({ input: e = stdin, output: r = stdout, overwrite: o = true, hideCursor: t = true } = {}) {
	const s = l.createInterface({
		input: e,
		output: r,
		prompt: "",
		tabSize: 1
	});
	l.emitKeypressEvents(e, s), e instanceof ReadStream && e.isTTY && e.setRawMode(true);
	const n = (f, { name: a, sequence: p }) => {
		if (isActionKey([
			String(f),
			a,
			p
		], "cancel")) {
			t && r.write(import_src.cursor.show), process.exit(0);
			return;
		}
		if (!o) return;
		const i = a === "return" ? 0 : -1, m = a === "return" ? -1 : 0;
		l.moveCursor(r, i, m, () => {
			l.clearLine(r, 1, () => {
				e.once("keypress", n);
			});
		});
	};
	return t && r.write(import_src.cursor.hide), e.once("keypress", n), () => {
		e.off("keypress", n), t && r.write(import_src.cursor.show), e instanceof ReadStream && e.isTTY && !R && e.setRawMode(false), s.terminal = false, s.close();
	};
}
const getColumns = (e) => "columns" in e && typeof e.columns == "number" ? e.columns : 80;
const getRows = (e) => "rows" in e && typeof e.rows == "number" ? e.rows : 20;
function wrapTextWithPrefix(e, r, o, t = o, s = o, n) {
	return wrapAnsi(r, getColumns(e ?? stdout) - o.length, {
		hard: true,
		trim: false
	}).split(`
`).map((c, i, m) => {
		const d = n ? n(c, i) : c;
		return i === 0 ? `${t}${d}` : i === m.length - 1 ? `${s}${d}` : `${o}${d}`;
	}).join(`
`);
}
function runValidation(e, n) {
	if ("~standard" in e) {
		const a = e["~standard"].validate(n);
		if (a instanceof Promise) throw new TypeError("Schema validation must be synchronous. Update `validate()` and remove any asynchronous logic.");
		return a.issues?.at(0)?.message;
	}
	return e(n);
}
var V = class {
	input;
	output;
	_abortSignal;
	rl;
	opts;
	_render;
	_track = false;
	_prevFrame = "";
	_subscribers = /* @__PURE__ */ new Map();
	_cursor = 0;
	state = "initial";
	error = "";
	value;
	userInput = "";
	constructor(t, e = true) {
		const { input: i = stdin, output: n = stdout, render: s, signal: r, ...o } = t;
		this.opts = o, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = s.bind(this), this._track = e, this._abortSignal = r, this.input = i, this.output = n;
	}
	unsubscribe() {
		this._subscribers.clear();
	}
	setSubscriber(t, e) {
		const i = this._subscribers.get(t) ?? [];
		i.push(e), this._subscribers.set(t, i);
	}
	on(t, e) {
		this.setSubscriber(t, { cb: e });
	}
	once(t, e) {
		this.setSubscriber(t, {
			cb: e,
			once: true
		});
	}
	emit(t, ...e) {
		const i = this._subscribers.get(t) ?? [], n = [];
		for (const s of i) s.cb(...e), s.once && n.push(() => i.splice(i.indexOf(s), 1));
		for (const s of n) s();
	}
	prompt() {
		return new Promise((t) => {
			if (this._abortSignal) {
				if (this._abortSignal.aborted) return this.state = "cancel", this.close(), t(CANCEL_SYMBOL);
				this._abortSignal.addEventListener("abort", () => {
					this.state = "cancel", this.close();
				}, { once: true });
			}
			this.rl = l__default.createInterface({
				input: this.input,
				tabSize: 2,
				prompt: "",
				escapeCodeTimeout: 50,
				terminal: true
			}), this.rl.prompt(), this.opts.initialUserInput !== void 0 && this._setUserInput(this.opts.initialUserInput, true), this.input.on("keypress", this.onKeypress), setRawMode(this.input, true), this.output.on("resize", this.render), this.render(), this.once("submit", () => {
				this.output.write(import_src.cursor.show), this.output.off("resize", this.render), setRawMode(this.input, false), t(this.value);
			}), this.once("cancel", () => {
				this.output.write(import_src.cursor.show), this.output.off("resize", this.render), setRawMode(this.input, false), t(CANCEL_SYMBOL);
			});
		});
	}
	_isActionKey(t, e) {
		return t === "	";
	}
	_shouldSubmit(t, e) {
		return true;
	}
	_setValue(t) {
		this.value = t, this.emit("value", this.value);
	}
	_setUserInput(t, e) {
		this.userInput = t ?? "", this.emit("userInput", this.userInput), e && this._track && this.rl && (this.rl.write(this.userInput), this._cursor = this.rl.cursor);
	}
	_clearUserInput() {
		this.rl?.write(null, {
			ctrl: true,
			name: "u"
		}), this._setUserInput("");
	}
	onKeypress(t, e) {
		if (this._track && e.name !== "return" && (e.name && this._isActionKey(t, e) && this.rl?.write(null, {
			ctrl: true,
			name: "h"
		}), this._cursor = this.rl?.cursor ?? 0, this._setUserInput(this.rl?.line)), this.state === "error" && (this.state = "active"), e?.name && (!this._track && settings.aliases.has(e.name) && this.emit("cursor", settings.aliases.get(e.name)), settings.actions.has(e.name) && this.emit("cursor", e.name)), t && (t.toLowerCase() === "y" || t.toLowerCase() === "n") && this.emit("confirm", t.toLowerCase() === "y"), this.emit("key", t, e), e?.name === "return" && this._shouldSubmit(t, e)) {
			if (this.opts.validate) {
				const i = runValidation(this.opts.validate, this.value);
				i && (this.error = i instanceof Error ? i.message : i, this.state = "error", this.rl?.write(this.userInput));
			}
			this.state !== "error" && (this.state = "submit");
		}
		isActionKey([
			t,
			e?.name,
			e?.sequence
		], "cancel") && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
	}
	close() {
		this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), setRawMode(this.input, false), this.rl?.close(), this.rl = void 0, this.emit(`${this.state}`, this.value), this.unsubscribe();
	}
	restoreCursor() {
		const t = wrapAnsi(this._prevFrame, process.stdout.columns, {
			hard: true,
			trim: false
		}).split(`
`).length - 1;
		this.output.write(import_src.cursor.move(-999, t * -1));
	}
	render() {
		const t = wrapAnsi(this._render(this) ?? "", process.stdout.columns, {
			hard: true,
			trim: false
		});
		if (t !== this._prevFrame) {
			if (this.state === "initial") this.output.write(import_src.cursor.hide);
			else {
				const e = diffLines(this._prevFrame, t), i = getRows(this.output);
				if (this.restoreCursor(), e) {
					const n = Math.max(0, e.numLinesAfter - i), s = Math.max(0, e.numLinesBefore - i);
					let r = e.lines.find((o) => o >= n);
					if (r === void 0) {
						this._prevFrame = t;
						return;
					}
					if (e.lines.length === 1) {
						this.output.write(import_src.cursor.move(0, r - s)), this.output.write(import_src.erase.lines(1));
						const o = t.split(`
`);
						this.output.write(o[r]), this._prevFrame = t, this.output.write(import_src.cursor.move(0, o.length - r - 1));
						return;
					} else if (e.lines.length > 1) {
						if (n < s) r = n;
						else {
							const h = r - s;
							h > 0 && this.output.write(import_src.cursor.move(0, h));
						}
						this.output.write(import_src.erase.down());
						const f = t.split(`
`).slice(r);
						this.output.write(f.join(`
`)), this._prevFrame = t;
						return;
					}
				}
				this.output.write(import_src.erase.down());
			}
			this.output.write(t), this.state === "initial" && (this.state = "active"), this._prevFrame = t;
		}
	}
};
var r = class extends V {
	get cursor() {
		return this.value ? 0 : 1;
	}
	get _value() {
		return this.cursor === 0;
	}
	constructor(t) {
		super(t, false), this.value = !!t.initialValue, this.on("userInput", () => {
			this.value = this._value;
		}), this.on("confirm", (i) => {
			this.output.write(import_src.cursor.move(0, -1)), this.value = i, this.state = "submit", this.close();
		}), this.on("cursor", () => {
			this.value = !this.value;
		});
	}
};
var a = class extends V {
	options;
	cursor = 0;
	get _value() {
		return this.options[this.cursor]?.value;
	}
	get _enabledOptions() {
		return this.options.filter((e) => e.disabled !== true);
	}
	toggleAll() {
		const e = this._enabledOptions, i = this.value !== void 0 && this.value.length === e.length;
		this.value = i ? [] : e.map((t) => t.value);
	}
	toggleInvert() {
		const e = this.value;
		if (!e) return;
		const i = this._enabledOptions.filter((t) => !e.includes(t.value));
		this.value = i.map((t) => t.value);
	}
	toggleValue() {
		this.value === void 0 && (this.value = []);
		const e = this.value.includes(this._value);
		this.value = e ? this.value.filter((i) => i !== this._value) : [...this.value, this._value];
	}
	constructor(e) {
		super(e, false), this.options = e.options, this.value = [...e.initialValues ?? []];
		const i = Math.max(this.options.findIndex(({ value: t }) => t === e.cursorAt), 0);
		this.cursor = this.options[i]?.disabled ? findCursor(i, 1, this.options) : i, this.on("key", (t, l) => {
			l.name === "a" && this.toggleAll(), l.name === "i" && this.toggleInvert();
		}), this.on("cursor", (t) => {
			switch (t) {
				case "left":
				case "up":
					this.cursor = findCursor(this.cursor, -1, this.options);
					break;
				case "down":
				case "right":
					this.cursor = findCursor(this.cursor, 1, this.options);
					break;
				case "space":
					this.toggleValue();
					break;
			}
		});
	}
};
let n$1 = class n extends V {
	options;
	cursor = 0;
	get _selectedValue() {
		return this.options[this.cursor];
	}
	changeValue() {
		const e = this._selectedValue;
		this.value = e === void 0 ? void 0 : e.value;
	}
	constructor(e) {
		super(e, false), this.options = e.options;
		const o = this.options.findIndex(({ value: s }) => s === e.initialValue), t = o === -1 ? 0 : o;
		this.cursor = this.options[t]?.disabled ? findCursor(t, 1, this.options) : t, this.changeValue(), this.on("cursor", (s) => {
			switch (s) {
				case "left":
				case "up":
					this.cursor = findCursor(this.cursor, -1, this.options);
					break;
				case "down":
				case "right":
					this.cursor = findCursor(this.cursor, 1, this.options);
					break;
			}
			this.changeValue();
		});
	}
};
export { a, block, fastStringWidth, getColumns, getRows, isCancel, n$1, r, require_src, settings, wrapAnsi, wrapTextWithPrefix };
