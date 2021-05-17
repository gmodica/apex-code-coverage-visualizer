import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { CoverageTestResult, CoverageItem, CoverageItem2, ClassCoverageItem } from './types';
import { CodeCoveragePanel } from './codeCoverageViewPanel';
import { CodeCoverageSideViewPanelProvider } from './codeCoverageSideViewPanel';

export const apexDirPath = path.join(
    vscode.workspace!.workspaceFolders![0].uri.fsPath,
    ".sfdx",
    "tools",
    "testresults",
    "apex"
);

export const apexClassesDirPath = path.join(
	vscode.workspace!.workspaceFolders![0].uri.fsPath,
	"force-app",
	"main",
	"default",
	"classes"
);

export const apexTriggersDirPath = path.join(
	vscode.workspace!.workspaceFolders![0].uri.fsPath,
	"force-app",
	"main",
	"default",
	"triggers"
);

export class CodeCoverage implements vscode.Disposable {
	private _codeCoverage: CoverageTestResult | null = null;
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem();
		this.statusBarItem.command = 'apex-code-coverage-visualizer.show-code-coverage';

        const testResultOutput = path.join(apexDirPath, "*.json");
        const testResultFileWatcher = vscode.workspace.createFileSystemWatcher(
            testResultOutput
        );
        testResultFileWatcher.onDidCreate((uri) => {
				this.refresh();
				this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
			}
        );

        vscode.window.onDidChangeActiveTextEditor(
            this.onDidChangeActiveTextEditor,
            this
        );
        this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    }

	public static getCoverage() : CoverageTestResult | null {
		return getCoverageData();
	}

	public static getTestClassesForApexClass(apexClass : string, codeCoverage : CoverageTestResult | null) : ClassCoverageItem[] | null {
		if(codeCoverage === null) {
			codeCoverage = this.getCoverage();
		}

		let tests : ClassCoverageItem[] = [];

		codeCoverage?.tests?.forEach(test => {
			test.perClassCoverage.forEach(coverage => {
				if(coverage.apexClassOrTriggerName === apexClass) {
					let testCoverage : ClassCoverageItem = {
						apexClassOrTriggerName: test.apexClass.name,
						apexTestMethodName: coverage.apexTestMethodName,
						percentage: coverage.percentage
					};
					tests.push(testCoverage);
				}
			});
		});

		return tests;
	}

	public refresh() {
		this._codeCoverage = getCoverageData();
		if(CodeCoveragePanel.currentPanel) {
			CodeCoveragePanel.currentPanel.setHtmlForWebview(this._codeCoverage);
		}
		if(CodeCoverageSideViewPanelProvider.currentView) {
			CodeCoverageSideViewPanelProvider.currentView.setHtmlForWebview(this._codeCoverage);
		}
	}

    public onDidChangeActiveTextEditor(editor?: vscode.TextEditor) {
        if (editor && (editor.document.fileName.toLowerCase().endsWith("cls") || editor.document.fileName.toLowerCase().endsWith("trigger"))) {
            let coverage: number | null = getCoverageForCurrentEditor(this._codeCoverage);
            if (coverage && coverage >= 0) {
                this.setCoverage(coverage);
                this.statusBarItem.show();
            } else {
                this.statusBarItem.hide();
            }
        } else {
            this.statusBarItem.hide();
        }
    }

    private setCoverage(coverage: number) {
        let icon = "";

        if (coverage < 60) {
            icon = "$(stop)";
            //this.statusBarItem.color = new ThemeColor("editorOverviewRuler.errorForeground");
        } else if (coverage < 75) {
            icon = "$(warning)";
            //this.statusBarItem.color = new ThemeColor("editorOverviewRuler.warningForeground");
        } else {
            icon = "$(check)";
            //this.statusBarItem.color = new ThemeColor("editorOverviewRuler.errorForeground");
        }

        this.statusBarItem.text = `$(microscope) ${Math.round(coverage)}% ${icon}`;
        this.statusBarItem.tooltip = `${coverage}% coverage`;
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}

function getTestRunId() {
    const testRunIdFile = path.join(apexDirPath, "test-run-id.txt");
    if (fs.existsSync(testRunIdFile)) {
        return fs.readFileSync(testRunIdFile, "utf8");
    }
    return null;
}

function getCoverageData() :CoverageTestResult | null {
    const testRunId = getTestRunId();
    const testResultFilePath = path.join(
        apexDirPath,
        `test-result-${testRunId}.json`
    );

    if (!fs.existsSync(testResultFilePath)) {
        return null;
    }

	const testResultOutput = fs.readFileSync(testResultFilePath, "utf8");
		const codeCoverage: CoverageTestResult = JSON.parse(
			testResultOutput
		) as CoverageTestResult;
		return codeCoverage;
}

function getCoverageForCurrentEditor(codeCoverage: CoverageTestResult | null) :number | null {
    if (!codeCoverage) {
		codeCoverage = getCoverageData();
	}
    if (!codeCoverage) {
        return null;
    }

	let coveredPercent: number | null = null;

	if(codeCoverage.coverage) {
		codeCoverage.coverage.coverage.forEach((item: CoverageItem) => {
			if (vscode.window.activeTextEditor?.document.fileName.includes(item.name)) {
				coveredPercent = item.coveredPercent;
			}
		});
	}
	else if(codeCoverage.codecoverage) {
		codeCoverage.codecoverage.forEach((item: CoverageItem2) => {
			if (vscode.window.activeTextEditor?.document.fileName.includes(item.name)) {
				coveredPercent = Number.parseFloat(item.percentage.replace('%',''));
			}
		});
	}


    return coveredPercent;
}
