import type { FluxShellGCO, GCOType, Pipeline, PipelineStage } from "../../types/core";
import { resolvePath } from "../../utils/libokka";
import { Command } from "./Command";
import { Process } from "./Process";
import { expandVariables, tokenize } from "./tokenize";

export const EXIT_CODES = {
	CMD_EXEC_FAIL: 123,
	CMD_NOT_EXECUTABLE: 127,
	CMD_NOT_FOUND: 126,
	GENERAL_ERROR: 1,
	MISUSE: 2,
	SUCCESS: 0,
} as const;

const rawPrint: (val: string, replace?: boolean) => null = print;

print = (value: any, replaceText = false) => {
	value = str(value);

	const gco = getCustomObject<GCOType>();
	let fd = 1;

	if (gco.fluxShell && gco.fluxShell.activeProcesses.length) {
		// A bit spaghetti
		if (value.indexOf("<color=red>") === 0) {
			fd = 2;
			value = value.replace(/<\/?color[^<>]*>/, ""); // Remove color tags
		}

		if (replaceText) gco.fluxShell.activeProcesses[-1].flush(fd);

		gco.fluxShell.activeProcesses[-1].write(fd, value);
	}
	else {
		rawPrint(value, replaceText);
	}
	return null;
};

if ("IS_GREYBEL" in globals) {
	const oldUserInput = userInput;
	userInput = (message = "", isPassword = false, anyKey = false, _addToHistory = false) => oldUserInput(message, isPassword, anyKey);

	cd = (_dir) => {
		// FluxCore.curr_session.working_dir = dir
		return "";
	};
}

export class FluxShell {
	static raw: FluxShellGCO;

	static get mainProcess(): Process {
		return this.raw.activeProcesses[0];
	}

	static get currProcess(): Process {
		return this.raw.activeProcesses[-1];
	}

	static get currComputer(): GreyHack.Computer {
		if (this.raw.core) {
			return this.raw.core.currSession().computer;
		}

		return getShell().hostComputer;
	}

	static initialize() {
		this.raw = this.initializeGCO();
	}

	static initializeGCO(): FluxShellGCO {
		const gco = getCustomObject<GCOType>();
		if (gco.fluxShell) {
			return gco.fluxShell;
		}

		gco.fluxShell = {
			currPID: 0,
			env: {
				"PATH": "/bin:/root:/usr/bin",
			},
			aliases: {},
			settings: {} as any,
			pipelines: [],
			prevPipeline: null,
			commands: {},
			activeProcesses: [],
			history: [],
		};

		const gcosh = gco.fluxShell;

		function printOut() {
			const data = FluxShell.mainProcess.read(1, true);
			if (!data) return;
			rawPrint(data);
		}

		function printErr() {
			let color = "red";
			if (Object.hasOwn(gcosh.settings, "errorColor")) {
				color = gcosh.settings.errorColor;
			}

			const lines = FluxShell.mainProcess.read(2);
			for (const line of lines)
				rawPrint(`<color=${color}>${line}`);
		}

		const mainProcess = new Process(0, "flux");
		mainProcess.resources[1].onWriteListeners.push(printOut);
		mainProcess.resources[2].onWriteListeners.push(printErr);
		gco.fluxShell.activeProcesses.push(mainProcess);
		gco.fluxShell.currPID = 1;

		this.raw = gco.fluxShell;

		return gco.fluxShell;
	}

	static getCommand(commandName: string, args: string[]): Command {
		// If we don't know this command, try to find a matching binary from PATH and cwd
		if (!Object.hasOwn(this.raw.commands, commandName)) {
			let shell: GreyHack.Shell | null = getShell();
			let comp: GreyHack.Computer = getShell().hostComputer;
			let currPath = currentPath();

			if (this.raw.core) {
				shell = this.raw.core.currSession().shell;
				comp = this.raw.core.currSession().computer;
				currPath = this.raw.core.currSession().workingDir;
			}

			let filePath = resolvePath(currPath, commandName);
			let file = comp.file(filePath);
			if (!file) {
				const paths = (this.raw.env["PATH"] as string).split(":");
				for (const folder of paths) {
					filePath = folder + "/" + commandName;
					file = comp.file(filePath);
					if (file) break;
				}
			}

			const command = new Command({
				name: commandName,
				description: "",
				category: "Other", // Just a random one
				nonFlux: true,
			});

			if (!file) return command;

			command.name = file.name!;
			command.valid = true;
			command.file = file;
			command.run = function (args, _opts, process) {
				const result = shell!.launch(file!.path(), args.join(" "));
				if (isType(result, "string")) {
					process.write(2, "Failed to launch program: " + result);
					return EXIT_CODES.GENERAL_ERROR;
				}

				return EXIT_CODES.SUCCESS;
			};

			return command;
		}

		let command = this.raw.commands[commandName];

		// Get the subcommand if we're using one
		while (args.length) {
			let foundSubcommand = false;
			for (const subcommand of command.subcommands) {
				if (subcommand.name !== args[0]) continue;

				command = subcommand;
				commandName = subcommand.name;
				args.shift();
				foundSubcommand = true;
				break;
			}

			if (!foundSubcommand) break;
		}

		return command;
	}

