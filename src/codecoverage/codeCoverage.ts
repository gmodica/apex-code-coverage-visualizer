import * as fs from "fs";
import * as path from "path";
import {
    Disposable,
    StatusBarItem,
    TextDocument,
    TextEditor,
    window,
    workspace,
	ThemeColor,
	WebviewPanel,
	Webview,
	ViewColumn,
	Uri,
	commands
} from "vscode";

const apexDirPath = path.join(
    workspace!.workspaceFolders![0].uri.fsPath,
    ".sfdx",
    "tools",
    "testresults",
    "apex"
);

const apexClassesDirPath = path.join(
	workspace!.workspaceFolders![0].uri.fsPath,
	"force-app",
	"main",
	"default",
	"classes"
);

const apexTriggersDirPath = path.join(
	workspace!.workspaceFolders![0].uri.fsPath,
	"force-app",
	"main",
	"default",
	"triggers"
);

export class CodeCoverage implements Disposable {
    private statusBarItem: StatusBarItem;

    constructor() {
		this.statusBarItem = window.createStatusBarItem();
		this.statusBarItem.command = 'apex-code-coverage-visualizer.show-code-coverage';

        const testResultOutput = path.join(apexDirPath, "*.json");
        const testResultFileWatcher = workspace.createFileSystemWatcher(
            testResultOutput
        );
        testResultFileWatcher.onDidCreate((uri) => {
				this.onDidChangeActiveTextEditor(window.activeTextEditor);
				if(CodeCoveragePanel.currentPanel) {
					CodeCoveragePanel.currentPanel.setHtmlForWebview();
				}
			}
        );

        window.onDidChangeActiveTextEditor(
            this.onDidChangeActiveTextEditor,
            this
        );
        this.onDidChangeActiveTextEditor(window.activeTextEditor);
    }

    public onDidChangeActiveTextEditor(editor?: TextEditor) {
        if (editor && (editor.document.fileName.toLowerCase().endsWith("cls") || editor.document.fileName.toLowerCase().endsWith("trigger"))) {
            let coverage: number | null = getCoverageForCurrentEditor();
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

export class CodeCoveragePanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: CodeCoveragePanel | undefined;

	public static readonly viewType = 'codeCoverage';
	private readonly _panel: WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: Disposable[] = [];
	private _codeCoverage: CoverageTestResult | null = null;
	private _fileNameFilter: string | null = '';
	private _lowCoverageFilter: boolean = false;
	private _projectFilesOnlyFilter: boolean = true;

	private constructor(panel: WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this.setHtmlForWebview();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				commands.executeCommand('setContext', 'codeCoverageViewFocused', this._panel.visible);
				if (this._panel.visible) {
					this.setHtmlForWebview();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						window.showErrorMessage(message.text);
						return;
					case 'filterapex':
						this._fileNameFilter = message.filter;
						this.updateHtmlForWebView();
						return;
					case 'filterlowcoverage':
						this._lowCoverageFilter = message.filter;
						this.updateHtmlForWebView();
						return;
					case 'filterprojectsfilesonly':
							this._projectFilesOnlyFilter = message.filter;
							this.updateHtmlForWebView();
							return;
				}
			},
			null,
			this._disposables
		);

		window.onDidChangeActiveTextEditor(
            this.setHtmlForWebview,
            this
		);

		commands.executeCommand('setContext', 'codeCoverageViewFocused', this._panel.visible);
	}

	public static createOrShow(extensionPath: string) {
		const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

		// If we already have a panel, show it.
		if (CodeCoveragePanel.currentPanel) {
			CodeCoveragePanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = window.createWebviewPanel(
			CodeCoveragePanel.viewType,
			'Code Coverage',
			column || ViewColumn.One,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [Uri.file(path.join(extensionPath, 'media'))]
			}
		);

		CodeCoveragePanel.currentPanel = new CodeCoveragePanel(panel, extensionPath);
	}

	public static revive(panel: WebviewPanel, extensionPath: string) {
		CodeCoveragePanel.currentPanel = new CodeCoveragePanel(panel, extensionPath);
	}

