/** biome-ignore-all lint/suspicious/noEmptyInterface: <> */
/** biome-ignore-all lint/correctness/noUnusedVariables: <> */

interface String {
	replaceFirst(oldValue: string, newValue: string, offset?: number): string;
	replaceLast(oldValue: string, newValue: string): string;
	padLeft(count: number, padChar?: string): string;
	padRight(count: number, padChar?: string): string;
	format(...formats: (string | number)[]): string;
	removeTags(): string;
	rainbow(rainbowLength?: number, offset?: number): string
	color(color: string): string;
	bold(): string;
}

interface Number {
	toFixed(fractionDigits: number): string;
}

interface Object {

}

interface Array<T> {

}

interface Function {

}