	static checkRequirements(command: Command): true | string {
		if (!command.requirements) return true;

		let shell: GreyHack.Shell | null = getShell();
		if (this.raw.core) {
			shell = this.raw.core.currSession().shell;
		}

		for (const reqName of Object.keys(command.requirements)) {
			const value = command.requirements[reqName];
			if (reqName === "hasShell" && value === true && !shell) {
				return "This command requires the session to have a shell";
			}
		}

		return true;
	}

	static runCommand(command: Command, args: string[], child: Process): number {
		if (!command.valid) {
			child.parent.write(1, "Unknown command: " + command.name);
			return EXIT_CODES.CMD_NOT_FOUND;
		}

		if (!command.isFluxCommand) {
			let shell: GreyHack.Shell | null = getShell();
			if (this.raw.core) {
				shell = this.raw.core.currSession().shell;
			}

			if (!shell) {
				child.parent.write(2, "This isn't an shell session so you can't execute programs that are on the computer.");
				return EXIT_CODES.MISUSE;
			}

			if (!command.file!.isBinary()) {
				child.parent.write(2, command.file?.path() + " is not an executable file.");
				return EXIT_CODES.CMD_NOT_EXECUTABLE;
			}

			if (!command.file!.hasPermission("x")) {
				child.parent.write(2, "You don't have permission to execute that program");
				return EXIT_CODES.CMD_NOT_EXECUTABLE;
			}

			if (!command.file!.isBinary()) {
				child.parent.write(2, "You don't have permissions to execute that program.");
				return EXIT_CODES.MISUSE;
			}

			if (!command.run) {
				child.parent.write(2, "This command didn't have a run function. This is a bug.");
				return EXIT_CODES.GENERAL_ERROR;
			}

			if (this.raw.core && !this.raw.core.raw.nonFluxWarned) {
				child.parent.write(1, "<color=yellow>This command/binary is not a <b>Flux</b> command and won't have benefits suchs as piping and redirecting (though xargs should still work).");
				this.raw.core.raw.nonFluxWarned = true;
			}

			return command.run(args, {}, child.parent);
		}

		const options = command.extractOptions(args, child);
		if (options === null) return EXIT_CODES.MISUSE;

		if (Object.hasOwn(options, "help")) {
			command.showHelp(child);
			return EXIT_CODES.SUCCESS;
		}

		const canRunResult = this.checkRequirements(command);
		if (isType(canRunResult, "string")) {
			child.write(2, canRunResult);
			return EXIT_CODES.GENERAL_ERROR;
		}

		const overrideArgs = Object.hasOwn(options, "overrideArgs");

		if (args.length < command.requiredArgCount && !overrideArgs && !command.acceptsStdin) {
			child.write(2, `Not enough arguments. Requires ${command.requiredArgCount}, received ${args.length}`);
			child.write(1, "Usage: " + command.getUsage());
			return EXIT_CODES.MISUSE;
		}

		if (!command["run"]) {
			child.write(2, "Command doesn't do anything by itself. Use its subcommands.");
			return EXIT_CODES.MISUSE;
		}

		this.raw.activeProcesses.push(child);
		const exitCode = command.run(args, options, child);
		this.raw.activeProcesses.pop();

		// Closes the file streams if not already done in the command 
		// Also sets the content to the file
		for (let fd = 3; fd < Object.size(child.resources); fd++) {
			child.close(fd);
		}

		return exitCode;
	}

