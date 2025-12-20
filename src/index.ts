import { FluxCore } from "./core/FluxCore";
import { FluxShell } from "./shell/FluxShell";

FluxCore.initialize();

include("./commands")

if (params.length) {
	const input = params.join(" ");
	FluxShell.handleInput(input);
	if (FluxShell.raw.env["?"] != 0) exit("<color=red>Invalid parameters");
	if (globals.wasInitialized) exit(""); 
}

FluxShell.startInputLoop();