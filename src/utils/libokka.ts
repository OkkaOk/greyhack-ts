import type { Session } from "../core/Session";
import type { GCOType } from "../types/core";

String.prototype.color = function (color = "red") {
	if (!color) return this as string;
	return `<color=${color}>${this}</color>`;
};

String.prototype.replaceFirst = function (oldValue, newValue, offset) {
	const str = this as string;
	if (!oldValue) return str;

	const index = this.indexOf(oldValue, offset);
	if (index == null) return str;

	return slice(str, 0, index) + newValue + slice(str, index + oldValue.length);
};

String.prototype.replaceLast = function (oldValue, newValue) {
	const str = this as string;
	if (!oldValue) return str;

	const index = this.lastIndexOf(oldValue);
	if (index === null || index === -1) return str;

	return slice(str, 0, index) + newValue + slice(str, index + oldValue.length);
};

String.prototype.padLeft = function (count, padChar = " ") {
	return padChar.repeatSelf(count) + this;
};

String.prototype.padRight = function (count, padChar = " ") {
	return this + padChar.repeatSelf(count);
};

String.prototype.repeatSelf = function (count) {
	if (count <= 0) return "";
	let thisString = this as string;
	if (count === 1) return thisString;

	const s = thisString;
	for (const _ of range(count - 2)) {
		thisString += s;
	}

	return thisString;
};

String.prototype.format = function (...formats) {
	let thisString = this as string;
	if (!formats.length) return thisString;

	const matches = this.matches("%[-.]?\\w+");

	for (const format of matches.values() as string[]) {
		let length: string | number = 0;
		if (format[1] == "-" || format[1] == ".") {
			length = slice(format, 2, format.length - 1).toInt();
		}
		else {
			length = slice(format, 1, format.length - 1).toInt();
		}

		if (isType(length, "string")) length = 0;

		let item = formats.pull();

		if (format[-1] === "d" && isType(item, "number")) {
			item = Math.round(item);
		}

		let strItem = str(item);
		if (format[1] === "." && isType(item, "number")) {
			if (format[-1] === "d") {
				strItem = strItem.padLeft(length - strItem.length);
			}
			else if (format[-1] == "f" && length) {
				strItem = item.toFixed(length);
			}
		}
		else if (format[1] == "-") {
			strItem = strItem.padRight(length - strItem.length);
		}
		else {
			strItem = strItem.padLeft(length - strItem.length);
		}

		thisString = thisString.replaceFirst(format, strItem);
	}

	return thisString;
};

String.prototype.removeTags = function () {
	return this.replace("<[^<>]+>", "");
};

Number.prototype.toFixed = function (fractionDigits) {
	const thisNum = this as number;
	fractionDigits = Math.floor(fractionDigits);
	if (fractionDigits <= 0) return str(Math.round(thisNum));

	let value = thisNum;
	value = value * (10 ** fractionDigits);
	value = Math.round(value);
	value = value / (10 ** fractionDigits);

	let strValue = str(value);
	const dotIndex = strValue.indexOf(".");
	if (dotIndex == null) {
		strValue = `${strValue}.${"0".repeatSelf(fractionDigits)}`;
	}
	else if (slice(strValue, dotIndex + 1).length < fractionDigits) {
		strValue = strValue + ("0".repeatSelf(fractionDigits - slice(strValue, dotIndex + 1).length));
	}

	return strValue;
};

export function updateLib(libPath: string): GreyHack.LibTypes[keyof GreyHack.LibTypes] | null {
	let lib = includeLib(libPath);
	if (!lib) {
		print(`A library doesn't exist at path: ${libPath}`);
		return null;
	}

	const fluxCore = getCustomObject<GCOType>()["fluxCore"];
	if (!fluxCore)
		return null;

	const session = fluxCore.sessionPath[-1];
	if (!session.apt) return lib;
	
	const libName = basename(libPath);
	let result = session.apt.checkUpgrade(libPath);
	if (isType(result, "string")) {
		print(`<color=red>Error while checking upgrades for ${libName}: ${result}`);
		return lib;
	}

	// No updates
	if (result === false) return lib;

	print(`<color=green>Updating ${libName}`);
	session.computer.file(libPath)!.delete();
	result = session.apt.install(libName, parentPath(libPath));

	if (isType(result, "string")) {
		print(`<color=red>Failed to update ${libName}: ${result}`);
		return lib;
	}

	return includeLib(libPath);
}

export function requireLib<Lib extends keyof GreyHack.LibTypes>(libName: Lib): GreyHack.LibTypes[Lib] | null {
	let lib = includeLib(`/lib/${libName}`) as GreyHack.LibTypes[Lib] | null;
	if (lib) return lib;

	const fluxFolder = parentPath(programPath());
	lib = includeLib(`${fluxFolder}/${libName}`) as GreyHack.LibTypes[Lib] | null;
	if (lib) return lib;

	const gco = getCustomObject<GCOType>();
	if (!gco.fluxCore) return null;

	const currSession = gco.fluxCore.sessionPath[-1];
	if (!currSession.computer.isNetworkActive()) {
		print(`Failed to load ${libName} and there is no internet connection to download it.`);
		return null;
	}

	// Try to scp it from existing sessions
	for (const session of gco.fluxCore.sessions.values() as Session[]) {
		if (!session.shell) continue;
		if (session === currSession) continue;

		let res = session.shell.scp(`/lib/${libName}`, fluxFolder, getShell());
		if (res === true) return includeLib(`${fluxFolder}/${libName}`) as GreyHack.LibTypes[Lib] | null;

		res = session.shell.scp(`${fluxFolder}/${libName}`, fluxFolder, getShell());
		if (res === true) return includeLib(`${fluxFolder}/${libName}`) as GreyHack.LibTypes[Lib] | null;
	}

	if (currSession.apt) {
		print(`Installing ${libName}...`);
		const result = currSession.apt.install(libName);

		if (isType(result, "string")) {
			print(`Failed to install ${libName}: ${result}`);
			return null;
		}

		lib = includeLib(`/lib/${libName}`) as GreyHack.LibTypes[Lib] | null;
		if (lib) return lib;
	}

	print(`<color=red>Error: Can't find ${libName} library in the /lib path or the current folder and failed to install it`);
	return null;
}

