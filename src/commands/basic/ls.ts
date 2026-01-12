import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";
import { formatColumnsf } from "../../utils/libokka";

const command = new Command({
	name: "ls",
	description: "Lists files and directories",
	category: "Data Operations",
	arguments: [
		{
			name: "path",
			description: "The path of the file",
			required: false,
			rest: true,
		}
	],
	options: [
		{
			name: "recursive",
			flags: ["-R", "--recursive"],
			description: "List files and directories recursively"
		},
		{
			name: "tree",
			flags: ["-t", "--tree"],
			description: "Prints the result as a tree. Useful with the recursive flag"
		},
		{
			name: "full",
			flags: ["-f", "--full-path"],
			description: "Prints the file path instead of the file name"
		},
		{
			name: "long",
			flags: ["-l", "--long"],
			description: "Shows detailed information about the files"
		},
		{
			name: "all",
			flags: ["-a", "--all"],
			description: "Shows hidden files as well"
		},
	]
});

command.run = function (args, options, process) {
	const session = FluxCore.currSession();
	const showHidden = "all" in options;

	let filePaths = [session.workingDir];
	if (args.length)
		filePaths = args;

	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;

	let lines: string[] = [];
	function addLine(file: GreyHack.File, depth: number) {
		let line = "";
		if ("long" in options)
			line += `${file.permissions!.color("green")} ${file.owner!.color("#FF9900")} ${file.group.color("#FF9900")} `;

		let text = file.name!;
		if ("full" in options)
			text = file.path();
		else if ("tree" in options)
			text = "|§".repeatSelf(depth) + text;

		line += text;
		if (file.isFolder())
			line = line.replaceLast("§", "-");

		lines.push(line);
	}

	function addFiles(folder: GreyHack.File, depth: number) {
		for (const subFolder of folder.getFolders()!) {
			if (subFolder.name![0] === "." && !showHidden)
				continue;

			addLine(subFolder, depth);
			if ("recursive" in options)
				addFiles(subFolder, depth + 1);
		}

		for (const file of folder.getFiles()!) {
			if (file.name![0] === "." && !showHidden)
				continue;
			addLine(file, depth);
		}
	}

	for (const filePath of filePaths) {
		const absPath = session.resolvePath(filePath);

		const fd = process.open(absPath, "r", true);
		if (!fd) {
			exitCode = EXIT_CODES.MISUSE;
			continue;
		}

		const file = process.resources[fd]!.file!;
		process.close(fd);

		if (!file.isFolder()) {
			process.write(1, filePath);
			continue;
		}

		lines = [];
		addFiles(file, 0);
		if (filePaths.length > 1)
			process.write(1, filePath + ":");
		if (lines.length > 1)
			process.write(1, formatColumnsf(lines, "left", true, { "§": " " }));
	}

	return exitCode;
};