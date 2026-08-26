import { o, r } from "./args-pathspec.mjs";
function* U(e, t) {
	const n = t === "global";
	for (const o of e) o.isGlobal === n && (yield o);
}
const k = /* @__PURE__ */ new Set([
	"--add",
	"--edit",
	"--remove-section",
	"--rename-section",
	"--replace-all",
	"--unset",
	"--unset-all",
	"-e"
]);
const S = /* @__PURE__ */ new Set([
	"--get",
	"--get-all",
	"--get-color",
	"--get-colorbool",
	"--get-regexp",
	"--get-urlmatch",
	"--list",
	"-l"
]);
const P = /* @__PURE__ */ new Set([
	"edit",
	"remove-section",
	"rename-section",
	"set",
	"unset"
]);
const E = /* @__PURE__ */ new Set([
	"get",
	"get-color",
	"get-colorbool",
	"list"
]);
function F(e, t) {
	for (const { name: o } of U(e, "task")) {
		if (k.has(o)) return p(!0, t);
		if (S.has(o)) return p(!1, t);
	}
	const n = t.at(0)?.toLowerCase();
	return n === void 0 ? null : P.has(n) ? p(!0, t.slice(1)) : E.has(n) ? p(!1, t.slice(1)) : t.length === 1 ? p(!1, t) : p(!0, t);
}
function p(e = !1, t = []) {
	const n = t.at(0)?.toLowerCase();
	return n === void 0 ? null : {
		isWrite: e,
		isRead: !e,
		key: n,
		value: t.at(1)
	};
}
function A(e, t) {
	return t.isWrite && t.value !== void 0 ? {
		key: t.key,
		value: t.value,
		scope: e
	} : {
		key: t.key,
		scope: e
	};
}
function M(e) {
	const t = e?.indexOf("=") || -1;
	return !e || t < 0 ? null : {
		key: e.slice(0, t).trim().toLowerCase(),
		value: e.slice(t + 1)
	};
}
function N(e) {
	for (const { name: t } of U(e, "task")) switch (t) {
		case "--global": return "global";
		case "--system": return "system";
		case "--worktree": return "worktree";
		case "--local": return "local";
		case "--file":
		case "-f": return "file";
	}
	return "local";
}
function G({ name: e }) {
	if (e === "-c" || e === "--config") return "inline";
	if (e === "--config-env") return "env";
}
function* O(e) {
	for (const t of e) {
		const n = G(t), o = n && M(t.value);
		o && (yield {
			...o,
			scope: n
		});
	}
}
function L(e, t, n) {
	const o = {
		read: [],
		write: [...O(t)]
	};
	return e === "config" && $(o, N(t), F(t, n)), o;
}
function $(e, t, n) {
	if (n === null) return;
	const o = A(t, n);
	n.isWrite ? e.write.push(o) : e.read.push(o);
}
const x = { short: /* @__PURE__ */ new Map([["c", !0]]) };
const D = {
	short: new Map([
		["C", !0],
		["P", !1],
		["h", !1],
		["p", !1],
		["v", !1],
		...x.short.entries()
	]),
	long: /* @__PURE__ */ new Set([
		"attr-source",
		"config-env",
		"exec-path",
		"git-dir",
		"list-cmds",
		"namespace",
		"super-prefix",
		"work-tree"
	])
};
const R = {
	clone: {
		short: /* @__PURE__ */ new Map([
			["b", !0],
			["j", !0],
			["l", !1],
			["n", !1],
			["o", !0],
			["q", !1],
			["s", !1],
			["u", !0]
		]),
		long: /* @__PURE__ */ new Set([
			"branch",
			"config",
			"jobs",
			"origin",
			"upload-pack",
			"u",
			"template"
		])
	},
	commit: {
		short: /* @__PURE__ */ new Map([
			["C", !0],
			["F", !0],
			["c", !0],
			["m", !0],
			["t", !0]
		]),
		long: /* @__PURE__ */ new Set([
			"file",
			"message",
			"reedit-message",
			"reuse-message",
			"template"
		])
	},
	config: {
		short: /* @__PURE__ */ new Map([
			["e", !1],
			["f", !0],
			["l", !1]
		]),
		long: /* @__PURE__ */ new Set([
			"blob",
			"comment",
			"default",
			"file",
			"type",
			"value"
		])
	},
	fetch: {
		short: /* @__PURE__ */ new Map(),
		long: /* @__PURE__ */ new Set(["upload-pack"])
	},
	init: {
		short: /* @__PURE__ */ new Map(),
		long: /* @__PURE__ */ new Set(["template"])
	},
	pull: {
		short: /* @__PURE__ */ new Map(),
		long: /* @__PURE__ */ new Set(["upload-pack"])
	},
	push: {
		short: /* @__PURE__ */ new Map(),
		long: /* @__PURE__ */ new Set(["exec", "receive-pack"])
	}
};
const T = {
	short: /* @__PURE__ */ new Map(),
	long: /* @__PURE__ */ new Set()
};
function I(e) {
	const t = R[e ?? ""] ?? T;
	return {
		short: new Map([...x.short.entries(), ...t.short.entries()]),
		long: t.long
	};
}
function b(e, t = D) {
	if (e.startsWith("--")) {
		const n = e.indexOf("=");
		if (n > 2) return [{
			name: e.slice(0, n),
			value: e.slice(n + 1),
			needsNext: !1
		}];
		const o = e.slice(2);
		return [{
			name: e,
			needsNext: t.long.has(o)
		}];
	}
	if (e.length === 2) {
		const n = e.charAt(1);
		return [{
			name: e,
			needsNext: t.short.get(n) === !0
		}];
	}
	return W(e, t.short);
}
function W(e, t) {
	const n = e.slice(1).split(""), o = [];
	for (let s = 0; s < n.length; s++) {
		const r = n[s], l = t.get(r);
		if (l === void 0) return [{
			name: e,
			needsNext: !1
		}];
		if (l) {
			const a = n.slice(s + 1).join("");
			if (a && ![...a].every((w) => t.has(w))) return o.push({
				name: `-${r}`,
				value: a,
				needsNext: !1
			}), o;
		}
		o.push({
			name: `-${r}`,
			needsNext: l
		});
	}
	return o;
}
function j(e, t = []) {
	let n = 0;
	for (; n < e.length;) {
		const o = String(e[n]);
		if (!o.startsWith("-") || o.length < 2) break;
		const s = b(o);
		let r = n + 1;
		for (const l of s) {
			const a = {
				name: l.name,
				value: l.value,
				absorbedNext: !1,
				isGlobal: !0
			};
			l.needsNext && a.value === void 0 && r < e.length && (a.value = String(e[r]), a.absorbedNext = !0, r++), t.push(a);
		}
		n = r;
	}
	return {
		flags: t,
		taskIndex: n
	};
}
function B(e, t, n = []) {
	const o$1 = I(t), s = [], r$1 = [];
	let l = 0;
	for (; l < e.length;) {
		const a = e[l];
		if (r(a)) {
			r$1.push(...o(a)), l++;
			continue;
		}
		const f = String(a);
		if (f === "--") {
			for (let g = l + 1; g < e.length; g++) {
				const u = e[g];
				r(u) ? r$1.push(...o(u)) : r$1.push(String(u));
			}
			break;
		}
		if (!f.startsWith("-") || f.length < 2) {
			s.push(f), l++;
			continue;
		}
		const w = b(f, o$1);
		let d = l + 1;
		for (const g of w) {
			const u = {
				name: g.name,
				value: g.value,
				absorbedNext: !1,
				isGlobal: !1
			};
			g.needsNext && u.value === void 0 && d < e.length && !r(e[d]) && (u.value = String(e[d]), u.absorbedNext = !0, d++), n.push(u);
		}
		l = d;
	}
	return {
		flags: n,
		positionals: s,
		pathspecs: r$1
	};
}
function* V({ write: e }) {
	for (const t of e) for (const n of q) {
		const o = n(t.key);
		o && (yield o);
	}
}
function c(e, t, n = String(e)) {
	const o = typeof e == "string" ? new RegExp(`\\s*${e.toLowerCase()}`) : e;
	return function(r) {
		if (o.test(r)) return {
			category: t,
			message: `Configuring ${n} is not permitted without enabling ${t}`
		};
	};
}
function i(e, t) {
	return c(new RegExp(`\\s*${e.toLowerCase().replace(/\./g, "(..+)?.")}`), t, e);
}
const q = [
	c("alias", "allowUnsafeAlias"),
	c("core.askPass", "allowUnsafeAskPass"),
	c("core.editor", "allowUnsafeEditor"),
	c("core.fsmonitor", "allowUnsafeFsMonitor"),
	c("core.gitProxy", "allowUnsafeGitProxy"),
	c("core.hooksPath", "allowUnsafeHooksPath"),
	c("core.pager", "allowUnsafePager"),
	c("core.sshCommand", "allowUnsafeSshCommand"),
	i("credential.helper", "allowUnsafeCredentialHelper"),
	i("diff.command", "allowUnsafeDiffExternal"),
	c("diff.external", "allowUnsafeDiffExternal"),
	i("diff.textconv", "allowUnsafeDiffTextConv"),
	i("filter.clean", "allowUnsafeFilter"),
	i("filter.smudge", "allowUnsafeFilter"),
	i("gpg.program", "allowUnsafeGpgProgram"),
	c("init.templateDir", "allowUnsafeTemplateDir"),
	i("merge.driver", "allowUnsafeMergeDriver"),
	i("mergetool.path", "allowUnsafeMergeDriver"),
	i("mergetool.cmd", "allowUnsafeMergeDriver"),
	i("protocol.allow", "allowUnsafeProtocolOverride"),
	i("remote.receivepack", "allowUnsafePack"),
	i("remote.uploadpack", "allowUnsafePack"),
	c("sequence.editor", "allowUnsafeEditor")
];
function* K(e, t) {
	for (const n of t) for (const o of H) {
		const s = o(e, n.name);
		s && (yield s);
	}
}
function h(e, t, n, o = String(t)) {
	const s = typeof t == "string" ? new RegExp(`\\s*${t.toLowerCase()}`) : t, r = `Use of ${e ? `${e} with option ` : ""}${o} is not permitted without enabling ${n}`;
	return function(a, f) {
		if ((!e || a === e) && s.test(f)) return {
			category: n,
			message: r
		};
	};
}
const H = [
	h(null, /--(upload|receive)-pack/, "allowUnsafePack", "--upload-pack or --receive-pack"),
	h("clone", /^-\w*u/, "allowUnsafePack"),
	h("clone", "--u", "allowUnsafePack"),
	h("push", "--exec", "allowUnsafePack"),
	h(null, "--template", "allowUnsafeTemplateDir")
];
function C(e, t, n) {
	return [...K(e, t), ...V(n)];
}
function Y(...e) {
	const { flags: t, taskIndex: n } = j(e), o = n < e.length ? String(e[n]).toLowerCase() : null, { positionals: r, pathspecs: l } = B(o !== null ? e.slice(n + 1) : [], o, t), a = L(o, t, r);
	return {
		task: o,
		flags: t.map(J),
		paths: l,
		config: a,
		vulnerabilities: z(C(o, t, a))
	};
}
function z(e) {
	return Object.defineProperty(e, "vulnerabilities", { value: e });
}
function J({ value: e, name: t }) {
	return e !== void 0 ? {
		name: t,
		value: e
	} : { name: t };
}
const y = {
	editor: "allowUnsafeEditor",
	git_askpass: "allowUnsafeAskPass",
	git_config_global: "allowUnsafeConfigPaths",
	git_config_system: "allowUnsafeConfigPaths",
	git_config_count: "allowUnsafeConfigEnvCount",
	git_config: "allowUnsafeConfigPaths",
	git_editor: "allowUnsafeEditor",
	git_exec_path: "allowUnsafeConfigPaths",
	git_external_diff: "allowUnsafeDiffExternal",
	git_pager: "allowUnsafePager",
	git_proxy_command: "allowUnsafeGitProxy",
	git_template_dir: "allowUnsafeTemplateDir",
	git_sequence_editor: "allowUnsafeEditor",
	git_ssh: "allowUnsafeSshCommand",
	git_ssh_command: "allowUnsafeSshCommand",
	pager: "allowUnsafePager",
	prefix: "allowUnsafeConfigPaths",
	ssh_askpass: "allowUnsafeAskPass"
};
function* Q(e) {
	const t = parseInt(e.git_config_count ?? "0", 10);
	for (let n = 0; n < t; n++) {
		const o = e[`git_config_key_${n}`], s = e[`git_config_value_${n}`];
		o !== void 0 && (yield {
			key: o.toLowerCase().trim(),
			value: s,
			scope: "env"
		});
	}
}
function* X(e) {
	for (const t of Object.keys(e)) if (_(t)) {
		const n = y[t];
		yield {
			category: n,
			message: `Use of "${t.toUpperCase()}" is not permitted without enabling ${n}`
		};
	}
}
function _(e) {
	return Object.hasOwn(y, e);
}
function Z(e) {
	const t = {};
	for (const [n, o] of Object.entries(e)) {
		const s = n.toLowerCase().trim();
		(_(s) || s.startsWith("git")) && (t[s] = String(o));
	}
	return t;
}
function ee(e) {
	const t = Z(e), n = {
		read: [],
		write: [...Q(t)]
	};
	return {
		config: n,
		vulnerabilities: [...X(t), ...C(null, [], n)]
	};
}
function ne(e, t) {
	return [...Y(...e).vulnerabilities, ...ee(t).vulnerabilities];
}
export { ne };
