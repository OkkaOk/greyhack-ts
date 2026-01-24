export class JSON {
	private static pos = 0;
	private static text = "";
	private static textLength = 0;

	/** Converts a value to a JavaScript Object Notation (JSON) string. */
	static stringify(value: any): string {
		return str(value);
	}

	/** Converts a JavaScript Object Notation (JSON) string into an object */
	static parse(text: string): any {
		this.pos = 0;
		this.text = text;
		this.textLength = text.length;

		return this.parseValue();
	}

	private static peek(): string {
		if (this.pos >= this.textLength) return "";
		return this.text[this.pos];
	}

	private static nextChar(): string {
		const c = this.text[this.pos];
		this.pos += 1;
		return c;
	}

	private static isWs(c: string): boolean {
		if (c === " " || c === char(10) || c === char(13) || c === char(9))
			return true;

		return false;
	}

	private static skipWs(): void {
		while (this.pos < this.textLength && this.isWs(this.text[this.pos]))
			this.pos += 1;
	}

	private static hexToInt(hexString: string): number {
		let value = 0;

		for (const ch of hexString.toLowerCase()) {
			let d = "0123456789".indexOf(ch);
			if (d !== null) {
				value = value * 16 + d;
				continue;
			}

			d = "abcdef".indexOf(ch);
			if (d !== null) {
				value = value * 16 + 10 + d;
				continue;
			}
		}

		return value;
	}

	private static parseValue() {
		this.skipWs();
		if (this.pos >= this.textLength)
			return null;

		const c = this.text[this.pos];
		if (c === "{") return this.parseObject();
		if (c === "[") return this.parseArray();
		if (c === char(34) || c === "'") return this.parseString();

		// Literals
		if (slice(this.text, this.pos, this.pos + 4) === "true") {
			this.pos += 4;
			return true;
		}

		if (slice(this.text, this.pos, this.pos + 5) === "false") {
			this.pos += 4;
			return false;
		}

		if (slice(this.text, this.pos, this.pos + 4) === "null") {
			this.pos += 4;
			return null;
		}

		return this.parseNumber();
	}

	private static parseArray(): any[] {
		this.nextChar(); // consume [
		this.skipWs();
		const out: any[] = [];

		if (this.peek() === "]") {
			this.pos += 1;
			return out;
		}

		if (this.pos >= this.textLength) return out;

		while (this.pos < this.textLength) {
			const value = this.parseValue();
			out.push(value);

			this.skipWs();
			const ch = this.peek();
			if (ch === ",") {
				this.pos += 1;
				this.skipWs();
				continue;
			}

			if (ch === "]") {
				this.pos += 1;
				break;
			}

			// malformed
			break;
		}

		return out;
	}

	private static parseObject(): object {
		this.nextChar(); // consume {
		this.skipWs();

		const out: Record<string, any> = {};
		if (this.peek() === "}") {
			this.pos += 1;
			return out;
		}

		while (this.pos < this.textLength) {
			const key = this.parseString();
			this.skipWs();
			if (this.peek() != ":") break;

			this.pos += 1;
			const value = this.parseValue();
			out[key] = value;

			this.skipWs();
			if (this.peek() === ",") {
				this.pos += 1;
				this.skipWs();
				continue;
			}

			if (this.peek() === "}") {
				this.pos += 1;
				break;
			}

			break;
		}

		return out;
	}

	private static parseNumber(): number | null {
		if (this.pos >= this.textLength) return null;

		const isNegative = this.text[this.pos] === "-";
		if (isNegative)
			this.pos += 1;

		let intPart = 0;
		while (this.pos < this.textLength) {
			const ch = this.text[this.pos];
			const d = ch.toInt();
			if (isType(d, "string"))
				break;

			intPart = intPart * 10 + d;
			this.pos += 1;
		}

		let num = intPart;

		// Fractional
		if (this.peek() === ".") {
			this.pos += 1;
			let frac = 0;
			let pow10 = 1;

			while (this.pos < this.textLength) {
				const ch = this.text[this.pos];
				const d = ch.toInt();
				if (isType(d, "string"))
					break;

				frac = frac * 10 + d;
				pow10 = pow10 * 10;
				this.pos += 1;
			}
			
			num = num + (frac / pow10);
		}

		// Exponent
		if (this.peek() === "e" || this.peek() === "E") {
			this.pos += 1;
			let sign = 1;
			if (this.peek() === "+") this.pos += 1;
			if (this.peek() === "-") {
				sign = -1;
				this.pos += 1;
			}

			let exp = 0;
			while (this.pos < this.textLength) {
				const ch = this.text[this.pos];
				const d = ch.toInt();
				if (isType(d, "string"))
					break;

				exp = exp * 10 + d;
				this.pos += 1;
			}

			const pow = 10 ** exp;
			if (sign === 1)
				num = num * pow;
			else
				num = num / pow;
		}

		if (isNegative) num = -num;
		return num;
	}

	private static parseString(): string {
		const quote = this.nextChar();
		let out = "";

		while (this.pos < this.textLength) {
			const ch = this.nextChar();
			if (ch === quote) return out;
			if (ch === "\\") {
				const esc = this.nextChar();
				if (esc === char(34)) out += char(34);
				if (esc === "'") out += "'";
				if (esc === "\\") out += "\\";
				if (esc === "/") out += "/";
				if (esc === "b") out += char(8);
				if (esc === "f") out += char(12);
				if (esc === "n") out += char(10);
				if (esc === "r") out += char(13);
				if (esc === "t") out += char(9);
				if (esc === "u") {
					const hex = slice(this.text, this.pos, this.pos + 4);
					this.pos += 4;
					const code = this.hexToInt(hex);
					out += char(code);
				}
				continue;
			}

			out += ch;
		}

		return out;
	}
}