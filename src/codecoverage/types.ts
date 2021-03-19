export type CoverageTestResult = {
    coverage: {
        coverage: CoverageItem[];
	};
	tests: TestItem[];
    codecoverage: CoverageItem2[];
};

export type CoverageItem = {
    id: string;
    name: string;
    totalLines: number;
    totalCovered: number;
	coveredPercent: number;
};

export type CoverageItem2 = {
    apexId: string;
	name: string;
	type: string;
    numLinesCovered: number;
    numLinesUncovered: number;
	percentage: string;
};

export type TestItem = {
	ApexClass: ApexClassItem;
	apexClass: ApexClassItem2;
};

export type ApexClassItem = {
	Name: string;
};

export type ApexClassItem2 = {
	name: string;
};