import { basename, resolvePath } from "../../utils/libokka";
import { FluxShell } from "./FluxShell";
import { Stream } from "./Stream";

type ProcessResources = {
	0: Stream,
	1: Stream,
	2: Stream,
	[fd: number]: Stream,
}

export class Process {
	classID = "process";
	pid: number;
	nextFd = 3;
	name;
	parent: Process;
	resources: ProcessResources;

	constructor(pid: number, name: string, parentProcess?: Process) {
		this.pid = pid;
		this.name = name;

		if (parentProcess) {
			this.parent = parentProcess;
			this.resources = Object.assign({}, parentProcess.resources);
		}
		else {
			this.parent = this;
			this.resources = {
				0: new Stream("stdin", "rw"),
				1: new Stream("stdout", "rw"),
				2: new Stream("stderr", "rw"),
			};
		}
	}

	/** Clones the process but gives it a new PID */
	clone(): Process {
		const cloned = new Process(FluxShell.raw.currPID, this.name, this);
		FluxShell.raw.currPID += 1;
		return cloned;
	}

	/** Creates a pipe and returns the file descriptor to it */
	pipe() {
		const fd = this.nextFd;
		this.nextFd += 1;

		const pipe = new Stream("pipe", "rw");
		this.resources[fd] = pipe;

		return fd;
	}

	/** Flush the stream */
	flush(fd: number) {
		if (!this.resources[fd]) {
			this.write(2, "Bad file descriptor (" + fd + ") [Process.flush]");
			return false;
		}

		this.resources[fd].flush();
		return true;
	}

	/** Writes data to a file descriptor */
	write(fd: number, data: string | Array<string>, omitNewLine?: boolean) {
		if (!this.resources[fd]) {
			this.write(2, "Bad file descriptor (" + fd + ") [Process.write]");
			return false;
		}

		if (fd === 2 && isType(data, "list")) {
			let i = 0;
			while (i < data.length) {
				data[i] = this.name + " > " + data[i];
				i += i;
			}
		}
		else if (fd === 2) {
			data = this.name + " > " + data;
		}

		this.resources[fd].write(data, omitNewLine);
		return true;
	}

	/** Reads data from a file descriptor */
	read(fd: number, noSplit: true): string;
	read(fd: number, noSplit?: false): string[];
	read(fd: number, noSplit?: boolean): string | string[] {
		if (!this.resources[fd]) {
			this.write(2, "Bad file descriptor (" + fd + ") [Process.read]");
			if (noSplit) return "";
			return [];
		}

		return this.resources[fd].read(noSplit);
	}

	/** Redirects `oldFd` to `newFd`. Basically `dup()` and `dup2()` from C combined 
	 * @example process.dup(1, 2) // Now everything written to 2(stderr) will go to 1(stdout)
	 */
	dup(oldFd: number, newFd?: number): number {
		if (!isType(oldFd, "number")) oldFd = str(oldFd).toInt() as number;
		if (!isType(newFd, "number")) newFd = str(newFd).toInt() as number;
		if (!isType(newFd, "number")) {
			newFd = this.nextFd;
			this.nextFd += 1;
		}

		if (!Object.hasOwn(this.resources, oldFd)) {
			this.write(2, "Bad file descriptor (" + oldFd + ") [Process.dup]");
			return -1;
		}

		if (oldFd === newFd) return oldFd;

		if (Object.hasOwn(this.resources, newFd)) {
			this.close(newFd);
		}

		this.resources[newFd] = this.resources[oldFd];
		return newFd;
	}

	/** Opens a file */
	open(filePath: string, mode: "r" | "w" | "rw", ignoreType = false): number | null {
		const fd = this.nextFd;

		let computer = getShell().hostComputer;
		if (FluxShell.raw.core) {
			const session = FluxShell.raw.core.currSession();
			filePath = session.resolvePath(filePath);
			computer = session.computer;
		}
		else {
			filePath = resolvePath(currentPath(), filePath);
		}

		let file = computer.file(filePath);
		const fileName = basename(filePath);

		if (!file) {
			if (mode === "r") {
				this.write(2, filePath + ": No such file or directory");
				return null;
			}

			let result = computer.touch(parentPath(filePath), fileName);
			if (isType(result, "string")) {
				if (result.indexOf("Can't create file") !== null && result.indexOf(".") != null) result = result.split(/\./)[-1].trim();
				this.write(2, `Failed to create file ${filePath}: ${result}`);
				return null;
			}

			file = computer.file(filePath)!;
		}

		if (mode === "r" || mode === "rw") {
			if (!file.hasPermission("r")) {
				this.write(2, filePath + ": Permission denied (r)");
				return null;
			}

			if (file.isFolder() && !ignoreType) {
				this.write(2, filePath + ": Is a directory");
				return null;
			}

			if (file.isBinary() && !ignoreType) {
				this.write(2, filePath + ": Is a binary file");
				return null;
			}
		}

		if ((mode === "w" || mode === "rw") && !file.hasPermission("w")) {
			this.write(2, filePath + ": Permission denied (w)");
			return null;
		}

		const stream = new Stream("fileStream", mode);
		stream.file = file;
		stream.data = stream.read(true);

		this.nextFd += 1;
		this.resources[fd] = stream;

		return fd;
	}

	/** Closes a file descriptor */
	close(fd: number) {
		if (!this.resources[fd]) {
			this.write(2, "Bad file descriptor (" + fd + ") [Process.close]");
			return false;
		}

		const stream = this.resources[fd];

		// I could save the file everytime something gets written to it but I like
		// it this way when we only save after we close it (typically after command)
		if (stream.name == "fileStream" && (stream.mode == "w" || stream.mode == "rw")) {
			if (!stream.file!.hasPermission("w")) {
				this.write(2, "No write permission to file: " + stream.file!.path());
				return false;
			}

			const result = stream.file!.setContent(stream.data);

			if (isType(result, "string")) {
				this.write(2, "Failed to write to file: " + result);
			}
		}

		Object.remove(this.resources, fd);
		return true;
	}
}