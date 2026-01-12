import { FluxCore } from "../../core/FluxCore";
import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "mv",
	description: "Rename files or move them to directory",
	category: "System Management",
	arguments: [
		{
			name: "source",
			description: "The path of the file. Can be relative",
			required: true,
		},
		{
			name: "dest",
			description: "The path of the file. Can be relative",
			required: true,
		},
	],
	options: [
		{
			name: "verbose",
			flags: ["-v", "--verbose"],
			description: "Explain what was done",
		},
	],
});

command.run = function (args, options, process) {
	const session = FluxCore.currSession();

	const sourcePath = session.resolvePath(args[0]!);
	let destPath = session.resolvePath(args[1]!);

	const source = session.computer.file(sourcePath);
	const dest = session.computer.file(destPath);

	if (!source) {
		process.write(2, `Cannot move '${args[0]}' to '${args[1]}': ${sourcePath} doesn't exist`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	function moveFile(source: GreyHack.File, folderPath: string, name: string) {
		const moveResult = source.move(folderPath, name);
		if (isType(moveResult, "string")) {
			process.write(2, `Cannot move '${source.name}' to '${folderPath}/${name}': ${moveResult}`);
			return EXIT_CODES.GENERAL_ERROR;
		}

		if (moveResult === null) {
			process.write(2, `${sourcePath} got deleted before this command was ran`);
			return EXIT_CODES.GENERAL_ERROR;
		}

		if ("verbose" in options)
			process.write(1, `Renamed '${sourcePath}' -> '${folderPath}/${name}'`);

		return EXIT_CODES.SUCCESS;
	}

	let newName = destPath.split("/")[-1]!;
	if (!dest)
		return moveFile(source, parentPath(destPath), newName);

	if (dest.isFolder())
		newName = source.name!;
	else
		destPath = parentPath(destPath);

	return moveFile(source, destPath, newName);
};