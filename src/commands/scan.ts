import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";
import type { Process } from "../shell/Process";
import { formatColumnsf } from "../utils/libokka";

interface Ext {
	scanLan: (process: Process) => typeof EXIT_CODES[keyof typeof EXIT_CODES];
}

const command = new Command<Ext>({
	name: "scan",
	description: "Shows information about the network",
	category: "Hacking",
	arguments: [
		{
			name: "ip",
			description: "The public IP address of the network",
			required: false,
		},
	],
});

command.funcs.scanLan = function(process) {
	let mainRouter = getRouter(FluxCore.currSession().publicIp);
	if (!mainRouter) mainRouter = getRouter();
	if (!mainRouter) {
		process.write(2, "Router not found");
		return EXIT_CODES.MISUSE;
	}

	type device = {
		ip: string;
		type: "computer" | "router" | "switch" | "camera";
		ports: number[];
		router: GreyHack.Router | null;
	}

	function createDevice(deviceIp: string): device {
		const device: device = {
			ip: deviceIp,
			type: "computer",
			ports: [],
			router: getRouter(deviceIp)
		}

		if (device.router) device.type = "router";
		if (getSwitch(deviceIp)) device.type = "switch";

		let ports: GreyHack.Port[] = [];
		if (device.type === "router") {
			ports = device.router!.usedPorts();
		}
		else {
			const devicePorts = mainRouter!.devicePorts(deviceIp);
			if (isType(devicePorts, "list")) {
				ports = devicePorts;
			}
		}

		for (const port of ports) {
			device.ports.push(port.portNumber);
		}

		if (device.ports.indexOf(37777) !== null) device.type = "camera";

		return device;
	}

	function scanDevice(device: device, visited: string[]) {
		let color = "";
		if (device.type === "router") color = "<color=green>";
		if (device.type === "switch") color = "<color=yellow>";

		const here = device.ip === FluxCore.currSession().localIp ? " (curr)" : "";

		let portStr = "―";
		if (device.ports.length)
			portStr = device.ports.join(", ");

		process.write(1, "%s%-22s %-10s %-15s".format(color, device.ip + here, device.type, portStr));

		visited.push(device.ip);
		if (device.router) {
			for (const ip of device.router.devicesLanIp()) {
				if (visited.indexOf(ip) != null) continue;

				const nextDevice = createDevice(ip);
				scanDevice(nextDevice, visited);
			}
		}
	}

	const routerDevice = createDevice(mainRouter.localIp);

	process.write(1, "<u>%-22s %-10s %-15s".format("IP", "Type", "Ports"));
	scanDevice(routerDevice, []);

	return EXIT_CODES.SUCCESS;
}

command.run = function (args, _options, process) {
	if (!args.length || args[0] === "lan") {
		return this.funcs.scanLan(process);
	}

	let router = getRouter(args[0]);
	let ports: GreyHack.Port[] | string | null = [];

	const isLan = isLanIp(args[0]!);

	if (isLan) {
		router = getRouter()!;
		ports = router.devicePorts(args[0]!);
		if (!isType(ports, "list")) {
			process.write(2, str(ports));
			return EXIT_CODES.GENERAL_ERROR;
		}
	}
	else {
		if (!router) {
			process.write(2, "No router found!");
			return EXIT_CODES.MISUSE;
		}
		ports = router.usedPorts();
	}

	process.write(1, `Info on ${args[0]}`);

	const portInfo = ["PORT STATE SERVICE VERSION LAN"];
	for (const port of ports) {
		const service = router.portInfo(port)!;
		const status = port.isClosed() ? "closed" : "open";
		portInfo.push(`${port.portNumber} ${status} ${service} ${port.getLanIp()}`);
	}

	process.write(1, `Kernel router version: ${router.kernelVersion}\n`);
	process.write(1, formatColumnsf(portInfo, "left", false));
	process.write(1, [""].concat(whois(router.publicIp).split(char(10))));
	return EXIT_CODES.SUCCESS;
};