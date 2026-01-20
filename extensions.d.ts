interface String {
	replaceFirst: (oldValue: string, newValue: string, offset?: number) => string;
	replaceLast: (oldValue: string, newValue: string) => string;
	repeatSelf: (count: number) => string;
	padLeft: (count: number, padChar?: string) => string;
	padRight: (count: number, padChar?: string) => string;
	format: (...formats: (string | number)[]) => string;
	color: (color: string) => string;
	removeTags: () => string;
	rainbow(rainbowLength?: number, offset?: number): string
}

interface Number {
	toFixed: (fractionDigits: number) => string;
}

interface Object {

}

interface Array<T> {

}

interface Function {

}