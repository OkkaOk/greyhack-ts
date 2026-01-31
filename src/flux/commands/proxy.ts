import { Libex } from "../../utils/libex";
import { getDeviceId } from "../../utils/libokka";
import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";

const command = new Command({
	name: "proxy",
	description: "Manage proxies",
	category: "Networking",
	subcommands: [
		{
			name: "add",
			description: "Adds a proxy to this database",
			arguments: [
				{
					name: "public_ip",
					description: "The public IP of the proxy",
					required: true
				},
				{
					name: "username",
					description: "The username to log in with",
					required: true,
				},
				{
					name: "password",
					description: "The password for the user",
					required: true,
				},
			]
		},
		{
			name: "remove",
			description: "Removes a proxy from the database",
			arguments: [
				{
					name: "public_ip",
					description: "The public IP of the proxy",
					required: true,
				},
			]
		},
		{
			name: "bounce",
			description: "Bounces through saved proxies in the db",
		}
	]
});

// Add
command.subcommands[0].run = function (args, _options, process) {
	if (!getRouter(args[0])) {
		process.write(2, "Invalid public IP");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const username = args[1];
	const password = args[2];

	const shell = getShell().connectService(args[0], 22, username, password);
	if (!isType(shell, "shell")) {
		process.write(2, str(shell));
		return EXIT_CODES.GENERAL_ERROR;
	}

	const computer = shell.hostComputer;
	Libex.corruptLog(computer);

	const deviceId = getDeviceId(computer);

	const row = FluxCore.raw.database.fetchOne("devices", { deviceId });
	if (row && row.isProxy) {
		process.write(2, "This is already added as a proxy");
		return EXIT_CODES.GENERAL_ERROR;
	}

	if (row) {
		row.isProxy = true;
		row.publicIp = computer.publicIp;
		row.username = username;
		row.password = password;
		FluxCore.raw.database.modified = true;
	}
	else {
		FluxCore.raw.database.insert("devices", {
			deviceId,
			publicIp: computer.publicIp,
			username,
			password,
			isProxy: true,
		})
	}

	process.write(1, "Proxy added!".color("green"));
	return EXIT_CODES.SUCCESS;
};

// Remove
command.subcommands[1].run = function (args, _options, process) {
	const fetchResult = FluxCore.raw.database.fetch("devices", { isProxy: true, publicIp: args[0] });
	if (!fetchResult || !fetchResult.length) {
		process.write(2, "Proxy not found");
		return EXIT_CODES.GENERAL_ERROR;
	}

	for (const device of fetchResult) {
		device.isProxy = false;
	}

	FluxCore.raw.database.modified = true;
	process.write(1, "Proxy deleted!".color("green"));
	return EXIT_CODES.SUCCESS;
};

// Bounce
command.subcommands[2].run = function (_args, _options, process) {
	const proxies = FluxCore.raw.database.fetch("devices", { isProxy: true });
	if (!proxies || !proxies.length) {
		process.write(2, "No proxies saved in the DB!");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const accounts: { ip: string, username: string, password: string }[] = [];
	for (const proxy of proxies) {
		accounts.push({
			ip: proxy.publicIp!,
			password: proxy.password!,
			username: proxy.username!,
		})
	}

	accounts.shuffle();

	const shells = [getShell()];
	for (const account of accounts) {
		const existing = FluxCore.getSession(account.ip);
		if (existing && existing.shell) {
			shells.push(existing.shell);
			continue;
		}

		const shell = shells[shells.length - 1].connectService(account.ip, 22, account.username, account.password);
		if (!isType(shell, "shell")) {
			process.write(2, `${account.ip} - ${shell}`);
			continue;
		}

		shells.push(shell);
		Libex.corruptLog(shell.hostComputer);

		// TODO: clear proxy router log as well
	}

	if (shells.length <= 1) {
		process.write(2, "Failed to connect to proxies!");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const proxyShell = shells[shells.length - 1];
	const computer = proxyShell.hostComputer;
	let session = FluxCore.getSession(computer.publicIp, computer.localIp, Libex.computerPrivileges(computer));
	if (!session) {
		session = FluxCore.createSession(proxyShell, false, false, true);
		if (!session) {
			process.write(2, "Failed to create session for proxy");
			return EXIT_CODES.GENERAL_ERROR;
		}
	}

	process.write(1, `Bounced through ${shells.length - 1} proxies!`);
	session.connect();
	return EXIT_CODES.SUCCESS;
};