export function ynPrompt(prompt: string, defaultChoice: "y" | "n" | "" = ""): "y" | "n" {
	let input = "";
	let yn = "[y/n]";
	if (defaultChoice === "y") yn = "[Y/n]";
	if (defaultChoice === "n") yn = "[y/N]";

	while (true) {
		input = userInput(`${prompt} ${yn}: `).lower();
		if (!input) input = defaultChoice;

		if (input.length > 0 && (input[0] === "y" || input[0] === "n")) break;
		print("invalid input");
	}

	return input[0];
}

export function getDeviceId(device: GreyHack.Shell | GreyHack.Computer): string {
	if (isType(device, "shell"))
		device = device.hostComputer;
	return slice(md5(device.publicIp + device.localIp), 0, 6);
}

export function resolvePath(basePath: string, relativePath?: string): string {
	if (!relativePath) return basePath;
	if (relativePath[0] === "/") basePath = "/";

	const currParts = basePath.split("\/");
	const relativeParts = relativePath.split("\/");

	for (const part of relativeParts) {
		if (part === "..") {
			if (currParts.length > 0) currParts.pop();
		}
		else if (part && part !== ".") {
			currParts.push(part);
		}
	}

	for (let i = currParts.length - 1; i >= 0; i--) {
		if (currParts[i] === "") currParts.remove(i);
	}

	return "/" + currParts.join("/");
}

export function basename(path: string) {
	const parts = path.split("/");
	if (!parts.length) return "";
	return parts[-1];
}

export function isValidMd5(md5: string): boolean {
	if (md5.length != 32) return false;
	for (const c of md5) {
		const num = code(c);
		// Outside of 0-9 and a-f
		if ((num < 48 || num > 57) && (num < 97 || num > 102))
			return false;
	}

	return true;
}

export function getDays(dateStr = ""): number {
	if (!dateStr) dateStr = currentDate();

	const segments = dateStr.split(" - ");
	const date = segments[0].split("/");
	const day = date[0].val();
	const month = date[1] as keyof typeof monthIndexes;
	const year = date[2].val();

	let days = (year - 2000) * 365.25;

	const monthIndexes = {
		"Jan": 1,
		"Feb": 2,
		"Mar": 3,
		"Apr": 4,
		"May": 5,
		"Jun": 6,
		"Jul": 7,
		"Aug": 8,
		"Sep": 9,
		"Oct": 10,
		"Nov": 11,
		"Dec": 12,
	};

	for (let i = 0; i < monthIndexes[month]; i++) {
		if (i === 2)
			days += 28;
		else if (i % 2 === 0)
			days += 30;
		else
			days += 31;
	}

	days += day;

	return Math.round(days);
}

type FormatSettings = {
	align?: "left" | "center" | "right",
	spacing?: number,
	joinLines?: boolean
	replacer?: Record<string, string>,
}

type FormatSettingsJoined = {
	joinLines: true,
} & FormatSettings

function test(settings: FormatSettingsJoined): string;
function test(settings: FormatSettings): string[];
function test(settings: FormatSettings | FormatSettingsJoined): string[] | string {
	return ""
}

const asd = test({ joinLines: false })

export function formatColumnsf(rows: string[], align: "left" | "center" | "right", joinLines?: false, replacer?: Record<string, string>, spacing?: number): string[];
export function formatColumnsf(rows: string[], align: "left" | "center" | "right", joinLines: true, replacer?: Record<string, string>, spacing?: number): string;
export function formatColumnsf(
	rows: string[],
	align: "left" | "center" | "right", 
	joinLines?: boolean,
	replacer?: Record<string, string>,
	spacing = 1
): string | string[] {
	if (!replacer) replacer = {};

	const longestStrings: number[] = [];

	for (const line of rows) {
		const values = line.removeTags().split(" ");

		for (let i = 0; i < values.length; i++) {
			if (i >= longestStrings.length) longestStrings.push(0);

			const cleanString = values[i];
			const length = cleanString.length;
			if (length > longestStrings[i]) longestStrings[i] = length;
		}
	}

	const newLines: string[] = [];
	for (const line of rows) {
		const values = line.split(" ");

		for (let i = 0; i < values.length; i++) {
			const padding = longestStrings[i] - values[i].removeTags().length;
			if (padding <= 0) continue;

			let paddingLeft = 0;
			let paddingRight = 0;
			if (align === "left")
				paddingRight = padding;
			else if (align === "right")
				paddingLeft = padding;
			else {
				paddingLeft = Math.floor(padding / 2);
				paddingRight = Math.floor(padding / 2);
			}

			values[i] = values[i].padLeft(paddingLeft).padRight(paddingRight);
		}
		
		let newLine = values.join(" ".repeatSelf(spacing));
		for (const key of Object.keys(replacer)) {
			newLine = newLine.replace(key, replacer[key]);
		}

		if (!("IS_GREYBEL" in globals))
			newLine = "<mspace=0.65em>" + newLine;

		newLines.push(newLine);
	}

	if (joinLines)
		return newLines.join(char(10));

	return newLines;
}