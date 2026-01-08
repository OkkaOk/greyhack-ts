export class Stream {
	classID = "stream";
	name: string;
	mode;
	file: GreyHack.File | null = null;
	data: string;
	onWriteListeners: Array<() => void>;

	constructor(name: string, mode: "r" | "w" | "rw") {
		this.name = name;
		this.mode = mode;
		this.file = null;
		this.data = "";
		this.onWriteListeners = [];
	}

	isEmpty() {
		return this.data.length === 0;
	}

	readOne() {
		const index = this.data.indexOf(char(10));
		if (index == null) {
			const data = this.data;
			this.data = "";
			return data;
		}

		const data = slice(this.data, 0, index);
		this.data = slice(this.data, index + 1);

		return data;
	}

	/** Clear the data this stream has */
	flush() {
		this.data = "";
	}

	/** Reads data from the stream */
	read(noSplit: true): string;
	read(noSplit?: boolean): string[];
	read(noSplit?: boolean): string | string[] {
		if (this.file) {
			const fileContent = this.file.getContent();
			if (!fileContent) {
				if (noSplit) return "";
				return [];
			}

			if (noSplit) return fileContent;
			return fileContent.split(char(10));
		}

		const data = this.data;
		this.data = "";

		if (noSplit) return data;

		if (!data) return [];
		return data.split(char(10));
	}

	/** Writes data to the stream */
	write(data: string | string[], omitNewLine?: boolean) {
		// I'm not writing to file here because
		// I think it's going to be pretty heavy so I buffer
		// it for a while and write it after the command has finished

		if (!omitNewLine && this.data) {
			this.data += char(10);
		}

		if (isType(data, "list"))
			this.data += data.join(char(10));
		else
			this.data += data;

		this.onWrite();
	}

	onWrite() {
		for (const listener of this.onWriteListeners) {
			listener();
		}

		return true;
	}
}