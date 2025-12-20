import { FluxCore } from "../core/FluxCore";
import { GreyDB } from "../core/GreyDB";
import { Session } from "../core/Session";
import { Command } from "../shell/Command";
import { Process } from "../shell/Process";

type CollectionData = {
	"mails": Record<string, string>;
	"users": Record<string, string>;
	"banks": Record<string, string>;
};

export type FluxCoreGCO = {
	exiting: boolean;
	nonFluxWarned: boolean;
	crawlPublicIp: string;
	data: Record<string, CollectionData>;
	database: GreyDB;
	currentCtf: GreyHack.CtfEvent | null;
	sessions: Record<string, Session>;
	sessionPath: Session[];
	visitedDevices: string[]; // For crawler
};

export type Pipeline = {
	id: number;
	tokens: string[];
	condition: null | "AND" | "OR";
	stages: {
		tokens: string[];
		process: Process;
		invalid: boolean;
	}[];
};

export type FluxShellGCO = {
	currPID: number;
	pipelines: Pipeline[];
	prevPipeline: Pipeline | null;
	commands: Record<string, Command>;
	activeProcesses: Process[];
	settings: ReturnType<typeof FluxCore["getDefaultSettings"]>;
	aliases: Record<string, string>;
	env: Record<string, string | number>;
	history: string[];
	core?: typeof FluxCore;
};

export interface GCOType {
	fluxCore: FluxCoreGCO;
	fluxShell: FluxShellGCO;
}