	static parsePipelineStages(pipeline: Pipeline) {
		if (pipeline.stages.length || !pipeline.tokens.length) return;

		function createStage(): PipelineStage {
			return {
				tokens: [],
				process: FluxShell.mainProcess.clone(),
				invalid: false,
			};
		}

		let currStage = createStage();

		const expandedTokens: Record<string, boolean> = {};

		// Recursively do alias expansion for the first token in the pipeline
		let firstToken = pipeline.tokens[0];
		while ((firstToken in this.raw.aliases) && !(firstToken in expandedTokens)) {
			const aliasTokens = tokenize(this.raw.aliases[firstToken]);
			pipeline.tokens = aliasTokens.concat(slice(pipeline.tokens, 1));
			expandedTokens[firstToken] = true;
			firstToken = pipeline.tokens[0];
		}

		while (pipeline.tokens.length) {
			const token = pipeline.tokens.shift()!;
			let nextToken: string | null = null;
			if (pipeline.tokens.hasIndex(0))
				nextToken = pipeline.tokens[0];

			let newFd: string | number = "";
			if (token.isMatch(/^\d?>>$/)) newFd = token.split(">>")[0].toInt();
			if (isType(newFd, "string") && token.isMatch(/^\d?>$/)) newFd = token.split(">")[0].toInt();
			if (isType(newFd, "string") && token.isMatch(/^\d?>&\d$/)) newFd = token.split(">&")[0].toInt();
			if (isType(newFd, "string")) newFd = 1;

			// TODO: Refactor

			// Handle combined >&file or &>file
			if (token.isMatch(/^>&\S+$/) || token.isMatch(/^&>\S+$/)) {
				const fd = currStage.process.open(slice(token, 2), "w");
				if (!fd) {
					currStage.invalid = true;
					continue;
				}

				currStage.process.flush(fd); // Truncate
				currStage.process.dup(fd, 1);
				currStage.process.dup(fd, 2);
			}
			// Handle split >& file or &> file
			else if ((token === ">&" || token === "&>") && nextToken) {
				pipeline.tokens.shift(); // Consume the nextToken
				const fd = currStage.process.open(nextToken, "w");
				if (!fd) {
					currStage.invalid = true;
					continue;
				}

				currStage.process.flush(fd); // Truncate
				currStage.process.dup(fd, 1);
				currStage.process.dup(fd, 2);
			}
			// Handle fd>&fd (e.g. 2>&1)
			else if (token.isMatch(/^\d?>&\d$/)) {
				let oldFd = token.split(">&")[1].toInt();
				if (isType(oldFd, "string")) oldFd = 1;

				const res = currStage.process.dup(oldFd, newFd);
				if (res === -1) currStage.invalid = true;
			}
			// Handle append: fd>> file
			else if (token.isMatch(/^\d?>>$/) && nextToken) {
				pipeline.tokens.shift(); // Consume the nextToken
				const fd = currStage.process.open(nextToken, "rw");
				if (!fd) {
					currStage.invalid = true;
					continue;
				}

				currStage.process.dup(fd, newFd);
			}
			// Handle truncate: fd> file
			else if (token.isMatch(/^\d?>$/) && nextToken) {
				pipeline.tokens.shift(); // Consume the nextToken
				const fd = currStage.process.open(nextToken, "w");
				if (!fd) {
					currStage.invalid = true;
					continue;
				}

				currStage.process.flush(fd);
				currStage.process.dup(fd, newFd);
			}
			// Handle heredoc: << delimiter
			else if (token === "<<" && nextToken) {
				while (true) {
					let input = userInput("> ");
					if (input === nextToken) break;

					input = expandVariables(input);
					currStage.process.write(0, input);
				}
				pipeline.tokens.shift(); // Consume the nextToken
			}
			// Handle input redirection
			else if (token === "<" && nextToken) {
				pipeline.tokens.shift(); // Consume the nextToken
				const fd = currStage.process.open(nextToken, "r");
				if (!fd) {
					currStage.invalid = true;
					continue;
				}

				currStage.process.dup(fd, 0);
			}
			// Handle pipeline split and err redirection
			else if (token === "|&" && currStage.tokens.length) {
				const pipeFd = currStage.process.pipe();
				currStage.process.dup(pipeFd, 1);
				currStage.process.dup(1, 2);

				pipeline.stages.push(currStage);
				const newStage = createStage();
				newStage.process.resources[0] = currStage.process.resources[1];
				currStage = newStage;
			}
			// Handle pipeline split
			else if (token === "|" && currStage.tokens.length) {
				const pipeFd = currStage.process.pipe();
				currStage.process.dup(pipeFd, 1);

				pipeline.stages.push(currStage);
				const newStage = createStage();
				newStage.process.resources[0] = currStage.process.resources[1];
				currStage = newStage;
			}
			// Normal token
			else {
				currStage.tokens.push(token);
			}
		}

		if (currStage.tokens.length) {
			pipeline.stages.push(currStage);
		}
	}

