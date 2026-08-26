import { a, block, fastStringWidth, getColumns, getRows, n$1, r, require_src, settings, wrapAnsi, wrapTextWithPrefix } from "./core.mjs";
import { styleText } from "node:util";
import process$1 from "node:process";
import "node:path";
var import_src = require_src();
function isUnicodeSupported() {
	if (process$1.platform !== "win32") return process$1.env.TERM !== "linux";
	return Boolean(process$1.env.CI) || Boolean(process$1.env.WT_SESSION) || Boolean(process$1.env.TERMINUS_SUBLIME) || process$1.env.ConEmuTask === "{cmd::Cmder}" || process$1.env.TERM_PROGRAM === "Terminus-Sublime" || process$1.env.TERM_PROGRAM === "vscode" || process$1.env.TERM === "xterm-256color" || process$1.env.TERM === "alacritty" || process$1.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
const unicode = isUnicodeSupported();
const isCI = () => process.env.CI === "true";
const unicodeOr = (o, e) => unicode ? o : e;
const S_STEP_ACTIVE = unicodeOr("◆", "*");
const S_STEP_CANCEL = unicodeOr("■", "x");
const S_STEP_ERROR = unicodeOr("▲", "x");
const S_STEP_SUBMIT = unicodeOr("◇", "o");
const S_BAR_START = unicodeOr("┌", "T");
const S_BAR = unicodeOr("│", "|");
const S_BAR_END = unicodeOr("└", "—");
const S_RADIO_ACTIVE = unicodeOr("●", ">");
const S_RADIO_INACTIVE = unicodeOr("○", " ");
const S_CHECKBOX_ACTIVE = unicodeOr("◻", "[•]");
const S_CHECKBOX_SELECTED = unicodeOr("◼", "[+]");
const S_CHECKBOX_INACTIVE = unicodeOr("◻", "[ ]");
const S_BAR_H = unicodeOr("─", "-");
const S_CORNER_TOP_RIGHT = unicodeOr("╮", "+");
const S_CONNECT_LEFT = unicodeOr("├", "+");
const S_CORNER_BOTTOM_RIGHT = unicodeOr("╯", "+");
const S_CORNER_BOTTOM_LEFT = unicodeOr("╰", "+");
const S_INFO = unicodeOr("●", "•");
const S_SUCCESS = unicodeOr("◆", "*");
const S_WARN = unicodeOr("▲", "!");
const S_ERROR = unicodeOr("■", "x");
const symbol = (o) => {
	switch (o) {
		case "initial":
		case "active": return styleText("cyan", S_STEP_ACTIVE);
		case "cancel": return styleText("red", S_STEP_CANCEL);
		case "error": return styleText("yellow", S_STEP_ERROR);
		case "submit": return styleText("green", S_STEP_SUBMIT);
	}
};
const symbolBar = (o) => {
	switch (o) {
		case "initial":
		case "active": return styleText("cyan", S_BAR);
		case "cancel": return styleText("red", S_BAR);
		case "error": return styleText("yellow", S_BAR);
		case "submit": return styleText("green", S_BAR);
	}
};
function formatInstructionFooter(o, e) {
	const r = [`${e ? `${styleText("cyan", S_BAR)}  ` : ""}${o.join(" • ")}`];
	return e && r.push(styleText("cyan", S_BAR_END)), r;
}
const I = (l, e, w, p, b, C = false) => {
	let r = e, O = 0;
	if (C) for (let i = p - 1; i >= w; i--) {
		const m = l[i];
		if (m && (r -= m.length), O++, r <= b) break;
	}
	else for (let i = w; i < p; i++) {
		const m = l[i];
		if (m && (r -= m.length), O++, r <= b) break;
	}
	return {
		lineCount: r,
		removals: O
	};
};
const limitOptions = ({ cursor: l, options: e, style: w, output: p = process.stdout, maxItems: b = Number.POSITIVE_INFINITY, columnPadding: C = 0, rowPadding: r = 4 }) => {
	const i = getColumns(p) - C, m = getRows(p), M = styleText("dim", "..."), v = Math.max(m - r, 0), a = Math.max(Math.min(b, v), 5);
	let f = 0;
	l >= a - 3 && (f = Math.max(Math.min(l - a + 3, e.length - a), 0));
	let d = a < e.length && f > 0, c = a < e.length && f + a < e.length;
	const W = Math.min(f + a, e.length), s = [];
	let g = 0;
	d && g++, c && g++;
	const T = f + (d ? 1 : 0), y = W - (c ? 1 : 0);
	for (let t = T; t < y; t++) {
		const n = e[t], h = wrapAnsi(n ? w(n, t === l) : "", i, {
			hard: true,
			trim: false
		}).split(`
`);
		s.push(h), g += h.length;
	}
	if (g > v) {
		let t = 0, n = 0, o = g;
		const h = l - T;
		let u = v;
		const L = () => I(s, o, 0, h, u), E = () => I(s, o, h + 1, s.length, u, true);
		d ? ({lineCount: o, removals: t} = L(), o > u && (c || (u -= 1), {lineCount: o, removals: n} = E())) : (c || (u -= 1), {lineCount: o, removals: n} = E(), o > u && (u -= 1, {lineCount: o, removals: t} = L())), t > 0 && (d = true, s.splice(0, t)), n > 0 && (c = true, s.splice(s.length - n, n));
	}
	const x = [];
	d && x.push(M);
	for (const t of s) for (const n of t) x.push(n);
	return c && x.push(M), x;
};
const confirm = (i) => {
	const a = i.active ?? "Yes", s = i.inactive ?? "No";
	return new r({
		active: a,
		inactive: s,
		signal: i.signal,
		input: i.input,
		output: i.output,
		initialValue: i.initialValue ?? true,
		render() {
			const e = i.withGuide ?? settings.withGuide, u = `${symbol(this.state)}  `, l = e ? `${styleText("gray", S_BAR)}  ` : "", f = wrapTextWithPrefix(i.output, i.message, l, u), o = `${e ? `${styleText("gray", S_BAR)}
` : ""}${f}
`, c = this.value ? a : s;
			switch (this.state) {
				case "submit": return `${o}${e ? `${styleText("gray", S_BAR)}  ` : ""}${styleText("dim", c)}`;
				case "cancel": return `${o}${e ? `${styleText("gray", S_BAR)}  ` : ""}${styleText(["strikethrough", "dim"], c)}${e ? `
${styleText("gray", S_BAR)}` : ""}`;
				default: {
					const r = e ? `${styleText("cyan", S_BAR)}  ` : "", g = e ? styleText("cyan", S_BAR_END) : "";
					return `${o}${r}${this.value ? `${styleText("green", S_RADIO_ACTIVE)} ${a}` : `${styleText("dim", S_RADIO_INACTIVE)} ${styleText("dim", a)}`}${i.vertical ? e ? `
${styleText("cyan", S_BAR)}  ` : `
` : ` ${styleText("dim", "/")} `}${this.value ? `${styleText("dim", S_RADIO_INACTIVE)} ${styleText("dim", s)}` : `${styleText("green", S_RADIO_ACTIVE)} ${s}`}
${g}
`;
				}
			}
		}
	}).prompt();
};
const MULTISELECT_INSTRUCTIONS = [
	`${styleText("dim", "↑/↓")} to navigate`,
	`${styleText("dim", "Space:")} select`,
	`${styleText("dim", "Enter:")} confirm`
];
const m = (i, u) => i.split(`
`).map((d) => u(d)).join(`
`);
const multiselect = (i) => {
	const u = (t, a) => {
		const r = t.label ?? String(t.value);
		return a === "disabled" ? `${styleText("gray", S_CHECKBOX_INACTIVE)} ${m(r, (o) => styleText(["strikethrough", "gray"], o))}${t.hint ? ` ${styleText("dim", `(${t.hint ?? "disabled"})`)}` : ""}` : a === "active" ? `${styleText("cyan", S_CHECKBOX_ACTIVE)} ${r}${t.hint ? ` ${styleText("dim", `(${t.hint})`)}` : ""}` : a === "selected" ? `${styleText("green", S_CHECKBOX_SELECTED)} ${m(r, (o) => styleText("dim", o))}${t.hint ? ` ${styleText("dim", `(${t.hint})`)}` : ""}` : a === "cancelled" ? `${m(r, (o) => styleText(["strikethrough", "dim"], o))}` : a === "active-selected" ? `${styleText("green", S_CHECKBOX_SELECTED)} ${r}${t.hint ? ` ${styleText("dim", `(${t.hint})`)}` : ""}` : a === "submitted" ? `${m(r, (o) => styleText("dim", o))}` : `${styleText("dim", S_CHECKBOX_INACTIVE)} ${m(r, (o) => styleText("dim", o))}`;
	}, d = i.required ?? true, v = i.showInstructions ?? true;
	return new a({
		options: i.options,
		signal: i.signal,
		input: i.input,
		output: i.output,
		initialValues: i.initialValues,
		required: d,
		cursorAt: i.cursorAt,
		validate(t) {
			if (d && (t === void 0 || t.length === 0)) return `Please select at least one option.
${styleText("reset", styleText("dim", `Press ${styleText([
				"gray",
				"bgWhite",
				"inverse"
			], " space ")} to select, ${styleText("gray", styleText("bgWhite", styleText("inverse", " enter ")))} to submit`))}`;
		},
		render() {
			const t = i.withGuide ?? settings.withGuide, a = wrapTextWithPrefix(i.output, i.message, t ? `${symbolBar(this.state)}  ` : "", `${symbol(this.state)}  `), r = `${t ? `${styleText("gray", S_BAR)}
` : ""}${a}
`, o = this.value ?? [], p = (n, l) => {
				if (n.disabled) return u(n, "disabled");
				const s = o.includes(n.value);
				return l && s ? u(n, "active-selected") : s ? u(n, "selected") : u(n, l ? "active" : "inactive");
			};
			switch (this.state) {
				case "submit": {
					const n = this.options.filter(({ value: s }) => o.includes(s)).map((s) => u(s, "submitted")).join(styleText("dim", ", ")) || styleText("dim", "none");
					return `${r}${wrapTextWithPrefix(i.output, n, t ? `${styleText("gray", S_BAR)}  ` : "")}`;
				}
				case "cancel": {
					const n = this.options.filter(({ value: s }) => o.includes(s)).map((s) => u(s, "cancelled")).join(styleText("dim", ", "));
					if (n.trim() === "") return `${r}${styleText("gray", S_BAR)}`;
					return `${r}${wrapTextWithPrefix(i.output, n, t ? `${styleText("gray", S_BAR)}  ` : "")}${t ? `
${styleText("gray", S_BAR)}` : ""}`;
				}
				case "error": {
					const n = t ? `${styleText("yellow", S_BAR)}  ` : "", l = this.error.split(`
`).map(($, C) => C === 0 ? `${t ? `${styleText("yellow", S_BAR_END)}  ` : ""}${styleText("yellow", $)}` : `   ${$}`).join(`
`), s = r.split(`
`).length, h = l.split(`
`).length + 1;
					return `${r}${n}${limitOptions({
						output: i.output,
						options: this.options,
						cursor: this.cursor,
						maxItems: i.maxItems,
						columnPadding: n.length,
						rowPadding: s + h,
						style: p
					}).join(`
${n}`)}
${l}
`;
				}
				default: {
					const n = t ? `${styleText("cyan", S_BAR)}  ` : "", l = r.split(`
`).length, s = v ? formatInstructionFooter(MULTISELECT_INSTRUCTIONS, t) : t ? [styleText("cyan", S_BAR_END)] : [], h = s.join(`
`), $ = s.length + 1;
					return `${r}${n}${limitOptions({
						output: i.output,
						options: this.options,
						cursor: this.cursor,
						maxItems: i.maxItems,
						columnPadding: n.length,
						rowPadding: l + $,
						style: p
					}).join(`
${n}`)}
${h}
`;
				}
			}
		}
	}).prompt();
};
const log = {
	message: (s = [], { symbol: e = styleText("gray", S_BAR), secondarySymbol: r = styleText("gray", S_BAR), output: m = process.stdout, spacing: l = 1, withGuide: c } = {}) => {
		const t = [], o = c ?? settings.withGuide, f = o ? r : "", O = o ? `${e}  ` : "", u = o ? `${r}  ` : "";
		for (let i = 0; i < l; i++) t.push(f);
		const g = Array.isArray(s) ? s : s.split(`
`);
		if (g.length > 0) {
			const [i, ...y] = g;
			i.length > 0 ? t.push(`${O}${i}`) : t.push(o ? e : "");
			for (const p of y) p.length > 0 ? t.push(`${u}${p}`) : t.push(o ? r : "");
		}
		m.write(`${t.join(`
`)}
`);
	},
	info: (s, e) => {
		log.message(s, {
			...e,
			symbol: styleText("blue", S_INFO)
		});
	},
	success: (s, e) => {
		log.message(s, {
			...e,
			symbol: styleText("green", S_SUCCESS)
		});
	},
	step: (s, e) => {
		log.message(s, {
			...e,
			symbol: styleText("green", S_STEP_SUBMIT)
		});
	},
	warn: (s, e) => {
		log.message(s, {
			...e,
			symbol: styleText("yellow", S_WARN)
		});
	},
	warning: (s, e) => {
		log.warn(s, e);
	},
	error: (s, e) => {
		log.message(s, {
			...e,
			symbol: styleText("red", S_ERROR)
		});
	}
};
const cancel = (o = "", t) => {
	const i = t?.output ?? process.stdout, e = t?.withGuide ?? settings.withGuide ? `${styleText("gray", S_BAR_END)}  ` : "";
	i.write(`${e}${styleText("red", o)}

`);
};
const intro = (o = "", t) => {
	const i = t?.output ?? process.stdout, e = t?.withGuide ?? settings.withGuide ? `${styleText("gray", S_BAR_START)}  ` : "";
	i.write(`${e}${o}
`);
};
const outro = (o = "", t) => {
	const i = t?.output ?? process.stdout, e = t?.withGuide ?? settings.withGuide ? `${styleText("gray", S_BAR)}
${styleText("gray", S_BAR_END)}  ` : "";
	i.write(`${e}${o}

`);
};
const W$1 = (o) => o;
const C = (o, e, s) => {
	const a = {
		hard: true,
		trim: false
	}, i = wrapAnsi(o, e, a).split(`
`), c = i.reduce((n, t) => Math.max(fastStringWidth(t), n), 0);
	return wrapAnsi(o, e - (i.map(s).reduce((n, t) => Math.max(fastStringWidth(t), n), 0) - c), a);
};
const note = (o = "", e = "", s) => {
	const a = s?.output ?? process$1.stdout, i = s?.withGuide ?? settings.withGuide, c = s?.format ?? W$1, g = [
		"",
		...C(o, getColumns(a) - 6, c).split(`
`).map(c),
		""
	], n = fastStringWidth(e), t = Math.max(g.reduce((m, F) => {
		const O = fastStringWidth(F);
		return O > m ? O : m;
	}, 0), n) + 2, h = g.map((m) => `${styleText("gray", S_BAR)}  ${m}${" ".repeat(t - fastStringWidth(m))}${styleText("gray", S_BAR)}`).join(`
`), T = i ? `${styleText("gray", S_BAR)}
` : "", l$1 = i ? S_CONNECT_LEFT : S_CORNER_BOTTOM_LEFT;
	a.write(`${T}${styleText("green", S_STEP_SUBMIT)}  ${styleText("reset", e)} ${styleText("gray", S_BAR_H.repeat(Math.max(t - n - 1, 1)) + S_CORNER_TOP_RIGHT)}
${h}
${styleText("gray", l$1 + S_BAR_H.repeat(t + 2) + S_CORNER_BOTTOM_RIGHT)}
`);
};
const W = (l) => styleText("magenta", l);
const spinner = ({ indicator: l = "dots", onCancel: h, output: n = process.stdout, cancelMessage: G, errorMessage: O, frames: E = unicode ? [
	"◒",
	"◐",
	"◓",
	"◑"
] : [
	"•",
	"o",
	"O",
	"0"
], delay: F = unicode ? 80 : 120, signal: m, ...I } = {}) => {
	const u = isCI();
	let M, T, d = false, S = false, s = "", p, w = performance.now();
	const x = getColumns(n), k = I?.styleFrame ?? W, g = (e) => {
		const r = e > 1 ? O ?? settings.messages.error : G ?? settings.messages.cancel;
		S = e === 1, d && (a(r, e), S && typeof h == "function" && h());
	}, f = () => g(2), i = () => g(1), A = () => {
		process.on("uncaughtExceptionMonitor", f), process.on("unhandledRejection", f), process.on("SIGINT", i), process.on("SIGTERM", i), process.on("exit", g), m && m.addEventListener("abort", i);
	}, H = () => {
		process.removeListener("uncaughtExceptionMonitor", f), process.removeListener("unhandledRejection", f), process.removeListener("SIGINT", i), process.removeListener("SIGTERM", i), process.removeListener("exit", g), m && m.removeEventListener("abort", i);
	}, y = () => {
		if (p === void 0) return;
		u && n.write(`
`);
		const r = wrapAnsi(p, x, {
			hard: true,
			trim: false
		}).split(`
`);
		r.length > 1 && n.write(import_src.cursor.up(r.length - 1)), n.write(import_src.cursor.to(0)), n.write(import_src.erase.down());
	}, C = (e) => e.replace(/\.+$/, ""), _ = (e) => {
		const r = (performance.now() - e) / 1e3, t = Math.floor(r / 60), o = Math.floor(r % 60);
		return t > 0 ? `[${t}m ${o}s]` : `[${o}s]`;
	}, N = I.withGuide ?? settings.withGuide, P = (e = "") => {
		d = true, M = block({ output: n }), s = C(e), w = performance.now(), N && n.write(`${styleText("gray", S_BAR)}
`);
		let r = 0, t = 0;
		A(), T = setInterval(() => {
			if (u && s === p) return;
			y(), p = s;
			const o = k(E[r]);
			let v;
			if (u) v = `${o}  ${s}...`;
			else if (l === "timer") v = `${o}  ${s} ${_(w)}`;
			else {
				const B = ".".repeat(Math.floor(t)).slice(0, 3);
				v = `${o}  ${s}${B}`;
			}
			const j = wrapAnsi(v, x, {
				hard: true,
				trim: false
			});
			n.write(j), r = r + 1 < E.length ? r + 1 : 0, t = t < 4 ? t + .125 : 0;
		}, F);
	}, a = (e = "", r = 0, t = false) => {
		if (!d) return;
		d = false, clearInterval(T), y();
		const o = r === 0 ? styleText("green", S_STEP_SUBMIT) : r === 1 ? styleText("red", S_STEP_CANCEL) : styleText("red", S_STEP_ERROR);
		s = e ?? s, t || (l === "timer" ? n.write(`${o}  ${s} ${_(w)}
`) : n.write(`${o}  ${s}
`)), H(), M();
	};
	return {
		start: P,
		stop: (e = "") => a(e, 0),
		message: (e = "") => {
			s = C(e ?? s);
		},
		cancel: (e = "") => a(e, 1),
		error: (e = "") => a(e, 2),
		clear: () => a("", 0, true),
		get isCancelled() {
			return S;
		}
	};
};
const SELECT_INSTRUCTIONS = [`${styleText("dim", "↑/↓")} to navigate`, `${styleText("dim", "Enter:")} confirm`];
const c = (t, o) => t.includes(`
`) ? t.split(`
`).map((d) => o(d)).join(`
`) : o(t);
const select = (t) => {
	const o = (n, m) => {
		if (n === void 0) return "";
		const s = n.label ?? String(n.value);
		switch (m) {
			case "disabled": return `${styleText("gray", S_RADIO_INACTIVE)} ${c(s, (i) => styleText("gray", i))}${n.hint ? ` ${styleText("dim", `(${n.hint ?? "disabled"})`)}` : ""}`;
			case "selected": return `${c(s, (i) => styleText("dim", i))}`;
			case "active": return `${styleText("green", S_RADIO_ACTIVE)} ${s}${n.hint ? ` ${styleText("dim", `(${n.hint})`)}` : ""}`;
			case "cancelled": return `${c(s, (i) => styleText(["strikethrough", "dim"], i))}`;
			default: return `${styleText("dim", S_RADIO_INACTIVE)} ${c(s, (i) => styleText("dim", i))}`;
		}
	}, d = t.showInstructions ?? true;
	return new n$1({
		options: t.options,
		signal: t.signal,
		input: t.input,
		output: t.output,
		initialValue: t.initialValue,
		render() {
			const n = t.withGuide ?? settings.withGuide, m = `${symbol(this.state)}  `, s = `${symbolBar(this.state)}  `, i = wrapTextWithPrefix(t.output, t.message, s, m), u = `${n ? `${styleText("gray", S_BAR)}
` : ""}${i}
`;
			switch (this.state) {
				case "submit": {
					const r = n ? `${styleText("gray", S_BAR)}  ` : "";
					return `${u}${wrapTextWithPrefix(t.output, o(this.options[this.cursor], "selected"), r)}`;
				}
				case "cancel": {
					const r = n ? `${styleText("gray", S_BAR)}  ` : "";
					return `${u}${wrapTextWithPrefix(t.output, o(this.options[this.cursor], "cancelled"), r)}${n ? `
${styleText("gray", S_BAR)}` : ""}`;
				}
				default: {
					const r = n ? `${styleText("cyan", S_BAR)}  ` : "", a = u.split(`
`).length, p = d ? formatInstructionFooter(SELECT_INSTRUCTIONS, n) : n ? [styleText("cyan", S_BAR_END)] : [], b = p.join(`
`), f = p.length + 1;
					return `${u}${r}${limitOptions({
						output: t.output,
						cursor: this.cursor,
						options: this.options,
						maxItems: t.maxItems,
						columnPadding: r.length,
						rowPadding: a + f,
						style: (g, x) => o(g, g.disabled ? "disabled" : x ? "active" : "inactive")
					}).join(`
${r}`)}
${b}
`;
				}
			}
		}
	}).prompt();
};
`${styleText("gray", S_BAR)}`;
export { cancel, confirm, intro, log, multiselect, note, outro, select, spinner };
