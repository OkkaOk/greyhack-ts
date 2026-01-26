export interface MetaLibVuln {
	library: string;
	version: string;
	address: string;
	unsecZone: string;
	type: string;
	/** For which user level did this vulnerability give a result for */
	permission: string;
	hasRequirements: boolean;
};