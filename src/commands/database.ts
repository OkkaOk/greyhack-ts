import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";
import type { DBSchema } from "../types/core";
import { JSON } from "../utils/JSON";
import { ynPrompt } from "../utils/libokka";

const command = new Command({
	name: "database",
	description: "Manage database",
	category: "System Management",
	subcommands: [
		{
			name: "save",
			description: "Forces a database save",
		},
		{
			name: "fetch",
			description: "Fetches rows from tables",
			arguments: [
				{
					name: "table",
					description: "The table to fetch from",
					required: true,
				},
				{
					name: "query",
					description: "The query to use (map)",
					required: false,
				},
			],
			options: [
				{
					name: "count",
					flags: ["-n", "--count"],
					description: "The number of rows to fetch",
					type: "number"
				},
			],
		},
		{
			name: "remove",
			description: "Remove rows from tables",
			arguments: [
				{
					name: "table",
					description: "The table to remove from",
					required: true,
				},
				{
					name: "query",
					description: "The query to use (map)",
					required: false,
				},
			],
			options: [
				{
					name: "count",
					flags: ["-n", "--count"],
					description: "The number of rows to remove at most",
					type: "number"
				},
			],
		},
		// {
		// 	name: "perft",
		// 	description: "Runs a performance test on the database",
		// 	arguments: [
		// 		{
		// 			name: "rows",
		// 			description: "The amount of rows to insert for the test",
		// 			required: false,
		// 		},
		// 	],
		// },
	]
});

// Save
command.subcommands[0]!.run = function (_args, _options, process) {
	FluxCore.raw.database.save(true);
	process.write(1, "Database saved!".color("green"));
	return EXIT_CODES.SUCCESS;
};

// Fetch
command.subcommands[1]!.run = function (args, options, process) {
	let limit: number | undefined = undefined;
	if ("count" in options) limit = options["count"][0] as number;

	const tableName = args[0] as keyof DBSchema
	if (!FluxCore.raw.database.hasTable(tableName)) {
		process.write(2, `Table '${tableName}' doesn't exist`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	let query: Record<string, string> = {};
	if (args.length >= 2) {
		query = JSON.parse(args[1]!);
		if (!isType(query, "map")) {
			process.write(2, `Invalid fetch query: ${args[1]}`);
			return EXIT_CODES.MISUSE;
		}
	}

	const rows = FluxCore.raw.database.fetch(tableName, query, limit).map(o => str(o));
	process.write(1, rows);

	return EXIT_CODES.SUCCESS;
}

// Remove
command.subcommands[2]!.run = function (args, options, process) {
	const tableName = args[0] as keyof DBSchema
	if (!FluxCore.raw.database.hasTable(tableName)) {
		process.write(2, `Table '${tableName}' doesn't exist`);
		return EXIT_CODES.GENERAL_ERROR;
	}
	
	let limit: number | undefined = undefined;
	if ("count" in options) limit = options["count"][0] as number;

	let query: Record<string, string> = {};
	if (args.length >= 2) {
		query = JSON.parse(args[1]!);
		if (!isType(query, "map")) {
			process.write(2, `Invalid fetch query: ${args[1]}`);
			return EXIT_CODES.MISUSE;
		}

		if (query.size !== 0) {
			const countRemoved = FluxCore.raw.database.remove(tableName, query, limit);
			process.write(1, `Removed ${countRemoved} rows`);
			return EXIT_CODES.SUCCESS;
		}
	}

	const yn = ynPrompt(`Are you sure you want to remove the whole '${args[0]}' table`, "n");
	if (yn == "n") return EXIT_CODES.SUCCESS;

	FluxCore.raw.database.deleteTable(tableName);
	process.write(1, `Removed the table '${tableName}'`);
	
	return EXIT_CODES.SUCCESS;
}