	public async setHtmlForWebview() {
		const codeCoverage: CoverageTestResult | null = getCoverageData();
		this._codeCoverage = codeCoverage;

		//this._panel.iconPath = Uri.file()
		this._panel.title = "Code Coverage";
		this._panel.webview.html = await this.getHtmlForWebview(this._panel.webview, '', codeCoverage);
	}

	public async updateHtmlForWebView() {
		const codeCoverage: CoverageTestResult | null = this._codeCoverage || getCoverageData();
		this._panel.webview.html = await this.getHtmlForWebview(this._panel.webview, '', codeCoverage);
	}

	private async getHtmlForWebview(webview: Webview, viewpath: string, codeCoverage: CoverageTestResult | null) {
		let content :string = '';

		if(!codeCoverage) {
			content = '<h2>No test coverage data exists. Please run tests to generate test coverage data</h2>';
		}
		else {
			content +=`
			<div style="margin: 20px; margin-bottom: 30px;">
				<form>
					<div class="form-row">
						<div class="col">
							<input class="form-check-input" type="checkbox" ${this._lowCoverageFilter ? 'checked ' : ''} id="lowCoverageFilter" onchange="filterLowCodeCoverage()" />
							<label class="form-check-label" for="lowCoverageFilter">Show only classes with coverage below 75%</label>
						</div>
						<div class="col">
							<input type="text" class="form-control" id="filterapex" placeholder="Filter by file name contains" oninput="filterFileName()" value="${this._fileNameFilter}" />
						</div>
					</div>
					<div class="form-row">
						<div class="col">
							<input class="form-check-input" type="checkbox" ${this._projectFilesOnlyFilter ? 'checked ' : ''} id="projectFilesOnlyFilter" onchange="filterProjectFilesOnly()" />
							<label class="form-check-label" for="lowCoverageFilter">Show only classes in this project</label>
						</div>
					</div>
				</form>
			</div>
			<table class="table table-striped">
				<thead>
					<tr>
						<th style="width: 40%">Apex Class</th>
						<th style="width: 60%">Coverage</th>
					</tr>
				</thead>
				<tbody>`;

			if(codeCoverage.coverage) {
				codeCoverage.coverage.coverage.sort((item1, item2) => {
					return item1.name.localeCompare(item2.name);
				}).forEach((item: CoverageItem) => {
					const className : string | null = item.name;
					const percentage : number = item.coveredPercent;

					const contentItem : string | null = this.calculateHtmlForItem(className, percentage);
					if(!contentItem) return;

					content += contentItem;
				});
			}
			else if(codeCoverage.codecoverage) {
				codeCoverage.codecoverage.sort((item1, item2) => {
					return item1.name.localeCompare(item2.name);
				}).forEach((item: CoverageItem2) => {
					const className : string | null = item.name;
					const percentage : number = item.percentage ? Number.parseFloat(item.percentage.replace('%','')) : 0;

					const contentItem : string | null = this.calculateHtmlForItem(className, percentage);
					if(!contentItem) return;

					content += contentItem;
				});
			}

			const fsPromises = fs.promises;
			const classes = await fsPromises.readdir(apexClassesDirPath);
			classes.forEach(function (file) {
				if(!file.endsWith('.cls')) return;
				const apexClass = file.replace(".cls","");
				const isTestClass = codeCoverage.tests.find((item) => (item.ApexClass && item.ApexClass.Name == apexClass) || (item.apexClass && item.apexClass.name == apexClass));
				if(isTestClass !== undefined) return;
				const found = codeCoverage.coverage ?
					codeCoverage.coverage.coverage.find((item) => item.name == apexClass) :
					codeCoverage.codecoverage.find((item) => item.name == apexClass);
				if(found === undefined) {
					content += `
						<tr>
							<td>${apexClass}</td><td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage information</div></div></td>
						</tr>`;
				}
			});
			const triggers = await fsPromises.readdir(apexTriggersDirPath);
			triggers.forEach(function (file) {
				if(!file.endsWith('.trigger')) return;
				const apexClass = file.replace(".trigger","");
				const found = codeCoverage.coverage ?
					codeCoverage.coverage.coverage.find((item) => item.name == apexClass) :
					codeCoverage.codecoverage.find((item) => item.name == apexClass);
				if(found === undefined) {
					content += `
						<tr>
						<td>${apexClass}</td><td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage information</div></div></td>
						</tr>`;
				}
			});

			content += `
				</tbody>
			</table>`;
		}

		return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
				<title>Code Coverage</title>
				<style>
					body {
						color: var(--vscode-editor-foreground);
						background-color: var(--vscode-editor-background);
					}
				</style>
            </head>
			<body>
				<div class="container">
					<h1>Apex Code Coverage</h1>
				${content}
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					var handler;

					function filterLowCodeCoverage() {
						const checkbox = document.getElementById('lowCoverageFilter');

						vscode.postMessage({
							command: 'filterlowcoverage',
							filter: checkbox.checked
						});
					}

					function filterProjectFilesOnly() {
						const checkbox = document.getElementById('projectFilesOnlyFilter');

						vscode.postMessage({
							command: 'filterprojectsfilesonly',
							filter: checkbox.checked
						});
					}


					function filterFileName() {
						if(handler) {
							clearTimeout(handler);
						}
						handler = setTimeout(filter, 300);
					}

					function filter() {
						handler = null;
						const text = document.getElementById('filterapex');
						vscode.postMessage({
							command: 'filterapex',
							filter: text.value
						});
					}
				</script>
            </body>
            </html>`;
	}

	private calculateHtmlForItem(className : string | null, percentage : number) : string | null {
		if(!className) return null;

		if(this._lowCoverageFilter && percentage >= 75) {
			return null;
		}

		const apexClassFile = path.join(apexClassesDirPath, `${className}.cls`);
		const apexTriggerFile = path.join(apexTriggersDirPath, `${className}.trigger`);
		if(this._projectFilesOnlyFilter && !fs.existsSync(apexClassFile) && !fs.existsSync(apexTriggerFile)) {
			return null;
		}

		if(this._fileNameFilter && !className.toLowerCase().includes(this._fileNameFilter.toLowerCase())) {
			return null;
		}

		let colorClass : string = "";

		if (percentage < 60) {
			colorClass = "bg-danger";
		} else if (percentage < 75) {
			colorClass = "bg-warning";
		} else {
			colorClass = "bg-success";
		}

		let coverage : string = Math.round(percentage).toString();

		const content = `
			<tr>
				<td>${className}</td><td><div class="progress"><div class="progress-bar ${colorClass}" role="progressbar" style="width: ${coverage}%;" aria-valuenow="${coverage}" aria-valuemin="0" aria-valuemax="100">${coverage}%</div></div></td>
			</tr>`;

		return content;
	}

	public dispose() {
		CodeCoveragePanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
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

function getCoverageForCurrentEditor() :number | null {
    const codeCoverage: CoverageTestResult | null = getCoverageData();
    if (!codeCoverage) {
        return null;
    }

	let coveredPercent: number | null = null;

	if(codeCoverage.coverage) {
		codeCoverage.coverage.coverage.forEach((item: CoverageItem) => {
			if (window.activeTextEditor?.document.fileName.includes(item.name)) {
				coveredPercent = item.coveredPercent;
			}
		});
	}
	else if(codeCoverage.codecoverage) {
		codeCoverage.codecoverage.forEach((item: CoverageItem2) => {
			if (window.activeTextEditor?.document.fileName.includes(item.name)) {
				coveredPercent = Number.parseFloat(item.percentage.replace('%',''));
			}
		});
	}


    return coveredPercent;
}

type CoverageTestResult = {
    coverage: {
        coverage: CoverageItem[];
	};
	tests: TestItem[];
    codecoverage: CoverageItem2[];
};

type CoverageItem = {
    id: string;
    name: string;
    totalLines: number;
    totalCovered: number;
	coveredPercent: number;
};

type CoverageItem2 = {
    apexId: string;
	name: string;
	type: string;
    numLinesCovered: number;
    numLinesUncovered: number;
	percentage: string;
};

type TestItem = {
	ApexClass: ApexClassItem;
	apexClass: ApexClassItem2;
}

type ApexClassItem = {
	Name: string;
}

type ApexClassItem2 = {
	name: string;
}
