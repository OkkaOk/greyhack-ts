import { isQuoted, resolvePath } from "../../utils/libokka";
import { FluxShell } from "./FluxShell";

interface ExtToken {
	value: string;
	original: boolean;
};

export function expandVariables(input: string): string {
	if (!input.length) return "";

	const varMatches = input.matches(/\$[^"" ]+/);
	Object.assign(varMatches, input.matches(/\$\{[^}]+\}/));

	for (const index of Object.keys(varMatches)) {
		// Escaped
		if (index > 0 && input[index - 1] === "\\") {
			input = slice(input, 0, index - 1) + slice(input, index);
			continue;
		}

		let varName = slice(varMatches[index], 1); // Skip $ character
		if (varName[0] === "{" && varName[-1] === "}")
			varName = slice(varName, 1, -1);

		if (!(varName in FluxShell.raw.env)) continue;

		input = slice(input, 0, index) + FluxShell.raw.env[varName] + slice(input, index + varMatches[index].length);
	}

	return input;
}

function expandBraces(tokens: ExtToken[]): ExtToken[] {
	return tokens;
}

function expandTilde(tokens: ExtToken[]): ExtToken[] {
	let home = homeDir();
	if (FluxShell.raw.core) {
		home = FluxShell.raw.core.currSession().homeDir();
	}

	for (const token of tokens) {
		if (token.value[0] === "~") {
			token.value = home + slice(token.value, 1);
		}
	}

	return tokens;
}

function expandParameters(tokens: ExtToken[]): ExtToken[] {
	for (const token of tokens) {
		token.value = expandVariables(token.value);
	}
	return tokens;
}

function arithmeticExpansion(tokens: ExtToken[]): ExtToken[] {
	return tokens;
}

function splitWords(tokens: ExtToken[]): ExtToken[] {
	return tokens;
}

function expandFilename(tokens: ExtToken[]): ExtToken[] {
	const computer = FluxShell.currComputer;

	let workingDir = currentPath();
	if (FluxShell.raw.core)
		workingDir = FluxShell.raw.core.currSession().workingDir;

	for (let i = 0; i < tokens.length; i++) {
		if (!tokens[i].original) continue;
		if (isQuoted(tokens[i].value)) continue;

		// Check if token doesn't contain glob characters
		if (tokens[i].value.indexOf("*") == null && tokens[i].value.indexOf("?") == null) {
			continue;
		}

		const matches = globMatch(tokens[i].value, computer, workingDir);

		// If no matches found, leave the token as-is (bash behavior)
		if (matches.length === 0) {
			continue;
		}

		tokens[i].value = matches[0];
		tokens[i].original = false;

		// If matches found, expand to all matches
		for (let j = matches.length - 1; j >= 1; j--) {
			tokens.insert(i + 1, {
				value: matches[j]!,
				original: false,
			});
		}
	}

	return tokens;
}

function removeQuotes(tokens: ExtToken[]): ExtToken[] {
	for (const token of tokens) {
		if (!token.original) continue;

		let current = "";
		let quoteChar = "";
		let inQuotes = false;

		for (const c of token.value) {
			if (inQuotes && c === quoteChar) {
				inQuotes = false;
				quoteChar = "";
				continue;
			}

			if (!inQuotes && (c === char(34) || c === char(39))) {
				inQuotes = true;
				quoteChar = c;
				continue;
			}

			if (inQuotes) {
				current += c;
				continue;
			}

			current += c;
		}

		token.value = current;
	}

	return tokens;
}

export function tokenize(input: string): string[] {
	if (!input) return [];

	input = input.trim();
	if (!input.length) return [];

	if (input.indexOf("!!") != null && FluxShell.raw.history.length) {
		const lastCmd = FluxShell.raw.history[-1];
		input = input.replace("!!", lastCmd);
		console.log(input);
	}

	let inQuotes = false;
	let quoteChar = "";
	const tokens: string[] = [];
	const data = {
		current: "",
	};

	function pushCurrent() {
		if (!data.current) return;
		tokens.push(data.current);
		data.current = "";
	}

	let i = -1;
	while (i < input.length - 1) {
		i += 1;
		const c = input[i];

		if (inQuotes && c === quoteChar) {
			inQuotes = false;
			quoteChar = "";
			data.current += c;
			continue;
		}

		if (!inQuotes && (c === char(34) || c === char(39))) { // " or '
			inQuotes = true;
			quoteChar = c;
			data.current += c;
			continue;
		}

		if (inQuotes) {
			data.current += c;
			continue;
		}

		const nextTwo = slice(input, i, i + 2);
		if (c === " ") {
			pushCurrent();
		}
		else if (nextTwo === "&&") {
			pushCurrent();
			tokens.push("&&");
			i += 1;
		}
		else if (nextTwo === "||") {
			pushCurrent();
			tokens.push("||");
			i += 1;
		}
		else if (c === ";") {
			pushCurrent();
			tokens.push(c);
		}
		else {
			data.current += c;
		}
	}

	pushCurrent();

	let extTokens: ExtToken[] = [];
	for (const token of tokens) {
		extTokens.push({
			value: token,
			original: true,
		});
	}

	// https://www.gnu.org/software/bash/manual/html_node/Shell-Expansions.html
	extTokens = expandBraces(extTokens);
	extTokens = expandTilde(extTokens);
	extTokens = expandParameters(extTokens);
	extTokens = arithmeticExpansion(extTokens);
	extTokens = splitWords(extTokens);
	extTokens = expandFilename(extTokens);
	extTokens = removeQuotes(extTokens);

	return extTokens.map(ext => ext.value);
}

function globMatch(pattern: string, computer: GreyHack.Computer, workingDir: string): string[] {
	const matches: string[] = [];

	// Split pattern into directory and filename parts
	let dirPath = workingDir;
	let givenDirPath = "";
	let filePattern = pattern;

	const lastSlash = pattern.lastIndexOf("/");
	if (lastSlash !== -1) {
		givenDirPath = pattern.slice(0, lastSlash);
		dirPath = resolvePath(workingDir, givenDirPath);
		filePattern = pattern.slice(lastSlash + 1);
	}

	// Get directory contents
	const dir = computer.file(dirPath);
	if (!dir || !dir.isFolder()) {
		return matches;
	}

	const files: GreyHack.File[] = [];

	files.push(...dir.getFiles()!, ...dir.getFolders()!);

	for (const file of files) {
		if (globMatchesFile(filePattern, file.name!)) {
			let outText = file.name!;
			if (givenDirPath)
				outText = givenDirPath + "/" + outText;

			matches.push(outText);
		}
	}

	// Sort matches alphabetically (bash behavior)
	matches.sort();
	return matches;
}

function globMatchesFile(pattern: string, filename: string): boolean {
	let p = 0; // pattern index
	let f = 0; // filename index

	while (p < pattern.length && f < filename.length) {
		if (pattern[p] === "*") {
			// * matches zero or more characters
			if (p === pattern.length - 1) {
				// * at end matches everything
				return true;
			}

			// Try to match rest of pattern
			const restPattern = pattern.slice(p + 1);
			while (f <= filename.length) {
				if (globMatchesFile(restPattern, filename.slice(f))) {
					return true;
				}
				f++;
			}
			return false;
		}
		else if (pattern[p] === "?") {
			// ? matches exactly one character
			p++;
			f++;
		}
		else {
			// Literal character match
			if (pattern[p] !== filename[f]) {
				return false;
			}
			p++;
			f++;
		}
	}

	return p === pattern.length && f === filename.length;
}