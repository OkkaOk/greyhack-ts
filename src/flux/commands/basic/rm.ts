import { ynPrompt } from "../../../utils/libokka";
import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "rm",
	description: "Removes a file or a folder",
	category: "System Management",
	arguments: [
		{
			name: "file",
			description: "The path of the file to remove",
			required: true,
			rest: true,
		}
	],
	options: [
		{
			name: "recursive",
			flags: ["-R", "--recursive"],
			description: "Remove recursively"
		},
		{
			name: "interactive",
			flags: ["-i"],
			description: "Prompts before removing each file"
		},
		{
			name: "silent",
			flags: ["-s", "--silence"],
			description: "Stops printing info"
		}
	]
});

command.run = function (args, options, process) {
	function deleteFile(file?: GreyHack.File) {
		if (!file) return;

		if (file.isFolder() && (file.getFiles()?.length || file.getFolders()?.length)) {
			if (!options["recursive"]) {
				if (options["silent"]) return;
				process.write(2, `Unable to delete ${file.path()} without recursive flag`);
				return;
			}

			for (const subFolder of file.getFolders()!) {
				deleteFile(subFolder);
			}

			for (const subFile of file.getFiles()!) {
				deleteFile(subFile);
			}

			if (!file.getFolders()!.length && !file.getFiles()!.length)
				deleteFile(file);
			return;
		}

		const path = file.path();

		if (options["interactive"]) {
			const yn = ynPrompt(`Delete ${path}`, "n");
			if (yn === "n") return;
		}

		const failReason = file.delete();
		if (options["silent"]) return;
		if (!failReason) {
			process.write(1, `Deleted file ${path}`);
			return;
		}

		process.write(2, `${path}: ${failReason}`);
	}

	const session = FluxCore.currSession();
	
	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;
	for (const arg of args) {
		const absPath = session.resolvePath(arg);

		const file = session.computer.file(absPath);
		if (!file) {
			process.write(2, `File ${absPath} doesn't exist`);
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		deleteFile(file);
	}

	return exitCode;
};