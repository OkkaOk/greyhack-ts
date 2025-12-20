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

String.prototype.repeatSelf = function (count) {
	if (count <= 0) return "";
	let thisString = this as string;
	if (count === 1) return thisString;
	
	const s = thisString;
	for (const _ of range(count - 2)) {
		thisString += s;
	}

	return thisString;
}

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
			item = round(item);
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

Number.prototype.toFixed = function (fractionDigits) {
	const thisNum = this as number;
	fractionDigits = floor(fractionDigits);
	if (fractionDigits <= 0) return str(round(thisNum));

	let value = thisNum;
	value = value * (10 ** fractionDigits);
	value = round(value);
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

export function resolvePath(basePath: string, relativePath?: string) {
	if (!relativePath) return basePath;
	if (relativePath[0] === "/") basePath = "/";

	const currParts = basePath.split("\/");
	const relativeParts = relativePath.split("\/");

	for (const part of relativeParts) {
		if (part === "..") {
			if (currParts.length > 0) currParts.pop();
		}
		else if (part && part !== ".") {
			currParts.push(part)
		}
	}

	for (let i = currParts.length - 1; i >= 0; i--) {
		if (!currParts[i]) currParts.remove(i);
	}

	return "/" + currParts.join("/");
}

export function baseName(path: string) {
	return path.split("/")[-1];
}