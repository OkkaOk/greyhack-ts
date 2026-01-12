import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "find",
	description: "Finds files based on criteria",
	category: "Data Operations",
	examples: [
		"find -p=rw -t=f"
	],
	acceptsStdin: true,
	arguments: [
		{
			name: "folder",
			description: "The folder we're searching from",
			required: false,
		}
	],
	options: [
		{
			name: "permissions",
			flags: ["-p", "--permissions"],
			description: "What permissions should the current user have for the files (r, w, x).",
			type: "string",
		},
		{
			name: "types",
			flags: ["-t", "--type"],
			description: "File type. f for file, d for directory, b for binary",
			type: "string",
		}
	]
});

command.run = function (args, options, process) {
	const session = FluxCore.currSession();

	let folderPath = "/";
	if (args.length) folderPath = session.resolvePath(args[0]!);

	const folderFile = session.computer.file(folderPath);
	if (!folderFile) {
		process.write(2, "Invalid path");
		return EXIT_CODES.GENERAL_ERROR;
	}

	if (!folderFile.isFolder()) {
		process.write(2, `${folderFile.path()} is not a folder.`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const perms: ("r" | "w" | "x")[] = [];
	let types: ("f" | "b" | "d")[] = ["f", "b", "d"];

	if ("permissions" in options) {
		for (const perm of options["permissions"] as typeof perms) {
			if (perms.indexOf(perm) === null) perms.push(perm);
		}
	}

	if ("types" in options) {
		types = [];
		for (const type of options["types"] as typeof types) {
			if (types.indexOf(type) === null) types.push(type);
		}
	}

	let exitCode: ExitCodeType = EXIT_CODES.GENERAL_ERROR;

	function addFile(file: GreyHack.File) {
		if (perms.length) {
			for (const perm of perms) {
				if (!file.hasPermission(perm)) return;
			}
		}

		if (file.isFolder() && types.indexOf("d") === null) return
		if (file.isBinary() && types.indexOf("b") === null) return
		if (!file.isFolder() && !file.isBinary() && types.indexOf("f") === null) return;

		process.write(1, file.path());
		exitCode = EXIT_CODES.SUCCESS;
	}

	function addFiles(folder: GreyHack.File) {
		for (const subFolder of folder.getFolders()!)
			addFiles(subFolder);
		
		addFile(folder);

		for (const file of folder.getFiles()!)
			addFile(file);
	}

	addFiles(folderFile);
	return exitCode;
};