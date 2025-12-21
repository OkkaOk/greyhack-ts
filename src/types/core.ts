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

type DBSchema = {
	hashes: {
		plain: string;
		hash: string;
	};
	vulns: {
		library: string;
		version: string;
		address: string;
		type: string;
		permission: string;
		hasRequirements: boolean;
	},
	devices: {
		deviceId?: string;
		publicIp?: string;
		isProxy?: boolean;
		isRshellServer?: boolean;
		username?: string;
		password?: string;
	};
	settings: ReturnType<typeof FluxCore.getDefaultSettings>;
	aliases: {
		key: string;
		value: string;
	};
	env: {
		key: string;
		value: string | number;
	};
	secrets: {

	}
};

export type FluxCoreGCO = {
	exiting: boolean;
	nonFluxWarned: boolean;
	crawlPublicIp: string;
	data: Record<string, CollectionData>;
	database: GreyDB<DBSchema>;
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
	aliases: Record<string, DBSchema["aliases"][keyof DBSchema["aliases"]]>;
	env: Record<string, DBSchema["env"][keyof DBSchema["env"]]>;
	history: string[];
	core?: typeof FluxCore;
};

export interface GCOType {
	fluxCore?: FluxCoreGCO;
	fluxShell?: FluxShellGCO;
}