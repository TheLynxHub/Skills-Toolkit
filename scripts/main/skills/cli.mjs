#!/usr/bin/env node
import { __toESM } from "./_chunks/rolldown-runtime.mjs";
import { isCancel } from "./_chunks/libs/@clack/core.mjs";
import { cancel, confirm, intro, log, multiselect, note, outro, select, spinner } from "./_chunks/libs/@clack/prompts.mjs";
import { require_picocolors } from "./_chunks/libs/picocolors.mjs";
import { esm_default } from "./_chunks/libs/simple-git.mjs";
import { xdgConfig } from "./_chunks/libs/xdg-basedir.mjs";
import { require_dist } from "./_chunks/libs/@vercel/detect-agent.mjs";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve, sep } from "path";
import { fileURLToPath } from "url";
import { stripVTControlCharacters } from "node:util";
import { createWriteStream } from "node:fs";
import { dirname as dirname$1, join as join$1, normalize as normalize$1, resolve as resolve$1, sep as sep$1 } from "node:path";
import { homedir, platform, tmpdir } from "os";
import * as readline from "readline";
import { Writable } from "stream";
import { promisify } from "util";
import { execFile, spawn, spawnSync } from "child_process";
import { access, chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, stat, symlink, writeFile } from "fs/promises";
import { parse } from "yaml";
import { createHash } from "crypto";
import { mkdir as mkdir$1, mkdtemp as mkdtemp$1, readFile as readFile$1, rm as rm$1, stat as stat$1, writeFile as writeFile$1 } from "node:fs/promises";
import { createHash as createHash$1 } from "node:crypto";
import { crc32, gunzipSync, inflateRawSync } from "node:zlib";
import { tmpdir as tmpdir$1 } from "node:os";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";
import { execFile as execFile$1 } from "node:child_process";
var import_picocolors = /* @__PURE__ */ __toESM(require_picocolors(), 1);
const DEFAULT_GITHUB_HOST = "github.com";
function getGitHubHost() {
	const configuredHost = process.env.GH_HOST?.trim();
	if (!configuredHost) return DEFAULT_GITHUB_HOST;
	try {
		const parsed = new URL(`https://${configuredHost}`);
		if (parsed.username || parsed.password || parsed.port || parsed.pathname !== "/" || parsed.search || parsed.hash) return DEFAULT_GITHUB_HOST;
		return parsed.hostname;
	} catch {
		return DEFAULT_GITHUB_HOST;
	}
}
function isGitHubHost(host) {
	const normalizedHost = host.toLowerCase();
	return normalizedHost === DEFAULT_GITHUB_HOST || normalizedHost === getGitHubHost().toLowerCase();
}
function getOwnerRepo(parsed) {
	if (parsed.type === "local" || parsed.type === "download") return null;
	const sshMatch = parsed.url.match(/^git@[^:]+:(.+)$/);
	if (sshMatch) {
		let path = sshMatch[1];
		path = path.replace(/\.git$/, "");
		if (path.includes("/")) return path;
		return null;
	}
	if (parsed.url.startsWith("ssh://")) try {
		let path = new URL(parsed.url).pathname.slice(1);
		path = path.replace(/\.git$/, "");
		if (path.includes("/")) return path;
		return null;
	} catch {
		return null;
	}
	if (!parsed.url.startsWith("http://") && !parsed.url.startsWith("https://")) return null;
	try {
		let path = new URL(parsed.url).pathname.slice(1);
		path = path.replace(/\.git$/, "");
		if (path.includes("/")) return path;
	} catch {}
	return null;
}
function parseOwnerRepo(ownerRepo) {
	const match = ownerRepo.match(/^([^/]+)\/([^/]+)$/);
	if (match) return {
		owner: match[1],
		repo: match[2]
	};
	return null;
}
async function isRepoPrivate(owner, repo) {
	try {
		const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
		if (!res.ok) return null;
		return (await res.json()).private === true;
	} catch {
		return null;
	}
}
function sanitizeSubpath(subpath) {
	const segments = subpath.replace(/\\/g, "/").split("/");
	for (const segment of segments) if (segment === "..") throw new Error(`Unsafe subpath: "${subpath}" contains path traversal segments. Subpaths must not contain ".." components.`);
	return subpath;
}
function isLocalPath(input) {
	return isAbsolute(input) || input.startsWith("./") || input.startsWith("../") || input === "." || input === ".." || /^[a-zA-Z]:[/\\]/.test(input);
}
const SOURCE_ALIASES = {
	"coinbase/agentWallet": "coinbase/agentic-wallet-skills",
	"vercel-labs/vercel-skills": "vercel-labs/agent-skills"
};
function decodeFragmentValue(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
function looksLikeGitSource(input) {
	if (input.startsWith("github:") || input.startsWith("gitlab:") || input.startsWith("git@")) return true;
	if (/^ssh:\/\/.+\.git(?:$|[/?])/i.test(input)) return true;
	if (input.startsWith("http://") || input.startsWith("https://")) try {
		const parsed = new URL(input);
		const pathname = parsed.pathname;
		if (isGitHubHost(parsed.host)) return /^\/[^/]+\/[^/]+(?:\.git)?(?:\/tree\/[^/]+(?:\/.*)?)?\/?$/.test(pathname);
		if (parsed.hostname === "gitlab.com") return /^\/.+?\/[^/]+(?:\.git)?(?:\/-\/tree\/[^/]+(?:\/.*)?)?\/?$/.test(pathname);
	} catch {}
	if (/^https?:\/\/.+\.git(?:$|[/?])/i.test(input)) return true;
	return !input.includes(":") && !input.startsWith(".") && !input.startsWith("/") && /^([^/]+)\/([^/]+)(?:\/(.+)|@(.+))?$/.test(input);
}
function parseFragmentRef(input) {
	const hashIndex = input.indexOf("#");
	if (hashIndex < 0) return { inputWithoutFragment: input };
	const inputWithoutFragment = input.slice(0, hashIndex);
	const fragment = input.slice(hashIndex + 1);
	if (!fragment || !looksLikeGitSource(inputWithoutFragment)) return { inputWithoutFragment: input };
	const atIndex = fragment.indexOf("@");
	if (atIndex === -1) return {
		inputWithoutFragment,
		ref: decodeFragmentValue(fragment)
	};
	const ref = fragment.slice(0, atIndex);
	const skillFilter = fragment.slice(atIndex + 1);
	return {
		inputWithoutFragment,
		ref: ref ? decodeFragmentValue(ref) : void 0,
		skillFilter: skillFilter ? decodeFragmentValue(skillFilter) : void 0
	};
}
function appendFragmentRef(input, ref, skillFilter) {
	if (!ref) return input;
	return `${input}#${ref}${skillFilter ? `@${skillFilter}` : ""}`;
}
function isHostedArtifactUrl(input) {
	try {
		const parsed = new URL(input);
		const host = parsed.hostname.toLowerCase();
		if (host === "raw.githubusercontent.com" || host === "codeload.github.com" || host === "objects.githubusercontent.com") return true;
		if (host === "github.com") return /^\/[^/]+\/[^/]+\/(?:archive\/|raw\/|releases\/(?:download\/|latest\/download\/))/.test(parsed.pathname);
		if (host === "gitlab.com") return /\/-\/(?:archive|raw)\//.test(parsed.pathname);
		return false;
	} catch {
		return false;
	}
}
function parseSource(input) {
	if (isLocalPath(input)) {
		const resolvedPath = resolve(input);
		return {
			type: "local",
			url: resolvedPath,
			localPath: resolvedPath
		};
	}
	const { inputWithoutFragment, ref: fragmentRef, skillFilter: fragmentSkillFilter } = parseFragmentRef(input);
	input = inputWithoutFragment;
	const alias = SOURCE_ALIASES[input];
	if (alias) input = alias;
	const githubPrefixMatch = input.match(/^github:(.+)$/);
	if (githubPrefixMatch) return parseSource(appendFragmentRef(githubPrefixMatch[1], fragmentRef, fragmentSkillFilter));
	const gitlabPrefixMatch = input.match(/^gitlab:(.+)$/);
	if (gitlabPrefixMatch) return parseSource(appendFragmentRef(`https://gitlab.com/${gitlabPrefixMatch[1]}`, fragmentRef, fragmentSkillFilter));
	if (isHostedArtifactUrl(input)) return {
		type: "download",
		url: input
	};
	if (getGitHubHost() !== "github.com" && /^https?:\/\//.test(input)) try {
		const parsedUrl = new URL(input);
		if (isGitHubHost(parsedUrl.host) && parsedUrl.host !== "github.com") {
			const [owner, rawRepo, marker, ref, ...subpathSegments] = parsedUrl.pathname.split("/").filter(Boolean);
			if (owner && rawRepo) {
				const repo = rawRepo.replace(/\.git$/, "");
				const isTreeUrl = marker === "tree" && ref;
				return {
					type: "git",
					url: `${parsedUrl.protocol}//${parsedUrl.host}/${owner}/${repo}.git`,
					...isTreeUrl ? { ref } : fragmentRef ? { ref: fragmentRef } : {},
					...isTreeUrl && subpathSegments.length > 0 ? { subpath: sanitizeSubpath(subpathSegments.join("/")) } : {}
				};
			}
		}
	} catch {}
	const githubTreeWithPathMatch = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/);
	if (githubTreeWithPathMatch) {
		const [, owner, repo, ref, subpath] = githubTreeWithPathMatch;
		return {
			type: "github",
			url: `https://github.com/${owner}/${repo}.git`,
			ref: ref || fragmentRef,
			subpath: subpath ? sanitizeSubpath(subpath) : subpath
		};
	}
	const githubTreeMatch = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/);
	if (githubTreeMatch) {
		const [, owner, repo, ref] = githubTreeMatch;
		return {
			type: "github",
			url: `https://github.com/${owner}/${repo}.git`,
			ref: ref || fragmentRef
		};
	}
	const githubRepoMatch = input.match(/github\.com\/([^/]+)\/([^/]+)/);
	if (githubRepoMatch) {
		const [, owner, repo] = githubRepoMatch;
		return {
			type: "github",
			url: `https://github.com/${owner}/${repo.replace(/\.git$/, "")}.git`,
			...fragmentRef ? { ref: fragmentRef } : {}
		};
	}
	const gitlabTreeWithPathMatch = input.match(/^(https?):\/\/([^/]+)\/(.+?)\/-\/tree\/([^/]+)\/(.+)/);
	if (gitlabTreeWithPathMatch) {
		const [, protocol, hostname, repoPath, ref, subpath] = gitlabTreeWithPathMatch;
		if (hostname !== "github.com" && repoPath) return {
			type: "gitlab",
			url: `${protocol}://${hostname}/${repoPath.replace(/\.git$/, "")}.git`,
			ref: ref || fragmentRef,
			subpath: subpath ? sanitizeSubpath(subpath) : subpath
		};
	}
	const gitlabTreeMatch = input.match(/^(https?):\/\/([^/]+)\/(.+?)\/-\/tree\/([^/]+)$/);
	if (gitlabTreeMatch) {
		const [, protocol, hostname, repoPath, ref] = gitlabTreeMatch;
		if (hostname !== "github.com" && repoPath) return {
			type: "gitlab",
			url: `${protocol}://${hostname}/${repoPath.replace(/\.git$/, "")}.git`,
			ref: ref || fragmentRef
		};
	}
	const gitlabRepoMatch = input.match(/gitlab\.com\/(.+?)(?:\.git)?\/?$/);
	if (gitlabRepoMatch) {
		const repoPath = gitlabRepoMatch[1];
		if (repoPath.includes("/")) return {
			type: "gitlab",
			url: `https://gitlab.com/${repoPath}.git`,
			...fragmentRef ? { ref: fragmentRef } : {}
		};
	}
	const githubHost = getGitHubHost();
	const shorthandSourceType = githubHost === "github.com" ? "github" : "git";
	const atSkillMatch = input.match(/^([^/]+)\/([^/@]+)@(.+)$/);
	if (atSkillMatch && !input.includes(":") && !input.startsWith(".") && !input.startsWith("/")) {
		const [, owner, repo, skillFilter] = atSkillMatch;
		return {
			type: shorthandSourceType,
			url: `https://${githubHost}/${owner}/${repo}.git`,
			...fragmentRef ? { ref: fragmentRef } : {},
			skillFilter: fragmentSkillFilter || skillFilter
		};
	}
	const shorthandMatch = input.match(/^([^/]+)\/([^/]+)(?:\/(.+?))?\/?$/);
	if (shorthandMatch && !input.includes(":") && !input.startsWith(".") && !input.startsWith("/")) {
		const [, owner, repo, subpath] = shorthandMatch;
		return {
			type: shorthandSourceType,
			url: `https://${githubHost}/${owner}/${repo}.git`,
			...fragmentRef ? { ref: fragmentRef } : {},
			subpath: subpath ? sanitizeSubpath(subpath) : subpath,
			...fragmentSkillFilter ? { skillFilter: fragmentSkillFilter } : {}
		};
	}
	if (isWellKnownUrl(input)) return {
		type: "well-known",
		url: input
	};
	return {
		type: "git",
		url: input,
		...fragmentRef ? { ref: fragmentRef } : {}
	};
}
function isWellKnownUrl(input) {
	if (!input.startsWith("http://") && !input.startsWith("https://")) return false;
	try {
		const parsed = new URL(input);
		if ([
			"github.com",
			"gitlab.com",
			"raw.githubusercontent.com"
		].includes(parsed.hostname)) return false;
		if (input.endsWith(".git")) return false;
		return true;
	} catch {
		return false;
	}
}
const CSI_RE = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g;
const OSC_RE = /\x1b\][\s\S]*?(?:\x07|\x1b\\)/g;
const DCS_PM_APC_RE = /\x1b[P^_][\s\S]*?(?:\x1b\\)/g;
const SIMPLE_ESC_RE = /\x1b[\x20-\x7e]/g;
const C1_RE = /[\x80-\x9f]/g;
const CONTROL_RE = /[\x00-\x06\x07\x08\x0b\x0c\x0d-\x1a\x1c-\x1f\x7f]/g;
function stripTerminalEscapes(str) {
	return str.replace(OSC_RE, "").replace(DCS_PM_APC_RE, "").replace(CSI_RE, "").replace(SIMPLE_ESC_RE, "").replace(C1_RE, "").replace(CONTROL_RE, "");
}
function sanitizeMetadata(str) {
	return stripTerminalEscapes(str).replace(/[\r\n]+/g, " ").trim();
}
const silentOutput = new Writable({ write(_chunk, _encoding, callback) {
	callback();
} });
const S_STEP_ACTIVE = import_picocolors.default.green("◆");
const S_STEP_CANCEL = import_picocolors.default.red("■");
const S_STEP_SUBMIT = import_picocolors.default.green("◇");
const S_RADIO_ACTIVE = import_picocolors.default.green("●");
const S_RADIO_INACTIVE = import_picocolors.default.dim("○");
import_picocolors.default.green("✓");
const S_BULLET = import_picocolors.default.green("•");
const S_BAR = import_picocolors.default.dim("│");
const S_BAR_H = import_picocolors.default.dim("─");
const cancelSymbol = Symbol("cancel");
function approxStringWidth(plain) {
	let width = 0;
	for (const ch of plain) {
		const code = ch.codePointAt(0);
		if (code === 0) continue;
		width += code >= 4352 && code <= 4447 || code >= 8986 && code <= 8987 || code >= 9001 && code <= 9002 || code >= 9193 && code <= 9196 || code === 9200 || code === 9203 || code >= 9725 && code <= 9726 || code >= 9748 && code <= 9749 || code >= 9800 && code <= 9811 || code >= 9855 && code <= 9855 || code >= 9875 && code <= 9875 || code >= 9889 && code <= 9889 || code >= 9898 && code <= 9899 || code >= 9917 && code <= 9918 || code >= 9924 && code <= 9925 || code >= 9934 && code <= 9934 || code >= 9940 && code <= 9940 || code >= 9962 && code <= 9962 || code >= 9970 && code <= 9971 || code >= 9973 && code <= 9973 || code >= 9978 && code <= 9978 || code >= 9981 && code <= 9981 || code >= 9989 && code <= 9989 || code >= 9994 && code <= 9995 || code >= 10024 && code <= 10024 || code >= 10060 && code <= 10060 || code >= 10062 && code <= 10062 || code >= 10067 && code <= 10069 || code >= 10071 && code <= 10071 || code >= 10133 && code <= 10135 || code >= 10160 && code <= 10160 || code >= 10175 && code <= 10175 || code >= 11035 && code <= 11036 || code >= 11088 && code <= 11088 || code >= 11093 && code <= 11093 || code >= 11904 && code <= 42191 && code !== 12351 || code >= 43360 && code <= 43388 || code >= 44032 && code <= 55203 || code >= 63744 && code <= 64255 || code >= 65040 && code <= 65049 || code >= 65072 && code <= 65135 || code >= 65280 && code <= 65376 || code >= 65504 && code <= 65510 || code >= 126976 && code <= 129535 ? 2 : 1;
	}
	return width;
}
function visualRowsForLine(line, columns) {
	const plain = stripVTControlCharacters(line);
	const cols = Math.max(1, columns);
	const w = approxStringWidth(plain);
	return Math.max(1, Math.ceil(w / cols));
}
function countVisualRowsForLines(lines, columns) {
	const cols = columns !== void 0 && columns > 0 ? columns : process.stdout.columns && process.stdout.columns > 0 ? process.stdout.columns : 80;
	return lines.reduce((sum, line) => sum + visualRowsForLine(line, cols), 0);
}
function truncateToWidth(text, width) {
	let truncated = "";
	for (const char of text) {
		if (approxStringWidth(truncated + char) > width) break;
		truncated += char;
	}
	return truncated;
}
function formatDetailLines(detail, width, maxLines) {
	const safeWidth = Math.max(1, width);
	const normalized = detail?.replace(/\s+/g, " ").trim() ?? "";
	const lines = [];
	let remaining = normalized;
	while (remaining && lines.length < maxLines) {
		if (approxStringWidth(remaining) <= safeWidth) {
			lines.push(remaining);
			remaining = "";
			break;
		}
		const candidate = truncateToWidth(remaining, safeWidth);
		const breakAt = candidate.lastIndexOf(" ");
		if (breakAt > 0) {
			lines.push(candidate.slice(0, breakAt).trimEnd());
			remaining = remaining.slice(breakAt).trimStart();
		} else {
			lines.push(candidate);
			remaining = remaining.slice(candidate.length).trimStart();
		}
	}
	if (remaining && lines.length > 0) {
		const last = lines.length - 1;
		lines[last] = `${truncateToWidth(lines[last], Math.max(0, safeWidth - 1)).trimEnd()}…`;
	}
	while (lines.length < maxLines) lines.push("");
	return lines;
}
function buildSearchEntries(items, selectGroups, collapsedGroups = /* @__PURE__ */ new Set()) {
	if (!selectGroups) return items.map((item) => ({
		type: "item",
		item
	}));
	const entries = [];
	let index = 0;
	while (index < items.length) {
		const item = items[index];
		if (!item.group) {
			entries.push({
				type: "item",
				item
			});
			index += 1;
			continue;
		}
		const groupItems = [];
		while (index < items.length && items[index].group === item.group) {
			groupItems.push(items[index]);
			index += 1;
		}
		const collapsed = collapsedGroups.has(item.group);
		entries.push({
			type: "group",
			group: item.group,
			items: groupItems,
			collapsed
		});
		if (!collapsed) entries.push(...groupItems.map((groupItem) => ({
			type: "item",
			item: groupItem
		})));
	}
	return entries;
}
function toggleSearchEntry(selected, entry) {
	if (entry?.type === "group") {
		const allSelected = entry.items.every((item) => selected.has(item.value));
		for (const item of entry.items) if (allSelected) selected.delete(item.value);
		else selected.add(item.value);
	} else if (entry?.type === "item") if (selected.has(entry.item.value)) selected.delete(entry.item.value);
	else selected.add(entry.item.value);
}
function getSelectAllState(selected, items) {
	const selectedCount = items.filter((item) => selected.has(item.value)).length;
	if (selectedCount === 0) return "none";
	if (selectedCount === items.length) return "all";
	return "partial";
}
function toggleAllItems(selected, items) {
	const shouldClear = getSelectAllState(selected, items) === "all";
	for (const item of items) if (shouldClear) selected.delete(item.value);
	else selected.add(item.value);
}
async function searchMultiselect(options) {
	const { message, items, maxVisible = 8, initialSelected = [], required = false, lockedSection, searchable = true, showDetail = false, detailLines = 2, showSelectedSummary = true, selectGroups = false, selectAll = false } = options;
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: silentOutput,
			terminal: false
		});
		if (process.stdin.isTTY) process.stdin.setRawMode(true);
		readline.emitKeypressEvents(process.stdin, rl);
		let query = "";
		let cursor = 0;
		const selected = new Set(initialSelected);
		const collapsedGroups = /* @__PURE__ */ new Set();
		let lastRenderHeight = 0;
		const lockedValues = lockedSection ? lockedSection.items.map((i) => i.value) : [];
		const filter = (item, q) => {
			if (!q) return true;
			const lowerQ = q.toLowerCase();
			return item.label.toLowerCase().includes(lowerQ) || String(item.value).toLowerCase().includes(lowerQ);
		};
		const getFiltered = () => {
			return items.filter((item) => filter(item, query));
		};
		const render = (state = "active") => {
			const lines = [];
			const filtered = getFiltered();
			const entries = buildSearchEntries(filtered, selectGroups, collapsedGroups);
			const hasSelectAll = selectAll && items.length > 0;
			const entryCursor = cursor - (hasSelectAll ? 1 : 0);
			const icon = state === "active" ? S_STEP_ACTIVE : state === "cancel" ? S_STEP_CANCEL : S_STEP_SUBMIT;
			lines.push(`${icon}  ${import_picocolors.default.bold(message)}`);
			if (state === "active") {
				if (lockedSection && lockedSection.items.length > 0) {
					lines.push(`${S_BAR}`);
					const lockedTitle = `${import_picocolors.default.bold(lockedSection.title)} ${import_picocolors.default.dim("── always included")}`;
					lines.push(`${S_BAR}  ${S_BAR_H}${S_BAR_H} ${lockedTitle} ${S_BAR_H.repeat(12)}`);
					for (const item of lockedSection.items) lines.push(`${S_BAR}    ${S_BULLET} ${import_picocolors.default.bold(item.label)}`);
					if (lockedSection.hiddenCount && lockedSection.hiddenCount > 0) lines.push(`${S_BAR}    ${import_picocolors.default.dim(`…and ${lockedSection.hiddenCount} more`)}`);
					lines.push(`${S_BAR}`);
					lines.push(`${S_BAR}  ${S_BAR_H}${S_BAR_H} ${import_picocolors.default.bold("Additional agents")} ${S_BAR_H.repeat(29)}`);
				}
				if (searchable) {
					const searchLine = `${S_BAR}  ${import_picocolors.default.dim("Search:")} ${query}${import_picocolors.default.inverse(" ")}`;
					lines.push(searchLine);
					lines.push(`${S_BAR}  ${import_picocolors.default.dim("↑↓ move, space select, enter confirm")}`);
					lines.push(`${S_BAR}`);
				}
				if (hasSelectAll) {
					const selectedCount = items.filter((item) => selected.has(item.value)).length;
					const selectAllState = getSelectAllState(selected, items);
					const radio = selectAllState === "all" ? S_RADIO_ACTIVE : selectAllState === "partial" ? import_picocolors.default.yellow("◐") : S_RADIO_INACTIVE;
					const isCursor = cursor === 0;
					const prefix = isCursor ? import_picocolors.default.cyan("❯") : " ";
					const label = isCursor ? import_picocolors.default.underline(import_picocolors.default.bold("Select All")) : import_picocolors.default.bold("Select All");
					lines.push(`${S_BAR} ${prefix} ${radio} ${label} ${import_picocolors.default.dim(`(${selectedCount}/${items.length})`)}`);
					lines.push(`${S_BAR}   ${S_BAR_H.repeat(36)}`);
				}
				const columns = process.stdout.columns && process.stdout.columns > 0 ? process.stdout.columns : 80;
				const buildFooterLines = (includeDetail, includeSelectedSummary) => {
					const footerLines = [];
					if (includeDetail) {
						const entry = entries[entryCursor];
						const detail = hasSelectAll && cursor === 0 ? `Select or clear all ${items.length} skills.` : entry?.type === "group" ? `Select all ${entry.items.length} skills in ${entry.group}.` : entry?.item.detail;
						const detailWidth = Math.max(1, columns - 5);
						footerLines.push(`${S_BAR}`);
						footerLines.push(`${S_BAR}  ${import_picocolors.default.dim("Description")}`);
						for (const line of formatDetailLines(detail, detailWidth, detailLines)) footerLines.push(`${S_BAR}  ${import_picocolors.default.dim(line)}`);
					}
					if (includeSelectedSummary) {
						footerLines.push(`${S_BAR}`);
						const allSelectedLabels = [...lockedSection ? lockedSection.items.map((i) => i.label) : [], ...items.filter((item) => selected.has(item.value)).map((item) => item.label)];
						if (allSelectedLabels.length === 0) footerLines.push(`${S_BAR}  ${import_picocolors.default.dim("Selected: (none)")}`);
						else {
							const summary = allSelectedLabels.length <= 3 ? allSelectedLabels.join(", ") : `${allSelectedLabels.slice(0, 3).join(", ")} +${allSelectedLabels.length - 3} more`;
							footerLines.push(`${S_BAR}  ${import_picocolors.default.green("Selected:")} ${summary}`);
						}
					}
					if (!searchable) {
						footerLines.push(`${S_BAR}`);
						footerLines.push(`${S_BAR}  ${import_picocolors.default.dim("↑↓ move, ←→ collapse/expand, space select, enter confirm")}`);
					}
					footerLines.push(`${import_picocolors.default.dim("└")}`);
					return footerLines;
				};
				const buildItemLines = (visibleLimit) => {
					if (filtered.length === 0) return [`${S_BAR}  ${import_picocolors.default.dim("No matches found")}`];
					const itemLines = [];
					const visibleStart = Math.max(0, Math.min(entryCursor - Math.floor(visibleLimit / 2), entries.length - visibleLimit));
					const visibleEnd = Math.min(entries.length, visibleStart + visibleLimit);
					const visibleEntries = entries.slice(visibleStart, visibleEnd);
					for (let i = 0; i < visibleEntries.length; i++) {
						const entry = visibleEntries[i];
						const isCursor = visibleStart + i === entryCursor;
						if (entry.type === "group") {
							const selectedCount = entry.items.filter((item) => selected.has(item.value)).length;
							const radio = selectedCount === entry.items.length ? S_RADIO_ACTIVE : selectedCount > 0 ? import_picocolors.default.yellow("◐") : S_RADIO_INACTIVE;
							const label = isCursor ? import_picocolors.default.underline(import_picocolors.default.bold(entry.group)) : import_picocolors.default.bold(entry.group);
							const prefix = isCursor ? import_picocolors.default.cyan("❯") : " ";
							const disclosure = import_picocolors.default.dim(entry.collapsed ? "▸" : "▾");
							itemLines.push(`${S_BAR} ${prefix} ${disclosure} ${radio} ${label}`);
							continue;
						}
						const item = entry.item;
						const radio = selected.has(item.value) ? S_RADIO_ACTIVE : S_RADIO_INACTIVE;
						const label = isCursor ? import_picocolors.default.underline(item.label) : item.label;
						const hint = item.hint ? import_picocolors.default.dim(` (${item.hint})`) : "";
						const prefix = isCursor ? import_picocolors.default.cyan("❯") : " ";
						const groupItems = selectGroups && item.group ? filtered.filter((i) => i.group === item.group) : [];
						const isLastInGroup = groupItems.at(-1) === item;
						const tree = groupItems.length > 0 ? `${import_picocolors.default.dim(isLastInGroup ? "└─" : "├─")} ` : "";
						itemLines.push(`${S_BAR} ${prefix} ${tree}${radio} ${label}${hint}`);
					}
					const hiddenBefore = visibleStart;
					const hiddenAfter = entries.length - visibleEnd;
					if (hiddenBefore > 0 || hiddenAfter > 0) {
						const parts = [];
						if (hiddenBefore > 0) parts.push(`↑ ${hiddenBefore} more`);
						if (hiddenAfter > 0) parts.push(`↓ ${hiddenAfter} more`);
						itemLines.push(`${S_BAR}  ${import_picocolors.default.dim(parts.join("  "))}`);
					}
					return itemLines;
				};
				const terminalRows = process.stdout.rows && process.stdout.rows > 0 ? process.stdout.rows : void 0;
				const maxFrameRows = terminalRows ? Math.max(1, terminalRows - 1) : void 0;
				const fitFrame = (includeDetail, includeSelectedSummary) => {
					const footerLines = buildFooterLines(includeDetail, includeSelectedSummary);
					let visibleLimit = Math.max(1, maxVisible);
					let itemLines = buildItemLines(visibleLimit);
					let frameRows = countVisualRowsForLines([
						...lines,
						...itemLines,
						...footerLines
					], columns);
					while (maxFrameRows && frameRows > maxFrameRows && visibleLimit > 1) {
						visibleLimit -= 1;
						itemLines = buildItemLines(visibleLimit);
						frameRows = countVisualRowsForLines([
							...lines,
							...itemLines,
							...footerLines
						], columns);
					}
					return {
						itemLines,
						footerLines,
						frameRows
					};
				};
				let includeDetail = showDetail;
				let includeSelectedSummary = showSelectedSummary;
				let fitted = fitFrame(includeDetail, includeSelectedSummary);
				if (maxFrameRows && fitted.frameRows > maxFrameRows && includeDetail) {
					includeDetail = false;
					fitted = fitFrame(includeDetail, includeSelectedSummary);
				}
				if (maxFrameRows && fitted.frameRows > maxFrameRows && includeSelectedSummary) {
					includeSelectedSummary = false;
					fitted = fitFrame(includeDetail, includeSelectedSummary);
				}
				lines.push(...fitted.itemLines, ...fitted.footerLines);
			} else if (state === "submit") {
				const allSelectedLabels = [...lockedSection ? lockedSection.items.map((i) => i.label) : [], ...items.filter((item) => selected.has(item.value)).map((item) => item.label)];
				lines.push(`${S_BAR}  ${import_picocolors.default.dim(allSelectedLabels.join(", "))}`);
			} else if (state === "cancel") lines.push(`${S_BAR}  ${import_picocolors.default.strikethrough(import_picocolors.default.dim("Cancelled"))}`);
			const clearPreviousFrame = lastRenderHeight > 0 ? `\x1b[${lastRenderHeight}A\x1b[J` : "";
			process.stdout.write(clearPreviousFrame + lines.join("\n") + "\n");
			lastRenderHeight = countVisualRowsForLines(lines, process.stdout.columns);
		};
		const cleanup = () => {
			process.stdin.removeListener("keypress", keypressHandler);
			if (process.stdin.isTTY) process.stdin.setRawMode(false);
			rl.close();
		};
		const submit = () => {
			if (required && selected.size === 0 && lockedValues.length === 0) return;
			render("submit");
			cleanup();
			resolve([...lockedValues, ...Array.from(selected)]);
		};
		const cancel = () => {
			render("cancel");
			cleanup();
			resolve(cancelSymbol);
		};
		const keypressHandler = (_str, key) => {
			if (!key) return;
			const entries = buildSearchEntries(getFiltered(), selectGroups, collapsedGroups);
			const hasSelectAll = selectAll && items.length > 0;
			const cursorOffset = hasSelectAll ? 1 : 0;
			const entry = entries[cursor - cursorOffset];
			if (key.name === "return") {
				submit();
				return;
			}
			if (key.name === "escape" || key.ctrl && key.name === "c") {
				cancel();
				return;
			}
			if (key.name === "up") {
				cursor = Math.max(0, cursor - 1);
				render();
				return;
			}
			if (key.name === "down") {
				cursor = Math.min(entries.length + cursorOffset - 1, cursor + 1);
				render();
				return;
			}
			if (selectGroups && key.name === "right") {
				if (entry?.type === "group" && entry.collapsed) {
					collapsedGroups.delete(entry.group);
					render();
				}
				return;
			}
			if (selectGroups && key.name === "left") {
				const group = entry?.type === "group" ? entry.group : entry?.item.group;
				if (group) {
					collapsedGroups.add(group);
					cursor = buildSearchEntries(getFiltered(), selectGroups, collapsedGroups).findIndex((collapsedEntry) => collapsedEntry.type === "group" && collapsedEntry.group === group) + cursorOffset;
					render();
				}
				return;
			}
			if (key.name === "space") {
				if (hasSelectAll && cursor === 0) toggleAllItems(selected, items);
				else toggleSearchEntry(selected, entry);
				render();
				return;
			}
			if (key.name === "backspace") {
				query = query.slice(0, -1);
				cursor = 0;
				render();
				return;
			}
			if (searchable && key.sequence && !key.ctrl && !key.meta && key.sequence.length === 1) {
				query += key.sequence;
				cursor = 0;
				render();
				return;
			}
		};
		process.stdin.on("keypress", keypressHandler);
		render();
	});
}
const DEFAULT_CLONE_TIMEOUT_MS = 3e5;
const ALLOWED_GIT_PROTOCOLS = "https:http:ssh:git:file";
const CLONE_TIMEOUT_MS = (() => {
	const raw = process.env.SKILLS_CLONE_TIMEOUT_MS;
	if (!raw) return DEFAULT_CLONE_TIMEOUT_MS;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CLONE_TIMEOUT_MS;
})();
const execFileAsync = promisify(execFile);
var GitCloneError = class extends Error {
	url;
	isTimeout;
	isAuthError;
	constructor(message, url, isTimeout = false, isAuthError = false) {
		super(message);
		this.name = "GitCloneError";
		this.url = url;
		this.isTimeout = isTimeout;
		this.isAuthError = isAuthError;
	}
};
function parseGitHubRepoUrl(url) {
	const sshMatch = url.match(/^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/i);
	if (sshMatch && isGitHubHost(sshMatch[1])) {
		const host = sshMatch[1];
		const owner = sshMatch[2];
		const repo = sshMatch[3];
		return {
			owner,
			repo,
			slug: `${owner}/${repo}`,
			sshUrl: `git@${host}:${owner}/${repo}.git`
		};
	}
	try {
		const parsed = new URL(url);
		if (!isGitHubHost(parsed.host)) return null;
		const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
		if (!match) return null;
		const owner = match[1];
		const repo = match[2];
		return {
			owner,
			repo,
			slug: `${owner}/${repo}`,
			sshUrl: `git@${parsed.host}:${owner}/${repo}.git`
		};
	} catch {
		return null;
	}
}
function isGitHubHttpsCloneUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" && isGitHubHost(parsed.host);
	} catch {
		return false;
	}
}
function isGitHubSsoAuthError(message) {
	const lower = message.toLowerCase();
	return lower.includes("saml sso") || lower.includes("enforced sso") || lower.includes("enabled or enforced saml") || lower.includes("re-authorize the oauth application");
}
function isAuthFailure(message) {
	return message.includes("Authentication failed") || message.includes("could not read Username") || message.includes("Permission denied") || message.includes("Repository not found") || message.includes("requested URL returned error: 403") || isGitHubSsoAuthError(message);
}
function createGitClient(sshCommand) {
	const git = esm_default({
		timeout: { block: CLONE_TIMEOUT_MS },
		config: [
			"filter.lfs.required=false",
			"filter.lfs.smudge=",
			"filter.lfs.clean=",
			"filter.lfs.process="
		],
		unsafe: {
			allowUnsafeAlias: true,
			allowUnsafeAskPass: true,
			allowUnsafeConfigEnvCount: true,
			allowUnsafeConfigPaths: true,
			allowUnsafeCredentialHelper: true,
			allowUnsafeDiffExternal: true,
			allowUnsafeDiffTextConv: true,
			allowUnsafeEditor: true,
			allowUnsafeFilter: true,
			allowUnsafeFsMonitor: true,
			allowUnsafeGpgProgram: true,
			allowUnsafeGitProxy: true,
			allowUnsafeHooksPath: true,
			allowUnsafeMergeDriver: true,
			allowUnsafePack: true,
			allowUnsafePager: true,
			allowUnsafeProtocolOverride: true,
			allowUnsafeSshCommand: true,
			allowUnsafeTemplateDir: true
		}
	});
	git.env({
		...process.env,
		GIT_TERMINAL_PROMPT: "0",
		GIT_ALLOW_PROTOCOL: ALLOWED_GIT_PROTOCOLS,
		GIT_LFS_SKIP_SMUDGE: "1",
		...sshCommand ? { GIT_SSH_COMMAND: sshCommand } : {}
	});
	return git;
}
async function resetTempDir(dir) {
	await rm(dir, {
		recursive: true,
		force: true
	}).catch(() => {});
	await mkdir(dir, { recursive: true });
}
async function tryGhClone(repo, tempDir, ref) {
	let cloneTarget = repo.slug;
	const host = repo.sshUrl.match(/^git@([^:]+):/)?.[1] || "github.com";
	try {
		const { stdout, stderr } = await execFileAsync("gh", [
			"auth",
			"status",
			"-h",
			host
		], {
			timeout: 5e3,
			env: {
				...process.env,
				GIT_TERMINAL_PROMPT: "0"
			}
		});
		const statusOutput = `${stdout}${stderr}`;
		if (/Git operations protocol:\s+ssh/i.test(statusOutput)) cloneTarget = repo.sshUrl;
	} catch {
		return false;
	}
	await execFileAsync("gh", [
		"repo",
		"clone",
		cloneTarget,
		tempDir,
		"--",
		...ref ? [
			"--depth=1",
			"--branch",
			ref
		] : ["--depth=1"]
	], {
		timeout: CLONE_TIMEOUT_MS,
		env: {
			...process.env,
			GIT_TERMINAL_PROMPT: "0",
			GIT_ALLOW_PROTOCOL: ALLOWED_GIT_PROTOCOLS
		}
	});
	return true;
}
function buildGitHubAuthError(url, repo, message) {
	const host = repo?.sshUrl.match(/^git@([^:]+):/)?.[1] || "github.com";
	if (repo && isGitHubSsoAuthError(message)) return `GitHub blocked HTTPS access to ${url} because the organization enforces SAML SSO.\n  skills tried your existing git credentials and available fallbacks, but none succeeded.\n  - Re-authorize your GitHub credentials/app for that org's SSO policy\n  - Or rerun with SSH: npx skills add ${repo.sshUrl}\n  - Verify access with: gh auth status -h ${host} or ssh -T git@${host}`;
	if (repo) return `Authentication failed for ${url}.\n  - For private repos, ensure you have access\n  - Retry with SSH: npx skills add ${repo.sshUrl}\n  - Check access with: gh auth status -h ${host} or ssh -T git@${host}`;
	return `Authentication failed for ${url}.\n  - For private repos, ensure you have access\n  - For SSH: Check your keys with 'ssh -T git@github.com'\n  - For HTTPS: Run 'gh auth login' or configure git credentials`;
}
async function cloneRepo(url, ref) {
	if (/^ext::/i.test(url)) throw new GitCloneError("Unsupported Git transport: ext", url);
	const tempDir = await mkdtemp(join(tmpdir(), "skills-"));
	const cloneOptions = ref ? [
		"--depth",
		"1",
		"--branch",
		ref
	] : ["--depth", "1"];
	const repo = parseGitHubRepoUrl(url);
	try {
		await createGitClient().clone(url, tempDir, cloneOptions);
		return tempDir;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isTimeout = errorMessage.includes("block timeout") || errorMessage.includes("timed out");
		const isAuthError = isAuthFailure(errorMessage);
		if (isTimeout) {
			await rm(tempDir, {
				recursive: true,
				force: true
			}).catch(() => {});
			throw new GitCloneError(`Clone timed out after ${Math.round(CLONE_TIMEOUT_MS / 1e3)}s. Common causes:\n  - Large repository: raise the timeout with SKILLS_CLONE_TIMEOUT_MS=600000 (10m)\n  - Slow network: retry, or clone manually and pass the local path to 'skills add'\n  - Private repo without credentials: ensure auth is configured\n      - For SSH: ssh-add -l (to check loaded keys)\n      - For HTTPS: gh auth status (if using GitHub CLI)`, url, true, false);
		}
		if (isAuthError && repo && isGitHubHttpsCloneUrl(url)) {
			try {
				await resetTempDir(tempDir);
				if (await tryGhClone(repo, tempDir, ref)) return tempDir;
			} catch {}
			try {
				await resetTempDir(tempDir);
				await createGitClient(process.env.GIT_SSH_COMMAND ?? "ssh -o BatchMode=yes").clone(repo.sshUrl, tempDir, cloneOptions);
				return tempDir;
			} catch {}
		}
		await rm(tempDir, {
			recursive: true,
			force: true
		}).catch(() => {});
		if (isAuthError) throw new GitCloneError(buildGitHubAuthError(url, repo, errorMessage), url, false, true);
		throw new GitCloneError(`Failed to clone ${url}: ${errorMessage}`, url, false, false);
	}
}
async function getGitTreeHash(repoDir, skillPath) {
	const segments = skillPath.replace(/\\/g, "/").split("/");
	segments.pop();
	const folderPath = segments.join("/");
	const revision = folderPath ? `HEAD:${folderPath}` : "HEAD^{tree}";
	try {
		const hash = (await new Promise((resolve, reject) => {
			execFile("git", [
				"-C",
				repoDir,
				"rev-parse",
				"--verify",
				"--end-of-options",
				revision
			], {
				encoding: "utf8",
				timeout: CLONE_TIMEOUT_MS,
				env: {
					...process.env,
					GIT_OPTIONAL_LOCKS: "0",
					GIT_TERMINAL_PROMPT: "0"
				}
			}, (error, output) => {
				if (error) reject(error);
				else resolve(output);
			});
		})).trim();
		return /^[0-9a-f]{40}$/i.test(hash) ? hash.toLowerCase() : null;
	} catch {
		return null;
	}
}
async function cleanupTempDir(dir) {
	const normalizedDir = normalize(resolve(dir));
	const normalizedTmpDir = normalize(resolve(tmpdir()));
	if (!normalizedDir.startsWith(normalizedTmpDir + sep) && normalizedDir !== normalizedTmpDir) throw new Error("Attempted to clean up directory outside of temp directory");
	await rm(dir, {
		recursive: true,
		force: true
	});
}
function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return {
		data: {},
		content: raw
	};
	return {
		data: parse(match[1]) ?? {},
		content: match[2] ?? ""
	};
}
function isContainedIn(targetPath, basePath) {
	const normalizedBase = normalize(resolve(basePath));
	const normalizedTarget = normalize(resolve(targetPath));
	return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
function isValidRelativePath(path) {
	return path.startsWith("./");
}
async function getPluginSkillPaths(basePath) {
	const searchDirs = [];
	const addPluginSkillPaths = (pluginBase, skills) => {
		if (!isContainedIn(pluginBase, basePath)) return;
		if (skills && skills.length > 0) for (const skillPath of skills) {
			if (!isValidRelativePath(skillPath)) continue;
			const skillDir = dirname(join(pluginBase, skillPath));
			if (isContainedIn(skillDir, basePath)) searchDirs.push(skillDir);
		}
		searchDirs.push(join(pluginBase, "skills"));
	};
	try {
		const content = await readFile(join(basePath, ".claude-plugin/marketplace.json"), "utf-8");
		const manifest = JSON.parse(content);
		const pluginRoot = manifest.metadata?.pluginRoot;
		if (pluginRoot === void 0 || isValidRelativePath(pluginRoot)) for (const plugin of manifest.plugins ?? []) {
			if (typeof plugin.source !== "string" && plugin.source !== void 0) continue;
			if (plugin.source !== void 0 && !isValidRelativePath(plugin.source)) continue;
			addPluginSkillPaths(join(basePath, pluginRoot ?? "", plugin.source ?? ""), plugin.skills);
		}
	} catch {}
	try {
		const content = await readFile(join(basePath, ".claude-plugin/plugin.json"), "utf-8");
		addPluginSkillPaths(basePath, JSON.parse(content).skills);
	} catch {}
	return searchDirs;
}
async function getPluginGroupings(basePath) {
	const groupings = /* @__PURE__ */ new Map();
	try {
		const content = await readFile(join(basePath, ".claude-plugin/marketplace.json"), "utf-8");
		const manifest = JSON.parse(content);
		const pluginRoot = manifest.metadata?.pluginRoot;
		if (pluginRoot === void 0 || isValidRelativePath(pluginRoot)) for (const plugin of manifest.plugins ?? []) {
			if (!plugin.name) continue;
			if (typeof plugin.source !== "string" && plugin.source !== void 0) continue;
			if (plugin.source !== void 0 && !isValidRelativePath(plugin.source)) continue;
			const pluginBase = join(basePath, pluginRoot ?? "", plugin.source ?? "");
			if (!isContainedIn(pluginBase, basePath)) continue;
			if (plugin.skills && plugin.skills.length > 0) for (const skillPath of plugin.skills) {
				if (!isValidRelativePath(skillPath)) continue;
				const skillDir = join(pluginBase, skillPath);
				if (isContainedIn(skillDir, basePath)) groupings.set(resolve(skillDir), plugin.name);
			}
		}
	} catch {}
	try {
		const content = await readFile(join(basePath, ".claude-plugin/plugin.json"), "utf-8");
		const manifest = JSON.parse(content);
		if (manifest.name && manifest.skills && manifest.skills.length > 0) for (const skillPath of manifest.skills) {
			if (!isValidRelativePath(skillPath)) continue;
			const skillDir = join(basePath, skillPath);
			if (isContainedIn(skillDir, basePath)) groupings.set(resolve(skillDir), manifest.name);
		}
	} catch {}
	return groupings;
}
const LOCAL_LOCK_FILE = "skills-lock.json";
const CURRENT_VERSION$1 = 1;
function getLocalLockPath(cwd) {
	return join(cwd || process.cwd(), LOCAL_LOCK_FILE);
}
async function readLocalLock(cwd) {
	const lockDir = cwd || process.cwd();
	const lockPath = getLocalLockPath(lockDir);
	try {
		const content = await readFile(lockPath, "utf-8");
		const parsed = JSON.parse(content);
		if (typeof parsed.version !== "number" || !parsed.skills) return createEmptyLocalLock();
		if (parsed.version < CURRENT_VERSION$1) return createEmptyLocalLock();
		for (const entry of Object.values(parsed.skills)) if (entry.sourceType === "local" && !isAbsolute(entry.source)) entry.source = resolve(lockDir, entry.source);
		return parsed;
	} catch {
		return createEmptyLocalLock();
	}
}
async function writeLocalLock(lock, cwd) {
	const lockDir = cwd || process.cwd();
	const lockPath = getLocalLockPath(lockDir);
	const sortedSkills = {};
	for (const key of Object.keys(lock.skills).sort()) {
		const entry = lock.skills[key];
		sortedSkills[key] = entry.sourceType === "local" ? {
			...entry,
			source: getPortableLocalSource(entry.source, lockDir)
		} : entry;
	}
	const sorted = {
		version: lock.version,
		skills: sortedSkills
	};
	await writeFile(lockPath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}
function getPortableLocalSource(source, lockDir) {
	const absoluteSource = isAbsolute(source) ? source : resolve(lockDir, source);
	const relativeSource = relative(lockDir, absoluteSource);
	if (isAbsolute(relativeSource)) return absoluteSource.split(sep).join("/");
	const portableSource = relativeSource.split(sep).join("/");
	if (!portableSource) return ".";
	if (portableSource === ".." || portableSource.startsWith("../")) return portableSource;
	return `./${portableSource}`;
}
async function computeSkillFolderHash(skillDir) {
	const files = [];
	await collectFiles(skillDir, skillDir, files);
	files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
	const hash = createHash("sha256");
	for (const file of files) {
		hash.update(file.relativePath);
		hash.update(file.content);
	}
	return hash.digest("hex");
}
async function collectFiles(baseDir, currentDir, results) {
	const entries = await readdir(currentDir, { withFileTypes: true });
	await Promise.all(entries.map(async (entry) => {
		const fullPath = join(currentDir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === ".git" || entry.name === "node_modules") return;
			await collectFiles(baseDir, fullPath, results);
		} else if (entry.isFile()) {
			const content = await readFile(fullPath);
			const relativePath = relative(baseDir, fullPath).split("\\").join("/");
			results.push({
				relativePath,
				content
			});
		}
	}));
}
async function addSkillToLocalLock(skillName, entry, cwd) {
	const lock = await readLocalLock(cwd);
	lock.skills[skillName] = entry;
	await writeLocalLock(lock, cwd);
}
async function removeSkillFromLocalLock(skillName, cwd) {
	const lock = await readLocalLock(cwd);
	if (!(skillName in lock.skills)) return false;
	delete lock.skills[skillName];
	await writeLocalLock(lock, cwd);
	return true;
}
function createEmptyLocalLock() {
	return {
		version: CURRENT_VERSION$1,
		skills: {}
	};
}
const AGENTS_DIR$1 = ".agents";
const SKILLS_SUBDIR = "skills";
const SKIP_DIRS = [
	"node_modules",
	".git",
	"dist",
	"build",
	"__pycache__"
];
const AGENT_PROJECT_SKILL_DIRS = [
	".agents/skills",
	".claude/skills",
	".cline/skills",
	".codebuddy/skills",
	".codex/skills",
	".commandcode/skills",
	".continue/skills",
	".github/skills",
	".goose/skills",
	".grok/skills",
	".iflow/skills",
	".junie/skills",
	".kilocode/skills",
	".kimchi/skills",
	".kiro/skills",
	".minimax/skills",
	".mux/skills",
	".neovate/skills",
	".opencode/skills",
	".openhands/skills",
	".pi/skills",
	".posit/assistant/skills",
	".qoder/skills",
	".roo/skills",
	".trae/skills",
	".windsurf/skills",
	".zcode/skills",
	".zencoder/skills"
];
function normalizeSkillName(name) {
	return name.toLowerCase().replace(/[\s_]+/g, "-");
}
function normalizeRelativePath(path) {
	return path.split(sep).join("/").replace(/\/+/g, "/");
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function shouldInstallInternalSkills() {
	const envValue = process.env.INSTALL_INTERNAL_SKILLS;
	return envValue === "1" || envValue === "true";
}
async function hasSkillMd(dir) {
	try {
		return (await stat(join(dir, "SKILL.md"))).isFile();
	} catch {
		return false;
	}
}
function warnSkippedSkill(skillMdPath, reason) {
	console.warn(`⚠ Skipped ${sanitizeMetadata(skillMdPath)} — ${stripTerminalEscapes(reason)}`);
}
async function parseSkillMd(skillMdPath, options) {
	let content;
	try {
		content = await readFile(skillMdPath, "utf-8");
	} catch (err) {
		warnSkippedSkill(skillMdPath, `failed to read file: ${err.message}`);
		return null;
	}
	let data;
	try {
		({data} = parseFrontmatter(content));
	} catch (err) {
		warnSkippedSkill(skillMdPath, `YAML parse error: ${err.message}`);
		return null;
	}
	if (!data.name || !data.description) {
		const missing = [];
		if (!data.name) missing.push("name");
		if (!data.description) missing.push("description");
		warnSkippedSkill(skillMdPath, `missing required frontmatter field(s): ${missing.join(", ")}`);
		return null;
	}
	if (typeof data.name !== "string" || typeof data.description !== "string") {
		warnSkippedSkill(skillMdPath, `frontmatter "name" and "description" must be strings (got ${typeof data.name} and ${typeof data.description})`);
		return null;
	}
	const metadata = isRecord(data.metadata) ? data.metadata : void 0;
	if (metadata?.internal === true && !shouldInstallInternalSkills() && !options?.includeInternal) return null;
	return {
		name: sanitizeMetadata(data.name),
		description: sanitizeMetadata(data.description),
		path: dirname(skillMdPath),
		rawContent: content,
		metadata
	};
}
async function findSkillDirs(dir, depth = 0, maxDepth = 5) {
	if (depth > maxDepth) return [];
	try {
		const [hasSkill, entries] = await Promise.all([hasSkillMd(dir), readdir(dir, { withFileTypes: true }).catch(() => [])]);
		const currentDir = hasSkill ? [dir] : [];
		const subDirResults = await Promise.all(entries.filter((entry) => entry.isDirectory() && !SKIP_DIRS.includes(entry.name)).map((entry) => findSkillDirs(join(dir, entry.name), depth + 1, maxDepth)));
		return [...currentDir, ...subDirResults.flat()];
	} catch {
		return [];
	}
}
function isSubpathSafe(basePath, subpath) {
	const normalizedBase = normalize(resolve(basePath));
	const normalizedTarget = normalize(resolve(join(basePath, subpath)));
	return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
async function discoverSkills(basePath, subpath, options) {
	const skills = [];
	const seenNames = /* @__PURE__ */ new Set();
	const parsedSkillPaths = /* @__PURE__ */ new Set();
	const localLock = await readLocalLock(basePath);
	const lockedSkillNames = new Set(Object.keys(localLock.skills).map(normalizeSkillName));
	if (subpath && !isSubpathSafe(basePath, subpath)) throw new Error(`Invalid subpath: "${subpath}" resolves outside the repository directory. Subpath must not contain ".." segments that escape the base path.`);
	const searchPath = subpath ? join(basePath, subpath) : basePath;
	const pluginGroupings = await getPluginGroupings(searchPath);
	const enhanceSkill = (skill) => {
		const resolvedPath = resolve(skill.path);
		if (pluginGroupings.has(resolvedPath)) skill.pluginName = pluginGroupings.get(resolvedPath);
		return skill;
	};
	const isInstalledProjectSkill = (skill) => {
		if (lockedSkillNames.size === 0) return false;
		const relativeDir = normalizeRelativePath(relative(basePath, skill.path));
		if (!AGENT_PROJECT_SKILL_DIRS.some((dir) => relativeDir === dir || relativeDir.startsWith(`${dir}/`))) return false;
		const skillName = normalizeSkillName(skill.name);
		const directoryName = normalizeSkillName(basename(skill.path));
		return lockedSkillNames.has(skillName) || lockedSkillNames.has(directoryName);
	};
	const parseSkillAt = async (skillDir) => {
		const skillMdPath = resolve(skillDir, "SKILL.md");
		if (parsedSkillPaths.has(skillMdPath)) return null;
		parsedSkillPaths.add(skillMdPath);
		return parseSkillMd(skillMdPath, options);
	};
	if (await hasSkillMd(searchPath)) {
		let skill = await parseSkillAt(searchPath);
		if (skill) {
			if (!isInstalledProjectSkill(skill)) {
				skill = enhanceSkill(skill);
				skills.push(skill);
				seenNames.add(skill.name);
				if (!options?.fullDepth) return skills;
			}
		}
	}
	const prioritySearchDirs = [
		searchPath,
		join(searchPath, "skills"),
		join(searchPath, "skills/.curated"),
		join(searchPath, "skills/.experimental"),
		join(searchPath, "skills/.system"),
		...AGENT_PROJECT_SKILL_DIRS.map((dir) => join(searchPath, dir))
	];
	const deepContainerDirs = new Set(prioritySearchDirs.slice(1));
	prioritySearchDirs.push(...await getPluginSkillPaths(searchPath));
	const tryAddSkillAt = async (skillDir) => {
		if (!await hasSkillMd(skillDir)) return false;
		let skill = await parseSkillAt(skillDir);
		if (!skill || seenNames.has(skill.name)) return true;
		if (isInstalledProjectSkill(skill)) return true;
		skill = enhanceSkill(skill);
		skills.push(skill);
		seenNames.add(skill.name);
		return true;
	};
	const walkSkillDirs = async (dir, maxDepth, depth = 1) => {
		try {
			const entries = await readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (!entry.isDirectory()) continue;
				const childDir = join(dir, entry.name);
				if (await tryAddSkillAt(childDir) || depth >= maxDepth || SKIP_DIRS.includes(entry.name)) continue;
				await walkSkillDirs(childDir, maxDepth, depth + 1);
			}
		} catch {}
	};
	for (const dir of prioritySearchDirs) await walkSkillDirs(dir, deepContainerDirs.has(dir) ? 3 : 1);
	if (skills.length === 0 || options?.fullDepth) {
		const allSkillDirs = await findSkillDirs(searchPath);
		for (const skillDir of allSkillDirs) {
			let skill = await parseSkillAt(skillDir);
			if (skill && !seenNames.has(skill.name) && !isInstalledProjectSkill(skill)) {
				skill = enhanceSkill(skill);
				skills.push(skill);
				seenNames.add(skill.name);
			}
		}
	}
	return skills;
}
function getSkillDisplayName(skill) {
	return skill.name || basename(skill.path);
}
function filterSkills(skills, inputNames) {
	const normalizedInputs = inputNames.map((n) => n.toLowerCase());
	return skills.filter((skill) => {
		const name = skill.name.toLowerCase();
		const displayName = getSkillDisplayName(skill).toLowerCase();
		return normalizedInputs.some((input) => input === name || input === displayName);
	});
}
const home = homedir();
const configHome = xdgConfig ?? join(home, ".config");
const codexHome = process.env.CODEX_HOME?.trim() || join(home, ".codex");
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, ".claude");
const vibeHome = process.env.VIBE_HOME?.trim() || join(home, ".vibe");
const hermesHome = process.env.HERMES_HOME?.trim() || join(home, ".hermes");
const autohandHome = process.env.AUTOHAND_HOME?.trim() || join(home, ".autohand");
const grokHome = process.env.GROK_HOME?.trim() || join(home, ".grok");
const zedAppDataHome = process.env.APPDATA?.trim();
const zedFlatpakConfigHome = process.env.FLATPAK_XDG_CONFIG_HOME?.trim();
function packageJsonHasDependency(packageJsonPath, dependencyName) {
	try {
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
		return !!(packageJson.dependencies?.[dependencyName] || packageJson.devDependencies?.[dependencyName]);
	} catch {
		return false;
	}
}
function getOpenClawGlobalSkillsDir(homeDir = home, pathExists = existsSync) {
	if (pathExists(join(homeDir, ".openclaw"))) return join(homeDir, ".openclaw/skills");
	if (pathExists(join(homeDir, ".clawdbot"))) return join(homeDir, ".clawdbot/skills");
	if (pathExists(join(homeDir, ".moltbot"))) return join(homeDir, ".moltbot/skills");
	return join(homeDir, ".openclaw/skills");
}
function isZCodeInstalled(homeDir = home, pathExists = existsSync) {
	return pathExists(join(homeDir, ".zcode")) || pathExists("/Applications/ZCode.app");
}
function isKimchiInstalled(homeDir = home, pathExists = existsSync) {
	return pathExists(join(homeDir, ".config", "kimchi"));
}
function isMiniMaxCodeInstalled(homeDir = home, pathExists = existsSync) {
	return pathExists(join(homeDir, ".minimax")) || pathExists("/Applications/MiniMax Code.app");
}
function isPositAssistantInstalled(homeDir = home, pathExists = existsSync) {
	return pathExists(join(homeDir, ".posit/assistant")) || pathExists(join(homeDir, ".positai"));
}
const agents = {
	"aider-desk": {
		name: "aider-desk",
		displayName: "AiderDesk",
		skillsDir: ".aider-desk/skills",
		globalSkillsDir: join(home, ".aider-desk/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".aider-desk"));
		}
	},
	amp: {
		name: "amp",
		displayName: "Amp",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(configHome, "agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "amp"));
		}
	},
	antigravity: {
		name: "antigravity",
		displayName: "Antigravity",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".gemini/antigravity/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".gemini/antigravity"));
		}
	},
	"antigravity-cli": {
		name: "antigravity-cli",
		displayName: "Antigravity CLI",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".gemini/antigravity-cli/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".gemini/antigravity-cli"));
		}
	},
	astrbot: {
		name: "astrbot",
		displayName: "AstrBot",
		skillsDir: "data/skills",
		globalSkillsDir: join(home, ".astrbot/data/skills"),
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), "data/skills")) || existsSync(join(home, ".astrbot"));
		}
	},
	"autohand-code": {
		name: "autohand-code",
		displayName: "Autohand Code CLI",
		skillsDir: ".autohand/skills",
		globalSkillsDir: join(autohandHome, "skills"),
		detectInstalled: async () => {
			return existsSync(autohandHome);
		}
	},
	augment: {
		name: "augment",
		displayName: "Augment",
		skillsDir: ".augment/skills",
		globalSkillsDir: join(home, ".augment/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".augment"));
		}
	},
	bob: {
		name: "bob",
		displayName: "IBM Bob",
		skillsDir: ".bob/skills",
		globalSkillsDir: join(home, ".bob/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".bob"));
		}
	},
	"claude-code": {
		name: "claude-code",
		displayName: "Claude Code",
		skillsDir: ".claude/skills",
		globalSkillsDir: join(claudeHome, "skills"),
		detectInstalled: async () => {
			return existsSync(claudeHome);
		}
	},
	openclaw: {
		name: "openclaw",
		displayName: "OpenClaw",
		skillsDir: "skills",
		globalSkillsDir: getOpenClawGlobalSkillsDir(),
		detectInstalled: async () => {
			return existsSync(join(home, ".openclaw")) || existsSync(join(home, ".clawdbot")) || existsSync(join(home, ".moltbot"));
		}
	},
	cline: {
		name: "cline",
		displayName: "Cline",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents", "skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".cline"));
		}
	},
	"codearts-agent": {
		name: "codearts-agent",
		displayName: "CodeArts Agent",
		skillsDir: ".codeartsdoer/skills",
		globalSkillsDir: join(home, ".codeartsdoer/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".codeartsdoer"));
		}
	},
	codebuddy: {
		name: "codebuddy",
		displayName: "CodeBuddy",
		skillsDir: ".codebuddy/skills",
		globalSkillsDir: join(home, ".codebuddy/skills"),
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), ".codebuddy")) || existsSync(join(home, ".codebuddy"));
		}
	},
	codemaker: {
		name: "codemaker",
		displayName: "Codemaker",
		skillsDir: ".codemaker/skills",
		globalSkillsDir: join(home, ".codemaker/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".codemaker"));
		}
	},
	codestudio: {
		name: "codestudio",
		displayName: "Code Studio",
		skillsDir: ".codestudio/skills",
		globalSkillsDir: join(home, ".codestudio/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".codestudio"));
		}
	},
	codex: {
		name: "codex",
		displayName: "Codex",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(codexHome, "skills"),
		detectInstalled: async () => {
			return existsSync(codexHome) || existsSync("/etc/codex");
		}
	},
	"command-code": {
		name: "command-code",
		displayName: "Command Code",
		skillsDir: ".commandcode/skills",
		globalSkillsDir: join(home, ".commandcode/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".commandcode"));
		}
	},
	continue: {
		name: "continue",
		displayName: "Continue",
		skillsDir: ".continue/skills",
		globalSkillsDir: join(home, ".continue/skills"),
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), ".continue")) || existsSync(join(home, ".continue"));
		}
	},
	cortex: {
		name: "cortex",
		displayName: "Cortex Code",
		skillsDir: ".cortex/skills",
		globalSkillsDir: join(home, ".snowflake/cortex/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".snowflake/cortex"));
		}
	},
	crush: {
		name: "crush",
		displayName: "Crush",
		skillsDir: ".crush/skills",
		globalSkillsDir: join(home, ".config/crush/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".config/crush"));
		}
	},
	cursor: {
		name: "cursor",
		displayName: "Cursor",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".cursor/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".cursor"));
		}
	},
	deepagents: {
		name: "deepagents",
		displayName: "Deep Agents",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".deepagents/agent/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".deepagents"));
		}
	},
	devin: {
		name: "devin",
		displayName: "Devin for Terminal",
		skillsDir: ".devin/skills",
		globalSkillsDir: join(configHome, "devin/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "devin"));
		}
	},
	dexto: {
		name: "dexto",
		displayName: "Dexto",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(home, ".dexto"));
		}
	},
	droid: {
		name: "droid",
		displayName: "Droid",
		skillsDir: ".factory/skills",
		globalSkillsDir: join(home, ".factory/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".factory"));
		}
	},
	eve: {
		name: "eve",
		displayName: "Eve",
		skillsDir: "agent/skills",
		globalSkillsDir: void 0,
		detectInstalled: async () => {
			const cwd = process.cwd();
			return existsSync(join(cwd, "agent")) && packageJsonHasDependency(join(cwd, "package.json"), "eve");
		}
	},
	firebender: {
		name: "firebender",
		displayName: "Firebender",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".firebender/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(home, ".firebender"));
		}
	},
	forgecode: {
		name: "forgecode",
		displayName: "ForgeCode",
		skillsDir: ".forge/skills",
		globalSkillsDir: join(home, ".forge/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".forge"));
		}
	},
	"gemini-cli": {
		name: "gemini-cli",
		displayName: "Gemini CLI",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".gemini/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".gemini"));
		}
	},
	"github-copilot": {
		name: "github-copilot",
		displayName: "GitHub Copilot",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".copilot/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".copilot"));
		}
	},
	goose: {
		name: "goose",
		displayName: "Goose",
		skillsDir: ".goose/skills",
		globalSkillsDir: join(configHome, "goose/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "goose"));
		}
	},
	grok: {
		name: "grok",
		displayName: "Grok Build",
		skillsDir: ".grok/skills",
		globalSkillsDir: join(grokHome, "skills"),
		detectInstalled: async () => {
			return existsSync(grokHome);
		}
	},
	"hermes-agent": {
		name: "hermes-agent",
		displayName: "Hermes Agent",
		skillsDir: ".hermes/skills",
		globalSkillsDir: join(hermesHome, "skills"),
		detectInstalled: async () => {
			return existsSync(hermesHome);
		}
	},
	"inference-sh": {
		name: "inference-sh",
		displayName: "inference.sh",
		skillsDir: ".inferencesh/skills",
		globalSkillsDir: join(home, ".inferencesh/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".inferencesh"));
		}
	},
	jazz: {
		name: "jazz",
		displayName: "Jazz",
		skillsDir: ".jazz/skills",
		globalSkillsDir: join(home, ".jazz/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".jazz")) || existsSync(join(process.cwd(), ".jazz"));
		}
	},
	junie: {
		name: "junie",
		displayName: "Junie",
		skillsDir: ".junie/skills",
		globalSkillsDir: join(home, ".junie/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".junie"));
		}
	},
	"iflow-cli": {
		name: "iflow-cli",
		displayName: "iFlow CLI",
		skillsDir: ".iflow/skills",
		globalSkillsDir: join(home, ".iflow/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".iflow"));
		}
	},
	kilo: {
		name: "kilo",
		displayName: "Kilo Code",
		skillsDir: ".kilocode/skills",
		globalSkillsDir: join(home, ".kilocode/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".kilocode"));
		}
	},
	kimchi: {
		name: "kimchi",
		displayName: "Kimchi",
		skillsDir: ".kimchi/skills",
		globalSkillsDir: join(home, ".config", "kimchi", "harness", "skills"),
		detectInstalled: async () => {
			return isKimchiInstalled();
		}
	},
	"kimi-code-cli": {
		name: "kimi-code-cli",
		displayName: "Kimi Code CLI",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".kimi-code")) || existsSync(join(home, ".kimi"));
		}
	},
	"kiro-cli": {
		name: "kiro-cli",
		displayName: "Kiro CLI",
		skillsDir: ".kiro/skills",
		globalSkillsDir: join(home, ".kiro/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".kiro"));
		}
	},
	kode: {
		name: "kode",
		displayName: "Kode",
		skillsDir: ".kode/skills",
		globalSkillsDir: join(home, ".kode/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".kode"));
		}
	},
	lingma: {
		name: "lingma",
		displayName: "Lingma",
		skillsDir: ".lingma/skills",
		globalSkillsDir: join(home, ".lingma/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".lingma"));
		}
	},
	loaf: {
		name: "loaf",
		displayName: "Loaf",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(home, ".loaf"));
		}
	},
	mcpjam: {
		name: "mcpjam",
		displayName: "MCPJam",
		skillsDir: ".mcpjam/skills",
		globalSkillsDir: join(home, ".mcpjam/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".mcpjam"));
		}
	},
	"minimax-code": {
		name: "minimax-code",
		displayName: "MiniMax Code",
		skillsDir: ".minimax/skills",
		globalSkillsDir: join(home, ".minimax/skills"),
		detectInstalled: async () => {
			return isMiniMaxCodeInstalled();
		}
	},
	"mistral-vibe": {
		name: "mistral-vibe",
		displayName: "Mistral Vibe",
		skillsDir: ".vibe/skills",
		globalSkillsDir: join(vibeHome, "skills"),
		detectInstalled: async () => {
			return existsSync(vibeHome);
		}
	},
	moxby: {
		name: "moxby",
		displayName: "Moxby",
		skillsDir: ".moxby/skills",
		globalSkillsDir: join(home, ".moxby/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".moxby"));
		}
	},
	mux: {
		name: "mux",
		displayName: "Mux",
		skillsDir: ".mux/skills",
		globalSkillsDir: join(home, ".mux/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".mux"));
		}
	},
	opencode: {
		name: "opencode",
		displayName: "OpenCode",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(configHome, "opencode/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "opencode"));
		}
	},
	openhands: {
		name: "openhands",
		displayName: "OpenHands",
		skillsDir: ".openhands/skills",
		globalSkillsDir: join(home, ".openhands/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".openhands"));
		}
	},
	ona: {
		name: "ona",
		displayName: "Ona",
		skillsDir: ".ona/skills",
		globalSkillsDir: join(home, ".ona/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".ona"));
		}
	},
	pi: {
		name: "pi",
		displayName: "Pi",
		skillsDir: ".pi/skills",
		globalSkillsDir: join(home, ".pi/agent/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".pi/agent"));
		}
	},
	"posit-assistant": {
		name: "posit-assistant",
		displayName: "Posit Assistant",
		skillsDir: ".posit/assistant/skills",
		globalSkillsDir: join(home, ".posit/assistant/skills"),
		detectInstalled: async () => {
			return isPositAssistantInstalled();
		}
	},
	qoder: {
		name: "qoder",
		displayName: "Qoder",
		skillsDir: ".qoder/skills",
		globalSkillsDir: join(home, ".qoder/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".qoder"));
		}
	},
	"qoder-cn": {
		name: "qoder-cn",
		displayName: "Qoder CN",
		skillsDir: ".qoder/skills",
		globalSkillsDir: join(home, ".qoder-cn/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".qoder-cn"));
		}
	},
	"qwen-code": {
		name: "qwen-code",
		displayName: "Qwen Code",
		skillsDir: ".qwen/skills",
		globalSkillsDir: join(home, ".qwen/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".qwen"));
		}
	},
	replit: {
		name: "replit",
		displayName: "Replit",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(configHome, "agents/skills"),
		showInUniversalList: false,
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), ".replit"));
		}
	},
	reasonix: {
		name: "reasonix",
		displayName: "Reasonix",
		skillsDir: ".reasonix/skills",
		globalSkillsDir: join(home, ".reasonix/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".reasonix"));
		}
	},
	rovodev: {
		name: "rovodev",
		displayName: "Rovo Dev",
		skillsDir: ".rovodev/skills",
		globalSkillsDir: join(home, ".rovodev/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".rovodev"));
		}
	},
	roo: {
		name: "roo",
		displayName: "Roo Code",
		skillsDir: ".roo/skills",
		globalSkillsDir: join(home, ".roo/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".roo"));
		}
	},
	"tabnine-cli": {
		name: "tabnine-cli",
		displayName: "Tabnine CLI",
		skillsDir: ".tabnine/agent/skills",
		globalSkillsDir: join(home, ".tabnine/agent/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".tabnine"));
		}
	},
	terramind: {
		name: "terramind",
		displayName: "Terramind",
		skillsDir: ".terramind/skills",
		globalSkillsDir: join(home, ".terramind/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".terramind"));
		}
	},
	tinycloud: {
		name: "tinycloud",
		displayName: "Tinycloud",
		skillsDir: ".tinycloud/skills",
		globalSkillsDir: join(home, ".tinycloud/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".tinycloud"));
		}
	},
	trae: {
		name: "trae",
		displayName: "Trae",
		skillsDir: ".trae/skills",
		globalSkillsDir: join(home, ".trae/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".trae"));
		}
	},
	"trae-cn": {
		name: "trae-cn",
		displayName: "Trae CN",
		skillsDir: ".trae/skills",
		globalSkillsDir: join(home, ".trae-cn/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".trae-cn"));
		}
	},
	warp: {
		name: "warp",
		displayName: "Warp",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".warp"));
		}
	},
	windsurf: {
		name: "windsurf",
		displayName: "Windsurf",
		skillsDir: ".windsurf/skills",
		globalSkillsDir: join(home, ".codeium/windsurf/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".codeium/windsurf"));
		}
	},
	zed: {
		name: "zed",
		displayName: "Zed",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "zed")) || !!zedAppDataHome && existsSync(join(zedAppDataHome, "Zed")) || !!zedFlatpakConfigHome && existsSync(join(zedFlatpakConfigHome, "zed"));
		}
	},
	zcode: {
		name: "zcode",
		displayName: "ZCode",
		skillsDir: ".zcode/skills",
		globalSkillsDir: join(home, ".zcode/skills"),
		detectInstalled: async () => {
			return isZCodeInstalled();
		}
	},
	zencoder: {
		name: "zencoder",
		displayName: "Zencoder",
		skillsDir: ".zencoder/skills",
		globalSkillsDir: join(home, ".zencoder/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".zencoder"));
		}
	},
	zenflow: {
		name: "zenflow",
		displayName: "Zenflow",
		skillsDir: ".zencoder/skills",
		globalSkillsDir: join(home, ".zencoder/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".zencoder"));
		}
	},
	neovate: {
		name: "neovate",
		displayName: "Neovate",
		skillsDir: ".neovate/skills",
		globalSkillsDir: join(home, ".neovate/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".neovate"));
		}
	},
	pochi: {
		name: "pochi",
		displayName: "Pochi",
		skillsDir: ".pochi/skills",
		globalSkillsDir: join(home, ".pochi/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".pochi"));
		}
	},
	promptscript: {
		name: "promptscript",
		displayName: "PromptScript",
		skillsDir: ".agents/skills",
		globalSkillsDir: void 0,
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), ".promptscript")) || existsSync(join(process.cwd(), "promptscript.yaml"));
		}
	},
	adal: {
		name: "adal",
		displayName: "AdaL",
		skillsDir: ".adal/skills",
		globalSkillsDir: join(home, ".adal/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".adal"));
		}
	},
	universal: {
		name: "universal",
		displayName: "Universal",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(configHome, "agents/skills"),
		showInUniversalList: false,
		detectInstalled: async () => false
	}
};
async function detectInstalledAgents() {
	return (await Promise.all(Object.entries(agents).map(async ([type, config]) => ({
		type,
		installed: await config.detectInstalled()
	})))).filter((r) => r.installed).map((r) => r.type);
}
const EVE_SUBAGENTS_DIR = join("agent", "subagents");
function getEveSubagents(cwd = process.cwd()) {
	const dir = join(cwd, EVE_SUBAGENTS_DIR);
	if (!existsSync(dir)) return [];
	try {
		return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
	} catch {
		return [];
	}
}
function getUniversalAgents() {
	return Object.entries(agents).filter(([_, config]) => config.skillsDir === ".agents/skills" && config.showInUniversalList !== false).map(([type]) => type);
}
function getVisibleUniversalAgents() {
	return Object.entries(agents).filter(([_, config]) => config.skillsDir === ".agents/skills" && config.showInUniversalList !== false && config.showInUniversalPrompt !== false).map(([type]) => type);
}
function getNonUniversalAgents() {
	return Object.entries(agents).filter(([_, config]) => config.skillsDir !== ".agents/skills").map(([type]) => type);
}
function isUniversalAgent(type) {
	return agents[type].skillsDir === ".agents/skills";
}
function sanitizeName(name) {
	return name.toLowerCase().replace(/[^a-z0-9._]+/g, "-").replace(/^[.\-]+|[.\-]+$/g, "").substring(0, 255) || "unnamed-skill";
}
function isPathSafe$2(basePath, targetPath) {
	const normalizedBase = normalize(resolve(basePath));
	const normalizedTarget = normalize(resolve(targetPath));
	return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
function pathsOverlap(pathA, pathB) {
	return isPathSafe$2(pathA, pathB) || isPathSafe$2(pathB, pathA);
}
async function isDirEntryOrSymlinkToDir(entry, entryPath) {
	if (entry.isDirectory()) return true;
	if (!entry.isSymbolicLink()) return false;
	try {
		return (await stat(entryPath)).isDirectory();
	} catch {
		return false;
	}
}
function getCanonicalSkillsDir(global, cwd) {
	return join(global ? homedir() : cwd || process.cwd(), AGENTS_DIR$1, SKILLS_SUBDIR);
}
function getEveSubagentSkillsDir(subagent, cwd) {
	return join(cwd || process.cwd(), EVE_SUBAGENTS_DIR, sanitizeName(subagent), "skills");
}
function getAgentBaseDir(agentType, global, cwd, eveSubagent) {
	if (isUniversalAgent(agentType)) return getCanonicalSkillsDir(global, cwd);
	if (agentType === "eve" && eveSubagent) return getEveSubagentSkillsDir(eveSubagent, cwd);
	const agent = agents[agentType];
	const baseDir = global ? homedir() : cwd || process.cwd();
	if (global) {
		if (agent.globalSkillsDir === void 0) return join(baseDir, agent.skillsDir);
		return agent.globalSkillsDir;
	}
	return join(baseDir, agent.skillsDir);
}
function resolveSymlinkTarget(linkPath, linkTarget) {
	return resolve(dirname(linkPath), linkTarget);
}
async function cleanAndCreateDirectory(path) {
	try {
		await rm(path, {
			recursive: true,
			force: true
		});
	} catch {}
	await mkdir(path, { recursive: true });
}
async function resolveParentSymlinks(path) {
	const resolved = resolve(path);
	const dir = dirname(resolved);
	const base = basename(resolved);
	try {
		return join(await realpath(dir), base);
	} catch {
		return resolved;
	}
}
async function createSymlink(target, linkPath) {
	try {
		const resolvedTarget = resolve(target);
		const resolvedLinkPath = resolve(linkPath);
		const [realTarget, realLinkPath] = await Promise.all([realpath(resolvedTarget).catch(() => resolvedTarget), realpath(resolvedLinkPath).catch(() => resolvedLinkPath)]);
		if (realTarget === realLinkPath) return true;
		if (await resolveParentSymlinks(target) === await resolveParentSymlinks(linkPath)) return true;
		try {
			if ((await lstat(linkPath)).isSymbolicLink()) {
				if (resolveSymlinkTarget(linkPath, await readlink(linkPath)) === resolvedTarget) return true;
				await rm(linkPath);
			} else await rm(linkPath, { recursive: true });
		} catch (err) {
			if (err && typeof err === "object" && "code" in err && err.code === "ELOOP") try {
				await rm(linkPath, { force: true });
			} catch {}
		}
		const linkDir = dirname(linkPath);
		await mkdir(linkDir, { recursive: true });
		const relativePath = relative(await resolveParentSymlinks(linkDir), target);
		const symlinkType = platform() === "win32" ? "junction" : void 0;
		await symlink(symlinkType === "junction" ? resolvedTarget : relativePath, linkPath, symlinkType);
		return true;
	} catch {
		return false;
	}
}
async function installSkillForAgent(skill, agentType, options = {}) {
	const agent = agents[agentType];
	const isGlobal = options.global ?? false;
	const cwd = options.cwd || process.cwd();
	const eveSubagent = options.eveSubagent;
	if (isGlobal && agent.globalSkillsDir === void 0) return {
		success: false,
		path: "",
		mode: options.mode ?? "symlink",
		error: `${agent.displayName} does not support global skill installation`
	};
	const skillName = sanitizeName(skill.name || basename(skill.path));
	const installMode = options.mode ?? "symlink";
	const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
	const canonicalDir = join(canonicalBase, skillName);
	const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
	const agentDir = join(agentBase, skillName);
	if (!isPathSafe$2(canonicalBase, canonicalDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	if (!isPathSafe$2(agentBase, agentDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	try {
		if (pathsOverlap(skill.path, agentDir)) return {
			success: true,
			path: agentDir,
			mode: installMode,
			skipped: true
		};
		if (installMode === "copy") {
			await cleanAndCreateDirectory(agentDir);
			await copyDirectory(skill.path, agentDir, agentType);
			return {
				success: true,
				path: agentDir,
				mode: "copy"
			};
		}
		if (pathsOverlap(skill.path, canonicalDir)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: "symlink",
			skipped: true
		};
		await cleanAndCreateDirectory(canonicalDir);
		await copyDirectory(skill.path, canonicalDir, agentType);
		if (isGlobal && isUniversalAgent(agentType)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
		if (!isGlobal && !isUniversalAgent(agentType)) {
			if (!existsSync(join(cwd, agents[agentType].skillsDir.split("/")[0])) && agentType !== "claude-code") return {
				success: true,
				path: canonicalDir,
				canonicalPath: canonicalDir,
				mode: "symlink",
				skipped: true
			};
		}
		if (!await createSymlink(canonicalDir, agentDir)) {
			await cleanAndCreateDirectory(agentDir);
			await copyDirectory(skill.path, agentDir, agentType);
			return {
				success: true,
				path: agentDir,
				canonicalPath: canonicalDir,
				mode: "symlink",
				symlinkFailed: true
			};
		}
		return {
			success: true,
			path: agentDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
	} catch (error) {
		return {
			success: false,
			path: agentDir,
			mode: installMode,
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
}
const EXCLUDE_FILES$1 = /* @__PURE__ */ new Set(["metadata.json"]);
const EXCLUDE_DIRS$1 = /* @__PURE__ */ new Set([
	".git",
	"__pycache__",
	"__pypackages__"
]);
const isExcluded$1 = (name, isDirectory = false) => {
	if (EXCLUDE_FILES$1.has(name)) return true;
	if (isDirectory && EXCLUDE_DIRS$1.has(name)) return true;
	return false;
};
function stripIgnoredEveFrontmatter(raw) {
	const { data, content } = parseFrontmatter(raw);
	const eveData = {};
	if (typeof data.description === "string") eveData.description = data.description;
	if (typeof data.license === "string") eveData.license = data.license;
	if (data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)) {
		const metadata = Object.fromEntries(Object.entries(data.metadata).filter((entry) => typeof entry[1] === "string"));
		if (Object.keys(metadata).length > 0) eveData.metadata = metadata;
	}
	const keys = Object.keys(eveData);
	if (keys.length === 0) return content.replace(/^\r?\n/u, "");
	return `---\n${keys.map((key) => `${key}: ${JSON.stringify(eveData[key])}`).join("\n")}\n---\n${content.replace(/^\r?\n/u, "")}`;
}
async function copyDirectory(src, dest, agentType) {
	await mkdir(dest, { recursive: true });
	const entries = await readdir(src, { withFileTypes: true });
	await Promise.all(entries.filter((entry) => !isExcluded$1(entry.name, entry.isDirectory())).map(async (entry) => {
		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);
		if (entry.isDirectory()) await copyDirectory(srcPath, destPath, agentType);
		else try {
			if (agentType === "eve" && entry.name.toLowerCase() === "skill.md") {
				await writeFile(destPath, stripIgnoredEveFrontmatter(await readFile(srcPath, "utf-8")));
				return;
			}
			await cp(srcPath, destPath, {
				dereference: true,
				recursive: true
			});
			await chmod(destPath, (await stat(srcPath)).mode & 511);
		} catch (err) {
			if (err instanceof Error && "code" in err && err.code === "ENOENT" && entry.isSymbolicLink()) console.warn(`Skipping broken symlink: ${srcPath}`);
			else throw err;
		}
	}));
}
function isEvePackagedSkill(files) {
	return files.some((file) => basename(file.path).toLowerCase() === "skill.md");
}
function toEveFlatSkillFileName(installName) {
	return `${sanitizeName(installName)}.md`;
}
function getEveFlatSkillMarkdown(files) {
	const skillFile = files.find((file) => basename(file.path).toLowerCase() === "skill.md");
	if (skillFile) return stripIgnoredEveFrontmatter(skillFile.contents);
	const markdownFile = files.find((file) => extname(file.path).toLowerCase() === ".md");
	return markdownFile ? stripIgnoredEveFrontmatter(markdownFile.contents) : "";
}
async function isSkillInstalled(skillName, agentType, options = {}) {
	const agent = agents[agentType];
	const sanitized = sanitizeName(skillName);
	if (options.global && agent.globalSkillsDir === void 0) return false;
	const targetBase = options.global ? agent.globalSkillsDir : agentType === "eve" && options.eveSubagent ? getEveSubagentSkillsDir(options.eveSubagent, options.cwd) : join(options.cwd || process.cwd(), agent.skillsDir);
	const skillDir = join(targetBase, sanitized);
	if (!isPathSafe$2(targetBase, skillDir)) return false;
	try {
		await access(skillDir);
		return true;
	} catch {
		return false;
	}
}
function getInstallPath(skillName, agentType, options = {}) {
	agents[agentType];
	options.cwd || process.cwd();
	const sanitized = sanitizeName(skillName);
	const targetBase = getAgentBaseDir(agentType, options.global ?? false, options.cwd, options.eveSubagent);
	const installPath = join(targetBase, sanitized);
	if (!isPathSafe$2(targetBase, installPath)) throw new Error("Invalid skill name: potential path traversal detected");
	return installPath;
}
function getCanonicalPath(skillName, options = {}) {
	const sanitized = sanitizeName(skillName);
	const canonicalBase = options.agent === "eve" ? getAgentBaseDir("eve", options.global ?? false, options.cwd, options.eveSubagent) : getCanonicalSkillsDir(options.global ?? false, options.cwd);
	const canonicalPath = join(canonicalBase, sanitized);
	if (!isPathSafe$2(canonicalBase, canonicalPath)) throw new Error("Invalid skill name: potential path traversal detected");
	return canonicalPath;
}
async function installWellKnownSkillForAgent(skill, agentType, options = {}) {
	const agent = agents[agentType];
	const isGlobal = options.global ?? false;
	const cwd = options.cwd || process.cwd();
	const installMode = options.mode ?? "symlink";
	const eveSubagent = options.eveSubagent;
	if (isGlobal && agent.globalSkillsDir === void 0) return {
		success: false,
		path: "",
		mode: installMode,
		error: `${agent.displayName} does not support global skill installation`
	};
	const skillName = sanitizeName(skill.installName);
	const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
	const canonicalDir = join(canonicalBase, skillName);
	const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
	const agentDir = join(agentBase, skillName);
	if (!isPathSafe$2(canonicalBase, canonicalDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	if (!isPathSafe$2(agentBase, agentDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	async function writeSkillFiles(targetDir) {
		for (const [filePath, content] of skill.files) {
			const fullPath = join(targetDir, filePath);
			if (!isPathSafe$2(targetDir, fullPath)) continue;
			const parentDir = dirname(fullPath);
			if (parentDir !== targetDir) await mkdir(parentDir, { recursive: true });
			await writeFile(fullPath, agentType === "eve" && basename(filePath).toLowerCase() === "skill.md" && typeof content === "string" ? stripIgnoredEveFrontmatter(content) : content);
		}
	}
	try {
		if (installMode === "copy") {
			await cleanAndCreateDirectory(agentDir);
			await writeSkillFiles(agentDir);
			return {
				success: true,
				path: agentDir,
				mode: "copy"
			};
		}
		await cleanAndCreateDirectory(canonicalDir);
		await writeSkillFiles(canonicalDir);
		if (isGlobal && isUniversalAgent(agentType)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
		if (!await createSymlink(canonicalDir, agentDir)) {
			await cleanAndCreateDirectory(agentDir);
			await writeSkillFiles(agentDir);
			return {
				success: true,
				path: agentDir,
				canonicalPath: canonicalDir,
				mode: "symlink",
				symlinkFailed: true
			};
		}
		return {
			success: true,
			path: agentDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
	} catch (error) {
		return {
			success: false,
			path: agentDir,
			mode: installMode,
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
}
async function installBlobSkillForAgent(skill, agentType, options = {}) {
	const agent = agents[agentType];
	const isGlobal = options.global ?? false;
	const cwd = options.cwd || process.cwd();
	const installMode = options.mode ?? "symlink";
	const eveSubagent = options.eveSubagent;
	if (isGlobal && agent.globalSkillsDir === void 0) return {
		success: false,
		path: "",
		mode: installMode,
		error: `${agent.displayName} does not support global skill installation`
	};
	const skillName = sanitizeName(skill.installName);
	const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
	if (agentType === "eve" && !isEvePackagedSkill(skill.files)) {
		const flatSkillPath = join(agentBase, toEveFlatSkillFileName(skill.installName));
		if (!isPathSafe$2(agentBase, flatSkillPath)) return {
			success: false,
			path: flatSkillPath,
			mode: installMode,
			error: "Invalid skill name: potential path traversal detected"
		};
		try {
			await mkdir(agentBase, { recursive: true });
			await rm(flatSkillPath, {
				recursive: true,
				force: true
			});
			await writeFile(flatSkillPath, getEveFlatSkillMarkdown(skill.files), "utf-8");
			return {
				success: true,
				path: flatSkillPath,
				mode: "copy"
			};
		} catch (error) {
			return {
				success: false,
				path: flatSkillPath,
				mode: installMode,
				error: error instanceof Error ? error.message : "Unknown error"
			};
		}
	}
	const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
	const canonicalDir = join(canonicalBase, skillName);
	const agentDir = join(agentBase, skillName);
	if (!isPathSafe$2(canonicalBase, canonicalDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	if (!isPathSafe$2(agentBase, agentDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	async function writeSkillFiles(targetDir) {
		for (const file of skill.files) {
			const fullPath = join(targetDir, file.path);
			if (!isPathSafe$2(targetDir, fullPath)) continue;
			const parentDir = dirname(fullPath);
			if (parentDir !== targetDir) await mkdir(parentDir, { recursive: true });
			await writeFile(fullPath, agentType === "eve" && basename(file.path).toLowerCase() === "skill.md" ? stripIgnoredEveFrontmatter(file.contents) : file.contents, "utf-8");
		}
	}
	try {
		if (installMode === "copy") {
			await cleanAndCreateDirectory(agentDir);
			await writeSkillFiles(agentDir);
			return {
				success: true,
				path: agentDir,
				mode: "copy"
			};
		}
		await cleanAndCreateDirectory(canonicalDir);
		await writeSkillFiles(canonicalDir);
		if (isGlobal && isUniversalAgent(agentType)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
		if (!isGlobal && !isUniversalAgent(agentType)) {
			if (!existsSync(join(cwd, agents[agentType].skillsDir.split("/")[0])) && agentType !== "claude-code") return {
				success: true,
				path: canonicalDir,
				canonicalPath: canonicalDir,
				mode: "symlink",
				skipped: true
			};
		}
		if (!await createSymlink(canonicalDir, agentDir)) {
			await cleanAndCreateDirectory(agentDir);
			await writeSkillFiles(agentDir);
			return {
				success: true,
				path: agentDir,
				canonicalPath: canonicalDir,
				mode: "symlink",
				symlinkFailed: true
			};
		}
		return {
			success: true,
			path: agentDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
	} catch (error) {
		return {
			success: false,
			path: agentDir,
			mode: installMode,
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
}
async function listInstalledSkills(options = {}) {
	const cwd = options.cwd || process.cwd();
	const skillsMap = /* @__PURE__ */ new Map();
	const scopes = [];
	const detectedAgents = await detectInstalledAgents();
	const agentFilter = options.agentFilter;
	const agentsToCheck = agentFilter ? detectedAgents.filter((a) => agentFilter.includes(a)) : detectedAgents;
	const scopeTypes = [];
	if (options.global === void 0) scopeTypes.push({ global: false }, { global: true });
	else scopeTypes.push({ global: options.global });
	for (const { global: isGlobal } of scopeTypes) {
		scopes.push({
			global: isGlobal,
			path: getCanonicalSkillsDir(isGlobal, cwd)
		});
		for (const agentType of agentsToCheck) {
			const agent = agents[agentType];
			if (isGlobal && agent.globalSkillsDir === void 0) continue;
			const agentDir = isGlobal ? agent.globalSkillsDir : join(cwd, agent.skillsDir);
			if (!scopes.some((s) => s.path === agentDir && s.global === isGlobal)) scopes.push({
				global: isGlobal,
				path: agentDir,
				agentType
			});
			if (agentType === "eve" && !isGlobal) for (const subagent of getEveSubagents(cwd)) {
				const subagentDir = getEveSubagentSkillsDir(subagent, cwd);
				if (!scopes.some((s) => s.path === subagentDir && s.global === isGlobal)) scopes.push({
					global: isGlobal,
					path: subagentDir,
					agentType
				});
			}
		}
		const allAgentTypes = Object.keys(agents);
		for (const agentType of allAgentTypes) {
			if (agentsToCheck.includes(agentType)) continue;
			const agent = agents[agentType];
			if (isGlobal && agent.globalSkillsDir === void 0) continue;
			const agentDir = isGlobal ? agent.globalSkillsDir : join(cwd, agent.skillsDir);
			if (scopes.some((s) => s.path === agentDir && s.global === isGlobal)) continue;
			if (existsSync(agentDir)) scopes.push({
				global: isGlobal,
				path: agentDir,
				agentType
			});
		}
	}
	for (const scope of scopes) try {
		const entries = await readdir(scope.path, { withFileTypes: true });
		for (const entry of entries) {
			const skillDir = join(scope.path, entry.name);
			if (!await isDirEntryOrSymlinkToDir(entry, skillDir)) continue;
			const skillMdPath = join(skillDir, "SKILL.md");
			try {
				await stat(skillMdPath);
			} catch {
				continue;
			}
			const skill = await parseSkillMd(skillMdPath);
			if (!skill) continue;
			const scopeKey = scope.global ? "global" : "project";
			const skillKey = `${scopeKey}:${skill.name}`;
			if (scope.agentType) {
				if (skillsMap.has(skillKey)) {
					const existing = skillsMap.get(skillKey);
					if (!existing.agents.includes(scope.agentType)) existing.agents.push(scope.agentType);
				} else skillsMap.set(skillKey, {
					name: skill.name,
					description: skill.description,
					path: skillDir,
					canonicalPath: skillDir,
					scope: scopeKey,
					agents: [scope.agentType]
				});
				continue;
			}
			const sanitizedSkillName = sanitizeName(skill.name);
			const installedAgents = [];
			for (const agentType of agentsToCheck) {
				const agent = agents[agentType];
				if (scope.global && agent.globalSkillsDir === void 0) continue;
				const agentBase = getAgentBaseDir(agentType, scope.global, cwd);
				let found = false;
				const possibleNames = Array.from(/* @__PURE__ */ new Set([
					entry.name,
					sanitizedSkillName,
					skill.name.toLowerCase().replace(/\s+/g, "-").replace(/[\/\\:\0]/g, "")
				]));
				for (const possibleName of possibleNames) {
					const agentSkillDir = join(agentBase, possibleName);
					if (!isPathSafe$2(agentBase, agentSkillDir)) continue;
					try {
						await access(agentSkillDir);
						found = true;
						break;
					} catch {}
				}
				if (!found) try {
					const agentEntries = await readdir(agentBase, { withFileTypes: true });
					for (const agentEntry of agentEntries) {
						const candidateDir = join(agentBase, agentEntry.name);
						if (!await isDirEntryOrSymlinkToDir(agentEntry, candidateDir)) continue;
						if (!isPathSafe$2(agentBase, candidateDir)) continue;
						try {
							const candidateSkillMd = join(candidateDir, "SKILL.md");
							await stat(candidateSkillMd);
							const candidateSkill = await parseSkillMd(candidateSkillMd);
							if (candidateSkill && candidateSkill.name === skill.name) {
								found = true;
								break;
							}
						} catch {}
					}
				} catch {}
				if (found) installedAgents.push(agentType);
			}
			if (skillsMap.has(skillKey)) {
				const existing = skillsMap.get(skillKey);
				for (const agent of installedAgents) if (!existing.agents.includes(agent)) existing.agents.push(agent);
			} else skillsMap.set(skillKey, {
				name: skill.name,
				description: skill.description,
				path: skillDir,
				canonicalPath: skillDir,
				scope: scopeKey,
				agents: installedAgents
			});
		}
	} catch {}
	return Array.from(skillsMap.values());
}
const TELEMETRY_URL = "https://add-skill.vercel.sh/t";
const AUDIT_URL = "https://add-skill.vercel.sh/audit";
let cliVersion = null;
let detectedAgentName = null;
function setDetectedAgent(agentName) {
	detectedAgentName = agentName;
}
function isCI() {
	return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI || process.env.CIRCLECI || process.env.TRAVIS || process.env.BUILDKITE || process.env.JENKINS_URL || process.env.TEAMCITY_VERSION);
}
function isEnabled() {
	return !process.env.DISABLE_TELEMETRY && !process.env.DO_NOT_TRACK;
}
function setVersion(version) {
	cliVersion = version;
}
async function fetchAuditData(source, skillSlugs, timeoutMs = 3e3) {
	if (!isEnabled()) return null;
	if (skillSlugs.length === 0) return null;
	try {
		const params = new URLSearchParams({
			source,
			skills: skillSlugs.join(",")
		});
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);
		const response = await fetch(`${AUDIT_URL}?${params.toString()}`, { signal: controller.signal });
		clearTimeout(timeout);
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}
const pendingTelemetry = [];
function track(data) {
	if (!isEnabled()) return;
	try {
		const params = new URLSearchParams();
		if (cliVersion) params.set("v", cliVersion);
		if (isCI()) params.set("ci", "1");
		if (detectedAgentName) params.set("agent", detectedAgentName);
		for (const [key, value] of Object.entries(data)) if (value !== void 0 && value !== null) params.set(key, String(value));
		const p = fetch(`${TELEMETRY_URL}?${params.toString()}`).catch(() => {}).then(() => {});
		pendingTelemetry.push(p);
	} catch {}
}
async function flushTelemetry(timeoutMs = 5e3) {
	if (pendingTelemetry.length === 0) return;
	const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
	await Promise.race([Promise.all(pendingTelemetry), timeout]);
}
var import_dist = require_dist();
let cachedResult = null;
function hasStrongCursorAgentSignal() {
	return Boolean(process.env.CURSOR_AGENT?.trim()) || process.env.CURSOR_EXTENSION_HOST_ROLE === "agent-exec";
}
function refineAgentResult(result) {
	if (!result.isAgent || !result.agent) return result;
	if (result.agent.name === "cursor" || result.agent.name === "cursor-cli") {
		if (!hasStrongCursorAgentSignal()) return {
			isAgent: false,
			agent: void 0
		};
		if (result.agent.name === "cursor") return {
			isAgent: true,
			agent: { name: "cursor-cli" }
		};
	}
	return result;
}
const agentNameToType = {
	cursor: "cursor",
	"cursor-cli": "cursor",
	claude: "claude-code",
	cowork: "claude-code",
	devin: "universal",
	replit: "replit",
	gemini: "gemini-cli",
	codex: "codex",
	antigravity: "antigravity",
	"augment-cli": "augment",
	opencode: "opencode",
	"github-copilot": "github-copilot"
};
async function detectAgent() {
	if (cachedResult) return cachedResult;
	cachedResult = refineAgentResult(await (0, import_dist.determineAgent)());
	if (cachedResult.isAgent) setDetectedAgent(cachedResult.agent.name);
	return cachedResult;
}
async function isRunningInAgent() {
	return (await detectAgent()).isAgent;
}
function getAgentType(agentName) {
	return agentNameToType[agentName] ?? null;
}
var ProviderRegistryImpl = class {
	providers = [];
	register(provider) {
		if (this.providers.some((p) => p.id === provider.id)) throw new Error(`Provider with id "${provider.id}" already registered`);
		this.providers.push(provider);
	}
	findProvider(url) {
		for (const provider of this.providers) if (provider.match(url).matches) return provider;
		return null;
	}
	getProviders() {
		return [...this.providers];
	}
};
new ProviderRegistryImpl();
const ZIP_LOCAL_FILE_HEADER = 67324752;
const ZIP_CENTRAL_DIRECTORY_HEADER = 33639248;
const ZIP_END_OF_CENTRAL_DIRECTORY = 101010256;
const ZIP64_END_OF_CENTRAL_DIRECTORY = 101075792;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR = 117853008;
const ZIP_END_MIN_SIZE = 22;
const ZIP_MAX_COMMENT_SIZE = 65535;
const CP437_HIGH_BYTES = [
	"ÇüéâäàåçêëèïîìÄÅ",
	"ÉæÆôöòûùÿÖÜ¢£¥₧ƒ",
	"áíóúñÑªº¿⌐¬½¼¡«»",
	"░▒▓│┤╡╢╖╕╣║╗╝╜╛┐",
	"└┴┬├─┼╞╟╚╔╩╦╠═╬╧",
	"╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀",
	"αßΓπΣσµτΦΘΩδ∞φε∩",
	"≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\xA0"
].join("");
var ArchiveValidationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ArchiveValidationError";
	}
};
function ensureRange(buffer, offset, length, label) {
	if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) throw new Error(`Invalid zip archive: ${label} is out of bounds`);
}
function findEndOfCentralDirectory(buffer) {
	const minOffset = Math.max(0, buffer.length - ZIP_MAX_COMMENT_SIZE - ZIP_END_MIN_SIZE);
	for (let offset = buffer.length - ZIP_END_MIN_SIZE; offset >= minOffset; offset--) {
		if (buffer.readUInt32LE(offset) !== ZIP_END_OF_CENTRAL_DIRECTORY) continue;
		const commentLength = buffer.readUInt16LE(offset + 20);
		if (offset + ZIP_END_MIN_SIZE + commentLength === buffer.length) return offset;
	}
	return -1;
}
function readUInt64AsNumber(buffer, offset, label) {
	ensureRange(buffer, offset, 8, label);
	const value = buffer.readBigUInt64LE(offset);
	if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`Invalid zip archive: ${label} exceeds the safe integer range`);
	return Number(value);
}
function readCentralDirectory(buffer, endOffset) {
	const diskNumber = buffer.readUInt16LE(endOffset + 4);
	const centralDirectoryDisk = buffer.readUInt16LE(endOffset + 6);
	const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
	const totalEntries = buffer.readUInt16LE(endOffset + 10);
	const size = buffer.readUInt32LE(endOffset + 12);
	const offset = buffer.readUInt32LE(endOffset + 16);
	if (!(entriesOnDisk === 65535 || totalEntries === 65535 || size === 4294967295 || offset === 4294967295)) {
		if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== totalEntries) throw new Error("Multi-disk zip archives are not supported");
		return {
			entries: totalEntries,
			offset,
			size,
			trailerOffset: endOffset
		};
	}
	if (diskNumber !== 0 || centralDirectoryDisk !== 0) throw new Error("Multi-disk zip archives are not supported");
	const locatorOffset = endOffset - 20;
	ensureRange(buffer, locatorOffset, 20, "zip64 locator");
	if (buffer.readUInt32LE(locatorOffset) !== ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR) throw new Error("Invalid zip64 locator");
	if (buffer.readUInt32LE(locatorOffset + 4) !== 0 || buffer.readUInt32LE(locatorOffset + 16) !== 1) throw new Error("Multi-disk zip archives are not supported");
	const zip64EndOffset = readUInt64AsNumber(buffer, locatorOffset + 8, "zip64 end offset");
	ensureRange(buffer, zip64EndOffset, 56, "zip64 end of central directory");
	if (buffer.readUInt32LE(zip64EndOffset) !== ZIP64_END_OF_CENTRAL_DIRECTORY) throw new Error("Invalid zip64 end of central directory");
	const recordSize = readUInt64AsNumber(buffer, zip64EndOffset + 4, "zip64 end size");
	if (recordSize < 44) throw new Error("Invalid zip64 end of central directory");
	ensureRange(buffer, zip64EndOffset, recordSize + 12, "zip64 end of central directory");
	if (zip64EndOffset + recordSize + 12 !== locatorOffset) throw new Error("Invalid zip64 end of central directory");
	if (buffer.readUInt32LE(zip64EndOffset + 16) !== 0 || buffer.readUInt32LE(zip64EndOffset + 20) !== 0) throw new Error("Multi-disk zip archives are not supported");
	const zip64EntriesOnDisk = readUInt64AsNumber(buffer, zip64EndOffset + 24, "zip64 entries on disk");
	const zip64TotalEntries = readUInt64AsNumber(buffer, zip64EndOffset + 32, "zip64 total entries");
	if (zip64EntriesOnDisk !== zip64TotalEntries) throw new Error("Multi-disk zip archives are not supported");
	return {
		entries: zip64TotalEntries,
		size: readUInt64AsNumber(buffer, zip64EndOffset + 40, "zip64 central directory size"),
		offset: readUInt64AsNumber(buffer, zip64EndOffset + 48, "zip64 central directory offset"),
		trailerOffset: zip64EndOffset
	};
}
function normalizeArchivePath(rawPath) {
	if (!rawPath || rawPath.includes("\0")) return null;
	const path = rawPath.replace(/\\/g, "/");
	if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) return null;
	const parts = path.split("/");
	if (parts.some((part) => part === "..")) return null;
	const normalized = parts.filter((part) => part && part !== ".").join("/");
	if (!normalized && !path.endsWith("/")) return null;
	return path.endsWith("/") && normalized ? `${normalized}/` : normalized;
}
function findExtraField(buffer, extraOffset, extraLength, targetId) {
	const extraEnd = extraOffset + extraLength;
	let offset = extraOffset;
	while (offset < extraEnd) {
		if (offset + 4 > extraEnd) throw new Error("Invalid zip extra field");
		const id = buffer.readUInt16LE(offset);
		const size = buffer.readUInt16LE(offset + 2);
		const dataOffset = offset + 4;
		ensureRange(buffer, dataOffset, size, "zip extra field");
		if (dataOffset + size > extraEnd) throw new Error("Invalid zip extra field");
		if (id === targetId) return buffer.subarray(dataOffset, dataOffset + size);
		offset = dataOffset + size;
	}
	return null;
}
function decodeFileName(bytes, isUtf8, unicodePathExtra) {
	if (isUtf8) return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	if (unicodePathExtra && unicodePathExtra.length >= 5 && unicodePathExtra[0] === 1 && unicodePathExtra.readUInt32LE(1) === crc32(bytes)) return new TextDecoder("utf-8", { fatal: true }).decode(unicodePathExtra.subarray(5));
	let result = "";
	for (const byte of bytes) result += byte < 128 ? String.fromCharCode(byte) : CP437_HIGH_BYTES[byte - 128];
	return result;
}
function readZip64EntryValues(buffer, extraOffset, extraLength, values) {
	if (!(values.uncompressedSize === 4294967295 || values.compressedSize === 4294967295 || values.localHeaderOffset === 4294967295 || values.diskStart === 65535)) {
		if (values.diskStart !== 0) throw new Error("Multi-disk zip archives are not supported");
		return values;
	}
	const zip64Extra = findExtraField(buffer, extraOffset, extraLength, 1);
	if (!zip64Extra) throw new Error("Invalid zip64 extra field");
	let valueOffset = 0;
	const readNextUInt64 = (label) => {
		if (valueOffset + 8 > zip64Extra.length) throw new Error(`Invalid zip64 extra field: missing ${label}`);
		const value = readUInt64AsNumber(zip64Extra, valueOffset, `zip64 ${label}`);
		valueOffset += 8;
		return value;
	};
	const resolved = { ...values };
	if (resolved.uncompressedSize === 4294967295) resolved.uncompressedSize = readNextUInt64("uncompressed size");
	if (resolved.compressedSize === 4294967295) resolved.compressedSize = readNextUInt64("compressed size");
	if (resolved.localHeaderOffset === 4294967295) resolved.localHeaderOffset = readNextUInt64("local header offset");
	if (resolved.diskStart === 65535) {
		if (valueOffset + 4 > zip64Extra.length) throw new Error("Invalid zip64 extra field: missing disk start");
		resolved.diskStart = zip64Extra.readUInt32LE(valueOffset);
	}
	if (resolved.diskStart !== 0) throw new Error("Multi-disk zip archives are not supported");
	return resolved;
}
function readZipArchive(bytes, limits) {
	const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const endOffset = findEndOfCentralDirectory(buffer);
	if (endOffset < 0) throw new Error("Invalid zip archive");
	const centralDirectory = readCentralDirectory(buffer, endOffset);
	const totalEntries = centralDirectory.entries;
	if (totalEntries > limits.maxEntries) throw new ArchiveValidationError(`Archive contains too many files (${totalEntries}). Maximum is ${limits.maxEntries}.`);
	ensureRange(buffer, centralDirectory.offset, centralDirectory.size, "central directory");
	if (centralDirectory.offset + centralDirectory.size > centralDirectory.trailerOffset) throw new Error("Invalid zip archive: central directory overlaps archive trailer");
	const files = /* @__PURE__ */ new Map();
	let extractedBytes = 0;
	let offset = centralDirectory.offset;
	for (let index = 0; index < totalEntries; index++) {
		ensureRange(buffer, offset, 46, "central directory entry");
		if (buffer.readUInt32LE(offset) !== ZIP_CENTRAL_DIRECTORY_HEADER) throw new Error("Invalid zip central directory entry");
		const flags = buffer.readUInt16LE(offset + 8);
		const method = buffer.readUInt16LE(offset + 10);
		const expectedChecksum = buffer.readUInt32LE(offset + 16);
		let compressedSize = buffer.readUInt32LE(offset + 20);
		let uncompressedSize = buffer.readUInt32LE(offset + 24);
		const fileNameLength = buffer.readUInt16LE(offset + 28);
		const extraLength = buffer.readUInt16LE(offset + 30);
		const commentLength = buffer.readUInt16LE(offset + 32);
		let diskStart = buffer.readUInt16LE(offset + 34);
		const externalAttributes = buffer.readUInt32LE(offset + 38);
		let localHeaderOffset = buffer.readUInt32LE(offset + 42);
		const variableSize = fileNameLength + extraLength + commentLength;
		ensureRange(buffer, offset + 46, variableSize, "central directory entry data");
		const nameStart = offset + 46;
		const extraOffset = nameStart + fileNameLength;
		({compressedSize, diskStart, localHeaderOffset, uncompressedSize} = readZip64EntryValues(buffer, extraOffset, extraLength, {
			compressedSize,
			diskStart,
			localHeaderOffset,
			uncompressedSize
		}));
		const centralFileName = buffer.subarray(nameStart, nameStart + fileNameLength);
		const rawFileName = decodeFileName(centralFileName, Boolean(flags & 2048), findExtraField(buffer, extraOffset, extraLength, 28789));
		const fileName = normalizeArchivePath(rawFileName);
		if (fileName === null) throw new ArchiveValidationError(`Archive contains unsafe path: ${rawFileName}`);
		if (flags & 1) throw new ArchiveValidationError("Encrypted zip entries are not supported");
		const fileType = externalAttributes >>> 16 & 61440;
		if (fileType !== 0 && fileType !== 32768 && fileType !== 16384) throw new ArchiveValidationError("Archive links are not supported");
		const isDirectory = rawFileName.replace(/\\/g, "/").endsWith("/") || fileType === 16384;
		offset += 46 + variableSize;
		extractedBytes += uncompressedSize;
		if (extractedBytes > limits.maxExtractedBytes) throw new ArchiveValidationError(`Archive extracts to more than ${limits.maxExtractedBytes} bytes.`);
		if (isDirectory) continue;
		ensureRange(buffer, localHeaderOffset, 30, "local file header");
		if (buffer.readUInt32LE(localHeaderOffset) !== ZIP_LOCAL_FILE_HEADER) throw new Error("Invalid zip local file header");
		const localFlags = buffer.readUInt16LE(localHeaderOffset + 6);
		const localMethod = buffer.readUInt16LE(localHeaderOffset + 8);
		const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
		const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
		const localNameOffset = localHeaderOffset + 30;
		ensureRange(buffer, localNameOffset, localFileNameLength + localExtraLength, "local file header data");
		const localFileName = buffer.subarray(localNameOffset, localNameOffset + localFileNameLength);
		if (localFlags !== flags || localMethod !== method || !localFileName.equals(centralFileName)) throw new Error("Zip local header does not match central directory");
		const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
		ensureRange(buffer, dataOffset, compressedSize, "file data");
		if (dataOffset + compressedSize > centralDirectory.offset) throw new Error("Invalid zip archive: file data overlaps central directory");
		const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
		let contents;
		if (method === 0) contents = compressed;
		else if (method === 8) contents = inflateRawSync(compressed, { maxOutputLength: uncompressedSize + 1 });
		else throw new Error(`Unsupported zip compression method: ${method}`);
		if (contents.byteLength !== uncompressedSize) throw new Error("Zip entry size mismatch");
		if (crc32(contents) !== expectedChecksum) throw new Error("Zip entry checksum mismatch");
		files.set(fileName, new Uint8Array(contents));
	}
	if (offset !== centralDirectory.offset + centralDirectory.size) throw new Error("Invalid zip central directory size");
	return files;
}
const DISCOVERY_SCHEMA_V2 = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";
const MAX_ARCHIVE_UNPACKED_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_FILES = 1e3;
const DISCOVERY_TIMEOUT_MS = 1e4;
var WellKnownScopeNotFoundError = class extends Error {
	scopePath;
	rootUrl;
	constructor(scopePath, rootUrl) {
		super(`No skills found for the scoped path '${scopePath}' on ${rootUrl}. Not falling back to the root skills index because that would install every skill the host publishes. Check the URL, or run 'skills add ${rootUrl}' to install from the root index.`);
		this.name = "WellKnownScopeNotFoundError";
		this.scopePath = scopePath;
		this.rootUrl = rootUrl;
	}
};
var WellKnownProvider = class {
	id = "well-known";
	displayName = "Well-Known Skills";
	WELL_KNOWN_PATHS = [".well-known/agent-skills", ".well-known/skills"];
	INDEX_FILE = "index.json";
	match(url) {
		if (!url.startsWith("http://") && !url.startsWith("https://")) return { matches: false };
		try {
			const parsed = new URL(url);
			if ([
				"github.com",
				"gitlab.com",
				"huggingface.co"
			].includes(parsed.hostname)) return { matches: false };
			return {
				matches: true,
				sourceIdentifier: `wellknown/${parsed.hostname}`
			};
		} catch {
			return { matches: false };
		}
	}
	async fetchIndex(baseUrl, options) {
		return (await this.fetchIndexCandidates(baseUrl, options))[0] ?? null;
	}
	async fetchIndexCandidates(baseUrl, options) {
		try {
			const parsed = new URL(baseUrl);
			const basePath = parsed.pathname.replace(/\/$/, "");
			const signal = AbortSignal.timeout(DISCOVERY_TIMEOUT_MS);
			const urlsToTry = [];
			for (const wellKnownPath of this.WELL_KNOWN_PATHS) {
				urlsToTry.push({
					indexUrl: `${parsed.protocol}//${parsed.host}${basePath}/${wellKnownPath}/${this.INDEX_FILE}`,
					baseUrl: `${parsed.protocol}//${parsed.host}${basePath}`,
					wellKnownPath
				});
				if (basePath && basePath !== "") urlsToTry.push({
					indexUrl: `${parsed.protocol}//${parsed.host}/${wellKnownPath}/${this.INDEX_FILE}`,
					baseUrl: `${parsed.protocol}//${parsed.host}`,
					wellKnownPath
				});
			}
			const candidates = [];
			for (const { indexUrl, baseUrl: resolvedBase, wellKnownPath } of urlsToTry) try {
				const response = await fetch(indexUrl, {
					signal,
					...options?.updateCheck ? { headers: { "X-Skills-Update-Check": "1" } } : {}
				});
				if (!response.ok) continue;
				const rawIndex = await response.json();
				const normalized = this.normalizeIndex(rawIndex, indexUrl, wellKnownPath);
				if (!normalized) continue;
				candidates.push({
					index: normalized.index,
					entries: normalized.entries,
					resolvedBaseUrl: resolvedBase,
					resolvedWellKnownPath: wellKnownPath,
					indexUrl
				});
			} catch {
				continue;
			}
			return candidates;
		} catch {
			return [];
		}
	}
	normalizeIndex(rawIndex, indexUrl, resolvedWellKnownPath) {
		if (!rawIndex || typeof rawIndex !== "object") return null;
		const record = rawIndex;
		if (!Array.isArray(record.skills)) return null;
		const schema = record.$schema;
		if (schema === DISCOVERY_SCHEMA_V2) {
			const entries = [];
			const v2Entries = [];
			for (const entry of record.skills) {
				if (!this.isValidSkillEntryV2(entry)) continue;
				const artifactUrl = new URL(entry.url, indexUrl).toString();
				entries.push({
					version: "0.2.0",
					name: entry.name,
					description: entry.description,
					type: entry.type,
					artifactUrl,
					digest: entry.digest,
					indexEntry: entry
				});
				v2Entries.push(entry);
			}
			if (entries.length === 0) return null;
			return {
				index: {
					$schema: DISCOVERY_SCHEMA_V2,
					skills: v2Entries
				},
				entries
			};
		}
		if (schema !== void 0) return null;
		const v1Entries = [];
		const entries = [];
		for (const entry of record.skills) {
			if (!this.isValidSkillEntryV1(entry)) return null;
			v1Entries.push(entry);
			entries.push({
				version: "0.1.0",
				name: entry.name,
				description: entry.description,
				files: entry.files,
				baseUrl: this.getLegacySkillBaseUrl(indexUrl, resolvedWellKnownPath),
				wellKnownPath: resolvedWellKnownPath,
				indexEntry: entry
			});
		}
		return {
			index: { skills: v1Entries },
			entries
		};
	}
	getLegacySkillBaseUrl(indexUrl, wellKnownPath) {
		const parsed = new URL(indexUrl);
		const marker = `/${wellKnownPath}/${this.INDEX_FILE}`;
		return `${parsed.protocol}//${parsed.host}${parsed.pathname.slice(0, -marker.length)}`;
	}
	isValidSkillName(name) {
		if (typeof name !== "string") return false;
		if (name.length < 1 || name.length > 64) return false;
		if (!/^[a-z0-9-]+$/.test(name)) return false;
		if (name.startsWith("-") || name.endsWith("-")) return false;
		if (name.includes("--")) return false;
		return true;
	}
	isSafeLegacyFilePath(filePath) {
		if (typeof filePath !== "string" || filePath.length === 0) return false;
		if (filePath.startsWith("/") || filePath.startsWith("\\") || filePath.includes("..")) return false;
		if (filePath.includes("\0")) return false;
		return true;
	}
	isValidSkillEntryV1(entry) {
		if (!entry || typeof entry !== "object") return false;
		const e = entry;
		if (!this.isValidSkillName(e.name)) return false;
		if (typeof e.description !== "string" || !e.description) return false;
		if (!Array.isArray(e.files) || e.files.length === 0) return false;
		for (const file of e.files) if (!this.isSafeLegacyFilePath(file)) return false;
		return e.files.some((f) => typeof f === "string" && f.toLowerCase() === "skill.md");
	}
	isValidSkillEntryV2(entry) {
		if (!entry || typeof entry !== "object") return false;
		const e = entry;
		if (!this.isValidSkillName(e.name)) return false;
		if (typeof e.description !== "string" || !e.description || e.description.length > 1024) return false;
		if (e.type !== "skill-md" && e.type !== "archive") return false;
		if (typeof e.url !== "string" || !e.url) return false;
		if (typeof e.digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(e.digest)) return false;
		try {
			new URL(e.url, "https://example.com/.well-known/agent-skills/index.json");
		} catch {
			return false;
		}
		return true;
	}
	async fetchSkill(url) {
		try {
			const parsed = new URL(url);
			const candidates = await this.fetchIndexCandidates(url);
			for (const result of candidates) {
				const { entries } = result;
				let skillName = null;
				const pathMatch = parsed.pathname.match(/\/.well-known\/(?:agent-skills|skills)\/([^/]+)\/?$/);
				if (pathMatch && pathMatch[1] && pathMatch[1] !== "index.json") skillName = pathMatch[1];
				else if (entries.length === 1) skillName = entries[0].name;
				if (!skillName) continue;
				const skillEntry = entries.find((s) => s.name === skillName);
				if (!skillEntry) continue;
				const skill = await this.fetchSkillByEntry(skillEntry);
				if (skill) return skill;
			}
			return null;
		} catch {
			return null;
		}
	}
	async fetchSkillByEntry(baseUrlOrEntry, legacyEntry, legacyWellKnownPath) {
		if (typeof baseUrlOrEntry === "string") {
			if (!legacyEntry) return null;
			return this.fetchLegacySkillByEntry({
				version: "0.1.0",
				name: legacyEntry.name,
				description: legacyEntry.description,
				files: legacyEntry.files,
				baseUrl: baseUrlOrEntry,
				wellKnownPath: legacyWellKnownPath ?? this.WELL_KNOWN_PATHS[0],
				indexEntry: legacyEntry
			});
		}
		if (baseUrlOrEntry.version === "0.1.0") return this.fetchLegacySkillByEntry(baseUrlOrEntry);
		return this.fetchArtifactSkillByEntry(baseUrlOrEntry);
	}
	async fetchLegacySkillByEntry(entry) {
		try {
			const skillBaseUrl = `${entry.baseUrl.replace(/\/$/, "")}/${entry.wellKnownPath}/${entry.name}`;
			const skillMdUrl = `${skillBaseUrl}/SKILL.md`;
			const response = await fetch(skillMdUrl);
			if (!response.ok) return null;
			const content = await response.text();
			const { data } = parseFrontmatter(content);
			if (typeof data.name !== "string" || typeof data.description !== "string") return null;
			const files = /* @__PURE__ */ new Map();
			files.set("SKILL.md", content);
			const filePromises = entry.files.filter((f) => f.toLowerCase() !== "skill.md").map(async (filePath) => {
				try {
					const fileUrl = `${skillBaseUrl}/${filePath}`;
					const fileResponse = await fetch(fileUrl);
					if (fileResponse.ok) {
						const fileContent = await fileResponse.arrayBuffer();
						return {
							path: filePath,
							content: new Uint8Array(fileContent)
						};
					}
				} catch {}
				return null;
			});
			const fileResults = await Promise.all(filePromises);
			for (const result of fileResults) if (result) files.set(result.path, result.content);
			return this.createSkill({
				name: data.name,
				description: data.description,
				content,
				installName: entry.name,
				sourceUrl: skillMdUrl,
				metadata: data.metadata,
				files,
				indexEntry: entry.indexEntry
			});
		} catch {
			return null;
		}
	}
	async fetchArtifactSkillByEntry(entry) {
		try {
			const response = await fetch(entry.artifactUrl);
			if (!response.ok) return null;
			const contentType = response.headers.get("content-type") ?? "";
			const bytes = new Uint8Array(await response.arrayBuffer());
			if (this.computeDigest(bytes) !== entry.digest) return null;
			if (entry.type === "skill-md") {
				const content = new TextDecoder().decode(bytes);
				const { data } = parseFrontmatter(content);
				if (typeof data.name !== "string" || typeof data.description !== "string") return null;
				const files = /* @__PURE__ */ new Map();
				files.set("SKILL.md", content);
				return this.createSkill({
					name: data.name,
					description: data.description,
					content,
					installName: entry.name,
					sourceUrl: entry.artifactUrl,
					metadata: data.metadata,
					files,
					indexEntry: entry.indexEntry
				});
			}
			const files = this.extractArchive(bytes, entry.artifactUrl, contentType);
			const skillMdBytes = files.get("SKILL.md");
			if (!skillMdBytes) return null;
			const content = typeof skillMdBytes === "string" ? skillMdBytes : new TextDecoder().decode(skillMdBytes);
			files.set("SKILL.md", content);
			const { data } = parseFrontmatter(content);
			if (typeof data.name !== "string" || typeof data.description !== "string") return null;
			return this.createSkill({
				name: data.name,
				description: data.description,
				content,
				installName: entry.name,
				sourceUrl: entry.artifactUrl,
				metadata: data.metadata,
				files,
				indexEntry: entry.indexEntry
			});
		} catch {
			return null;
		}
	}
	createSkill(input) {
		return {
			name: sanitizeMetadata(input.name),
			description: sanitizeMetadata(input.description),
			content: input.content,
			installName: input.installName,
			sourceUrl: input.sourceUrl,
			metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : void 0,
			files: input.files,
			indexEntry: input.indexEntry
		};
	}
	getScope(url) {
		try {
			const parsed = new URL(url);
			const scopePath = parsed.pathname.replace(/\/$/, "");
			if (!scopePath) return null;
			return {
				scopePath,
				rootBaseUrl: `${parsed.protocol}//${parsed.host}`
			};
		} catch {
			return null;
		}
	}
	async fetchAllSkills(url, options = {}) {
		try {
			const candidates = await this.fetchIndexCandidates(url);
			const scope = this.getScope(url);
			const scopedCandidates = scope ? candidates.filter((c) => c.resolvedBaseUrl !== scope.rootBaseUrl) : candidates;
			const includeInternal = options.includeInternal || shouldInstallInternalSkills();
			for (const result of scopedCandidates) {
				const skillPromises = result.entries.map((entry) => this.fetchSkillByEntry(entry));
				const skills = (await Promise.all(skillPromises)).filter((s) => s !== null).filter((skill) => includeInternal || skill.metadata?.internal !== true);
				if (skills.length > 0) return skills;
			}
			if (scope && scopedCandidates.length < candidates.length) throw new WellKnownScopeNotFoundError(scope.scopePath, scope.rootBaseUrl);
			return [];
		} catch (error) {
			if (error instanceof WellKnownScopeNotFoundError) throw error;
			return [];
		}
	}
	computeDigest(bytes) {
		return `sha256:${createHash$1("sha256").update(bytes).digest("hex")}`;
	}
	extractArchive(bytes, artifactUrl, contentType) {
		if (this.isZipArchive(bytes, artifactUrl, contentType)) return new Map(readZipArchive(bytes, {
			maxExtractedBytes: MAX_ARCHIVE_UNPACKED_BYTES,
			maxEntries: MAX_ARCHIVE_FILES
		}));
		if (this.isTarGzArchive(bytes, artifactUrl, contentType)) return this.extractTarGz(bytes);
		throw new Error("Unsupported archive format");
	}
	isZipArchive(bytes, artifactUrl, contentType) {
		return contentType.includes("application/zip") || artifactUrl.toLowerCase().endsWith(".zip") || bytes[0] === 80 && bytes[1] === 75;
	}
	isTarGzArchive(bytes, artifactUrl, contentType) {
		const lower = artifactUrl.toLowerCase();
		return contentType.includes("application/gzip") || contentType.includes("application/x-gzip") || lower.endsWith(".tar.gz") || lower.endsWith(".tgz") || bytes[0] === 31 && bytes[1] === 139;
	}
	normalizeArchivePath(rawPath) {
		if (!rawPath || rawPath.includes("\0")) return null;
		if (rawPath.startsWith("/") || rawPath.startsWith("\\")) return null;
		if (/^[A-Za-z]:/.test(rawPath)) return null;
		if (rawPath.includes("\\")) return null;
		const parts = rawPath.split("/").filter(Boolean);
		if (parts.length === 0) return null;
		if (parts.some((part) => part === "." || part === "..")) return null;
		return parts.join("/");
	}
	addArchiveFile(files, path, content, runningTotal) {
		const normalizedPath = this.normalizeArchivePath(path);
		if (!normalizedPath) throw new Error(`Unsafe archive path: ${path}`);
		runningTotal.bytes += content.byteLength;
		if (runningTotal.bytes > MAX_ARCHIVE_UNPACKED_BYTES) throw new Error("Archive exceeds maximum unpacked size");
		if (files.size >= MAX_ARCHIVE_FILES) throw new Error("Archive contains too many files");
		files.set(normalizedPath, content);
	}
	extractTarGz(bytes) {
		const tar = gunzipSync(Buffer.from(bytes));
		const files = /* @__PURE__ */ new Map();
		const runningTotal = { bytes: 0 };
		let offset = 0;
		while (offset + 512 <= tar.length) {
			const header = tar.subarray(offset, offset + 512);
			if (header.every((byte) => byte === 0)) break;
			const name = this.readTarString(header, 0, 100);
			const sizeText = this.readTarString(header, 124, 12).trim();
			const typeFlag = header[156];
			const prefix = this.readTarString(header, 345, 155);
			const path = prefix ? `${prefix}/${name}` : name;
			const size = Number.parseInt(sizeText || "0", 8);
			if (!Number.isFinite(size) || size < 0) throw new Error("Invalid tar entry size");
			offset += 512;
			if (typeFlag === 50 || typeFlag === 49) throw new Error("Archive links are not supported");
			if (typeFlag === 0 || typeFlag === 48) {
				const content = tar.subarray(offset, offset + size);
				this.addArchiveFile(files, path, new Uint8Array(content), runningTotal);
			}
			offset += Math.ceil(size / 512) * 512;
		}
		if (!files.has("SKILL.md")) throw new Error("Archive missing root SKILL.md");
		return files;
	}
	readTarString(buffer, offset, length) {
		const slice = buffer.subarray(offset, offset + length);
		const nul = slice.indexOf(0);
		return new TextDecoder().decode(nul >= 0 ? slice.subarray(0, nul) : slice);
	}
	toRawUrl(url) {
		try {
			const parsed = new URL(url);
			if (url.toLowerCase().endsWith("/skill.md")) return url;
			const primaryPath = this.WELL_KNOWN_PATHS[0];
			const pathMatch = parsed.pathname.match(/\/.well-known\/(?:agent-skills|skills)\/([^/]+)\/?$/);
			if (pathMatch && pathMatch[1]) {
				const basePath = parsed.pathname.replace(/\/.well-known\/(?:agent-skills|skills)\/.*$/, "");
				return `${parsed.protocol}//${parsed.host}${basePath}/${primaryPath}/${pathMatch[1]}/SKILL.md`;
			}
			const basePath = parsed.pathname.replace(/\/$/, "");
			return `${parsed.protocol}//${parsed.host}${basePath}/${primaryPath}/${this.INDEX_FILE}`;
		} catch {
			return url;
		}
	}
	getSourceIdentifier(url) {
		try {
			return new URL(url).hostname.replace(/^www\./, "");
		} catch {
			return "unknown";
		}
	}
	async hasSkillsIndex(url) {
		return await this.fetchIndex(url) !== null;
	}
};
function computeWellKnownSkillDigest(skill) {
	if ("digest" in skill.indexEntry && skill.indexEntry.digest) return skill.indexEntry.digest;
	const hash = createHash$1("sha256");
	for (const path of Array.from(skill.files.keys()).sort()) {
		hash.update(path);
		hash.update("\0");
		hash.update(skill.files.get(path));
		hash.update("\0");
	}
	return `sha256:${hash.digest("hex")}`;
}
const wellKnownProvider = new WellKnownProvider();
const DEFAULT_DOWNLOAD_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_EXTRACT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_EXTRACT_MAX_FILES = 1e3;
const FETCH_TIMEOUT_MS = 3e4;
function getPositiveIntegerEnv(name, fallback) {
	const raw = process.env[name];
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function getDownloadLimits() {
	return {
		downloadMaxBytes: getPositiveIntegerEnv("SKILLS_DOWNLOAD_MAX_BYTES", DEFAULT_DOWNLOAD_MAX_BYTES),
		extractMaxBytes: getPositiveIntegerEnv("SKILLS_EXTRACT_MAX_BYTES", DEFAULT_EXTRACT_MAX_BYTES),
		extractMaxFiles: getPositiveIntegerEnv("SKILLS_EXTRACT_MAX_FILES", DEFAULT_EXTRACT_MAX_FILES)
	};
}
function isPathSafe$1(basePath, targetPath) {
	const normalizedBase = normalize$1(resolve$1(basePath));
	const normalizedTarget = normalize$1(resolve$1(targetPath));
	return normalizedTarget.startsWith(normalizedBase + sep$1) || normalizedTarget === normalizedBase;
}
function validateArchivePath(path) {
	const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
	if (!normalized || normalized.endsWith("/")) return normalized;
	if (normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) return null;
	if (normalized.split("/").includes("..")) return null;
	return normalized;
}
function incrementEntry(state, size, limits) {
	state.entries += 1;
	if (state.entries > limits.extractMaxFiles) throw new ArchiveValidationError(`Archive contains too many files (${state.entries}). Maximum is ${limits.extractMaxFiles}. Set SKILLS_EXTRACT_MAX_FILES to override.`);
	state.bytes += size;
	if (state.bytes > limits.extractMaxBytes) throw new ArchiveValidationError(`Archive extracts to more than ${limits.extractMaxBytes} bytes. Set SKILLS_EXTRACT_MAX_BYTES to override.`);
}
async function downloadToFile(url, targetFile, limits) {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		redirect: "follow"
	});
	if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}`);
	const contentLength = response.headers.get("content-length");
	if (contentLength) {
		const parsed = Number.parseInt(contentLength, 10);
		if (Number.isFinite(parsed) && parsed > limits.downloadMaxBytes) throw new Error(`Download is larger than ${limits.downloadMaxBytes} bytes. Set SKILLS_DOWNLOAD_MAX_BYTES to override.`);
	}
	if (!response.body) throw new Error("Download response has no body");
	let downloaded = 0;
	const limitStream = new TransformStream({ transform(chunk, controller) {
		downloaded += chunk.byteLength;
		if (downloaded > limits.downloadMaxBytes) throw new Error(`Download is larger than ${limits.downloadMaxBytes} bytes. Set SKILLS_DOWNLOAD_MAX_BYTES to override.`);
		controller.enqueue(chunk);
	} });
	await pipeline(response.body.pipeThrough(limitStream), createWriteStream(targetFile));
}
async function isValidSkillMarkdown(filePath) {
	try {
		const { data } = parseFrontmatter(await readFile$1(filePath, "utf-8"));
		return typeof data.name === "string" && typeof data.description === "string";
	} catch {
		return false;
	}
}
async function extractZip(filePath, extractDir, limits) {
	const files = readZipArchive(await readFile$1(filePath), {
		maxExtractedBytes: limits.extractMaxBytes,
		maxEntries: limits.extractMaxFiles
	});
	for (const [path, contents] of files) {
		const targetPath = join$1(extractDir, path);
		if (!isPathSafe$1(extractDir, targetPath)) throw new ArchiveValidationError(`Archive contains unsafe path: ${path}`);
		await mkdir$1(dirname$1(targetPath), { recursive: true });
		await writeFile$1(targetPath, contents);
	}
}
function getTarEntryType(entry) {
	if (entry instanceof tar.ReadEntry) return entry.type;
	if (entry.isFile()) return "File";
	if (entry.isDirectory()) return "Directory";
	return "";
}
function isTarEntryFile(entry) {
	const type = getTarEntryType(entry);
	return type === "File" || type === "OldFile" || type === "ContiguousFile";
}
async function extractTar(filePath, extractDir, limits) {
	const state = {
		bytes: 0,
		entries: 0
	};
	let validationError;
	await tar.x({
		strict: true,
		filter(entryPath, entry) {
			if (validationError) return false;
			try {
				const safePath = validateArchivePath(entryPath);
				if (safePath === null) throw new ArchiveValidationError(`Archive contains unsafe path: ${entryPath}`);
				if (!isPathSafe$1(extractDir, join$1(extractDir, safePath))) throw new ArchiveValidationError(`Archive contains unsafe path: ${entryPath}`);
				incrementEntry(state, entry.size, limits);
				if (isTarEntryFile(entry)) return true;
				return getTarEntryType(entry) === "Directory";
			} catch (error) {
				if (error instanceof ArchiveValidationError) {
					validationError = error;
					return false;
				}
				throw error;
			}
		},
		cwd: extractDir,
		preservePaths: false,
		noChmod: true,
		file: filePath
	});
	if (validationError) throw validationError;
}
async function tryExtractArchive(filePath, extractDir, limits) {
	const header = await readFile$1(filePath).then((buffer) => buffer.subarray(0, 512));
	const isZip = header[0] === 80 && header[1] === 75;
	const isGzip = header[0] === 31 && header[1] === 139;
	try {
		if (isZip) {
			await extractZip(filePath, extractDir, limits);
			return true;
		}
		if (isGzip) {
			await extractTar(filePath, extractDir, limits);
			return true;
		}
		await extractTar(filePath, extractDir, limits);
		return true;
	} catch (error) {
		await rm$1(extractDir, {
			recursive: true,
			force: true
		}).catch(() => {});
		await mkdir$1(extractDir, { recursive: true });
		if (error instanceof ArchiveValidationError) throw error;
		return false;
	}
}
async function getSingleTopLevelDirectory(dir) {
	const { readdir } = await import("node:fs/promises");
	const visibleEntries = (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.name !== "__MACOSX");
	if (visibleEntries.length !== 1 || !visibleEntries[0].isDirectory()) return null;
	return join$1(dir, visibleEntries[0].name);
}
async function downloadSource(url) {
	const limits = getDownloadLimits();
	const tempDir = await mkdtemp$1(join$1(tmpdir$1(), "skills-download-"));
	const downloadedFile = join$1(tempDir, "source.download");
	const extractDir = join$1(tempDir, "extract");
	try {
		await downloadToFile(url, downloadedFile, limits);
		if ((await stat$1(downloadedFile)).size === 0) throw new Error("Downloaded URL is empty");
		if (await isValidSkillMarkdown(downloadedFile)) {
			const skillDir = join$1(tempDir, "skill");
			await mkdir$1(skillDir, { recursive: true });
			await writeFile$1(join$1(skillDir, "SKILL.md"), await readFile$1(downloadedFile));
			return {
				rootDir: skillDir,
				tempDir,
				kind: "skill-md"
			};
		}
		await mkdir$1(extractDir, { recursive: true });
		if (await tryExtractArchive(downloadedFile, extractDir, limits)) return {
			rootDir: await getSingleTopLevelDirectory(extractDir) ?? extractDir,
			tempDir,
			kind: "archive"
		};
		throw new Error("Downloaded URL is not a valid SKILL.md file or supported archive");
	} catch (error) {
		await rm$1(tempDir, {
			recursive: true,
			force: true
		}).catch(() => {});
		throw error;
	}
}
const AGENTS_DIR = ".agents";
const LOCK_FILE = ".skill-lock.json";
const CURRENT_VERSION = 3;
function getSkillLockPath() {
	const xdgStateHome = process.env.XDG_STATE_HOME;
	if (xdgStateHome) return join(xdgStateHome, "skills", LOCK_FILE);
	return join(homedir(), AGENTS_DIR, LOCK_FILE);
}
async function readSkillLock() {
	const lockPath = getSkillLockPath();
	try {
		const content = await readFile(lockPath, "utf-8");
		const parsed = JSON.parse(content);
		if (typeof parsed.version !== "number" || !parsed.skills) return createEmptyLockFile();
		if (parsed.version < CURRENT_VERSION) return createEmptyLockFile();
		return parsed;
	} catch (error) {
		return createEmptyLockFile();
	}
}
async function writeSkillLock(lock) {
	const lockPath = getSkillLockPath();
	await mkdir(dirname(lockPath), { recursive: true });
	await writeFile(lockPath, JSON.stringify(lock, null, 2), "utf-8");
}
function getGitHubToken() {
	if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
	if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
	return null;
}
async function addSkillToLock(skillName, entry) {
	const lock = await readSkillLock();
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const existingEntry = lock.skills[skillName];
	lock.skills[skillName] = {
		...entry,
		installedAt: existingEntry?.installedAt ?? now,
		updatedAt: now
	};
	await writeSkillLock(lock);
}
async function removeSkillFromLock(skillName) {
	const lock = await readSkillLock();
	if (!(skillName in lock.skills)) return false;
	delete lock.skills[skillName];
	await writeSkillLock(lock);
	return true;
}
async function getSkillFromLock(skillName) {
	return (await readSkillLock()).skills[skillName] ?? null;
}
async function getAllLockedSkills() {
	return (await readSkillLock()).skills;
}
function createEmptyLockFile() {
	return {
		version: CURRENT_VERSION,
		skills: {},
		dismissed: {}
	};
}
async function isPromptDismissed(promptKey) {
	return (await readSkillLock()).dismissed?.[promptKey] === true;
}
async function dismissPrompt(promptKey) {
	const lock = await readSkillLock();
	if (!lock.dismissed) lock.dismissed = {};
	lock.dismissed[promptKey] = true;
	await writeSkillLock(lock);
}
async function getLastSelectedAgents() {
	return (await readSkillLock()).lastSelectedAgents;
}
async function saveSelectedAgents(agents) {
	const lock = await readSkillLock();
	lock.lastSelectedAgents = agents;
	await writeSkillLock(lock);
}
const DOWNLOAD_BASE_URL = process.env.SKILLS_DOWNLOAD_URL || "https://skills.sh";
const BLOB_ALLOWED_REPOS = { "zapier/connectors": { downloadUrl: (slug) => `https://connectors-skills.zapier.com/download/${encodeURIComponent(slug)}/snapshot.json` } };
const FETCH_TIMEOUT = 1e4;
const GH_API_MAX_BUFFER = 16 * 1024 * 1024;
function toSkillSlug(name) {
	return name.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
let _rateLimitedThisSession = false;
async function fetchTreeBranch(ownerRepo, branch, token) {
	try {
		const githubHost = getGitHubHost();
		const url = `${githubHost === "github.com" ? "https://api.github.com" : `https://${githubHost}/api/v3`}/repos/${ownerRepo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
		const headers = {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "skills-cli"
		};
		if (token) headers["Authorization"] = `Bearer ${token}`;
		const response = await fetch(url, {
			headers,
			signal: AbortSignal.timeout(FETCH_TIMEOUT)
		});
		if (response.ok) {
			const data = await response.json();
			return {
				tree: {
					sha: data.sha,
					branch,
					tree: data.tree
				},
				rateLimited: false,
				authRetryable: false
			};
		}
		return {
			tree: null,
			rateLimited: response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0",
			authRetryable: response.status === 401 || response.status === 404
		};
	} catch {
		return {
			tree: null,
			rateLimited: false,
			authRetryable: false
		};
	}
}
async function fetchTreeWithToken(ownerRepo, branches, getToken) {
	const token = getToken();
	if (!token) return null;
	for (const branch of branches) {
		const result = await fetchTreeBranch(ownerRepo, branch, token);
		if (result.tree) return result.tree;
	}
	return null;
}
async function fetchTreeWithGitHubCli(ownerRepo, branches) {
	for (const branch of branches) try {
		const endpoint = `repos/${ownerRepo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
		const stdout = await new Promise((resolve, reject) => {
			execFile$1("gh", [
				"api",
				endpoint,
				"--method",
				"GET",
				"--hostname",
				getGitHubHost()
			], {
				encoding: "utf8",
				timeout: FETCH_TIMEOUT,
				maxBuffer: GH_API_MAX_BUFFER,
				windowsHide: true,
				env: {
					...process.env,
					GH_PROMPT_DISABLED: "1"
				}
			}, (error, output) => {
				if (error) reject(error);
				else resolve(output);
			});
		});
		const data = JSON.parse(stdout);
		if (typeof data.sha !== "string" || !Array.isArray(data.tree)) continue;
		return {
			sha: data.sha,
			branch,
			tree: data.tree
		};
	} catch {}
	return null;
}
async function fetchTreeWithAvailableAuth(ownerRepo, branches, getToken) {
	if (getToken) {
		const tree = await fetchTreeWithToken(ownerRepo, branches, getToken);
		if (tree) return tree;
	}
	return fetchTreeWithGitHubCli(ownerRepo, branches);
}
async function fetchRepoTree(ownerRepo, ref, getToken) {
	const branches = ref ? [ref] : [
		"HEAD",
		"main",
		"master"
	];
	if (_rateLimitedThisSession) return fetchTreeWithAvailableAuth(ownerRepo, branches, getToken);
	let rateLimited = false;
	let authRetryable = false;
	for (const branch of branches) {
		const result = await fetchTreeBranch(ownerRepo, branch, null);
		if (result.tree) return result.tree;
		if (result.rateLimited) {
			rateLimited = true;
			break;
		}
		if (result.authRetryable) {
			authRetryable = true;
			break;
		}
	}
	if (!(rateLimited || authRetryable)) return null;
	if (rateLimited) _rateLimitedThisSession = true;
	return fetchTreeWithAvailableAuth(ownerRepo, branches, getToken);
}
function getSkillFolderHashFromTree(tree, skillPath) {
	let folderPath = skillPath.replace(/\\/g, "/");
	if (folderPath.toLowerCase().endsWith("/skill.md")) folderPath = folderPath.slice(0, -9);
	else if (folderPath.toLowerCase().endsWith("skill.md")) folderPath = folderPath.slice(0, -8);
	if (folderPath.endsWith("/")) folderPath = folderPath.slice(0, -1);
	if (!folderPath) return tree.sha;
	return tree.tree.find((e) => e.type === "tree" && e.path === folderPath)?.sha ?? null;
}
const PRIORITY_PREFIXES = [
	"",
	"skills/",
	"skills/.curated/",
	"skills/.experimental/",
	"skills/.system/",
	".agents/skills/",
	".claude/skills/",
	".cline/skills/",
	".codebuddy/skills/",
	".codex/skills/",
	".commandcode/skills/",
	".continue/skills/",
	".github/skills/",
	".goose/skills/",
	".grok/skills/",
	".iflow/skills/",
	".junie/skills/",
	".kilocode/skills/",
	".kimchi/skills/",
	".kiro/skills/",
	".minimax/skills/",
	".mux/skills/",
	".neovate/skills/",
	".opencode/skills/",
	".openhands/skills/",
	".pi/skills/",
	".posit/assistant/skills/",
	".qoder/skills/",
	".roo/skills/",
	".trae/skills/",
	".windsurf/skills/",
	".zcode/skills/",
	".zencoder/skills/"
];
function findSkillMdPaths(tree, subpath) {
	const allSkillMds = tree.tree.filter((e) => e.type === "blob" && e.path.toLowerCase().endsWith("skill.md")).map((e) => e.path);
	const prefix = subpath ? subpath.endsWith("/") ? subpath : subpath + "/" : "";
	const filtered = prefix ? allSkillMds.filter((p) => p.startsWith(prefix) || p === prefix + "SKILL.md") : allSkillMds;
	if (filtered.length === 0) return [];
	const priorityResults = [];
	const seen = /* @__PURE__ */ new Set();
	const SKIP_DIRS = /* @__PURE__ */ new Set([
		"node_modules",
		".git",
		"dist",
		"build",
		"__pycache__"
	]);
	const lowerSkillMdSet = new Set(filtered.map((p) => p.toLowerCase()));
	for (const priorityPrefix of PRIORITY_PREFIXES) {
		const fullPrefix = prefix + priorityPrefix;
		const isContainer = priorityPrefix !== "";
		for (const skillMd of filtered) {
			if (!skillMd.startsWith(fullPrefix)) continue;
			const rest = skillMd.slice(fullPrefix.length);
			if (rest.toLowerCase() === "skill.md") {
				if (!seen.has(skillMd)) {
					priorityResults.push(skillMd);
					seen.add(skillMd);
				}
				continue;
			}
			const parts = rest.split("/");
			if (parts.length === 2 && parts[1].toLowerCase() === "skill.md") {
				if (!seen.has(skillMd)) {
					priorityResults.push(skillMd);
					seen.add(skillMd);
				}
				continue;
			}
			const skillDirs = parts.slice(0, -1);
			const hasAncestorSkill = skillDirs.slice(0, -1).some((_, index) => {
				const ancestorPath = skillDirs.slice(0, index + 1).join("/");
				return lowerSkillMdSet.has(`${fullPrefix}${ancestorPath}/SKILL.md`.toLowerCase());
			});
			if (isContainer && parts.length >= 3 && parts.length <= 4 && parts.at(-1).toLowerCase() === "skill.md" && skillDirs.every((part) => !SKIP_DIRS.has(part)) && !hasAncestorSkill) {
				if (!seen.has(skillMd)) {
					priorityResults.push(skillMd);
					seen.add(skillMd);
				}
			}
		}
	}
	if (priorityResults.length > 0) return priorityResults;
	return filtered.filter((p) => {
		return p.split("/").length <= 6;
	});
}
async function fetchSkillMdContent(ownerRepo, branch, skillMdPath) {
	try {
		const url = `https://raw.githubusercontent.com/${ownerRepo}/${branch}/${skillMdPath}`;
		const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
		if (!response.ok) return null;
		return await response.text();
	} catch {
		return null;
	}
}
async function fetchSkillDownload(source, slug) {
	try {
		const [owner, repo] = source.split("/");
		const defaultUrl = `${DOWNLOAD_BASE_URL}/api/download/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(slug)}`;
		const url = BLOB_ALLOWED_REPOS[source.toLowerCase()]?.downloadUrl(slug) ?? defaultUrl;
		const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}
function computeSnapshotHash(files) {
	const hash = createHash$1("sha256");
	for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
		hash.update(file.path);
		hash.update(file.contents);
	}
	return hash.digest("hex");
}
async function tryBlobInstall(ownerRepo, options = {}) {
	if (options.ref !== void 0) return null;
	const tree = await fetchRepoTree(ownerRepo, options.ref, options.getToken);
	if (!tree) return null;
	let skillMdPaths = findSkillMdPaths(tree, options.subpath);
	if (skillMdPaths.length === 0) return null;
	if (options.skillFilter) {
		const filterSlug = toSkillSlug(options.skillFilter);
		const filtered = skillMdPaths.filter((p) => {
			const parts = p.split("/");
			if (parts.length < 2) return false;
			const folderName = parts[parts.length - 2];
			return toSkillSlug(folderName) === filterSlug;
		});
		if (filtered.length > 0) skillMdPaths = filtered;
	}
	const mdFetches = await Promise.all(skillMdPaths.map(async (mdPath) => {
		return {
			mdPath,
			content: await fetchSkillMdContent(ownerRepo, tree.branch, mdPath)
		};
	}));
	const parsedSkills = [];
	for (const { mdPath, content } of mdFetches) {
		if (!content) continue;
		const { data } = parseFrontmatter(content);
		if (!data.name || !data.description) continue;
		if (typeof data.name !== "string" || typeof data.description !== "string") continue;
		if (data.metadata?.internal === true && !options.includeInternal) continue;
		const safeName = sanitizeMetadata(data.name);
		const safeDescription = sanitizeMetadata(data.description);
		parsedSkills.push({
			mdPath,
			name: safeName,
			description: safeDescription,
			content,
			slug: toSkillSlug(safeName),
			metadata: data.metadata
		});
	}
	if (parsedSkills.length === 0) return null;
	let filteredSkills = parsedSkills;
	if (options.skillFilter) {
		const filterSlug = toSkillSlug(options.skillFilter);
		const nameFiltered = parsedSkills.filter((s) => s.slug === filterSlug);
		if (nameFiltered.length > 0) filteredSkills = nameFiltered;
		if (filteredSkills.length === 0) return null;
	}
	const source = ownerRepo.toLowerCase();
	const downloads = await Promise.all(filteredSkills.map(async (skill) => {
		return {
			skill,
			download: await fetchSkillDownload(source, skill.slug)
		};
	}));
	if (!downloads.every((d) => d.download !== null)) return null;
	return {
		skills: downloads.map(({ skill, download }) => {
			const mdPathLower = skill.mdPath.toLowerCase();
			const files = (mdPathLower.endsWith("/skill.md") ? skill.mdPath.slice(0, -9) : mdPathLower === "skill.md" ? "" : skill.mdPath.slice(0, -9)) ? download.files : download.files.filter((file) => file.path.toLowerCase() === "skill.md");
			return {
				name: skill.name,
				description: skill.description,
				path: "",
				rawContent: skill.content,
				metadata: skill.metadata,
				files,
				snapshotHash: files.length === download.files.length ? download.hash : computeSnapshotHash(files),
				repoPath: skill.mdPath
			};
		}),
		tree
	};
}
var version$1 = "1.5.23";
const isCancelled$1 = (value) => typeof value === "symbol";
const EVE_AGENT_LABEL = "eve agent";
async function isSourcePrivate(source) {
	const ownerRepo = parseOwnerRepo(source);
	if (!ownerRepo) return false;
	return isRepoPrivate(ownerRepo.owner, ownerRepo.repo);
}
function getLockSource(parsedUrl, normalizedSource) {
	if (parsedUrl.startsWith("git@") || parsedUrl.startsWith("ssh://")) return parsedUrl;
	if (parsedUrl.startsWith("http://") || parsedUrl.startsWith("https://")) try {
		if (new URL(parsedUrl).hostname !== "github.com") return parsedUrl;
	} catch {
		return normalizedSource;
	}
	return normalizedSource;
}
function getProjectLockSourceUrl(sourceType, sourceUrl) {
	return sourceType === "git" || sourceType === "gitlab" ? sourceUrl : void 0;
}
function initTelemetry(version) {
	setVersion(version);
}
function riskLabel(risk) {
	switch (risk) {
		case "critical": return import_picocolors.default.red(import_picocolors.default.bold("Critical Risk"));
		case "high": return import_picocolors.default.red("High Risk");
		case "medium": return import_picocolors.default.yellow("Med Risk");
		case "low": return import_picocolors.default.green("Low Risk");
		case "safe": return import_picocolors.default.green("Safe");
		default: return import_picocolors.default.dim("--");
	}
}
function socketLabel(audit) {
	if (!audit) return import_picocolors.default.dim("--");
	const count = audit.alerts ?? 0;
	return count > 0 ? import_picocolors.default.red(`${count} alert${count !== 1 ? "s" : ""}`) : import_picocolors.default.green("0 alerts");
}
function padEnd(str, width) {
	const visible = stripTerminalEscapes(str);
	const pad = Math.max(0, width - visible.length);
	return str + " ".repeat(pad);
}
function buildSecurityLines(auditData, skills, source) {
	if (!auditData) return [];
	if (!skills.some((s) => {
		const data = auditData[s.slug];
		return data && Object.keys(data).length > 0;
	})) return [];
	const nameWidth = Math.min(Math.max(...skills.map((s) => s.displayName.length)), 36);
	const lines = [];
	const header = padEnd("", nameWidth + 2) + padEnd(import_picocolors.default.dim("Gen"), 18) + padEnd(import_picocolors.default.dim("Socket"), 18) + import_picocolors.default.dim("Snyk");
	lines.push(header);
	for (const skill of skills) {
		const data = auditData[skill.slug];
		const name = skill.displayName.length > nameWidth ? skill.displayName.slice(0, nameWidth - 1) + "…" : skill.displayName;
		const ath = data?.ath ? riskLabel(data.ath.risk) : import_picocolors.default.dim("--");
		const socket = data?.socket ? socketLabel(data.socket) : import_picocolors.default.dim("--");
		const snyk = data?.snyk ? riskLabel(data.snyk.risk) : import_picocolors.default.dim("--");
		lines.push(padEnd(import_picocolors.default.cyan(name), nameWidth + 2) + padEnd(ath, 18) + padEnd(socket, 18) + snyk);
	}
	lines.push("");
	lines.push(`${import_picocolors.default.dim("Details:")} ${import_picocolors.default.dim(`https://skills.sh/${source}`)}`);
	return lines;
}
function shortenPath$2(fullPath, cwd) {
	const home = homedir();
	if (fullPath === home || fullPath.startsWith(home + sep)) return "~" + fullPath.slice(home.length);
	if (fullPath === cwd || fullPath.startsWith(cwd + sep)) return "." + fullPath.slice(cwd.length);
	return fullPath;
}
function formatList$1(items, maxShow = 5) {
	if (items.length <= maxShow) return items.join(", ");
	const shown = items.slice(0, maxShow);
	const remaining = items.length - maxShow;
	return `${shown.join(", ")} +${remaining} more`;
}
function formatSkillPromptSubject(skills) {
	const namedSubject = formatList$1(skills.map((skill) => import_picocolors.default.cyan(getSkillDisplayName(skill))), 3);
	return stripTerminalEscapes(namedSubject).length <= 80 ? namedSubject : `${skills.length} selected skills`;
}
function formatEveInstallPromptMessage(skills) {
	return `Detected an eve project. Install ${formatSkillPromptSubject(skills)} for your ${EVE_AGENT_LABEL} to use?`;
}
function splitAgentsByType(agentTypes) {
	const universal = [];
	const symlinked = [];
	for (const a of agentTypes) if (isUniversalAgent(a)) universal.push(agents[a].displayName);
	else symlinked.push(agents[a].displayName);
	return {
		universal,
		symlinked
	};
}
function buildAgentSummaryLines(targetAgents, installMode) {
	const lines = [];
	const { universal, symlinked } = splitAgentsByType(targetAgents);
	if (installMode === "symlink") {
		if (universal.length > 0) lines.push(`  ${import_picocolors.default.green("universal:")} ${formatList$1(universal)}`);
		if (symlinked.length > 0) lines.push(`  ${import_picocolors.default.dim("symlink →")} ${formatList$1(symlinked)}`);
	} else {
		const allNames = targetAgents.map((a) => agents[a].displayName);
		lines.push(`  ${import_picocolors.default.dim("copy →")} ${formatList$1(allNames)}`);
	}
	return lines;
}
function targetDisplayName(target) {
	const base = agents[target.agent].displayName;
	return target.subagent ? `${base} (${target.subagent})` : base;
}
function targetKey(target) {
	return target.subagent ? `${target.agent}:${target.subagent}` : target.agent;
}
function buildInstallTargets(targetAgents, eveSubagentTargets) {
	const targets = [];
	for (const agent of targetAgents) if (agent === "eve") for (const subagent of eveSubagentTargets) targets.push({
		agent,
		subagent
	});
	else targets.push({ agent });
	return targets;
}
function buildTargetSummaryLines(targets, installMode) {
	const lines = [];
	const rootAgents = targets.filter((t) => !t.subagent).map((t) => t.agent);
	const subagentNames = targets.filter((t) => t.subagent).map(targetDisplayName);
	const { universal, symlinked } = splitAgentsByType(rootAgents);
	if (installMode === "symlink") {
		if (universal.length > 0) lines.push(`  ${import_picocolors.default.green("universal:")} ${formatList$1(universal)}`);
		if (symlinked.length > 0) lines.push(`  ${import_picocolors.default.dim("symlink →")} ${formatList$1(symlinked)}`);
		if (subagentNames.length > 0) lines.push(`  ${import_picocolors.default.dim("copy →")} ${formatList$1(subagentNames)}`);
	} else {
		const allNames = targets.map(targetDisplayName);
		lines.push(`  ${import_picocolors.default.dim("copy →")} ${formatList$1(allNames)}`);
	}
	return lines;
}
function ensureUniversalAgents(targetAgents) {
	const universalAgents = getUniversalAgents();
	const result = [...targetAgents];
	for (const ua of universalAgents) if (!result.includes(ua)) result.push(ua);
	return result;
}
function buildResultLines(results, targetAgents) {
	const lines = [];
	const { universal, symlinked: symlinkAgents } = splitAgentsByType(targetAgents);
	const successfulSymlinks = results.filter((r) => !r.symlinkFailed && !r.skipped && !universal.includes(r.agent)).map((r) => r.agent);
	const failedSymlinks = results.filter((r) => r.symlinkFailed && !r.skipped).map((r) => r.agent);
	if (universal.length > 0) lines.push(`  ${import_picocolors.default.green("universal:")} ${formatList$1(universal)}`);
	if (successfulSymlinks.length > 0) lines.push(`  ${import_picocolors.default.dim("symlinked:")} ${formatList$1(successfulSymlinks)}`);
	if (failedSymlinks.length > 0) lines.push(`  ${import_picocolors.default.yellow("copied:")} ${formatList$1(failedSymlinks)}`);
	return lines;
}
async function promptForAgents(message, choices) {
	let lastSelected;
	try {
		lastSelected = await getLastSelectedAgents();
	} catch {}
	const validAgents = choices.map((c) => c.value);
	const defaultValues = [
		"claude-code",
		"opencode",
		"codex"
	].filter((a) => validAgents.includes(a));
	let initialValues = [];
	if (lastSelected && lastSelected.length > 0) initialValues = lastSelected.filter((a) => validAgents.includes(a));
	if (initialValues.length === 0) initialValues = defaultValues;
	const selected = await searchMultiselect({
		message,
		items: choices,
		initialSelected: initialValues,
		required: true
	});
	if (!isCancelled$1(selected)) try {
		await saveSelectedAgents(selected);
	} catch {}
	return selected;
}
async function selectAgentsInteractive(options) {
	const supportsGlobalFilter = (a) => !options.global || agents[a].globalSkillsDir;
	const universalAgents = getUniversalAgents().filter(supportsGlobalFilter);
	const visibleUniversalAgents = getVisibleUniversalAgents().filter(supportsGlobalFilter);
	const otherAgents = getNonUniversalAgents().filter((agent) => agent !== "eve" && supportsGlobalFilter(agent));
	const universalSection = {
		title: "Universal (.agents/skills)",
		items: visibleUniversalAgents.map((a) => ({
			value: a,
			label: agents[a].displayName
		})),
		hiddenCount: universalAgents.length - visibleUniversalAgents.length
	};
	const otherChoices = otherAgents.map((a) => ({
		value: a,
		label: agents[a].displayName,
		hint: options.global ? agents[a].globalSkillsDir : agents[a].skillsDir
	}));
	let lastSelected;
	try {
		lastSelected = await getLastSelectedAgents();
	} catch {}
	const selected = await searchMultiselect({
		message: "Which agents do you want to install to?",
		items: otherChoices,
		initialSelected: lastSelected ? lastSelected.filter((a) => otherAgents.includes(a) && !universalAgents.includes(a)) : [],
		lockedSection: universalSection
	});
	if (!isCancelled$1(selected)) try {
		await saveSelectedAgents(selected);
	} catch {}
	return selected;
}
setVersion(version$1);
function isSkillsShPackUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.hostname.replace(/^www\./, "") === "skills.sh" && /^\/p\/[^/]+/.test(parsed.pathname);
	} catch {
		return false;
	}
}
async function handleWellKnownSkills(source, url, options, spinner) {
	spinner.start("Discovering skills from well-known endpoint...");
	let skills = [];
	try {
		skills = await wellKnownProvider.fetchAllSkills(url, { includeInternal: Boolean(options.skill && options.skill.length > 0 && !options.skill.includes("*")) });
	} catch (error) {
		if (error instanceof WellKnownScopeNotFoundError) {
			spinner.stop(import_picocolors.default.red("No matching skills"));
			log.error(error.message);
			process.exit(1);
		}
	}
	if (skills.length === 0) {
		spinner.stop(import_picocolors.default.dim("No well-known skills found; trying direct download..."));
		return false;
	}
	spinner.stop(`Found ${import_picocolors.default.green(skills.length)} skill${skills.length > 1 ? "s" : ""}`);
	for (const skill of skills) {
		log.info(`Skill: ${import_picocolors.default.cyan(skill.installName)}`);
		log.message(import_picocolors.default.dim(skill.description));
		if (skill.files.size > 1) log.message(import_picocolors.default.dim(`  Files: ${Array.from(skill.files.keys()).join(", ")}`));
	}
	if (options.list) {
		console.log();
		log.step(import_picocolors.default.bold("Available Skills"));
		for (const skill of skills) {
			log.message(`  ${import_picocolors.default.cyan(skill.installName)}`);
			log.message(`    ${import_picocolors.default.dim(skill.description)}`);
			if (skill.files.size > 1) log.message(`    ${import_picocolors.default.dim(`Files: ${skill.files.size}`)}`);
		}
		console.log();
		outro("Run without --list to install");
		process.exit(0);
	}
	let selectedSkills;
	if (options.skill?.includes("*")) {
		selectedSkills = skills;
		log.info(`Installing all ${skills.length} skills`);
	} else if (options.skill && options.skill.length > 0) {
		selectedSkills = skills.filter((s) => options.skill.some((name) => s.installName.toLowerCase() === name.toLowerCase() || s.name.toLowerCase() === name.toLowerCase()));
		if (selectedSkills.length === 0) {
			log.error(`No matching skills found for: ${options.skill.join(", ")}`);
			log.info("Available skills:");
			for (const s of skills) log.message(`  - ${s.installName}`);
			process.exit(1);
		}
	} else if (skills.length === 1) {
		selectedSkills = skills;
		const firstSkill = skills[0];
		log.info(`Skill: ${import_picocolors.default.cyan(firstSkill.installName)}`);
	} else if (options.yes) {
		selectedSkills = skills;
		log.info(`Installing all ${skills.length} skills`);
	} else {
		const selected = await searchMultiselect({
			message: "Select skills to install",
			items: skills.map((s) => ({
				value: s,
				label: s.installName,
				hint: s.description.length > 60 ? s.description.slice(0, 57) + "…" : s.description
			})),
			initialSelected: isSkillsShPackUrl(url) ? skills : void 0,
			required: true,
			maxVisible: 20,
			selectAll: true
		});
		if (isCancelled$1(selected)) {
			cancel("Installation cancelled");
			process.exit(0);
		}
		selectedSkills = selected;
	}
	let targetAgents;
	const validAgents = Object.keys(agents);
	if (options.agent?.includes("*")) {
		targetAgents = validAgents;
		log.info(`Installing to all ${targetAgents.length} agents`);
	} else if (options.agent && options.agent.length > 0) {
		const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
		if (invalidAgents.length > 0) {
			log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
			log.info(`Valid agents: ${validAgents.join(", ")}`);
			process.exit(1);
		}
		targetAgents = options.agent;
	} else {
		spinner.start("Loading agents…");
		const installedAgents = await detectInstalledAgents();
		const totalAgents = Object.keys(agents).length;
		spinner.stop(`${totalAgents} agents`);
		if (installedAgents.length === 0) if (options.yes) {
			targetAgents = validAgents;
			log.info("Installing to all agents");
		} else {
			log.info("Select agents to install skills to");
			const selected = await promptForAgents("Which agents do you want to install to?", Object.entries(agents).map(([key, config]) => ({
				value: key,
				label: config.displayName
			})));
			if (isCancel(selected)) {
				cancel("Installation cancelled");
				process.exit(0);
			}
			targetAgents = selected;
		}
		else if (installedAgents.length === 1 || options.yes) {
			targetAgents = ensureUniversalAgents(installedAgents);
			if (installedAgents.length === 1) {
				const firstAgent = installedAgents[0];
				log.info(`Installing to: ${import_picocolors.default.cyan(agents[firstAgent].displayName)}`);
			} else log.info(`Installing to: ${installedAgents.map((a) => import_picocolors.default.cyan(agents[a].displayName)).join(", ")}`);
		} else {
			const selected = await selectAgentsInteractive({ global: options.global });
			if (isCancel(selected)) {
				cancel("Installation cancelled");
				process.exit(0);
			}
			targetAgents = selected;
		}
	}
	let installGlobally = options.global ?? false;
	const supportsGlobal = targetAgents.some((a) => agents[a].globalSkillsDir !== void 0);
	if (options.global === void 0 && !options.yes && supportsGlobal) {
		const scope = await select({
			message: "Installation scope",
			options: [{
				value: false,
				label: "Project",
				hint: "Install in current directory (committed with your project)"
			}, {
				value: true,
				label: "Global",
				hint: "Install in home directory (available across all projects)"
			}]
		});
		if (isCancel(scope)) {
			cancel("Installation cancelled");
			process.exit(0);
		}
		installGlobally = scope;
	}
	let installMode = options.copy ? "copy" : "symlink";
	const uniqueDirs = new Set(targetAgents.map((a) => agents[a].skillsDir));
	if (!options.copy && !options.yes && uniqueDirs.size > 1) {
		const modeChoice = await select({
			message: "Installation method",
			options: [{
				value: "symlink",
				label: "Symlink (Recommended)",
				hint: "Single source of truth, easy updates"
			}, {
				value: "copy",
				label: "Copy to all agents",
				hint: "Independent copies for each agent"
			}]
		});
		if (isCancel(modeChoice)) {
			cancel("Installation cancelled");
			process.exit(0);
		}
		installMode = modeChoice;
	} else if (uniqueDirs.size <= 1) installMode = "copy";
	const cwd = process.cwd();
	const summaryLines = [];
	targetAgents.map((a) => agents[a].displayName);
	const overwriteChecks = await Promise.all(selectedSkills.flatMap((skill) => targetAgents.map(async (agent) => ({
		skillName: skill.installName,
		agent,
		installed: await isSkillInstalled(skill.installName, agent, { global: installGlobally })
	}))));
	const overwriteStatus = /* @__PURE__ */ new Map();
	for (const { skillName, agent, installed } of overwriteChecks) {
		if (!overwriteStatus.has(skillName)) overwriteStatus.set(skillName, /* @__PURE__ */ new Map());
		overwriteStatus.get(skillName).set(agent, installed);
	}
	for (const skill of selectedSkills) {
		if (summaryLines.length > 0) summaryLines.push("");
		const shortCanonical = shortenPath$2(getCanonicalPath(skill.installName, { global: installGlobally }), cwd);
		summaryLines.push(`${import_picocolors.default.cyan(shortCanonical)}`);
		summaryLines.push(...buildAgentSummaryLines(targetAgents, installMode));
		if (skill.files.size > 1) summaryLines.push(`  ${import_picocolors.default.dim("files:")} ${skill.files.size}`);
		const skillOverwrites = overwriteStatus.get(skill.installName);
		const overwriteAgents = targetAgents.filter((a) => skillOverwrites?.get(a)).map((a) => agents[a].displayName);
		if (overwriteAgents.length > 0) summaryLines.push(`  ${import_picocolors.default.yellow("overwrites:")} ${formatList$1(overwriteAgents)}`);
	}
	console.log();
	note(summaryLines.join("\n"), "Installation Summary");
	if (!options.yes) {
		const confirmed = await confirm({ message: "Proceed with installation?" });
		if (isCancel(confirmed) || !confirmed) {
			cancel("Installation cancelled");
			process.exit(0);
		}
	}
	const sourceIdentifier = wellKnownProvider.getSourceIdentifier(url);
	const wellKnownPrivacyPromise = isSourcePrivate(sourceIdentifier).catch(() => null);
	spinner.start("Installing skills…");
	const results = [];
	for (const skill of selectedSkills) for (const agent of targetAgents) {
		const result = await installWellKnownSkillForAgent(skill, agent, {
			global: installGlobally,
			mode: installMode
		});
		results.push({
			skill: skill.installName,
			agent: agents[agent].displayName,
			...result
		});
	}
	spinner.stop("Installation complete");
	console.log();
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);
	const skillFiles = {};
	for (const skill of selectedSkills) skillFiles[skill.installName] = skill.sourceUrl;
	if (await wellKnownPrivacyPromise !== true) track({
		event: "install",
		source: sourceIdentifier,
		skills: selectedSkills.map((s) => s.installName).join(","),
		agents: targetAgents.join(","),
		...installGlobally && { global: "1" },
		skillFiles: JSON.stringify(skillFiles),
		installUrl: url,
		metadata: options.metadata,
		sourceType: "well-known"
	});
	if (successful.length > 0 && installGlobally) {
		const successfulSkillNames = new Set(successful.map((r) => r.skill));
		for (const skill of selectedSkills) if (successfulSkillNames.has(skill.installName)) try {
			await addSkillToLock(skill.installName, {
				source: sourceIdentifier,
				sourceType: "well-known",
				sourceUrl: skill.sourceUrl,
				skillFolderHash: "",
				sourceBaseUrl: url,
				wellKnownDigest: computeWellKnownSkillDigest(skill)
			});
		} catch {}
	}
	if (successful.length > 0 && !installGlobally) {
		const successfulSkillNames = new Set(successful.map((r) => r.skill));
		for (const skill of selectedSkills) if (successfulSkillNames.has(skill.installName)) try {
			const matchingResult = successful.find((r) => r.skill === skill.installName);
			const installDir = matchingResult?.canonicalPath || matchingResult?.path;
			if (installDir) {
				const computedHash = await computeSkillFolderHash(installDir);
				await addSkillToLocalLock(skill.installName, {
					source: sourceIdentifier,
					sourceUrl: url,
					sourceType: "well-known",
					computedHash,
					wellKnownDigest: computeWellKnownSkillDigest(skill)
				}, cwd);
			}
		} catch {}
	}
	if (successful.length > 0) {
		const bySkill = /* @__PURE__ */ new Map();
		for (const r of successful) {
			const skillResults = bySkill.get(r.skill) || [];
			skillResults.push(r);
			bySkill.set(r.skill, skillResults);
		}
		const skillCount = bySkill.size;
		const symlinkFailures = successful.filter((r) => r.mode === "symlink" && r.symlinkFailed);
		const copiedAgents = symlinkFailures.map((r) => r.agent);
		const resultLines = [];
		for (const [skillName, skillResults] of bySkill) {
			const firstResult = skillResults[0];
			if (firstResult.mode === "copy") {
				resultLines.push(`${import_picocolors.default.green("✓")} ${skillName} ${import_picocolors.default.dim("(copied)")}`);
				const shortPathsSet = /* @__PURE__ */ new Set();
				for (const r of skillResults) {
					const shortPath = shortenPath$2(r.path, cwd);
					if (!shortPathsSet.has(shortPath)) {
						shortPathsSet.add(shortPath);
						resultLines.push(`  ${import_picocolors.default.dim("→")} ${shortPath}`);
					}
				}
			} else {
				if (firstResult.canonicalPath) {
					const shortPath = shortenPath$2(firstResult.canonicalPath, cwd);
					resultLines.push(`${import_picocolors.default.green("✓")} ${shortPath}`);
				} else resultLines.push(`${import_picocolors.default.green("✓")} ${skillName}`);
				resultLines.push(...buildResultLines(skillResults, targetAgents));
			}
		}
		const title = import_picocolors.default.green(`Installed ${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
		note(resultLines.join("\n"), title);
		if (symlinkFailures.length > 0) {
			log.warn(import_picocolors.default.yellow(`Symlinks failed for: ${formatList$1(copiedAgents)}`));
			log.message(import_picocolors.default.dim("  Files were copied instead. On Windows, enable Developer Mode for symlink support."));
		}
	}
	if (failed.length > 0) {
		console.log();
		log.error(import_picocolors.default.red(`Failed to install ${failed.length}`));
		for (const r of failed) log.message(`  ${import_picocolors.default.red("✗")} ${r.skill} → ${r.agent}: ${import_picocolors.default.dim(r.error)}`);
	}
	console.log();
	outro(import_picocolors.default.green("Done!") + import_picocolors.default.dim("  Review skills before use; they run with full agent permissions."));
	await promptForFindSkills(options, targetAgents);
	return true;
}
async function runAdd(args, options = {}) {
	const source = args[0];
	let installTipShown = false;
	const showInstallTip = () => {
		if (installTipShown) return;
		log.message(import_picocolors.default.dim("Tip: use the --yes (-y) and --global (-g) flags to install without prompts."));
		installTipShown = true;
	};
	if (!source) {
		console.log();
		console.log(import_picocolors.default.bgRed(import_picocolors.default.white(import_picocolors.default.bold(" ERROR "))) + " " + import_picocolors.default.red("Missing required argument: source"));
		console.log();
		console.log(import_picocolors.default.dim("  Usage:"));
		console.log(`    ${import_picocolors.default.cyan("npx skills add")} ${import_picocolors.default.yellow("<source>")} ${import_picocolors.default.dim("[options]")}`);
		console.log();
		console.log(import_picocolors.default.dim("  Example:"));
		console.log(`    ${import_picocolors.default.cyan("npx skills add")} ${import_picocolors.default.yellow("vercel-labs/agent-skills")}`);
		console.log();
		process.exit(1);
	}
	if (options.all) {
		options.skill = ["*"];
		options.agent = ["*"];
		options.yes = true;
	}
	const agentResult = await detectAgent();
	if (agentResult.isAgent) {
		options.yes = true;
		if (!options.agent || options.agent.length === 0) {
			const mappedAgent = getAgentType(agentResult.agent.name);
			if (mappedAgent) options.agent = ensureUniversalAgents([mappedAgent]);
		}
	}
	console.log();
	if (!agentResult.isAgent) intro(import_picocolors.default.bgCyan(import_picocolors.default.black(" skills ")));
	if (agentResult.isAgent) log.info(import_picocolors.default.bgCyan(import_picocolors.default.black(import_picocolors.default.bold(` ${agentResult.agent.name} `))) + " Agent detected — installing non-interactively");
	else if (!process.stdin.isTTY) showInstallTip();
	let tempDir = null;
	try {
		const spinner$3 = spinner();
		spinner$3.start("Parsing source…");
		const parsed = parseSource(source);
		let directDownload = parsed.type === "download";
		spinner$3.stop(`Source: ${parsed.type === "local" ? parsed.localPath : parsed.url}${parsed.ref ? ` @ ${import_picocolors.default.yellow(parsed.ref)}` : ""}${parsed.subpath ? ` (${parsed.subpath})` : ""}${parsed.skillFilter ? ` ${import_picocolors.default.dim("@")}${import_picocolors.default.cyan(parsed.skillFilter)}` : ""}`);
		const ownerRepoRaw = parsed.type === "well-known" || parsed.type === "download" ? null : getOwnerRepo(parsed);
		const repoPrivacyPromise = (() => {
			if (parsed.type !== "github") return Promise.resolve(null);
			if (!ownerRepoRaw) return Promise.resolve(null);
			const ownerRepo = parseOwnerRepo(ownerRepoRaw);
			if (!ownerRepo) return Promise.resolve(null);
			return isRepoPrivate(ownerRepo.owner, ownerRepo.repo).catch(() => null);
		})();
		if (parsed.type === "well-known") {
			if (await handleWellKnownSkills(source, parsed.url, options, spinner$3)) return;
			directDownload = true;
		}
		if (parsed.skillFilter) {
			options.skill = options.skill || [];
			if (!options.skill.includes(parsed.skillFilter)) options.skill.push(parsed.skillFilter);
		}
		const includeInternal = !!(options.skill && options.skill.length > 0 && !options.skill.includes("*"));
		let skills;
		let blobResult = null;
		if (parsed.type === "local") {
			spinner$3.start("Validating local path…");
			if (!existsSync(parsed.localPath)) {
				spinner$3.stop(import_picocolors.default.red("Path not found"));
				outro(import_picocolors.default.red(`Local path does not exist: ${parsed.localPath}`));
				process.exit(1);
			}
			spinner$3.stop("Local path validated");
			spinner$3.start("Discovering skills…");
			skills = await discoverSkills(parsed.localPath, parsed.subpath, {
				includeInternal,
				fullDepth: options.fullDepth
			});
		} else if (parsed.type === "well-known" || parsed.type === "download") {
			spinner$3.start("Downloading source...");
			const downloaded = await downloadSource(parsed.url);
			tempDir = downloaded.tempDir;
			spinner$3.stop(`Downloaded ${downloaded.kind === "skill-md" ? "SKILL.md file" : "archive"}`);
			spinner$3.start("Discovering skills...");
			skills = await discoverSkills(downloaded.rootDir, parsed.subpath, {
				includeInternal,
				fullDepth: options.fullDepth
			});
		} else if (parsed.type === "github" && !options.fullDepth) {
			const BLOB_ALLOWED_OWNERS = [
				"vercel",
				"vercel-labs",
				"heygen-com"
			];
			const ownerRepo = getOwnerRepo(parsed);
			const owner = ownerRepo?.split("/")[0]?.toLowerCase();
			const isSelfHostedRepo = !!ownerRepo && Object.hasOwn(BLOB_ALLOWED_REPOS, ownerRepo.toLowerCase());
			if (ownerRepo && owner && (isSelfHostedRepo || BLOB_ALLOWED_OWNERS.includes(owner))) {
				spinner$3.start("Fetching skills…");
				blobResult = await tryBlobInstall(ownerRepo, {
					subpath: parsed.subpath,
					skillFilter: parsed.skillFilter,
					ref: parsed.ref,
					getToken: getGitHubToken,
					includeInternal
				});
				if (!blobResult) spinner$3.stop(import_picocolors.default.dim("Falling back to clone…"));
			}
			if (blobResult) {
				skills = blobResult.skills;
				spinner$3.stop(`Found ${import_picocolors.default.green(skills.length)} skill${skills.length > 1 ? "s" : ""}`);
			} else {
				spinner$3.start("Cloning repository…");
				tempDir = await cloneRepo(parsed.url, parsed.ref);
				spinner$3.stop("Repository cloned");
				spinner$3.start("Discovering skills…");
				skills = await discoverSkills(tempDir, parsed.subpath, {
					includeInternal,
					fullDepth: options.fullDepth
				});
			}
		} else {
			spinner$3.start("Cloning repository…");
			tempDir = await cloneRepo(parsed.url, parsed.ref);
			spinner$3.stop("Repository cloned");
			spinner$3.start("Discovering skills…");
			skills = await discoverSkills(tempDir, parsed.subpath, {
				includeInternal,
				fullDepth: options.fullDepth
			});
		}
		if (skills.length === 0) {
			spinner$3.stop(import_picocolors.default.red("No skills found"));
			outro(import_picocolors.default.red("No valid skills found. Skills require a SKILL.md with name and description."));
			await cleanup(tempDir);
			process.exit(1);
		}
		if (!blobResult) spinner$3.stop(`Found ${import_picocolors.default.green(skills.length)} skill${skills.length > 1 ? "s" : ""}`);
		if (options.list) {
			console.log();
			log.step(import_picocolors.default.bold("Available Skills"));
			const groupedSkills = {};
			const ungroupedSkills = [];
			for (const skill of skills) if (skill.pluginName) {
				const group = skill.pluginName;
				if (!groupedSkills[group]) groupedSkills[group] = [];
				groupedSkills[group].push(skill);
			} else ungroupedSkills.push(skill);
			const sortedGroups = Object.keys(groupedSkills).sort();
			for (const group of sortedGroups) {
				const title = group.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
				console.log(import_picocolors.default.bold(title));
				for (const skill of groupedSkills[group]) {
					log.message(`  ${import_picocolors.default.cyan(getSkillDisplayName(skill))}`);
					log.message(`    ${import_picocolors.default.dim(skill.description)}`);
				}
				console.log();
			}
			if (ungroupedSkills.length > 0) {
				if (sortedGroups.length > 0) console.log(import_picocolors.default.bold("General"));
				for (const skill of ungroupedSkills) {
					log.message(`  ${import_picocolors.default.cyan(getSkillDisplayName(skill))}`);
					log.message(`    ${import_picocolors.default.dim(skill.description)}`);
				}
			}
			console.log();
			outro("Use --skill <name> to install specific skills");
			await cleanup(tempDir);
			process.exit(0);
		}
		let selectedSkills;
		if (options.skill?.includes("*")) {
			selectedSkills = skills;
			log.info(`Installing all ${skills.length} skills`);
		} else if (options.skill && options.skill.length > 0) {
			selectedSkills = filterSkills(skills, options.skill);
			if (selectedSkills.length === 0) {
				log.error(`No matching skills found for: ${options.skill.join(", ")}`);
				log.info("Available skills:");
				for (const s of skills) log.message(`  - ${getSkillDisplayName(s)}`);
				await cleanup(tempDir);
				process.exit(1);
			}
			log.info(`Selected ${selectedSkills.length} skill${selectedSkills.length !== 1 ? "s" : ""}: ${selectedSkills.map((s) => import_picocolors.default.cyan(getSkillDisplayName(s))).join(", ")}`);
		} else if (skills.length === 1) {
			selectedSkills = skills;
			const firstSkill = skills[0];
			log.info(`Skill: ${import_picocolors.default.cyan(getSkillDisplayName(firstSkill))}`);
			log.message(import_picocolors.default.dim(firstSkill.description));
		} else if (options.yes) {
			selectedSkills = skills;
			log.info(`Installing all ${skills.length} skills`);
		} else {
			const sortedSkills = [...skills].sort((a, b) => {
				if (a.pluginName && !b.pluginName) return -1;
				if (!a.pluginName && b.pluginName) return 1;
				if (a.pluginName && b.pluginName && a.pluginName !== b.pluginName) return a.pluginName.localeCompare(b.pluginName);
				return getSkillDisplayName(a).localeCompare(getSkillDisplayName(b));
			});
			const hasGroups = sortedSkills.some((s) => s.pluginName);
			const kebabToTitle = (s) => s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
			const skillChoices = sortedSkills.map((s) => ({
				value: s,
				label: getSkillDisplayName(s),
				group: hasGroups ? s.pluginName ? kebabToTitle(s.pluginName) : "Other" : void 0,
				detail: s.description
			}));
			const selected = await searchMultiselect({
				message: hasGroups ? `Select skills to install ${import_picocolors.default.dim("(space to toggle)")}` : "Select skills to install",
				items: skillChoices,
				required: true,
				maxVisible: 20,
				searchable: !hasGroups,
				showDetail: true,
				showSelectedSummary: false,
				selectGroups: hasGroups,
				selectAll: true
			});
			if (isCancelled$1(selected)) {
				cancel("Installation cancelled");
				await cleanup(tempDir);
				process.exit(0);
			}
			selectedSkills = selected;
		}
		const ownerRepoForAudit = getOwnerRepo(parsed);
		const auditPromise = ownerRepoForAudit ? repoPrivacyPromise.then((isPrivate) => isPrivate === false ? fetchAuditData(ownerRepoForAudit, selectedSkills.map((s) => getSkillDisplayName(s))) : null) : Promise.resolve(null);
		let targetAgents;
		const validAgents = Object.keys(agents);
		if (options.agent?.includes("*")) {
			targetAgents = validAgents;
			log.info(`Installing to all ${targetAgents.length} agents`);
		} else if (options.agent && options.agent.length > 0) {
			const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
			if (invalidAgents.length > 0) {
				log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
				log.info(`Valid agents: ${validAgents.join(", ")}`);
				await cleanup(tempDir);
				process.exit(1);
			}
			targetAgents = options.agent;
		} else {
			spinner$3.start("Loading agents…");
			const installedAgents = await detectInstalledAgents();
			const totalAgents = Object.keys(agents).length;
			spinner$3.stop(`${totalAgents} agents`);
			if (installedAgents.includes("eve") && (options.yes || !agentResult.isAgent)) {
				const useEve = options.yes ? true : await confirm({
					message: formatEveInstallPromptMessage(selectedSkills),
					initialValue: true
				});
				if (isCancel(useEve)) {
					cancel("Installation cancelled");
					await cleanup(tempDir);
					process.exit(0);
				}
				if (useEve) {
					targetAgents = ["eve"];
					log.info(`Installing to: ${import_picocolors.default.cyan(EVE_AGENT_LABEL)}`);
				} else {
					const selected = await selectAgentsInteractive({ global: options.global });
					if (isCancel(selected)) {
						cancel("Installation cancelled");
						await cleanup(tempDir);
						process.exit(0);
					}
					targetAgents = selected;
				}
			} else if (installedAgents.length === 0) if (options.yes) {
				targetAgents = validAgents;
				log.info("Installing to all agents");
			} else {
				log.info("Select agents to install skills to");
				const selected = await promptForAgents("Which agents do you want to install to?", Object.entries(agents).filter(([key]) => key !== "eve").map(([key, config]) => ({
					value: key,
					label: config.displayName
				})));
				if (isCancel(selected)) {
					cancel("Installation cancelled");
					await cleanup(tempDir);
					process.exit(0);
				}
				targetAgents = selected;
			}
			else if (installedAgents.length === 1 || options.yes) {
				targetAgents = ensureUniversalAgents(installedAgents);
				if (installedAgents.length === 1) {
					const firstAgent = installedAgents[0];
					log.info(`Installing to: ${import_picocolors.default.cyan(agents[firstAgent].displayName)}`);
				} else log.info(`Installing to: ${installedAgents.map((a) => import_picocolors.default.cyan(agents[a].displayName)).join(", ")}`);
			} else {
				const selected = await selectAgentsInteractive({ global: options.global });
				if (isCancel(selected)) {
					cancel("Installation cancelled");
					await cleanup(tempDir);
					process.exit(0);
				}
				targetAgents = selected;
			}
		}
		if (options.subagent && options.subagent.length > 0 && !targetAgents.includes("eve")) targetAgents = [...targetAgents, "eve"];
		let eveSubagentTargets = [void 0];
		if (targetAgents.includes("eve")) {
			const availableSubagents = getEveSubagents(process.cwd());
			if (options.subagent && options.subagent.length > 0) eveSubagentTargets = options.subagent.map((s) => s === "root" || s === "." ? void 0 : s);
			else if (availableSubagents.length > 0 && !options.yes) {
				const selectedSubagents = await multiselect({
					message: "Where should Eve skills be installed?",
					options: [{
						value: "",
						label: "Root agent",
						hint: "agent/skills"
					}, ...availableSubagents.map((name) => ({
						value: name,
						label: name,
						hint: `agent/subagents/${name}/skills`
					}))],
					initialValues: [""],
					required: true
				});
				if (isCancel(selectedSubagents)) {
					cancel("Installation cancelled");
					await cleanup(tempDir);
					process.exit(0);
				}
				eveSubagentTargets = selectedSubagents.map((s) => s === "" ? void 0 : s);
			}
		}
		const installTargets = buildInstallTargets(targetAgents, eveSubagentTargets);
		let installGlobally = options.global ?? false;
		const supportsGlobal = targetAgents.some((a) => agents[a].globalSkillsDir !== void 0);
		if (options.global === void 0 && !options.yes && supportsGlobal) {
			const scope = await select({
				message: "Installation scope",
				options: [{
					value: false,
					label: "Project",
					hint: "Install in current directory (committed with your project)"
				}, {
					value: true,
					label: "Global",
					hint: "Install in home directory (available across all projects)"
				}]
			});
			if (isCancel(scope)) {
				cancel("Installation cancelled");
				await cleanup(tempDir);
				process.exit(0);
			}
			installGlobally = scope;
		}
		let installMode = options.copy ? "copy" : "symlink";
		const allEve = installTargets.every((t) => t.agent === "eve");
		const uniqueDirs = new Set(installTargets.map((t) => t.subagent ? `eve:subagent:${t.subagent}` : agents[t.agent].skillsDir));
		if (!options.copy && !options.yes && uniqueDirs.size > 1 && !allEve) {
			const modeChoice = await select({
				message: "Installation method",
				options: [{
					value: "symlink",
					label: "Symlink (Recommended)",
					hint: "Single source of truth, easy updates"
				}, {
					value: "copy",
					label: "Copy to all agents",
					hint: "Independent copies for each agent"
				}]
			});
			if (isCancel(modeChoice)) {
				cancel("Installation cancelled");
				await cleanup(tempDir);
				process.exit(0);
			}
			installMode = modeChoice;
		} else if (uniqueDirs.size <= 1 || allEve) installMode = "copy";
		const cwd = process.cwd();
		const summaryLines = [];
		const overwriteChecks = await Promise.all(selectedSkills.flatMap((skill) => installTargets.map(async (target) => ({
			skillName: skill.name,
			target,
			installed: await isSkillInstalled(skill.name, target.agent, {
				global: installGlobally,
				eveSubagent: target.subagent
			})
		}))));
		const overwriteStatus = /* @__PURE__ */ new Map();
		for (const { skillName, target, installed } of overwriteChecks) {
			if (!overwriteStatus.has(skillName)) overwriteStatus.set(skillName, /* @__PURE__ */ new Map());
			overwriteStatus.get(skillName).set(targetKey(target), installed);
		}
		const groupedSummary = {};
		const ungroupedSummary = [];
		for (const skill of selectedSkills) if (skill.pluginName) {
			const group = skill.pluginName;
			if (!groupedSummary[group]) groupedSummary[group] = [];
			groupedSummary[group].push(skill);
		} else ungroupedSummary.push(skill);
		const printSkillSummary = (skills) => {
			for (const skill of skills) {
				if (summaryLines.length > 0) summaryLines.push("");
				const shortCanonical = shortenPath$2(installTargets.length === 1 ? getCanonicalPath(skill.name, {
					global: installGlobally,
					agent: installTargets[0].agent,
					eveSubagent: installTargets[0].subagent
				}) : getCanonicalPath(skill.name, { global: installGlobally }), cwd);
				summaryLines.push(`${import_picocolors.default.cyan(shortCanonical)}`);
				summaryLines.push(...buildTargetSummaryLines(installTargets, installMode));
				const skillOverwrites = overwriteStatus.get(skill.name);
				const overwriteAgents = installTargets.filter((t) => skillOverwrites?.get(targetKey(t))).map(targetDisplayName);
				if (overwriteAgents.length > 0) summaryLines.push(`  ${import_picocolors.default.yellow("overwrites:")} ${formatList$1(overwriteAgents)}`);
			}
		};
		const sortedGroups = Object.keys(groupedSummary).sort();
		for (const group of sortedGroups) {
			const title = group.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
			summaryLines.push("");
			summaryLines.push(import_picocolors.default.bold(title));
			printSkillSummary(groupedSummary[group]);
		}
		if (ungroupedSummary.length > 0) {
			if (sortedGroups.length > 0) {
				summaryLines.push("");
				summaryLines.push(import_picocolors.default.bold("General"));
			}
			printSkillSummary(ungroupedSummary);
		}
		console.log();
		note(summaryLines.join("\n"), "Installation Summary");
		try {
			const auditData = await auditPromise;
			if (auditData && ownerRepoForAudit) {
				const securityLines = buildSecurityLines(auditData, selectedSkills.map((s) => ({
					slug: getSkillDisplayName(s),
					displayName: getSkillDisplayName(s)
				})), ownerRepoForAudit);
				if (securityLines.length > 0) note(securityLines.join("\n"), "Security Risk Assessments");
			}
		} catch {}
		if (!options.yes) {
			const confirmed = await confirm({ message: "Proceed with installation?" });
			if (isCancel(confirmed) || !confirmed) {
				cancel("Installation cancelled");
				await cleanup(tempDir);
				process.exit(0);
			}
		}
		spinner$3.start("Installing skills…");
		const results = [];
		for (const skill of selectedSkills) for (const target of installTargets) {
			const { agent, subagent } = target;
			let result;
			if (blobResult && "files" in skill) {
				const blobSkill = skill;
				result = await installBlobSkillForAgent({
					installName: blobSkill.name,
					files: blobSkill.files
				}, agent, {
					global: installGlobally,
					mode: installMode,
					eveSubagent: subagent
				});
			} else result = await installSkillForAgent(skill, agent, {
				global: installGlobally,
				mode: installMode,
				eveSubagent: subagent
			});
			results.push({
				skill: getSkillDisplayName(skill),
				agent: targetDisplayName(target),
				pluginName: skill.pluginName,
				...result
			});
		}
		spinner$3.stop("Installation complete");
		console.log();
		const successful = results.filter((r) => r.success);
		const failed = results.filter((r) => !r.success);
		const skillFiles = {};
		for (const skill of selectedSkills) if (blobResult && "repoPath" in skill) skillFiles[skill.name] = skill.repoPath;
		else if (tempDir && skill.path === tempDir) skillFiles[skill.name] = "SKILL.md";
		else if (tempDir && skill.path.startsWith(tempDir + sep)) skillFiles[skill.name] = skill.path.slice(tempDir.length + 1).split(sep).join("/") + "/SKILL.md";
		else continue;
		const normalizedSource = directDownload ? null : getOwnerRepo(parsed);
		const lockSource = directDownload ? null : getLockSource(parsed.url, normalizedSource);
		const projectLockSourceUrl = directDownload ? void 0 : getProjectLockSourceUrl(parsed.type, parsed.url);
		if (normalizedSource) if (parseOwnerRepo(normalizedSource)) {
			if (await repoPrivacyPromise === false) track({
				event: "install",
				source: normalizedSource,
				skills: selectedSkills.map((s) => s.name).join(","),
				agents: targetAgents.join(","),
				...installGlobally && { global: "1" },
				skillFiles: JSON.stringify(skillFiles),
				metadata: options.metadata
			});
		} else track({
			event: "install",
			source: normalizedSource,
			skills: selectedSkills.map((s) => s.name).join(","),
			agents: targetAgents.join(","),
			...installGlobally && { global: "1" },
			skillFiles: JSON.stringify(skillFiles),
			metadata: options.metadata
		});
		if (successful.length > 0 && installGlobally && normalizedSource) {
			const successfulSkillNames = new Set(successful.map((r) => r.skill));
			let cachedTree;
			if (parsed.type === "github" && !blobResult) cachedTree = await fetchRepoTree(normalizedSource, parsed.ref, getGitHubToken);
			for (const skill of selectedSkills) {
				const skillDisplayName = getSkillDisplayName(skill);
				if (successfulSkillNames.has(skillDisplayName)) try {
					let skillFolderHash = "";
					const skillPathValue = skillFiles[skill.name];
					if (blobResult && skillPathValue) {
						const hash = getSkillFolderHashFromTree(blobResult.tree, skillPathValue);
						if (hash) skillFolderHash = hash;
					} else if (parsed.type === "github" && skillPathValue && cachedTree) {
						const hash = getSkillFolderHashFromTree(cachedTree, skillPathValue);
						if (hash) skillFolderHash = hash;
					} else if (skillPathValue && tempDir) {
						const hash = await computeSkillFolderHash(join(tempDir, dirname(skillPathValue)));
						if (hash) skillFolderHash = hash;
					}
					await addSkillToLock(skill.name, {
						source: lockSource || normalizedSource,
						sourceType: parsed.type,
						sourceUrl: parsed.url,
						ref: parsed.ref,
						skillPath: skillPathValue,
						skillFolderHash,
						pluginName: skill.pluginName
					});
				} catch {}
			}
		}
		if (successful.length > 0 && !installGlobally && !directDownload) {
			const successfulSkillNames = new Set(successful.map((r) => r.skill));
			const eveSubagents = targetAgents.includes("eve") ? eveSubagentTargets.map((s) => s ?? "") : void 0;
			const recordSubagents = eveSubagents && (eveSubagents.length > 1 || eveSubagents.some((s) => s !== ""));
			for (const skill of selectedSkills) {
				const skillDisplayName = getSkillDisplayName(skill);
				if (successfulSkillNames.has(skillDisplayName)) try {
					const computedHash = blobResult && "snapshotHash" in skill ? skill.snapshotHash : await computeSkillFolderHash(skill.path);
					const skillPathValue = skillFiles[skill.name];
					await addSkillToLocalLock(skill.name, {
						source: lockSource || parsed.url,
						...projectLockSourceUrl && { sourceUrl: projectLockSourceUrl },
						ref: parsed.ref,
						sourceType: parsed.type,
						...skillPathValue && { skillPath: skillPathValue },
						computedHash,
						...recordSubagents && { subagents: eveSubagents }
					}, cwd);
				} catch {}
			}
		}
		if (successful.length > 0) {
			const bySkill = /* @__PURE__ */ new Map();
			const groupedResults = {};
			const ungroupedResults = [];
			for (const r of successful) {
				const skillResults = bySkill.get(r.skill) || [];
				skillResults.push(r);
				bySkill.set(r.skill, skillResults);
				if (skillResults.length === 1) if (r.pluginName) {
					const group = r.pluginName;
					if (!groupedResults[group]) groupedResults[group] = [];
					groupedResults[group].push(r);
				} else ungroupedResults.push(r);
			}
			const skillCount = bySkill.size;
			const symlinkFailures = successful.filter((r) => r.mode === "symlink" && r.symlinkFailed);
			const copiedAgents = symlinkFailures.map((r) => r.agent);
			const resultLines = [];
			const printSkillResults = (entries) => {
				for (const entry of entries) {
					const skillResults = bySkill.get(entry.skill) || [];
					const firstResult = skillResults[0];
					if (firstResult.mode === "copy") {
						resultLines.push(`${import_picocolors.default.green("✓")} ${entry.skill} ${import_picocolors.default.dim("(copied)")}`);
						const shortPathsSet = /* @__PURE__ */ new Set();
						for (const r of skillResults) {
							const shortPath = shortenPath$2(r.path, cwd);
							if (!shortPathsSet.has(shortPath)) {
								shortPathsSet.add(shortPath);
								resultLines.push(`  ${import_picocolors.default.dim("→")} ${shortPath}`);
							}
						}
					} else {
						if (firstResult.canonicalPath) {
							const shortPath = shortenPath$2(firstResult.canonicalPath, cwd);
							resultLines.push(`${import_picocolors.default.green("✓")} ${shortPath}`);
						} else resultLines.push(`${import_picocolors.default.green("✓")} ${entry.skill}`);
						resultLines.push(...buildResultLines(skillResults, targetAgents));
					}
				}
			};
			const sortedResultGroups = Object.keys(groupedResults).sort();
			for (const group of sortedResultGroups) {
				const title = group.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
				resultLines.push("");
				resultLines.push(import_picocolors.default.bold(title));
				printSkillResults(groupedResults[group]);
			}
			if (ungroupedResults.length > 0) {
				if (sortedResultGroups.length > 0) {
					resultLines.push("");
					resultLines.push(import_picocolors.default.bold("General"));
				}
				printSkillResults(ungroupedResults);
			}
			const title = import_picocolors.default.green(`Installed ${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
			note(resultLines.join("\n"), title);
			if (symlinkFailures.length > 0) {
				log.warn(import_picocolors.default.yellow(`Symlinks failed for: ${formatList$1(copiedAgents)}`));
				log.message(import_picocolors.default.dim("  Files were copied instead. On Windows, enable Developer Mode for symlink support."));
			}
		}
		if (failed.length > 0) {
			console.log();
			log.error(import_picocolors.default.red(`Failed to install ${failed.length}`));
			for (const r of failed) log.message(`  ${import_picocolors.default.red("✗")} ${r.skill} → ${r.agent}: ${import_picocolors.default.dim(r.error)}`);
		}
		console.log();
		outro(import_picocolors.default.green("Done!") + import_picocolors.default.dim("  Review skills before use; they run with full agent permissions."));
		await promptForFindSkills(options, targetAgents);
	} catch (error) {
		if (error instanceof GitCloneError) {
			log.error(import_picocolors.default.red("Failed to clone repository"));
			for (const line of error.message.split("\n")) log.message(import_picocolors.default.dim(line));
		} else log.error(error instanceof Error ? error.message : "Unknown error occurred");
		showInstallTip();
		outro(import_picocolors.default.red("Installation failed"));
		process.exit(1);
	} finally {
		await cleanup(tempDir);
	}
}
async function cleanup(tempDir) {
	if (tempDir) try {
		await cleanupTempDir(tempDir);
	} catch {}
}
async function promptForFindSkills(options, targetAgents) {
	if (!process.stdin.isTTY) return;
	if (options?.yes) return;
	try {
		if (await isPromptDismissed("findSkillsPrompt")) return;
		if (await isSkillInstalled("find-skills", "claude-code", { global: true })) {
			await dismissPrompt("findSkillsPrompt");
			return;
		}
		console.log();
		log.message(import_picocolors.default.dim("One-time prompt - you won't be asked again if you dismiss."));
		const install = await confirm({ message: `Install the ${import_picocolors.default.cyan("find-skills")} skill? It helps your agent discover and suggest skills.` });
		if (isCancel(install)) {
			await dismissPrompt("findSkillsPrompt");
			return;
		}
		if (install) {
			await dismissPrompt("findSkillsPrompt");
			const findSkillsAgents = targetAgents?.filter((a) => a !== "replit");
			if (!findSkillsAgents || findSkillsAgents.length === 0) return;
			console.log();
			log.step("Installing find-skills skill…");
			try {
				await runAdd(["vercel-labs/skills"], {
					skill: ["find-skills"],
					global: true,
					yes: true,
					agent: findSkillsAgents
				});
			} catch {
				log.warn("Failed to install find-skills. You can try again with:");
				log.message(import_picocolors.default.dim("  npx skills add vercel-labs/skills@find-skills -g -y --all"));
			}
		} else {
			await dismissPrompt("findSkillsPrompt");
			log.message(import_picocolors.default.dim("You can install it later with: npx skills add vercel-labs/skills@find-skills"));
		}
	} catch {}
}
function parseAddOptions(args) {
	const options = {};
	const source = [];
	const errors = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-g" || arg === "--global") options.global = true;
		else if (arg === "-y" || arg === "--yes") options.yes = true;
		else if (arg === "-l" || arg === "--list") options.list = true;
		else if (arg === "--all") options.all = true;
		else if (arg === "-a" || arg === "--agent") {
			options.agent = options.agent || [];
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.agent.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg === "-s" || arg === "--skill") {
			options.skill = options.skill || [];
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.skill.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg === "--metadata") {
			const metadata = args[++i];
			if (metadata === void 0) errors.push("--metadata requires a JSON value");
			else try {
				JSON.parse(metadata);
				options.metadata = metadata;
			} catch {
				errors.push("--metadata must be valid JSON");
			}
		} else if (arg === "--full-depth") options.fullDepth = true;
		else if (arg === "--copy") options.copy = true;
		else if (arg === "--subagent") {
			options.subagent = options.subagent || [];
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.subagent.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg && !arg.startsWith("-")) source.push(arg);
	}
	return {
		source,
		options,
		errors
	};
}
const RESET$3 = "\x1B[0m";
const BOLD$3 = "\x1B[1m";
const DIM$3 = "\x1B[38;5;102m";
const TEXT$2 = "\x1B[38;5;145m";
const CYAN$1 = "\x1B[36m";
const SEARCH_API_BASE = process.env.SKILLS_API_URL || "https://skills.sh";
const SEARCH_RESULT_LIMIT = "20";
function formatInstalls(count) {
	if (!count || count <= 0) return "";
	if (count >= 1e6) return `${(count / 1e6).toFixed(1).replace(/\.0$/, "")}M installs`;
	if (count >= 1e3) return `${(count / 1e3).toFixed(1).replace(/\.0$/, "")}K installs`;
	return `${count} install${count === 1 ? "" : "s"}`;
}
const GITHUB_OWNER_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38})$/i;
function parseFindOptions(args) {
	const queryParts = [];
	const options = {};
	const errors = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg) continue;
		let ownerValue;
		if (arg === "--owner") {
			const value = args[i + 1];
			if (!value || value.startsWith("-")) {
				errors.push("--owner requires a GitHub owner");
				continue;
			}
			ownerValue = value;
			i++;
		} else if (arg.startsWith("--owner=")) {
			ownerValue = arg.slice(8);
			if (!ownerValue) {
				errors.push("--owner requires a GitHub owner");
				continue;
			}
		} else {
			queryParts.push(arg);
			continue;
		}
		const owner = ownerValue.trim().toLowerCase();
		if (!GITHUB_OWNER_PATTERN.test(owner)) {
			errors.push("--owner must be a valid GitHub owner");
			continue;
		}
		options.owner = owner;
	}
	return {
		query: queryParts.join(" "),
		options,
		errors
	};
}
async function searchSkillsAPI(query, owner) {
	try {
		const params = new URLSearchParams({
			q: query,
			limit: SEARCH_RESULT_LIMIT
		});
		if (owner) params.set("owner", owner);
		const url = `${SEARCH_API_BASE}/api/search?${params.toString()}`;
		const res = await fetch(url);
		if (!res.ok) return [];
		return (await res.json()).skills.map((skill) => ({
			name: sanitizeMetadata(skill.name),
			slug: sanitizeMetadata(skill.id),
			source: sanitizeMetadata(skill.source || ""),
			installs: skill.installs
		})).sort((a, b) => (b.installs || 0) - (a.installs || 0));
	} catch {
		return [];
	}
}
const HIDE_CURSOR = "\x1B[?25l";
const SHOW_CURSOR = "\x1B[?25h";
const CLEAR_DOWN = "\x1B[J";
const MOVE_UP = (n) => `\x1b[${n}A`;
const MOVE_TO_COL = (n) => `\x1b[${n}G`;
async function runSearchPrompt(initialQuery = "", owner) {
	let results = [];
	let selectedIndex = 0;
	let query = initialQuery;
	let loading = false;
	let debounceTimer = null;
	let lastRenderedLines = 0;
	if (process.stdin.isTTY) process.stdin.setRawMode(true);
	readline.emitKeypressEvents(process.stdin);
	process.stdin.resume();
	process.stdout.write(HIDE_CURSOR);
	function render() {
		if (lastRenderedLines > 0) process.stdout.write(MOVE_UP(lastRenderedLines) + MOVE_TO_COL(1));
		process.stdout.write(CLEAR_DOWN);
		const lines = [];
		const cursor = `${BOLD$3}_${RESET$3}`;
		lines.push(`${TEXT$2}Search skills:${RESET$3} ${query}${cursor}`);
		lines.push("");
		if (!query || query.length < 2) lines.push(`${DIM$3}Start typing to search (min 2 chars)${RESET$3}`);
		else if (results.length === 0 && loading) lines.push(`${DIM$3}Searching…${RESET$3}`);
		else if (results.length === 0) lines.push(`${DIM$3}No skills found${RESET$3}`);
		else {
			const visible = results.slice(0, 8);
			for (let i = 0; i < visible.length; i++) {
				const skill = visible[i];
				const isSelected = i === selectedIndex;
				const arrow = isSelected ? `${BOLD$3}>${RESET$3}` : " ";
				const name = isSelected ? `${BOLD$3}${skill.name}${RESET$3}` : `${TEXT$2}${skill.name}${RESET$3}`;
				const source = skill.source ? ` ${DIM$3}${skill.source}${RESET$3}` : "";
				const installs = formatInstalls(skill.installs);
				const installsBadge = installs ? ` ${CYAN$1}${installs}${RESET$3}` : "";
				const loadingIndicator = loading && i === 0 ? ` ${DIM$3}…${RESET$3}` : "";
				lines.push(`  ${arrow} ${name}${source}${installsBadge}${loadingIndicator}`);
			}
		}
		lines.push("");
		lines.push(`${DIM$3}up/down navigate | enter select | esc cancel${RESET$3}`);
		for (const line of lines) process.stdout.write(line + "\n");
		lastRenderedLines = lines.length;
	}
	function triggerSearch(q) {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
		loading = false;
		if (!q || q.length < 2) {
			results = [];
			selectedIndex = 0;
			render();
			return;
		}
		loading = true;
		render();
		const debounceMs = Math.max(150, 350 - q.length * 50);
		debounceTimer = setTimeout(async () => {
			try {
				results = await searchSkillsAPI(q, owner);
				selectedIndex = 0;
			} catch {
				results = [];
			} finally {
				loading = false;
				debounceTimer = null;
				render();
			}
		}, debounceMs);
	}
	if (initialQuery) triggerSearch(initialQuery);
	render();
	return new Promise((resolve) => {
		function cleanup() {
			process.stdin.removeListener("keypress", handleKeypress);
			if (process.stdin.isTTY) process.stdin.setRawMode(false);
			process.stdout.write(SHOW_CURSOR);
			process.stdin.pause();
		}
		function handleKeypress(_ch, key) {
			if (!key) return;
			if (key.name === "escape" || key.ctrl && key.name === "c") {
				cleanup();
				resolve(null);
				return;
			}
			if (key.name === "return") {
				cleanup();
				resolve(results[selectedIndex] || null);
				return;
			}
			if (key.name === "up") {
				selectedIndex = Math.max(0, selectedIndex - 1);
				render();
				return;
			}
			if (key.name === "down") {
				selectedIndex = Math.min(Math.max(0, results.length - 1), selectedIndex + 1);
				render();
				return;
			}
			if (key.name === "backspace") {
				if (query.length > 0) {
					query = query.slice(0, -1);
					triggerSearch(query);
				}
				return;
			}
			if (key.sequence && !key.ctrl && !key.meta && key.sequence.length === 1) {
				const char = key.sequence;
				if (char >= " " && char <= "~") {
					query += char;
					triggerSearch(query);
				}
			}
		}
		process.stdin.on("keypress", handleKeypress);
	});
}
function getOwnerRepoFromString(pkg) {
	const atIndex = pkg.lastIndexOf("@");
	const match = (atIndex > 0 ? pkg.slice(0, atIndex) : pkg).match(/^([^/]+)\/([^/]+)$/);
	if (match) return {
		owner: match[1],
		repo: match[2]
	};
	return null;
}
async function isRepoPublic(owner, repo) {
	return await isRepoPrivate(owner, repo) === false;
}
async function runFind(args) {
	const { query, options: findOptions, errors } = parseFindOptions(args);
	const owner = findOptions.owner;
	const isNonInteractive = !process.stdin.isTTY;
	const agentTip = `${DIM$3}Tip: if running in a coding agent, follow these steps:${RESET$3}
${DIM$3}  1) npx skills find [query] [--owner <owner>]${RESET$3}
${DIM$3}  2) npx skills add <owner/repo@skill>${RESET$3}`;
	if (errors.length > 0) {
		for (const error of errors) console.error(error);
		console.error("Usage: npx skills find <query> [--owner <owner>]");
		return;
	}
	if (query) {
		const results = await searchSkillsAPI(query, owner);
		track({
			event: "find",
			query,
			resultCount: String(results.length)
		});
		if (results.length === 0) {
			const ownerSuffix = owner ? ` from owner "${owner}"` : "";
			console.log(`${DIM$3}No skills found for "${query}"${ownerSuffix}${RESET$3}`);
			return;
		}
		console.log(`${DIM$3}Install with${RESET$3} npx skills add <owner/repo@skill>`);
		console.log();
		for (const skill of results) {
			const pkg = skill.source || skill.slug;
			const installs = formatInstalls(skill.installs);
			console.log(`${TEXT$2}${pkg}@${skill.name}${RESET$3}${installs ? ` ${CYAN$1}${installs}${RESET$3}` : ""}`);
			console.log(`${DIM$3}└ https://skills.sh/${skill.slug}${RESET$3}`);
			console.log();
		}
		return;
	}
	if (isNonInteractive || await isRunningInAgent()) {
		console.log(agentTip);
		console.log();
		console.log(`${DIM$3}Usage: npx skills find <query> [--owner <owner>]${RESET$3}`);
		return;
	}
	const selected = await runSearchPrompt("", owner);
	track({
		event: "find",
		query: "",
		resultCount: selected ? "1" : "0",
		interactive: "1"
	});
	if (!selected) {
		console.log(`${DIM$3}Search cancelled${RESET$3}`);
		console.log();
		return;
	}
	const pkg = selected.source || selected.slug;
	const skillName = selected.name;
	console.log();
	console.log(`${TEXT$2}Installing ${BOLD$3}${skillName}${RESET$3} from ${DIM$3}${pkg}${RESET$3}…`);
	console.log();
	const { source, options: addOptions } = parseAddOptions([
		pkg,
		"--skill",
		skillName
	]);
	await runAdd(source, addOptions);
	console.log();
	const info = getOwnerRepoFromString(pkg);
	if (info && await isRepoPublic(info.owner, info.repo)) console.log(`${DIM$3}View the skill at${RESET$3} ${TEXT$2}https://skills.sh/${selected.slug}${RESET$3}`);
	else console.log(`${DIM$3}Discover more skills at${RESET$3} ${TEXT$2}https://skills.sh${RESET$3}`);
	console.log();
}
const isCancelled = (value) => typeof value === "symbol";
function shortenPath$1(fullPath, cwd) {
	const home = homedir();
	if (fullPath === home || fullPath.startsWith(home + sep)) return "~" + fullPath.slice(home.length);
	if (fullPath === cwd || fullPath.startsWith(cwd + sep)) return "." + fullPath.slice(cwd.length);
	return fullPath;
}
async function discoverNodeModuleSkills(cwd) {
	const nodeModulesDir = join(cwd, "node_modules");
	const skills = [];
	let topNames;
	try {
		topNames = await readdir(nodeModulesDir);
	} catch {
		return skills;
	}
	const processPackageDir = async (pkgDir, packageName) => {
		const rootSkill = await parseSkillMd(join(pkgDir, "SKILL.md"));
		if (rootSkill) {
			skills.push({
				...rootSkill,
				packageName
			});
			return;
		}
		const searchDirs = [
			pkgDir,
			join(pkgDir, "skills"),
			join(pkgDir, ".agents", "skills")
		];
		for (const searchDir of searchDirs) try {
			const entries = await readdir(searchDir);
			for (const name of entries) {
				const skillDir = join(searchDir, name);
				try {
					if (!(await stat(skillDir)).isDirectory()) continue;
				} catch {
					continue;
				}
				const skill = await parseSkillMd(join(skillDir, "SKILL.md"));
				if (skill) skills.push({
					...skill,
					packageName
				});
			}
		} catch {}
	};
	await Promise.all(topNames.map(async (name) => {
		if (name.startsWith(".")) return;
		const fullPath = join(nodeModulesDir, name);
		try {
			if (!(await stat(fullPath)).isDirectory()) return;
		} catch {
			return;
		}
		if (name.startsWith("@")) try {
			const scopeNames = await readdir(fullPath);
			await Promise.all(scopeNames.map(async (scopedName) => {
				const scopedPath = join(fullPath, scopedName);
				try {
					if (!(await stat(scopedPath)).isDirectory()) return;
				} catch {
					return;
				}
				await processPackageDir(scopedPath, `${name}/${scopedName}`);
			}));
		} catch {}
		else await processPackageDir(fullPath, name);
	}));
	return skills;
}
async function runSync(args, options = {}) {
	const cwd = process.cwd();
	const agentResult = await detectAgent();
	if (agentResult.isAgent) {
		options.yes = true;
		if (!options.agent || options.agent.length === 0) {
			const mappedAgent = getAgentType(agentResult.agent.name);
			if (mappedAgent) {
				const agentList = [mappedAgent];
				for (const ua of getUniversalAgents()) if (!agentList.includes(ua)) agentList.push(ua);
				options.agent = agentList;
			}
		}
	}
	console.log();
	if (!agentResult.isAgent) intro(import_picocolors.default.bgCyan(import_picocolors.default.black(" skills experimental_sync ")));
	if (agentResult.isAgent) log.info(import_picocolors.default.bgCyan(import_picocolors.default.black(import_picocolors.default.bold(` ${agentResult.agent.name} `))) + " Agent detected — installing non-interactively");
	const spinner$2 = spinner();
	spinner$2.start("Scanning node_modules for skills…");
	const discoveredSkills = await discoverNodeModuleSkills(cwd);
	if (discoveredSkills.length === 0) {
		spinner$2.stop(import_picocolors.default.yellow("No skills found"));
		outro(import_picocolors.default.dim("No SKILL.md files found in node_modules."));
		return;
	}
	spinner$2.stop(`Found ${import_picocolors.default.green(String(discoveredSkills.length))} skill${discoveredSkills.length > 1 ? "s" : ""} in node_modules`);
	for (const skill of discoveredSkills) {
		log.info(`${import_picocolors.default.cyan(skill.name)} ${import_picocolors.default.dim(`from ${skill.packageName}`)}`);
		if (skill.description) log.message(import_picocolors.default.dim(`  ${skill.description}`));
	}
	const localLock = await readLocalLock(cwd);
	const toInstall = [];
	const upToDate = [];
	if (options.force) {
		toInstall.push(...discoveredSkills);
		log.info(import_picocolors.default.dim("Force mode: reinstalling all skills"));
	} else {
		for (const skill of discoveredSkills) {
			const existingEntry = localLock.skills[skill.name];
			if (existingEntry) {
				if (await computeSkillFolderHash(skill.path) === existingEntry.computedHash) {
					upToDate.push(skill.name);
					continue;
				}
			}
			toInstall.push(skill);
		}
		if (upToDate.length > 0) log.info(import_picocolors.default.dim(`${upToDate.length} skill${upToDate.length !== 1 ? "s" : ""} already up to date`));
		if (toInstall.length === 0) {
			console.log();
			outro(import_picocolors.default.green("All skills are up to date."));
			return;
		}
	}
	log.info(`${toInstall.length} skill${toInstall.length !== 1 ? "s" : ""} to install/update`);
	let targetAgents;
	const validAgents = Object.keys(agents);
	const universalAgents = getUniversalAgents();
	const visibleUniversalAgents = getVisibleUniversalAgents();
	if (options.agent?.includes("*")) {
		targetAgents = validAgents;
		log.info(`Installing to all ${targetAgents.length} agents`);
	} else if (options.agent && options.agent.length > 0) {
		const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
		if (invalidAgents.length > 0) {
			log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
			log.info(`Valid agents: ${validAgents.join(", ")}`);
			process.exit(1);
		}
		targetAgents = options.agent;
	} else {
		spinner$2.start("Loading agents…");
		const installedAgents = await detectInstalledAgents();
		const totalAgents = Object.keys(agents).length;
		spinner$2.stop(`${totalAgents} agents`);
		if (installedAgents.length === 0) if (options.yes) {
			targetAgents = universalAgents;
			log.info("Installing to universal agents");
		} else {
			const selected = await searchMultiselect({
				message: "Which agents do you want to install to?",
				items: getNonUniversalAgents().map((a) => ({
					value: a,
					label: agents[a].displayName,
					hint: agents[a].skillsDir
				})),
				initialSelected: [],
				lockedSection: {
					title: "Universal (.agents/skills)",
					items: visibleUniversalAgents.map((a) => ({
						value: a,
						label: agents[a].displayName
					})),
					hiddenCount: universalAgents.length - visibleUniversalAgents.length
				}
			});
			if (isCancelled(selected)) {
				cancel("Sync cancelled");
				process.exit(0);
			}
			targetAgents = selected;
		}
		else if (installedAgents.length === 1 || options.yes) {
			targetAgents = [...installedAgents];
			for (const ua of universalAgents) if (!targetAgents.includes(ua)) targetAgents.push(ua);
		} else {
			const selected = await searchMultiselect({
				message: "Which agents do you want to install to?",
				items: getNonUniversalAgents().filter((a) => installedAgents.includes(a)).map((a) => ({
					value: a,
					label: agents[a].displayName,
					hint: agents[a].skillsDir
				})),
				initialSelected: installedAgents.filter((a) => !universalAgents.includes(a)),
				lockedSection: {
					title: "Universal (.agents/skills)",
					items: visibleUniversalAgents.map((a) => ({
						value: a,
						label: agents[a].displayName
					})),
					hiddenCount: universalAgents.length - visibleUniversalAgents.length
				}
			});
			if (isCancelled(selected)) {
				cancel("Sync cancelled");
				process.exit(0);
			}
			targetAgents = selected;
		}
	}
	const summaryLines = [];
	for (const skill of toInstall) {
		const shortCanonical = shortenPath$1(getCanonicalPath(skill.name, { global: false }), cwd);
		summaryLines.push(`${import_picocolors.default.cyan(skill.name)} ${import_picocolors.default.dim(`← ${skill.packageName}`)}`);
		summaryLines.push(`  ${import_picocolors.default.dim(shortCanonical)}`);
	}
	console.log();
	note(summaryLines.join("\n"), "Sync Summary");
	if (!options.yes) {
		const confirmed = await confirm({ message: "Proceed with sync?" });
		if (isCancel(confirmed) || !confirmed) {
			cancel("Sync cancelled");
			process.exit(0);
		}
	}
	spinner$2.start("Syncing skills…");
	const results = [];
	for (const skill of toInstall) for (const agent of targetAgents) {
		const result = await installSkillForAgent(skill, agent, {
			global: false,
			cwd,
			mode: "symlink"
		});
		results.push({
			skill: skill.name,
			packageName: skill.packageName,
			agent: agents[agent].displayName,
			success: result.success,
			path: result.path,
			canonicalPath: result.canonicalPath,
			error: result.error
		});
	}
	spinner$2.stop("Sync complete");
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);
	const successfulSkillNames = new Set(successful.map((r) => r.skill));
	for (const skill of toInstall) if (successfulSkillNames.has(skill.name)) try {
		const computedHash = await computeSkillFolderHash(skill.path);
		await addSkillToLocalLock(skill.name, {
			source: skill.packageName,
			sourceType: "node_modules",
			computedHash
		}, cwd);
	} catch {}
	console.log();
	if (successful.length > 0) {
		const bySkill = /* @__PURE__ */ new Map();
		for (const r of successful) {
			const skillResults = bySkill.get(r.skill) || [];
			skillResults.push(r);
			bySkill.set(r.skill, skillResults);
		}
		const resultLines = [];
		for (const [skillName, skillResults] of bySkill) {
			const firstResult = skillResults[0];
			const pkg = toInstall.find((s) => s.name === skillName)?.packageName;
			if (firstResult.canonicalPath) {
				const shortPath = shortenPath$1(firstResult.canonicalPath, cwd);
				resultLines.push(`${import_picocolors.default.green("✓")} ${skillName} ${import_picocolors.default.dim(`← ${pkg}`)}`);
				resultLines.push(`  ${import_picocolors.default.dim(shortPath)}`);
			} else resultLines.push(`${import_picocolors.default.green("✓")} ${skillName} ${import_picocolors.default.dim(`← ${pkg}`)}`);
		}
		const skillCount = bySkill.size;
		const title = import_picocolors.default.green(`Synced ${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
		note(resultLines.join("\n"), title);
	}
	if (failed.length > 0) {
		console.log();
		log.error(import_picocolors.default.red(`Failed to install ${failed.length}`));
		for (const r of failed) log.message(`  ${import_picocolors.default.red("✗")} ${r.skill} → ${r.agent}: ${import_picocolors.default.dim(r.error)}`);
	}
	track({
		event: "experimental_sync",
		skillCount: String(toInstall.length),
		successCount: String(successfulSkillNames.size),
		agents: targetAgents.join(",")
	});
	console.log();
	outro(import_picocolors.default.green("Done!") + import_picocolors.default.dim("  Review skills before use; they run with full agent permissions."));
}
function parseSyncOptions(args) {
	const options = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-y" || arg === "--yes") options.yes = true;
		else if (arg === "-f" || arg === "--force") options.force = true;
		else if (arg === "-a" || arg === "--agent") {
			options.agent = options.agent || [];
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.agent.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		}
	}
	return { options };
}
function formatSourceInput(sourceUrl, ref) {
	if (!ref) return sourceUrl;
	return `${sourceUrl}#${ref}`;
}
function deriveSkillFolder(skillPath) {
	let folder = skillPath;
	if (folder.endsWith("/SKILL.md")) folder = folder.slice(0, -9);
	else if (folder.endsWith("SKILL.md")) folder = folder.slice(0, -8);
	if (folder.endsWith("/")) folder = folder.slice(0, -1);
	return folder;
}
function supportsAppendedSubpath(source) {
	if (source.startsWith("git@") || source.startsWith("ssh://")) return false;
	if (source.endsWith(".git")) return false;
	if (source.startsWith("http://") || source.startsWith("https://")) try {
		const host = new URL(source).hostname;
		return host === "github.com" || host === "gitlab.com";
	} catch {
		return false;
	}
	return true;
}
function isBareShorthand(source) {
	return !source.includes(":") && !source.startsWith(".") && !source.startsWith("/");
}
function getLocalSource(entry) {
	if (entry.sourceUrl) return entry.sourceUrl;
	if ((entry.sourceType === "git" || entry.sourceType === "gitlab") && isBareShorthand(entry.source)) return null;
	return entry.source;
}
function buildLocalCloneSource(entry) {
	const source = getLocalSource(entry);
	if (!source) return null;
	if (entry.sourceType === "github" && isBareShorthand(source)) return `https://github.com/${source.replace(/\.git$/, "")}.git`;
	return source;
}
function shouldUseFullDepthForUpdate(entry) {
	if (!entry.skillPath) return false;
	const source = entry.sourceType && entry.sourceType !== "github" ? getLocalSource(entry) : entry.source;
	return source !== null && !supportsAppendedSubpath(source);
}
function appendFolderAndRef(source, skillPath, ref) {
	if (!supportsAppendedSubpath(source)) return formatSourceInput(source, ref);
	const folder = deriveSkillFolder(skillPath);
	const withFolder = folder ? `${source}/${folder}` : source;
	return ref ? `${withFolder}#${ref}` : withFolder;
}
function buildUpdateInstallSource(entry) {
	if (!entry.skillPath) {
		const source = entry.sourceType && entry.sourceType !== "github" ? getLocalSource(entry) : entry.sourceUrl || entry.source;
		if (!source) return null;
		return formatSourceInput(source, entry.ref);
	}
	const source = entry.sourceType && entry.sourceType !== "github" ? getLocalSource(entry) : entry.source;
	if (!source) return null;
	return appendFolderAndRef(source, entry.skillPath, entry.ref);
}
function buildLocalUpdateSource(entry) {
	const source = getLocalSource(entry);
	if (!source) return null;
	if (!entry.skillPath) return formatSourceInput(source, entry.ref);
	return appendFolderAndRef(source, entry.skillPath, entry.ref);
}
async function runInstallFromLock(args) {
	const lock = await readLocalLock(process.cwd());
	const skillEntries = Object.entries(lock.skills);
	if (skillEntries.length === 0) {
		log.warn("No project skills found in skills-lock.json");
		log.info(`Add project-level skills with ${import_picocolors.default.cyan("npx skills add <package>")} (without ${import_picocolors.default.cyan("-g")})`);
		return;
	}
	const universalAgentNames = getUniversalAgents();
	const nodeModuleSkills = [];
	const bySource = /* @__PURE__ */ new Map();
	for (const [skillName, entry] of skillEntries) {
		if (entry.sourceType === "node_modules") {
			nodeModuleSkills.push(skillName);
			continue;
		}
		const installSource = buildLocalUpdateSource(entry);
		if (!installSource) {
			log.error(`Cannot restore ${import_picocolors.default.cyan(skillName)}: skills-lock.json is missing sourceUrl for this generic Git source`);
			continue;
		}
		const existing = bySource.get(installSource);
		if (existing) existing.skills.push(skillName);
		else bySource.set(installSource, {
			sourceType: entry.sourceType,
			skills: [skillName]
		});
	}
	const remoteCount = skillEntries.length - nodeModuleSkills.length;
	if (remoteCount > 0) log.info(`Restoring ${import_picocolors.default.cyan(String(remoteCount))} skill${remoteCount !== 1 ? "s" : ""} from skills-lock.json into ${import_picocolors.default.dim(".agents/skills/")}`);
	for (const [source, { skills }] of bySource) try {
		await runAdd([source], {
			skill: skills,
			agent: universalAgentNames,
			yes: true
		});
	} catch (error) {
		log.error(`Failed to install from ${import_picocolors.default.cyan(source)}: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
	if (nodeModuleSkills.length > 0) {
		log.info(`${import_picocolors.default.cyan(String(nodeModuleSkills.length))} skill${nodeModuleSkills.length !== 1 ? "s" : ""} from node_modules`);
		try {
			const { options: syncOptions } = parseSyncOptions(args);
			await runSync(args, {
				...syncOptions,
				yes: true,
				agent: universalAgentNames
			});
		} catch (error) {
			log.error(`Failed to sync node_modules skills: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}
}
const RESET$2 = "\x1B[0m";
const BOLD$2 = "\x1B[1m";
const DIM$2 = "\x1B[38;5;102m";
const CYAN = "\x1B[36m";
const YELLOW = "\x1B[33m";
function shortenPath(fullPath, cwd) {
	const home = homedir();
	if (fullPath.startsWith(home)) return fullPath.replace(home, "~");
	if (fullPath.startsWith(cwd)) return "." + fullPath.slice(cwd.length);
	return fullPath;
}
function formatList(items, maxShow = 5) {
	if (items.length <= maxShow) return items.join(", ");
	const shown = items.slice(0, maxShow);
	const remaining = items.length - maxShow;
	return `${shown.join(", ")} +${remaining} more`;
}
function parseListOptions(args) {
	const options = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-g" || arg === "--global") options.global = true;
		else if (arg === "--json") options.json = true;
		else if (arg === "-a" || arg === "--agent") {
			options.agent = options.agent || [];
			while (i + 1 < args.length && !args[i + 1].startsWith("-")) options.agent.push(args[++i]);
		}
	}
	return options;
}
async function runList(args) {
	const options = parseListOptions(args);
	const scope = options.global === true ? true : false;
	let agentFilter;
	if (options.agent && options.agent.length > 0) {
		const validAgents = Object.keys(agents);
		const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
		if (invalidAgents.length > 0) {
			console.log(`${YELLOW}Invalid agents: ${invalidAgents.join(", ")}${RESET$2}`);
			console.log(`${DIM$2}Valid agents: ${validAgents.join(", ")}${RESET$2}`);
			process.exit(1);
		}
		agentFilter = options.agent;
	}
	const installedSkills = await listInstalledSkills({
		global: scope,
		agentFilter
	});
	const cwd = process.cwd();
	const lockedSkills = scope ? await getAllLockedSkills() : (await readLocalLock(cwd)).skills;
	const lockEntriesBySanitizedName = new Map(Object.entries(lockedSkills).map(([name, entry]) => [sanitizeName(name), entry]));
	const getLockEntry = (skillName) => lockedSkills[skillName] ?? lockEntriesBySanitizedName.get(sanitizeName(skillName));
	if (options.json) {
		const jsonOutput = installedSkills.map((skill) => {
			const lockEntry = getLockEntry(skill.name);
			return {
				name: skill.name,
				path: skill.canonicalPath,
				scope: skill.scope,
				agents: skill.agents.map((a) => agents[a].displayName),
				source: lockEntry?.source ?? null,
				sourceUrl: lockEntry?.sourceUrl ?? null,
				sourceType: lockEntry?.sourceType ?? null
			};
		});
		console.log(JSON.stringify(jsonOutput, null, 2));
		return;
	}
	const scopeLabel = scope ? "Global" : "Project";
	if (installedSkills.length === 0) {
		if (options.json) {
			console.log("[]");
			return;
		}
		console.log(`${DIM$2}No ${scopeLabel.toLowerCase()} skills found.${RESET$2}`);
		if (scope) console.log(`${DIM$2}Try listing project skills without -g${RESET$2}`);
		else console.log(`${DIM$2}Try listing global skills with -g${RESET$2}`);
		return;
	}
	function printSkill(skill, indent = false, maxNameLength = 0, maxPathLength = 0) {
		const prefix = indent ? "  " : "";
		const shortPath = shortenPath(skill.canonicalPath, cwd);
		const agentNames = skill.agents.map((a) => agents[a].displayName);
		const agentInfo = skill.agents.length > 0 ? formatList(agentNames) : `${YELLOW}not linked${RESET$2}`;
		const paddedName = sanitizeMetadata(skill.name).padEnd(maxNameLength);
		const paddedPath = shortPath.padEnd(maxPathLength);
		const source = getLockEntry(skill.name)?.source ?? null;
		const sourceLabel = source ? sanitizeMetadata(source) : "local";
		console.log(`${prefix}${CYAN}${paddedName}${RESET$2} ${DIM$2}${paddedPath}${RESET$2}`);
		console.log(`${prefix}  ${DIM$2}Agents:${RESET$2} ${agentInfo}  ${DIM$2}Source:${RESET$2} ${sourceLabel}`);
	}
	console.log(`${BOLD$2}${scopeLabel} Skills${RESET$2}`);
	console.log();
	const groupedSkills = {};
	const ungroupedSkills = [];
	for (const skill of installedSkills) {
		const lockEntry = getLockEntry(skill.name);
		if (lockEntry?.pluginName) {
			const group = lockEntry.pluginName;
			if (!groupedSkills[group]) groupedSkills[group] = [];
			groupedSkills[group].push(skill);
		} else ungroupedSkills.push(skill);
	}
	if (Object.keys(groupedSkills).length > 0) {
		const sortedGroups = Object.keys(groupedSkills).sort();
		for (const group of sortedGroups) {
			const title = group.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
			console.log(`${BOLD$2}${title}${RESET$2}`);
			const skills = groupedSkills[group];
			if (skills) {
				let maxNameLength = 0;
				let maxPathLength = 0;
				for (const skill of skills) {
					const nameLength = sanitizeMetadata(skill.name).length;
					const pathLength = shortenPath(skill.canonicalPath, cwd).length;
					if (nameLength > maxNameLength) maxNameLength = nameLength;
					if (pathLength > maxPathLength) maxPathLength = pathLength;
				}
				for (const skill of skills) printSkill(skill, true, maxNameLength, maxPathLength);
			}
			console.log();
		}
		if (ungroupedSkills.length > 0) {
			console.log(`${BOLD$2}General${RESET$2}`);
			let maxNameLength = 0;
			let maxPathLength = 0;
			for (const skill of ungroupedSkills) {
				const nameLength = sanitizeMetadata(skill.name).length;
				const pathLength = shortenPath(skill.canonicalPath, cwd).length;
				if (nameLength > maxNameLength) maxNameLength = nameLength;
				if (pathLength > maxPathLength) maxPathLength = pathLength;
			}
			for (const skill of ungroupedSkills) printSkill(skill, true, maxNameLength, maxPathLength);
			console.log();
		}
	} else {
		let maxNameLength = 0;
		let maxPathLength = 0;
		for (const skill of installedSkills) {
			const nameLength = sanitizeMetadata(skill.name).length;
			const pathLength = shortenPath(skill.canonicalPath, cwd).length;
			if (nameLength > maxNameLength) maxNameLength = nameLength;
			if (pathLength > maxPathLength) maxPathLength = pathLength;
		}
		for (const skill of installedSkills) printSkill(skill, false, maxNameLength, maxPathLength);
		console.log();
	}
}
function resolveSkillsToRemove(requested, folderNames, lockKeys = []) {
	const identityBySanitized = /* @__PURE__ */ new Map();
	for (const folder of folderNames) identityBySanitized.set(sanitizeName(folder), folder);
	for (const key of lockKeys) identityBySanitized.set(sanitizeName(key), key);
	const matched = /* @__PURE__ */ new Set();
	for (const name of requested) {
		const hit = identityBySanitized.get(sanitizeName(name));
		if (hit) matched.add(hit);
	}
	return Array.from(matched);
}
async function removeCommand(skillNames, options) {
	const agentResult = await detectAgent();
	if (agentResult.isAgent) {
		options.yes = true;
		log.info(import_picocolors.default.bgCyan(import_picocolors.default.black(import_picocolors.default.bold(` ${agentResult.agent.name} `))) + " Agent detected — removing non-interactively");
	}
	if (skillNames.includes("*")) {
		options.all = true;
		skillNames = skillNames.filter((name) => name !== "*");
	}
	const namedSkills = skillNames.filter((name) => name !== "*");
	if (options.all && namedSkills.length > 0) {
		log.error("Cannot combine --all with specific skill names.");
		log.info("Use `skills remove --all` to remove every skill, or omit --all to remove only the named skills.");
		log.info(`Example: skills remove ${namedSkills[0]} -y`);
		process.exit(1);
	}
	const isGlobal = options.global ?? false;
	const cwd = process.cwd();
	const spinner$1 = spinner();
	spinner$1.start("Scanning for installed skills…");
	const skillNamesSet = /* @__PURE__ */ new Set();
	const scanDir = async (dir) => {
		try {
			const entries = await readdir(dir, { withFileTypes: true });
			for (const entry of entries) if (entry.isDirectory()) skillNamesSet.add(entry.name);
		} catch (err) {
			if (err instanceof Error && err.code !== "ENOENT") log.warn(`Could not scan directory ${dir}: ${err.message}`);
		}
	};
	if (isGlobal) {
		await scanDir(getCanonicalSkillsDir(true, cwd));
		for (const agent of Object.values(agents)) if (agent.globalSkillsDir !== void 0) await scanDir(agent.globalSkillsDir);
	} else {
		await scanDir(getCanonicalSkillsDir(false, cwd));
		for (const agent of Object.values(agents)) await scanDir(join(cwd, agent.skillsDir));
		for (const subagent of getEveSubagents(cwd)) await scanDir(getEveSubagentSkillsDir(subagent, cwd));
	}
	const installedSkills = Array.from(skillNamesSet).sort();
	spinner$1.stop(`Found ${installedSkills.length} unique installed skill(s)`);
	const lockSkillsKeys = isGlobal ? Object.keys((await readSkillLock()).skills) : Object.keys((await readLocalLock(cwd)).skills);
	const requestedSkills = options.all ? [...installedSkills, ...lockSkillsKeys] : skillNames;
	const resolvedRequestedSkills = options.all || skillNames.length > 0 ? resolveSkillsToRemove(requestedSkills, installedSkills, lockSkillsKeys) : [];
	if (installedSkills.length === 0 && resolvedRequestedSkills.length === 0) {
		outro(import_picocolors.default.yellow("No skills found to remove."));
		return;
	}
	if (options.agent && options.agent.length > 0) {
		const validAgents = Object.keys(agents);
		const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
		if (invalidAgents.length > 0) {
			log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
			log.info(`Valid agents: ${validAgents.join(", ")}`);
			process.exit(1);
		}
	}
	let selectedSkills = [];
	if (options.all) selectedSkills = resolvedRequestedSkills;
	else if (skillNames.length > 0) {
		selectedSkills = resolvedRequestedSkills;
		if (selectedSkills.length === 0) {
			log.error(`No matching skills found for: ${skillNames.join(", ")}`);
			return;
		}
	} else {
		const choices = installedSkills.map((s) => ({
			value: s,
			label: s
		}));
		const selected = await multiselect({
			message: `Select skills to remove ${import_picocolors.default.dim("(space to toggle)")}`,
			options: choices,
			required: true
		});
		if (isCancel(selected)) {
			cancel("Removal cancelled");
			process.exit(0);
		}
		selectedSkills = resolveSkillsToRemove(selected, installedSkills, lockSkillsKeys);
	}
	let targetAgents;
	if (options.agent && options.agent.length > 0) targetAgents = options.agent;
	else {
		targetAgents = Object.keys(agents);
		spinner$1.stop(`Targeting ${targetAgents.length} potential agent(s)`);
	}
	if (!options.yes) {
		console.log();
		log.info("Skills to remove:");
		for (const skill of selectedSkills) log.message(`  ${import_picocolors.default.red("•")} ${skill}`);
		console.log();
		const confirmed = await confirm({ message: `Are you sure you want to uninstall ${selectedSkills.length} skill(s)?` });
		if (isCancel(confirmed) || !confirmed) {
			cancel("Removal cancelled");
			process.exit(0);
		}
	}
	spinner$1.start("Removing skills…");
	const results = [];
	for (const skillName of selectedSkills) try {
		const canonicalPath = getCanonicalPath(skillName, {
			global: isGlobal,
			cwd
		});
		for (const agentKey of targetAgents) {
			const agent = agents[agentKey];
			const skillPath = getInstallPath(skillName, agentKey, {
				global: isGlobal,
				cwd
			});
			const pathsToCleanup = /* @__PURE__ */ new Set([skillPath]);
			const sanitizedName = sanitizeName(skillName);
			if (isGlobal && agent.globalSkillsDir) pathsToCleanup.add(join(agent.globalSkillsDir, sanitizedName));
			else {
				pathsToCleanup.add(join(cwd, agent.skillsDir, sanitizedName));
				if (agentKey === "eve") for (const subagent of getEveSubagents(cwd)) pathsToCleanup.add(join(getEveSubagentSkillsDir(subagent, cwd), sanitizedName));
			}
			for (const pathToCleanup of pathsToCleanup) {
				if (pathToCleanup === canonicalPath) continue;
				try {
					if (await lstat(pathToCleanup).catch(() => null)) await rm(pathToCleanup, {
						recursive: true,
						force: true
					});
				} catch (err) {
					log.warn(`Could not remove skill from ${agent.displayName}: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		}
		const remainingAgents = (await detectInstalledAgents()).filter((a) => !targetAgents.includes(a));
		let isStillUsed = false;
		for (const agentKey of remainingAgents) if (await lstat(getInstallPath(skillName, agentKey, {
			global: isGlobal,
			cwd
		})).catch(() => null)) {
			isStillUsed = true;
			break;
		}
		if (!isStillUsed) await rm(canonicalPath, {
			recursive: true,
			force: true
		});
		let effectiveSource = "local";
		let effectiveSourceType = "local";
		if (isGlobal) {
			const lockEntry = await getSkillFromLock(skillName);
			effectiveSource = lockEntry?.source || "local";
			effectiveSourceType = lockEntry?.sourceType || "local";
			if (!isStillUsed) await removeSkillFromLock(skillName);
		} else {
			const lockEntry = (await readLocalLock(cwd)).skills[skillName];
			effectiveSource = lockEntry?.source || "local";
			effectiveSourceType = lockEntry?.sourceType || "local";
			if (!isStillUsed) await removeSkillFromLocalLock(skillName, cwd);
		}
		results.push({
			skill: skillName,
			success: true,
			source: effectiveSource,
			sourceType: effectiveSourceType
		});
	} catch (err) {
		results.push({
			skill: skillName,
			success: false,
			error: err instanceof Error ? err.message : String(err)
		});
	}
	spinner$1.stop("Removal process complete");
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);
	if (successful.length > 0) {
		const bySource = /* @__PURE__ */ new Map();
		for (const r of successful) {
			const source = r.source || "local";
			const existing = bySource.get(source) || { skills: [] };
			existing.skills.push(r.skill);
			existing.sourceType = r.sourceType;
			bySource.set(source, existing);
		}
		for (const [source, data] of bySource) track({
			event: "remove",
			source,
			skills: data.skills.join(","),
			agents: targetAgents.join(","),
			...isGlobal && { global: "1" },
			sourceType: data.sourceType
		});
	}
	if (successful.length > 0) log.success(import_picocolors.default.green(`Successfully removed ${successful.length} skill(s)`));
	if (failed.length > 0) {
		log.error(import_picocolors.default.red(`Failed to remove ${failed.length} skill(s)`));
		for (const r of failed) log.message(`  ${import_picocolors.default.red("✗")} ${r.skill}: ${r.error}`);
	}
	console.log();
	outro(import_picocolors.default.green("Done!"));
}
function parseRemoveOptions(args) {
	const options = {};
	const skills = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-g" || arg === "--global") options.global = true;
		else if (arg === "-y" || arg === "--yes") options.yes = true;
		else if (arg === "--all") {
			options.all = true;
			options.yes = true;
		} else if (arg === "-s" || arg === "--skill") {
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				skills.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg === "-a" || arg === "--agent") {
			options.agent = options.agent || [];
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.agent.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg && !arg.startsWith("-")) skills.push(arg);
	}
	return {
		skills,
		options
	};
}
const __dirname$1 = dirname(fileURLToPath(import.meta.url));
const RESET$1 = "\x1B[0m";
const BOLD$1 = "\x1B[1m";
const DIM$1 = "\x1B[38;5;102m";
const TEXT$1 = "\x1B[38;5;145m";
function getUpdateChildEnv(sourceType) {
	if (sourceType !== "github") return;
	return {
		...process.env,
		GH_HOST: "github.com"
	};
}
function parseUpdateOptions(args) {
	const options = {};
	const positional = [];
	for (const arg of args) if (arg === "-g" || arg === "--global") options.global = true;
	else if (arg === "-p" || arg === "--project") options.project = true;
	else if (arg === "-y" || arg === "--yes") options.yes = true;
	else if (!arg.startsWith("-")) positional.push(arg);
	if (positional.length > 0) options.skills = positional;
	return options;
}
function hasProjectSkills(cwd) {
	const dir = cwd || process.cwd();
	if (existsSync(join(dir, "skills-lock.json"))) return true;
	const skillsDir = join(dir, ".agents", "skills");
	try {
		const entries = readdirSync(skillsDir, { withFileTypes: true });
		for (const entry of entries) if (entry.isDirectory()) {
			if (existsSync(join(skillsDir, entry.name, "SKILL.md"))) return true;
		}
	} catch {}
	return false;
}
async function resolveUpdateScope(options) {
	if (options.skills && options.skills.length > 0) {
		if (options.global) return "global";
		if (options.project) return "project";
		return "both";
	}
	if (options.global && options.project) return "both";
	if (options.global) return "global";
	if (options.project) return "project";
	if (options.yes || !process.stdin.isTTY) return hasProjectSkills() ? "project" : "global";
	const scope = await select({
		message: "Update scope",
		options: [
			{
				value: "project",
				label: "Project",
				hint: "Update skills in current directory"
			},
			{
				value: "global",
				label: "Global",
				hint: "Update skills in home directory"
			},
			{
				value: "both",
				label: "Both",
				hint: "Update all skills"
			}
		]
	});
	if (isCancel(scope)) {
		cancel("Cancelled");
		process.exit(0);
	}
	return scope;
}
function matchesSkillFilter(name, filter) {
	if (!filter || filter.length === 0) return true;
	const lower = name.toLowerCase();
	return filter.some((f) => f.toLowerCase() === lower);
}
function getSkipReason(entry) {
	if (entry.sourceType === "local") return "Local path";
	if (entry.sourceType === "git") return "Git URL";
	if (entry.sourceType === "well-known") return "Well-known skill";
	if (!entry.skillFolderHash) return "Private or deleted repo";
	if (!entry.skillPath) return "No skill path recorded";
	return "No version tracking";
}
function getInstallSource(skill) {
	let url = skill.sourceUrl;
	if (skill.sourceType === "well-known") {
		const idx = url.indexOf("/.well-known/");
		if (idx !== -1) url = url.slice(0, idx);
	}
	return formatSourceInput(url, skill.ref);
}
function printSkippedSkills(skipped) {
	if (skipped.length === 0) return;
	console.log();
	console.log(`${DIM$1}${skipped.length} skill(s) cannot be checked automatically:${RESET$1}`);
	const grouped = /* @__PURE__ */ new Map();
	for (const skill of skipped) {
		const source = getInstallSource(skill);
		const existing = grouped.get(source) || [];
		existing.push(skill);
		grouped.set(source, existing);
	}
	for (const [source, skills] of grouped) {
		if (skills.length === 1) {
			const skill = skills[0];
			console.log(`  ${TEXT$1}•${RESET$1} ${sanitizeMetadata(skill.name)} ${DIM$1}(${skill.reason})${RESET$1}`);
		} else {
			const reason = skills[0].reason;
			const names = skills.map((s) => sanitizeMetadata(s.name)).join(", ");
			console.log(`  ${TEXT$1}•${RESET$1} ${names} ${DIM$1}(${reason})${RESET$1}`);
		}
		console.log(`    ${DIM$1}To update: ${TEXT$1}npx skills add ${source} -g -y${RESET$1}`);
	}
}
async function getProjectSkillsForUpdate(skillFilter) {
	const localLock = await readLocalLock();
	const skills = [];
	for (const [name, entry] of Object.entries(localLock.skills)) {
		if (!matchesSkillFilter(name, skillFilter)) continue;
		if (entry.sourceType === "node_modules" || entry.sourceType === "local") continue;
		skills.push({
			name,
			source: entry.sourceUrl || entry.source,
			entry
		});
	}
	return skills;
}
async function promptDeletions(source, deletedSkills, isGlobal, options) {
	if (deletedSkills.length === 0) return;
	console.log();
	console.log(`${DIM$1}Warning:${RESET$1} The following skills from ${DIM$1}${source}${RESET$1} appear to have been deleted upstream:`);
	for (const s of deletedSkills) console.log(`  ${DIM$1}•${RESET$1} ${s}`);
	if (options.yes || !process.stdin.isTTY) {
		console.log(`${DIM$1}Skipping deletion in non-interactive mode.${RESET$1}`);
		return;
	}
	const confirmed = await confirm({ message: `Would you like to remove the local copies of these deleted skills?` });
	if (confirmed && !isCancel(confirmed)) for (const s of deletedSkills) {
		console.log(`${DIM$1}Removing${RESET$1} ${s}…`);
		await removeCommand([s], {
			yes: true,
			global: isGlobal
		});
	}
}
async function checkAndPromptForDeletions(source, allLockedForSource, lockSkills, isGlobal, options, discoveredPaths) {
	const deletedSkills = allLockedForSource.filter((name) => {
		const entry = lockSkills[name];
		if (!entry?.skillPath) return false;
		return !discoveredPaths.includes(entry.skillPath);
	});
	await promptDeletions(source, deletedSkills, isGlobal, options);
	return deletedSkills;
}
async function checkWellKnownForUpdates(baseUrl, items) {
	let indexResult;
	try {
		indexResult = await wellKnownProvider.fetchIndex(baseUrl, { updateCheck: true });
	} catch {
		return { status: "error" };
	}
	if (!indexResult) return { status: "error" };
	const byName = new Map(indexResult.entries.map((entry) => [entry.name, entry]));
	const removedSkills = items.filter((item) => !byName.has(item.name)).map((item) => item.name);
	const localNames = new Set(items.map((item) => item.name));
	const newSkills = indexResult.entries.map((entry) => entry.name).filter((name) => !localNames.has(name));
	const changedSkills = [];
	const needsContentCheck = [];
	for (const item of items) {
		const entry = byName.get(item.name);
		if (!entry) continue;
		if (entry.version === "0.2.0") {
			if (!item.digest || entry.digest !== item.digest) changedSkills.push(item.name);
		} else needsContentCheck.push(item);
	}
	if (needsContentCheck.length > 0) {
		const tracked = new Set(needsContentCheck.map((item) => item.name));
		const skills = (await Promise.all(indexResult.entries.filter((entry) => tracked.has(entry.name)).map((entry) => wellKnownProvider.fetchSkillByEntry(entry).catch(() => null)))).filter((skill) => skill !== null);
		if (skills.length === 0) return { status: "error" };
		const digests = new Map(skills.map((skill) => [skill.installName, computeWellKnownSkillDigest(skill)]));
		for (const item of needsContentCheck) {
			const digest = digests.get(item.name);
			if (!digest || !item.digest || digest !== item.digest) changedSkills.push(item.name);
		}
	}
	if (changedSkills.length === 0 && removedSkills.length === 0) return {
		status: "current",
		newSkills
	};
	return {
		status: "changed",
		changedSkills,
		removedSkills,
		newSkills
	};
}
function printNewSkills(baseUrl, newSkills, isGlobal) {
	if (newSkills.length === 0) return;
	const names = newSkills.map(sanitizeMetadata);
	console.log(`  ${DIM$1}${newSkills.length} new skill(s) available from this source:${RESET$1} ${names.join(", ")}`);
	console.log(`    ${DIM$1}To install: ${TEXT$1}npx skills add ${baseUrl} --skill ${names.join(" ")}${isGlobal ? " -g" : ""}${RESET$1}`);
}
async function processWellKnownUpdates(groups, isGlobal, options) {
	let successCount = 0;
	let failCount = 0;
	let changed = false;
	for (const [baseUrl, items] of groups) {
		process.stdout.write(`\r${DIM$1}Checking skills from source: ${baseUrl}${RESET$1}\x1b[K\n`);
		const result = await checkWellKnownForUpdates(baseUrl, items);
		if (result.status === "error") {
			console.log(`  ${DIM$1}✗ Failed to check skills from ${baseUrl}${RESET$1}`);
			continue;
		}
		if (result.status === "current") {
			printNewSkills(baseUrl, result.newSkills, isGlobal);
			continue;
		}
		changed = true;
		await promptDeletions(baseUrl, result.removedSkills, isGlobal, options);
		printNewSkills(baseUrl, result.newSkills, isGlobal);
		if (result.changedSkills.length === 0) continue;
		const cliEntry = join(__dirname$1, "..", "bin", "cli.mjs");
		if (!existsSync(cliEntry)) {
			failCount += result.changedSkills.length;
			console.log(`  ${DIM$1}✗ CLI entrypoint not found at ${cliEntry}${RESET$1}`);
			continue;
		}
		const itemByName = new Map(items.map((item) => [item.name, item]));
		for (const name of result.changedSkills) {
			const safeName = sanitizeMetadata(name);
			console.log(`${TEXT$1}Updating ${safeName}…${RESET$1}`);
			const subagents = itemByName.get(name)?.subagents;
			const subagentArgs = !isGlobal && subagents?.length ? ["--subagent", ...subagents.map((s) => s === "" ? "root" : s)] : [];
			if (spawnSync(process.execPath, [
				cliEntry,
				"add",
				baseUrl,
				"--skill",
				name,
				...subagentArgs,
				...isGlobal ? ["-g"] : [],
				"-y"
			], {
				stdio: [
					"inherit",
					"pipe",
					"pipe"
				],
				encoding: "utf-8",
				shell: false
			}).status === 0) {
				successCount++;
				console.log(`  ${TEXT$1}✓${RESET$1} Updated ${safeName}`);
			} else {
				failCount++;
				console.log(`  ${DIM$1}✗ Failed to update ${safeName}${RESET$1}`);
			}
		}
	}
	return {
		successCount,
		failCount,
		changed
	};
}
async function updateGlobalSkills(options = {}) {
	const lock = await readSkillLock();
	const skillNames = Object.keys(lock.skills);
	let successCount = 0;
	let failCount = 0;
	if (skillNames.length === 0) {
		if (!options.skills) {
			console.log(`${DIM$1}No global skills tracked in lock file.${RESET$1}`);
			console.log(`${DIM$1}Install skills with${RESET$1} ${TEXT$1}npx skills add <package> -g${RESET$1}`);
		}
		return {
			successCount,
			failCount,
			checkedCount: 0
		};
	}
	const updates = [];
	const skipped = [];
	const checkable = [];
	const wellKnownGroups = /* @__PURE__ */ new Map();
	for (const skillName of skillNames) {
		if (!matchesSkillFilter(skillName, options.skills)) continue;
		const entry = lock.skills[skillName];
		if (!entry) continue;
		if (entry.sourceType === "well-known" && entry.sourceBaseUrl && entry.wellKnownDigest) {
			const group = wellKnownGroups.get(entry.sourceBaseUrl) || [];
			group.push({
				name: skillName,
				digest: entry.wellKnownDigest
			});
			wellKnownGroups.set(entry.sourceBaseUrl, group);
			continue;
		}
		if (!entry.skillFolderHash || !entry.skillPath) {
			skipped.push({
				name: skillName,
				reason: getSkipReason(entry),
				sourceUrl: entry.sourceUrl,
				sourceType: entry.sourceType,
				ref: entry.ref
			});
			continue;
		}
		checkable.push({
			name: skillName,
			entry
		});
	}
	const wellKnownCount = Array.from(wellKnownGroups.values()).reduce((sum, items) => sum + items.length, 0);
	const { successCount: wkSuccessCount, failCount: wkFailCount, changed: wkChanged } = await processWellKnownUpdates(wellKnownGroups, true, options);
	successCount += wkSuccessCount;
	failCount += wkFailCount;
	const bySource = /* @__PURE__ */ new Map();
	for (const item of checkable) {
		const key = `${item.entry.source}\n${item.entry.ref ?? ""}`;
		const existing = bySource.get(key) || [];
		existing.push(item);
		bySource.set(key, existing);
	}
	for (const [, itemsForSource] of bySource) {
		const firstEntry = itemsForSource[0].entry;
		const source = firstEntry.source;
		const sourceUrl = firstEntry.sourceUrl || firstEntry.source;
		let tempDir = null;
		process.stdout.write(`\r${DIM$1}Checking skills from source: ${source}${RESET$1}\x1b[K\n`);
		try {
			const isGitHubSource = firstEntry.sourceType === "github";
			if (isGitHubSource) {
				const tree = await fetchRepoTree(source, firstEntry.ref, getGitHubToken);
				if (tree) {
					const discoveredPaths = tree.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
					const deletedSkills = await checkAndPromptForDeletions(source, Object.entries(lock.skills).filter(([_, entry]) => entry.source === source && entry.ref === firstEntry.ref).map(([name, _]) => name), lock.skills, true, options, discoveredPaths);
					const deletedSkillSet = new Set(deletedSkills);
					for (const { name: skillName, entry } of itemsForSource) {
						if (deletedSkillSet.has(skillName)) continue;
						const latestHash = getSkillFolderHashFromTree(tree, entry.skillPath);
						if (latestHash && latestHash !== entry.skillFolderHash) updates.push({
							name: skillName,
							source,
							entry
						});
					}
					continue;
				}
				console.log(`  ${DIM$1}GitHub API unavailable; checking via Git clone${RESET$1}`);
			}
			tempDir = await cloneRepo(sourceUrl, firstEntry.ref);
			const discoveredPaths = (await discoverSkills(tempDir, void 0, { fullDepth: true })).map((skill) => {
				return join(relative(tempDir, skill.path), "SKILL.md").split(sep).join("/");
			});
			const deletedSkills = await checkAndPromptForDeletions(source, Object.entries(lock.skills).filter(([_, entry]) => entry.source === source && entry.ref === firstEntry.ref).map(([name, _]) => name), lock.skills, true, options, discoveredPaths);
			const deletedSkillSet = new Set(deletedSkills);
			for (const { name: skillName, entry } of itemsForSource) {
				if (deletedSkillSet.has(skillName)) continue;
				const skillPath = entry.skillPath;
				if (!discoveredPaths.includes(skillPath)) continue;
				const latestHash = isGitHubSource && /^[0-9a-f]{40}$/i.test(entry.skillFolderHash) ? await getGitTreeHash(tempDir, skillPath) : await computeSkillFolderHash(join(tempDir, dirname(skillPath)));
				if (latestHash && latestHash !== entry.skillFolderHash) updates.push({
					name: skillName,
					source,
					entry
				});
			}
		} catch (error) {
			console.log(`  ${DIM$1}✗ Failed to check skills from ${source}${RESET$1}`);
		} finally {
			if (tempDir) await cleanupTempDir(tempDir);
		}
	}
	if (checkable.length > 0) process.stdout.write("\r\x1B[K");
	const checkedCount = checkable.length + skipped.length + wellKnownCount;
	if (checkable.length === 0 && skipped.length === 0 && wellKnownCount === 0) {
		if (!options.skills) console.log(`${DIM$1}No global skills to check.${RESET$1}`);
		return {
			successCount,
			failCount,
			checkedCount: 0
		};
	}
	if (checkable.length === 0 && skipped.length === 0) {
		if (!wkChanged) console.log(`${TEXT$1}✓ All global skills are up to date${RESET$1}`);
		return {
			successCount,
			failCount,
			checkedCount
		};
	}
	if (checkable.length === 0 && skipped.length > 0) {
		printSkippedSkills(skipped);
		return {
			successCount,
			failCount,
			checkedCount
		};
	}
	if (updates.length === 0) {
		if (!wkChanged) console.log(`${TEXT$1}✓ All global skills are up to date${RESET$1}`);
		return {
			successCount,
			failCount,
			checkedCount
		};
	}
	console.log(`${TEXT$1}Found ${updates.length} global update(s)${RESET$1}`);
	console.log();
	for (const update of updates) {
		const safeName = sanitizeMetadata(update.name);
		console.log(`${TEXT$1}Updating ${safeName}…${RESET$1}`);
		const installUrl = buildUpdateInstallSource(update.entry);
		if (!installUrl) {
			failCount++;
			console.log(`  ${DIM$1}✗ Cannot update ${safeName}: lock file is missing sourceUrl for this generic Git source${RESET$1}`);
			continue;
		}
		const cliEntry = join(__dirname$1, "..", "bin", "cli.mjs");
		if (!existsSync(cliEntry)) {
			failCount++;
			console.log(`  ${DIM$1}✗ Failed to update ${safeName}: CLI entrypoint not found at ${cliEntry}${RESET$1}`);
			continue;
		}
		const fullDepthArgs = shouldUseFullDepthForUpdate(update.entry) ? ["--full-depth"] : [];
		if (spawnSync(process.execPath, [
			cliEntry,
			"add",
			installUrl,
			"--skill",
			update.name,
			...fullDepthArgs,
			"-g",
			"-y"
		], {
			stdio: [
				"inherit",
				"pipe",
				"pipe"
			],
			encoding: "utf-8",
			env: getUpdateChildEnv(update.entry.sourceType),
			shell: false
		}).status === 0) {
			successCount++;
			console.log(`  ${TEXT$1}✓${RESET$1} Updated ${safeName}`);
		} else {
			failCount++;
			console.log(`  ${DIM$1}✗ Failed to update ${safeName}${RESET$1}`);
		}
	}
	printSkippedSkills(skipped);
	return {
		successCount,
		failCount,
		checkedCount
	};
}
async function updateProjectSkills(options = {}) {
	const projectSkills = await getProjectSkillsForUpdate(options.skills);
	let successCount = 0;
	let failCount = 0;
	if (projectSkills.length === 0) {
		if (!options.skills) {
			console.log(`${DIM$1}No project skills to update.${RESET$1}`);
			console.log(`${DIM$1}Install project skills with${RESET$1} ${TEXT$1}npx skills add <package>${RESET$1}`);
		}
		return {
			successCount,
			failCount,
			foundCount: 0
		};
	}
	const wellKnownGroups = /* @__PURE__ */ new Map();
	const nonWellKnown = [];
	for (const skill of projectSkills) {
		const { entry } = skill;
		if (entry.sourceType === "well-known" && entry.sourceUrl && entry.wellKnownDigest) {
			const group = wellKnownGroups.get(entry.sourceUrl) || [];
			group.push({
				name: skill.name,
				digest: entry.wellKnownDigest,
				subagents: entry.subagents
			});
			wellKnownGroups.set(entry.sourceUrl, group);
		} else nonWellKnown.push(skill);
	}
	const wellKnownCount = Array.from(wellKnownGroups.values()).reduce((sum, items) => sum + items.length, 0);
	const updatable = nonWellKnown.filter((s) => s.entry.skillPath);
	const legacy = nonWellKnown.filter((s) => !s.entry.skillPath);
	if (updatable.length === 0 && wellKnownCount === 0) {
		console.log(`${DIM$1}No project skills can be updated in place.${RESET$1}`);
		printLegacyProjectSkills(legacy);
		return {
			successCount,
			failCount,
			foundCount: projectSkills.length
		};
	}
	const cwd = process.cwd();
	const targetAgentNames = [];
	let hasUniversal = false;
	for (const [type, config] of Object.entries(agents)) if (isUniversalAgent(type)) {
		if (!hasUniversal && existsSync(join(cwd, ".agents"))) hasUniversal = true;
	} else {
		const agentRoot = config.skillsDir.split("/")[0];
		if (existsSync(join(cwd, agentRoot))) targetAgentNames.push(config.displayName);
	}
	const targetParts = [];
	if (hasUniversal) targetParts.push("Universal");
	targetParts.push(...targetAgentNames);
	if (targetParts.length > 0) console.log(`${TEXT$1}Updating for: ${targetParts.join(", ")}${RESET$1}`);
	console.log(`${TEXT$1}Refreshing ${updatable.length + wellKnownCount} skill(s)…${RESET$1}`);
	console.log();
	const { successCount: wkSuccessCount, failCount: wkFailCount } = await processWellKnownUpdates(wellKnownGroups, false, options);
	successCount += wkSuccessCount;
	failCount += wkFailCount;
	const bySource = /* @__PURE__ */ new Map();
	for (const skill of updatable) {
		const key = `${skill.entry.sourceUrl || skill.entry.source}\n${skill.entry.ref ?? ""}`;
		const existing = bySource.get(key) || [];
		existing.push(skill);
		bySource.set(key, existing);
	}
	const localLock = await readLocalLock();
	const cliEntry = join(__dirname$1, "..", "bin", "cli.mjs");
	if (updatable.length > 0 && !existsSync(cliEntry)) {
		console.log(`${DIM$1}✗ CLI entrypoint not found at ${cliEntry}${RESET$1}`);
		return {
			successCount,
			failCount: failCount + updatable.length,
			foundCount: projectSkills.length
		};
	}
	for (const [, skillsForSource] of bySource) {
		const firstEntry = skillsForSource[0].entry;
		const source = firstEntry.sourceUrl || firstEntry.source;
		const cloneSource = buildLocalCloneSource(firstEntry);
		const ref = firstEntry.ref;
		const allLockedForSource = Object.entries(localLock.skills).filter(([_, entry]) => (entry.sourceUrl || entry.source) === source && entry.ref === ref).map(([name, _]) => name);
		let tempDir = null;
		let deletedSkills = [];
		if (cloneSource === null) {
			failCount += skillsForSource.length;
			console.log(`${DIM$1}✗ Cannot update ${source}: skills-lock.json is missing sourceUrl for this generic Git source${RESET$1}`);
			continue;
		}
		try {
			tempDir = await cloneRepo(cloneSource, ref);
			const discoveredPaths = (await discoverSkills(tempDir, void 0, { fullDepth: true })).map((s) => {
				return join(relative(tempDir, s.path), "SKILL.md").split(sep).join("/");
			});
			deletedSkills = await checkAndPromptForDeletions(source, allLockedForSource, localLock.skills, false, options, discoveredPaths);
		} catch (error) {
			console.log(`${DIM$1}✗ Failed to check for deleted skills from ${source}${RESET$1}`);
		} finally {
			if (tempDir) await cleanupTempDir(tempDir);
		}
		const remainingSkills = skillsForSource.filter((s) => !deletedSkills.includes(s.name));
		for (const skill of remainingSkills) {
			const safeName = sanitizeMetadata(skill.name);
			console.log(`${TEXT$1}Updating ${safeName}…${RESET$1}`);
			const installUrl = buildLocalUpdateSource(skill.entry);
			if (!installUrl) {
				failCount++;
				console.log(`  ${DIM$1}✗ Cannot update ${safeName}: skills-lock.json is missing sourceUrl for this generic Git source${RESET$1}`);
				continue;
			}
			const subagentArgs = skill.entry.subagents?.length ? ["--subagent", ...skill.entry.subagents.map((s) => s === "" ? "root" : s)] : [];
			const fullDepthArgs = shouldUseFullDepthForUpdate(skill.entry) ? ["--full-depth"] : [];
			if (spawnSync(process.execPath, [
				cliEntry,
				"add",
				installUrl,
				"--skill",
				skill.name,
				...subagentArgs,
				...fullDepthArgs,
				"-y"
			], {
				stdio: [
					"inherit",
					"pipe",
					"pipe"
				],
				encoding: "utf-8",
				env: getUpdateChildEnv(skill.entry.sourceType),
				shell: false
			}).status === 0) {
				successCount++;
				console.log(`  ${TEXT$1}✓${RESET$1} Updated ${safeName}`);
			} else {
				failCount++;
				console.log(`  ${DIM$1}✗ Failed to update ${safeName}${RESET$1}`);
			}
		}
	}
	printLegacyProjectSkills(legacy);
	return {
		successCount,
		failCount,
		foundCount: projectSkills.length
	};
}
function printLegacyProjectSkills(legacy) {
	if (legacy.length === 0) return;
	console.log();
	console.log(`${DIM$1}${legacy.length} project skill(s) cannot be updated automatically (installed before skillPath tracking):${RESET$1}`);
	for (const skill of legacy) {
		const reinstall = buildLocalUpdateSource(skill.entry);
		console.log(`  ${TEXT$1}•${RESET$1} ${sanitizeMetadata(skill.name)}`);
		if (reinstall) console.log(`    ${DIM$1}To refresh: ${TEXT$1}npx skills add ${reinstall} -y${RESET$1}`);
		else console.log(`    ${DIM$1}To refresh: reinstall using the original full Git URL; this lock entry only has an ambiguous shorthand.${RESET$1}`);
	}
}
async function runUpdate(args = []) {
	const options = parseUpdateOptions(args);
	const scope = await resolveUpdateScope(options);
	if (options.skills) console.log(`${TEXT$1}Updating ${options.skills.join(", ")}…${RESET$1}`);
	else console.log(`${TEXT$1}Checking for skill updates…${RESET$1}`);
	console.log();
	let totalSuccess = 0;
	let totalFail = 0;
	let totalFound = 0;
	if (scope === "global" || scope === "both") {
		if (scope === "both" && !options.skills) console.log(`${BOLD$1}Global Skills${RESET$1}`);
		const { successCount, failCount, checkedCount } = await updateGlobalSkills(options);
		totalSuccess += successCount;
		totalFail += failCount;
		totalFound += checkedCount;
		if (scope === "both" && !options.skills) console.log();
	}
	if (scope === "project" || scope === "both") {
		if (scope === "both" && !options.skills) console.log(`${BOLD$1}Project Skills${RESET$1}`);
		const { successCount, failCount, foundCount } = await updateProjectSkills(options);
		totalSuccess += successCount;
		totalFail += failCount;
		totalFound += foundCount;
	}
	if (options.skills && totalFound === 0) console.log(`${DIM$1}No installed skills found matching: ${options.skills.join(", ")}${RESET$1}`);
	console.log();
	if (totalSuccess > 0) console.log(`${TEXT$1}✓ Updated ${totalSuccess} skill(s)${RESET$1}`);
	if (totalFail > 0) {
		console.log(`${DIM$1}Failed to update ${totalFail} skill(s)${RESET$1}`);
		process.exitCode = 1;
	}
	track({
		event: "update",
		scope,
		skillCount: String(totalSuccess + totalFail),
		successCount: String(totalSuccess),
		failCount: String(totalFail)
	});
	console.log();
}
const BLOB_ALLOWED_OWNERS = [
	"vercel",
	"vercel-labs",
	"heygen-com"
];
const EXCLUDE_FILES = /* @__PURE__ */ new Set(["metadata.json"]);
const EXCLUDE_DIRS = /* @__PURE__ */ new Set([
	".git",
	"__pycache__",
	"__pypackages__"
]);
const USE_AGENT_CONFIGS = {
	"claude-code": {
		command: "claude",
		args: []
	},
	codex: {
		command: "codex",
		args: []
	}
};
const SUPPORTED_USE_AGENTS = Object.keys(USE_AGENT_CONFIGS);
function parseUseOptions(args) {
	const source = [];
	const options = {};
	const errors = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg) continue;
		if (arg === "--help" || arg === "-h") options.help = true;
		else if (arg === "--full-depth") options.fullDepth = true;
		else if (arg === "--skill" || arg === "-s") {
			const value = args[i + 1];
			if (!value || value.startsWith("-")) errors.push(`${arg} requires a skill name`);
			else if (options.skill) {
				errors.push("Only one --skill value can be provided");
				i++;
			} else {
				options.skill = value;
				i++;
			}
		} else if (arg === "--agent" || arg === "-a") {
			options.agent = options.agent || [];
			i++;
			let nextArg = args[i];
			const startCount = options.agent.length;
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.agent.push(nextArg);
				i++;
				nextArg = args[i];
			}
			if (options.agent.length === startCount) errors.push(`${arg} requires an agent name`);
			i--;
		} else if (arg.startsWith("-")) errors.push(`Unknown option: ${arg}`);
		else source.push(arg);
	}
	errors.push(...validateUseAgentOption(options.agent));
	return {
		source,
		options,
		errors
	};
}
function buildUsePrompt(input) {
	const sections = [
		"You are being given a Skill to execute for the user's next request.",
		"Use the following SKILL.md as your instructions:",
		`<SKILL.md>\n${input.skillMd}\n</SKILL.md>`
	];
	if (input.hasSupportingFiles && input.supportDir) sections.push(`Supporting files for this skill were downloaded to:\n${input.supportDir}\n\nWhen the SKILL.md references relative paths, read them from that directory.`);
	return sections.join("\n\n") + "\n";
}
async function materializeUseSkill(skill) {
	const tempRoot = await mkdtemp(join(tmpdir(), "skills-use-"));
	const skillDir = join(tempRoot, sanitizeName(skill.directoryName || skill.name));
	if (!isPathSafe(tempRoot, skillDir)) throw new Error("Invalid skill name: potential path traversal detected");
	await mkdir(skillDir, { recursive: true });
	if (skill.kind === "blob") await writeSnapshotFiles(skillDir, skill.files);
	else if (skill.kind === "well-known") await writeMapFiles(skillDir, skill.files);
	else await copySkillDirectory(skill.path, skillDir);
	return {
		tempRoot,
		skillDir,
		skillMd: skill.rawContent ?? await readFile(join(skillDir, "SKILL.md"), "utf-8"),
		hasSupportingFiles: await containsSupportingFiles(skillDir, skillDir)
	};
}
async function runUse(sourceArgs, options = {}, parseErrors = []) {
	let cloneTempDir = null;
	try {
		if (options.help) {
			console.log(getUseHelp());
			return;
		}
		if (parseErrors.length > 0) fail(parseErrors.join("\n"));
		if (sourceArgs.length === 0) fail(`Missing required argument: source\n\n${getUseHelp()}`);
		if (sourceArgs.length > 1) fail(`Expected one source, received ${sourceArgs.length}: ${sourceArgs.join(", ")}`);
		const useAgent = options.agent?.[0];
		if (useAgent && !USE_AGENT_CONFIGS[useAgent]) fail(formatUnsupportedAgentError(useAgent));
		const source = sourceArgs[0];
		const parsed = parseSource(source);
		const selector = resolveSelector(parsed.skillFilter, options.skill);
		const includeInternal = selector !== void 0;
		let selectedSkill;
		if (parsed.type === "well-known") {
			const skills = await wellKnownProvider.fetchAllSkills(parsed.url, { includeInternal }).catch((error) => {
				if (error instanceof WellKnownScopeNotFoundError) fail(error.message);
				return [];
			});
			if (skills.length > 0) selectedSkill = selectWellKnownSkill(skills, selector, source);
			else {
				const downloaded = await downloadSource(parsed.url);
				cloneTempDir = downloaded.tempDir;
				const selected = selectSkill(await discoverSkills(downloaded.rootDir, void 0, {
					includeInternal,
					fullDepth: options.fullDepth
				}), selector, source);
				selectedSkill = {
					kind: "disk",
					name: selected.name,
					directoryName: selected.name,
					rawContent: selected.rawContent,
					path: selected.path
				};
			}
		} else {
			let skills;
			let blobResult = null;
			if (parsed.type === "download") {
				const downloaded = await downloadSource(parsed.url);
				cloneTempDir = downloaded.tempDir;
				skills = await discoverSkills(downloaded.rootDir, void 0, {
					includeInternal,
					fullDepth: options.fullDepth
				});
			} else if (parsed.type === "local") {
				if (!existsSync(parsed.localPath)) fail(`Local path does not exist: ${parsed.localPath}`);
				skills = await discoverSkills(parsed.localPath, parsed.subpath, {
					includeInternal,
					fullDepth: options.fullDepth
				});
			} else if (parsed.type === "github" && !options.fullDepth) {
				const ownerRepo = getOwnerRepo(parsed);
				const owner = ownerRepo?.split("/")[0]?.toLowerCase();
				if (ownerRepo && owner && BLOB_ALLOWED_OWNERS.includes(owner)) blobResult = await tryBlobInstall(ownerRepo, {
					subpath: parsed.subpath,
					skillFilter: selector,
					ref: parsed.ref,
					getToken: getGitHubToken,
					includeInternal
				});
				if (blobResult) skills = blobResult.skills;
				else {
					cloneTempDir = await cloneRepo(parsed.url, parsed.ref);
					skills = await discoverSkills(cloneTempDir, parsed.subpath, {
						includeInternal,
						fullDepth: options.fullDepth
					});
				}
			} else {
				cloneTempDir = await cloneRepo(parsed.url, parsed.ref);
				skills = await discoverSkills(cloneTempDir, parsed.subpath, {
					includeInternal,
					fullDepth: options.fullDepth
				});
			}
			const selected = selectSkill(skills, selector, source);
			if (blobResult && isBlobSkill(selected)) selectedSkill = {
				kind: "blob",
				name: selected.name,
				directoryName: selected.name,
				rawContent: selected.rawContent ?? getSkillMdFromSnapshot(selected.files),
				files: selected.files
			};
			else selectedSkill = {
				kind: "disk",
				name: selected.name,
				directoryName: selected.name,
				rawContent: selected.rawContent,
				path: selected.path
			};
		}
		const materialized = await materializeUseSkill(selectedSkill);
		await cleanupClone(cloneTempDir);
		cloneTempDir = null;
		const prompt = buildUsePrompt({
			skillMd: materialized.skillMd,
			supportDir: materialized.skillDir,
			hasSupportingFiles: materialized.hasSupportingFiles
		});
		if (useAgent) {
			const exitCode = await launchAgentInteractively(useAgent, prompt);
			if (exitCode !== 0) process.exit(exitCode);
			return;
		}
		process.stdout.write(prompt);
	} catch (error) {
		await cleanupClone(cloneTempDir);
		if (error instanceof GitCloneError) fail(error.message);
		if (error instanceof UseCommandError) fail(error.message);
		fail(error instanceof Error ? error.message : "Unknown error");
	}
}
async function launchAgentInteractively(agent, prompt, spawnImpl = spawnAgent) {
	const config = USE_AGENT_CONFIGS[agent];
	if (!config) throw new UseCommandError(formatUnsupportedAgentError(agent));
	return new Promise((resolve, reject) => {
		const child = spawnImpl(config.command, [...config.args, prompt], { stdio: "inherit" });
		let settled = false;
		child.on("error", (error) => {
			if (settled) return;
			settled = true;
			if (error.code === "ENOENT") {
				reject(new UseCommandError(`Could not launch ${agents[agent].displayName}: command not found: ${config.command}`));
				return;
			}
			reject(error);
		});
		child.on("close", (code) => {
			if (settled) return;
			settled = true;
			resolve(code ?? 1);
		});
	});
}
function spawnAgent(command, args) {
	return spawn(command, args, { stdio: "inherit" });
}
function getUseHelp() {
	return `Usage: skills use <source>[@<skill>] [options]

Generate a prompt for using one skill without installing it.

Options:
  -s, --skill <skill>   Select the skill to use
  -a, --agent <agent>   Start one supported agent interactively (${SUPPORTED_USE_AGENTS.join(", ")})
  --full-depth          Search nested directories like skills add --full-depth
  -h, --help            Show this help message

Examples:
  skills use vercel-labs/agent-skills@web-design-guidelines | claude
  skills use vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code
  skills use vercel-labs/agent-skills@web-design-guidelines --agent codex`;
}
function resolveSelector(sourceSelector, optionSelector) {
	if (sourceSelector && optionSelector) {
		if (sourceSelector.toLowerCase() !== optionSelector.toLowerCase()) throw new UseCommandError(`Conflicting skill selectors: source selects "${sourceSelector}" but --skill selects "${optionSelector}". Provide one selector.`);
		return optionSelector;
	}
	return optionSelector ?? sourceSelector;
}
function selectSkill(skills, selector, source) {
	if (skills.length === 0) throw new UseCommandError("No valid skills found. Skills require a SKILL.md with name and description.");
	if (!selector) {
		if (skills.length === 1) return skills[0];
		throw new UseCommandError(formatMultipleSkillsError(source, skills.map(getSkillDisplayName)));
	}
	const selected = filterSkills(skills, [selector]);
	if (selected.length === 0) throw new UseCommandError(formatNoMatchError(selector, skills.map(getSkillDisplayName)));
	if (selected.length > 1) throw new UseCommandError(`Skill selector "${selector}" matched multiple skills.`);
	return selected[0];
}
function selectWellKnownSkill(skills, selector, source) {
	if (skills.length === 0) throw new UseCommandError("No skills found at this URL. Make sure the server has a /.well-known/agent-skills/index.json or /.well-known/skills/index.json file.");
	let selected;
	if (!selector) {
		if (skills.length !== 1) throw new UseCommandError(formatMultipleSkillsError(source, skills.map((s) => s.installName)));
		selected = skills;
	} else {
		selected = skills.filter((skill) => skill.installName.toLowerCase() === selector.toLowerCase() || skill.name.toLowerCase() === selector.toLowerCase());
		if (selected.length === 0) throw new UseCommandError(formatNoMatchError(selector, skills.map((s) => s.installName)));
		if (selected.length > 1) throw new UseCommandError(`Skill selector "${selector}" matched multiple skills.`);
	}
	const skill = selected[0];
	return {
		kind: "well-known",
		name: skill.name,
		directoryName: skill.installName,
		rawContent: skill.content,
		files: skill.files
	};
}
function formatMultipleSkillsError(source, names) {
	return [
		"This source contains multiple skills. Specify exactly one skill:",
		...names.map((name) => `  - ${name}`),
		"",
		`Examples:\n  skills use ${source}@${names[0] ?? "<skill>"}\n  skills use ${source} --skill ${names[0] ?? "<skill>"}`
	].join("\n");
}
function formatNoMatchError(selector, names) {
	return [
		`No matching skill found for: ${selector}`,
		"Available skills:",
		...names.map((name) => `  - ${name}`)
	].join("\n");
}
function validateUseAgentOption(agentValues) {
	if (!agentValues || agentValues.length === 0) return [];
	const errors = [];
	const validAgents = Object.keys(agents);
	const invalidAgents = agentValues.filter((agent) => agent !== "*" && !validAgents.includes(agent));
	if (agentValues.includes("*")) errors.push("skills use --agent does not support '*'; specify exactly one agent.");
	if (agentValues.length > 1) errors.push("skills use --agent accepts exactly one agent.");
	if (invalidAgents.length > 0) errors.push(`Invalid agents: ${invalidAgents.join(", ")}\nValid agents: ${validAgents.join(", ")}`);
	return errors;
}
function formatUnsupportedAgentError(agent) {
	return [`Running ${agents[agent].displayName} is not supported yet.`, `Supported agents for skills use --agent: ${SUPPORTED_USE_AGENTS.join(", ")}`].join("\n");
}
async function writeSnapshotFiles(targetDir, files) {
	for (const file of files) await writeSafeFile(targetDir, file.path, file.contents);
}
async function writeMapFiles(targetDir, files) {
	for (const [path, contents] of files) await writeSafeFile(targetDir, path, contents);
}
async function writeSafeFile(targetDir, filePath, contents) {
	const fullPath = join(targetDir, filePath);
	if (!isPathSafe(targetDir, fullPath)) return;
	await mkdir(dirname(fullPath), { recursive: true });
	if (typeof contents === "string") await writeFile(fullPath, contents, "utf-8");
	else await writeFile(fullPath, contents);
}
async function copySkillDirectory(src, dest) {
	await mkdir(dest, { recursive: true });
	const entries = await readdir(src, { withFileTypes: true });
	await Promise.all(entries.filter((entry) => !isExcluded(entry.name, entry.isDirectory())).map(async (entry) => {
		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);
		if (!isPathSafe(dest, destPath)) return;
		if (entry.isDirectory()) {
			await copySkillDirectory(srcPath, destPath);
			return;
		}
		try {
			await cp(srcPath, destPath, {
				dereference: true,
				recursive: true
			});
		} catch (err) {
			if (err instanceof Error && "code" in err && err.code === "ENOENT" && entry.isSymbolicLink()) {
				console.error(`Skipping broken symlink: ${srcPath}`);
				return;
			}
			throw err;
		}
	}));
}
async function containsSupportingFiles(rootDir, currentDir) {
	const entries = await readdir(currentDir, { withFileTypes: true });
	for (const entry of entries) {
		const entryPath = join(currentDir, entry.name);
		const relPath = relative(rootDir, entryPath).split(sep).join("/");
		if (entry.isDirectory()) {
			if (await containsSupportingFiles(rootDir, entryPath)) return true;
		} else if (relPath.toLowerCase() !== "skill.md") return true;
	}
	return false;
}
function isBlobSkill(skill) {
	return Array.isArray(skill.files);
}
function getSkillMdFromSnapshot(files) {
	return files.find((file) => file.path.toLowerCase() === "skill.md")?.contents ?? "";
}
function isExcluded(name, isDirectory) {
	return EXCLUDE_FILES.has(name) || isDirectory && EXCLUDE_DIRS.has(name);
}
function isPathSafe(basePath, targetPath) {
	const normalizedBase = normalize(resolve(basePath));
	const normalizedTarget = normalize(resolve(targetPath));
	return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
async function cleanupClone(tempDir) {
	if (tempDir) await cleanupTempDir(tempDir).catch(() => {});
}
function fail(message) {
	console.error(message);
	process.exit(1);
}
var UseCommandError = class extends Error {};
const __dirname = dirname(fileURLToPath(import.meta.url));
function getVersion() {
	try {
		const pkgPath = join(__dirname, "..", "package.json");
		return JSON.parse(readFileSync(pkgPath, "utf-8")).version;
	} catch {
		return "0.0.0";
	}
}
const VERSION = getVersion();
initTelemetry(VERSION);
const RESET = "\x1B[0m";
const BOLD = "\x1B[1m";
const DIM = "\x1B[38;5;102m";
const TEXT = "\x1B[38;5;145m";
const LOGO_LINES = [
	"███████╗██╗  ██╗██╗██╗     ██╗     ███████╗",
	"██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝",
	"███████╗█████╔╝ ██║██║     ██║     ███████╗",
	"╚════██║██╔═██╗ ██║██║     ██║     ╚════██║",
	"███████║██║  ██╗██║███████╗███████╗███████║",
	"╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝"
];
const GRAYS = [
	"\x1B[38;5;250m",
	"\x1B[38;5;248m",
	"\x1B[38;5;245m",
	"\x1B[38;5;243m",
	"\x1B[38;5;240m",
	"\x1B[38;5;238m"
];
function showLogo() {
	console.log();
	LOGO_LINES.forEach((line, i) => {
		console.log(`${GRAYS[i]}${line}${RESET}`);
	});
}
function showBanner() {
	showLogo();
	console.log();
	console.log(`${DIM}The open agent skills ecosystem${RESET}`);
	console.log();
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills add ${DIM}<package>${RESET}        ${DIM}Add a new skill${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills use ${DIM}<package>@<skill>${RESET} ${DIM}Use a skill without installing${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills remove${RESET}               ${DIM}Remove installed skills${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills list${RESET}                 ${DIM}List installed skills${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills find ${DIM}[query]${RESET}         ${DIM}Search for skills${RESET}`);
	console.log();
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills update${RESET}               ${DIM}Update installed skills${RESET}`);
	console.log();
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills experimental_install${RESET} ${DIM}Restore from skills-lock.json${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills init ${DIM}[name]${RESET}          ${DIM}Create a new skill${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills experimental_sync${RESET}    ${DIM}Sync skills from node_modules${RESET}`);
	console.log();
	console.log(`${DIM}try:${RESET} npx skills add vercel-labs/agent-skills`);
	console.log();
	console.log(`Discover more skills at ${TEXT}https://skills.sh/${RESET}`);
	console.log();
}
function showHelp() {
	console.log(`
${BOLD}Usage:${RESET} skills <command> [options]

${BOLD}Manage Skills:${RESET}
  add <package>        Add a skill package (alias: a)
                       e.g. vercel-labs/agent-skills
                            https://github.com/vercel-labs/agent-skills
  use <package>@<skill>
                       Generate a prompt for using one skill without installing it
  remove [skills]      Remove installed skills
  list, ls             List installed skills
  find [query]         Search for skills interactively

${BOLD}Find Options:${RESET}
  --owner <owner>        Search only repositories from a GitHub owner

${BOLD}Updates:${RESET}
  update [skills...]   Update skills to latest versions (alias: upgrade)

${BOLD}Update Options:${RESET}
  -g, --global           Update global skills only
  -p, --project          Update project skills only
  -y, --yes              Skip scope prompt (auto-detect: project if in a project, else global)

${BOLD}Project:${RESET}
  experimental_install Restore skills from skills-lock.json
  init [name]          Initialize a skill (creates <name>/SKILL.md or ./SKILL.md)
  experimental_sync    Sync skills from node_modules into agent directories

${BOLD}Add Options:${RESET}
  -g, --global           Install skill globally (user-level) instead of project-level
  -a, --agent <agents>   Specify agents to install to (use '*' for all agents)
  -s, --skill <skills>   Specify skill names to install (use '*' for all skills)
  -l, --list             List available skills in the repository without installing
  -y, --yes              Skip confirmation prompts
  --copy                 Copy files instead of symlinking to agent directories
  --metadata <json>      Attach valid JSON to the install telemetry event
  --subagent <names>     Install to Eve subagents (use 'root' for the root agent)
  --all                  Shorthand for --skill '*' --agent '*' -y
  --full-depth           Search all subdirectories even when a root SKILL.md exists

${BOLD}Use Options:${RESET}
  -s, --skill <skill>    Specify the skill to use
  -a, --agent <agent>    Start one supported agent interactively
  --full-depth           Search all subdirectories even when a root SKILL.md exists

${BOLD}Remove Options:${RESET}
  -g, --global           Remove from global scope
  -a, --agent <agents>   Remove from specific agents (omit to clean all agent links)
  -s, --skill <skills>   Specify skills to remove (use '*' for all skills)
  -y, --yes              Skip confirmation prompts
  --all                  Remove every installed skill (-y implied). Do not combine with named skills.
  
${BOLD}Experimental Sync Options:${RESET}
  -a, --agent <agents>   Specify agents to install to (use '*' for all agents)
  -y, --yes              Skip confirmation prompts

${BOLD}List Options:${RESET}
  -g, --global           List global skills (default: project)
  -a, --agent <agents>   Filter by specific agents
  --json                 Output as JSON (machine-readable, no ANSI codes)

${BOLD}Options:${RESET}
  --help, -h        Show this help message
  --version, -v     Show version number

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} skills add vercel-labs/agent-skills
  ${DIM}$${RESET} skills use vercel-labs/agent-skills@vercel-optimize | claude
  ${DIM}$${RESET} skills use vercel-labs/agent-skills --skill vercel-optimize --agent claude-code
  ${DIM}$${RESET} skills add vercel-labs/agent-skills -g
  ${DIM}$${RESET} skills add vercel-labs/agent-skills --agent claude-code cursor
  ${DIM}$${RESET} skills add vercel-labs/agent-skills --skill pr-review commit
  ${DIM}$${RESET} skills remove                        ${DIM}# interactive remove${RESET}
  ${DIM}$${RESET} skills remove web-design             ${DIM}# remove by name${RESET}
  ${DIM}$${RESET} skills rm --global frontend-design
  ${DIM}$${RESET} skills list                          ${DIM}# list project skills${RESET}
  ${DIM}$${RESET} skills ls -g                         ${DIM}# list global skills${RESET}
  ${DIM}$${RESET} skills ls -a claude-code             ${DIM}# filter by agent${RESET}
  ${DIM}$${RESET} skills ls --json                      ${DIM}# JSON output${RESET}
  ${DIM}$${RESET} skills find                          ${DIM}# interactive search${RESET}
  ${DIM}$${RESET} skills find typescript               ${DIM}# search by keyword${RESET}
  ${DIM}$${RESET} skills find react --owner vercel     ${DIM}# search within an owner${RESET}
  ${DIM}$${RESET} skills update
  ${DIM}$${RESET} skills update my-skill             ${DIM}# update a single skill${RESET}
  ${DIM}$${RESET} skills update -g                    ${DIM}# update global skills only${RESET}
  ${DIM}$${RESET} skills experimental_install            ${DIM}# restore from skills-lock.json${RESET}
  ${DIM}$${RESET} skills init my-skill
  ${DIM}$${RESET} skills experimental_sync              ${DIM}# sync from node_modules${RESET}
  ${DIM}$${RESET} skills experimental_sync -y           ${DIM}# sync without prompts${RESET}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}
function showRemoveHelp() {
	console.log(`
${BOLD}Usage:${RESET} skills remove [skills...] [options]

${BOLD}Description:${RESET}
  Remove installed skills from agents. If no skill names are provided,
  an interactive selection menu will be shown.

${BOLD}Arguments:${RESET}
  skills            Optional skill names to remove (space-separated)

${BOLD}Options:${RESET}
  -g, --global       Remove from global scope (~/) instead of project scope
  -a, --agent        Remove from specific agents (omit to clean all agent links)
  -s, --skill        Specify skills to remove (use '*' for all skills)
  -y, --yes          Skip confirmation prompts
  --all              Remove every installed skill (-y implied). Do not combine with named skills.

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} skills remove                           ${DIM}# interactive selection${RESET}
  ${DIM}$${RESET} skills remove my-skill                   ${DIM}# remove specific skill${RESET}
  ${DIM}$${RESET} skills remove skill1 skill2 -y           ${DIM}# remove multiple skills${RESET}
  ${DIM}$${RESET} skills remove --global my-skill          ${DIM}# remove from global scope${RESET}
  ${DIM}$${RESET} skills rm --agent claude-code my-skill   ${DIM}# remove from specific agent${RESET}
  ${DIM}$${RESET} skills remove --all                      ${DIM}# remove all skills${RESET}
  ${DIM}$${RESET} skills remove --skill '*' -a cursor      ${DIM}# remove all skills from cursor${RESET}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}
function runInit(args) {
	const cwd = process.cwd();
	const skillName = args[0] || basename(cwd);
	const hasName = args[0] !== void 0;
	const skillDir = hasName ? join(cwd, skillName) : cwd;
	const skillFile = join(skillDir, "SKILL.md");
	const displayPath = hasName ? `${skillName}/SKILL.md` : "SKILL.md";
	if (existsSync(skillFile)) {
		console.log(`${TEXT}Skill already exists at ${DIM}${displayPath}${RESET}`);
		return;
	}
	if (hasName) mkdirSync(skillDir, { recursive: true });
	writeFileSync(skillFile, `---
name: ${skillName}
description: A brief description of what this skill does
---

# ${skillName}

Instructions for the agent to follow when this skill is activated.

## When to use

Describe when this skill should be used.

## Instructions

1. First step
2. Second step
3. Additional steps as needed
`);
	console.log(`${TEXT}Initialized skill: ${DIM}${skillName}${RESET}`);
	console.log();
	console.log(`${DIM}Created:${RESET}`);
	console.log(`  ${displayPath}`);
	console.log();
	console.log(`${DIM}Next steps:${RESET}`);
	console.log(`  1. Edit ${TEXT}${displayPath}${RESET} to define your skill instructions`);
	console.log(`  2. Update the ${TEXT}name${RESET} and ${TEXT}description${RESET} in the frontmatter`);
	console.log();
	console.log(`${DIM}Publishing:${RESET}`);
	console.log(`  ${DIM}GitHub:${RESET}  Push to a repo, then ${TEXT}npx skills add <owner>/<repo>${RESET}`);
	console.log(`  ${DIM}URL:${RESET}     Host the file, then ${TEXT}npx skills add https://example.com/${displayPath}${RESET}`);
	console.log();
	console.log(`Browse existing skills for inspiration at ${TEXT}https://skills.sh/${RESET}`);
	console.log();
}
async function main() {
	const args = process.argv.slice(2);
	const inAgent = await isRunningInAgent();
	if (args.length === 0) {
		if (!inAgent) showBanner();
		return;
	}
	const command = args[0];
	const restArgs = args.slice(1);
	if (command !== "--help" && command !== "-h" && command !== "--version" && command !== "-v" && (restArgs.includes("--help") || restArgs.includes("-h"))) {
		if (command === "remove" || command === "rm" || command === "r") showRemoveHelp();
		else showHelp();
		return;
	}
	switch (command) {
		case "find":
		case "search":
		case "f":
		case "s":
			if (!inAgent) showLogo();
			console.log();
			await runFind(restArgs);
			break;
		case "init":
			if (!inAgent) showLogo();
			console.log();
			runInit(restArgs);
			break;
		case "experimental_install":
			if (!inAgent) showLogo();
			await runInstallFromLock(restArgs);
			break;
		case "i":
		case "install":
		case "a":
		case "add": {
			if (!inAgent) showLogo();
			const { source: addSource, options: addOpts, errors } = parseAddOptions(restArgs);
			if (errors.length > 0) {
				for (const error of errors) console.error(`Error: ${error}`);
				process.exitCode = 1;
				break;
			}
			await runAdd(addSource, addOpts);
			break;
		}
		case "use": {
			const { source: useSource, options: useOptions, errors: useErrors } = parseUseOptions(restArgs);
			await runUse(useSource, useOptions, useErrors);
			break;
		}
		case "remove":
		case "rm":
		case "r": {
			const { skills, options: removeOptions } = parseRemoveOptions(restArgs);
			await removeCommand(skills, removeOptions);
			break;
		}
		case "experimental_sync": {
			if (!inAgent) showLogo();
			const { options: syncOptions } = parseSyncOptions(restArgs);
			await runSync(restArgs, syncOptions);
			break;
		}
		case "list":
		case "ls":
			await runList(restArgs);
			break;
		case "check":
		case "update":
		case "upgrade":
			await runUpdate(restArgs);
			break;
		case "--help":
		case "-h":
			showHelp();
			break;
		case "--version":
		case "-v":
			console.log(VERSION);
			break;
		default:
			console.log(`Unknown command: ${command}`);
			console.log(`Run ${BOLD}skills --help${RESET} for usage.`);
			process.exitCode = 1;
	}
}
main().finally(() => flushTelemetry().then(() => process.exit(process.exitCode ?? 0)));
export {};
