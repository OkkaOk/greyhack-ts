String.prototype.color = function (color = "red") {
	if (!color) return this as string;
	return `<color=${color}>${this}</color>`;
};

String.prototype.bold = function() {
	return `<b>${this}</b>`;
}

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
	return padChar.repeat(count) + this;
};

String.prototype.padRight = function (count, padChar = " ") {
	return this + padChar.repeat(count);
};

String.prototype.format = function (...formats) {
	let thisString = this as string;
	if (!formats.length) return thisString;

	const matches = this.matches(/%[-.]?\w+/);

	for (const format of Object.values(matches)) {
		let length: string | number = 0;
		if (format[1] === "-" || format[1] === ".") {
			length = slice(format, 2, format.length - 1).toInt();
		}
		else {
			length = slice(format, 1, format.length - 1).toInt();
		}

		if (isType(length, "string")) length = 0;

		let item = formats.shift()!;

		if (format[-1] === "d" && isType(item, "number")) {
			item = Math.round(item);
		}

		let strItem = str(item);
		if (format[1] === "." && isType(item, "number")) {
			if (format[-1] === "d") {
				strItem = strItem.padLeft(length - strItem.length);
			}
			else if (format[-1] === "f" && length) {
				strItem = item.toFixed(length);
			}
		}
		else if (format[1] === "-") {
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
	return this.replace(/<[^<>]+>/, "");
};

String.prototype.rainbow = function (rainbowLength = 0, offset = 0) {
	const thisStr = this as string;
	if (!thisStr.length) return "";
	if (rainbowLength <= 0) rainbowLength = thisStr.length;

	let out = "";
	for (let i = 0; i < thisStr.length; i++) {
		const color = valueToColor((i + offset) % rainbowLength, rainbowLength);
		out = out + thisStr[i].color(color);
	}
	return out;
}

/** Map a number from 0-range to hex color */
export function valueToColor(value: number, range: number) {
	const hue = value * (360 / range);
	const rgb = hsvToRGB(hue, 1, 1);
	return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

export function hsvToRGB(h: number, s: number, v: number): [number, number, number] {
	const c = v * s;
	const x = c * (1 - Math.abs((h/60 % 2) - 1));
	const m = v - c;

	if (h < 60) return [(c+m)*255, (x+m)*255, (0+m)*255];
	if (h < 120) return [(x+m)*255, (c+m)*255, (0+m)*255];
	if (h < 180) return [(0+m)*255, (c+m)*255, (x+m)*255];
	if (h < 240) return [(0+m)*255, (x+m)*255, (c+m)*255];
	if (h < 300) return [(x+m)*255, (0+m)*255, (c+m)*255];
	return [(c+m)*255, (0+m)*255, (x+m)*255];
}

export function rgbToHex(red: number, green: number, blue: number) {
	function toHex(num: number) {
		if (num > 255) num = 255;
		if (num < 0) num = 0;

		const digits = "0123456789abcdef";
		const hi = Math.floor(num / 16);
		const lo = num % 16;
		return digits[hi] + digits[lo];
	}

	return "#" + toHex(Math.floor(red)) + toHex(Math.floor(green)) + toHex(Math.floor(blue));
}