	static parsePipelines(inputTokens: string[]): Array<Pipeline> {
		if (!inputTokens.length) return [];

		const pipelines: Pipeline[] = [];
		function addPipeline(pipelineTokens: Pipeline["tokens"], op: Pipeline["condition"]) {
			pipelines.push({
				tokens: pipelineTokens,
				id: pipelines.length,
				condition: op,
				stages: [],
			});
		}

		let prevCondition: Pipeline["condition"] = null;
		let startIndex = 0;

		for (let i = 0; i < inputTokens.length - 1; i++) {
			const token = inputTokens[i];
			if (token === ";") {
				addPipeline(slice(inputTokens, startIndex, i), prevCondition);
				startIndex = i + 1;
			}
			else if (token === "||") {
				addPipeline(slice(inputTokens, startIndex, i), prevCondition);
				startIndex = i + 1;
				prevCondition = "OR";
			}
			else if (token === "&&") {
				addPipeline(slice(inputTokens, startIndex, i), prevCondition);
				startIndex = i + 1;
				prevCondition = "AND";
			}
		}

		if (startIndex < inputTokens.length) {
			addPipeline(slice(inputTokens, startIndex), prevCondition);
		}

		return pipelines;
	}

	static executePipeline() {
		while (this.raw.pipelines.length) {
			const pipeline = this.raw.pipelines[0];

			// There was a pipeline before this (separated by ; || &&)
			if (this.raw.prevPipeline) {
				if (pipeline.condition === "OR" && this.raw.env["?"] === EXIT_CODES.SUCCESS) {
					this.raw.pipelines.shift();
					continue;
				}

				if (pipeline.condition === "AND" && this.raw.env["?"] !== EXIT_CODES.SUCCESS) {
					this.raw.pipelines.shift();
					continue;
				}
			}

			this.parsePipelineStages(pipeline);

			while (pipeline.stages.length) {
				const stage = pipeline.stages.shift()!;

				if (stage.invalid) {
					this.raw.env["?"] = EXIT_CODES.MISUSE;
					continue;
				}

				const commandName = stage.tokens[0];
				const commandArgs = slice(stage.tokens, 1);
				const command = this.getCommand(commandName, commandArgs);

				stage.process.name = command.fullName;
				this.raw.env["?"] = this.runCommand(command, commandArgs, stage.process);
			}

			// Consume the pipeline
			// The only scenario where the id differs is that if one of the commands in the pipeline
			// launched another instance of this script (e.g. hop sessions) and the new instance picked up
			// the remaining pipeline
			if (pipeline.id === this.raw.pipelines[0].id) {
				this.raw.prevPipeline = this.raw.pipelines.shift();
			}
		}
	}

	static handleInput(input: string) {
		const inputTokens = tokenize(input);

		this.raw.pipelines = this.parsePipelines(inputTokens);
		this.raw.prevPipeline = null;

		this.executePipeline();
	}

	static startInputLoop(getMessageFunc?: () => string) {
		if (this.raw.pipelines.length) {
			this.executePipeline();
		}

		while (true) {
			this.raw.env["PWD"] = currentPath();
			this.raw.env["USER"] = activeUser();

			if (this.raw.core) {
				const session = this.raw.core.currSession();
				this.raw.env["PWD"] = session.workingDir;
				this.raw.env["USER"] = session.user;
			}

			let message = "";

			if (getMessageFunc)
				message = getMessageFunc();
			else
				message = this.getUserInputMessage();

			cd(this.raw.env["PWD"]);

			const input = userInput(message, false, false, true);
			this.handleInput(input);

			if (this.raw.core) {
				this.raw.core.raw.database.save();
			}

			this.raw.history.push(input);
			if (this.raw.history.length > 30)
				this.raw.history.shift();
		}
	}

	private static getUserInputMessage() {
		let color = "#7fff00";
		if (!this.raw.core) {
			const user = activeUser();
			const currPath = currentPath().replace(homeDir(), "~");
			const userSymbol = user === "root" ? "#" : "$";
			const message = `<b><color=${color}>${user}</color>:<color=#28A9DB>${currPath}</color>${userSymbol} `;
			return message;
		}

		const session = this.raw.core.currSession();
		const user = session.user;

		if (session.isProxy) {
			color = "#00FFFF";
		}
		else if (session.publicIp !== this.raw.core.raw.sessionPath[0].publicIp) {
			color = "#FF8800";
		}

		const currPath = session.workingDir.replace(session.homeDir(), "~");
		const userSymbol = user === "root" ? "#" : "$";
		return `<b><color=${color}>#${this.raw.core.raw.sessionPath.length} ${user}@${session.localIp}</color>:<color=#28A9DB>${currPath}</color>${userSymbol} `;
	}
}