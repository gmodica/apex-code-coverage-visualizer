"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeCoveragePanel = exports.CodeCoverage = void 0;
const fs = require("fs");
const path = require("path");
const vscode_1 = require("vscode");
const apexDirPath = path.join(vscode_1.workspace.workspaceFolders[0].uri.fsPath, ".sfdx", "tools", "testresults", "apex");
const apexClassesDirPath = path.join(vscode_1.workspace.workspaceFolders[0].uri.fsPath, "force-app", "main", "default", "classes");
const apexTriggersDirPath = path.join(vscode_1.workspace.workspaceFolders[0].uri.fsPath, "force-app", "main", "default", "triggers");
class CodeCoverage {
    constructor() {
        this.statusBarItem = vscode_1.window.createStatusBarItem();
        this.statusBarItem.command = 'apex-code-coverage-visualizer.show-code-coverage';
        const testResultOutput = path.join(apexDirPath, "*.json");
        const testResultFileWatcher = vscode_1.workspace.createFileSystemWatcher(testResultOutput);
        testResultFileWatcher.onDidCreate((uri) => {
            this.onDidChangeActiveTextEditor(vscode_1.window.activeTextEditor);
            if (CodeCoveragePanel.currentPanel) {
                CodeCoveragePanel.currentPanel.setHtmlForWebview();
            }
        });
        vscode_1.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this);
        this.onDidChangeActiveTextEditor(vscode_1.window.activeTextEditor);
    }
    onDidChangeActiveTextEditor(editor) {
        if (editor && (editor.document.fileName.toLowerCase().endsWith("cls") || editor.document.fileName.toLowerCase().endsWith("trigger"))) {
            let coverage = getCoverageForCurrentEditor();
            if (coverage && coverage >= 0) {
                this.setCoverage(coverage);
                this.statusBarItem.show();
            }
            else {
                this.statusBarItem.hide();
            }
        }
        else {
            this.statusBarItem.hide();
        }
    }
    setCoverage(coverage) {
        let icon = "";
        if (coverage < 60) {
            icon = "$(stop)";
            //this.statusBarItem.color = new ThemeColor("editorOverviewRuler.errorForeground");
        }
        else if (coverage < 75) {
            icon = "$(warning)";
            //this.statusBarItem.color = new ThemeColor("editorOverviewRuler.warningForeground");
        }
        else {
            icon = "$(check)";
            //this.statusBarItem.color = new ThemeColor("editorOverviewRuler.errorForeground");
        }
        this.statusBarItem.text = `$(microscope) ${Math.round(coverage)}% ${icon}`;
        this.statusBarItem.tooltip = `${coverage}% coverage`;
    }
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.CodeCoverage = CodeCoverage;
class CodeCoveragePanel {
    constructor(panel, extensionPath) {
        this._disposables = [];
        this._codeCoverage = null;
        this._fileNameFilter = '';
        this._lowCoverageFilter = false;
        this._projectFilesOnlyFilter = true;
        this._panel = panel;
        this._extensionPath = extensionPath;
        // Set the webview's initial html content
        this.setHtmlForWebview();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        this._panel.onDidChangeViewState(e => {
            vscode_1.commands.executeCommand('setContext', 'codeCoverageViewFocused', this._panel.visible);
            if (this._panel.visible) {
                this.setHtmlForWebview();
            }
        }, null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'alert':
                    vscode_1.window.showErrorMessage(message.text);
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
        }, null, this._disposables);
        vscode_1.window.onDidChangeActiveTextEditor(this.setHtmlForWebview, this);
        vscode_1.commands.executeCommand('setContext', 'codeCoverageViewFocused', this._panel.visible);
    }
    static createOrShow(extensionPath) {
        const column = vscode_1.window.activeTextEditor ? vscode_1.window.activeTextEditor.viewColumn : undefined;
        // If we already have a panel, show it.
        if (CodeCoveragePanel.currentPanel) {
            CodeCoveragePanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode_1.window.createWebviewPanel(CodeCoveragePanel.viewType, 'Code Coverage', column || vscode_1.ViewColumn.One, {
            // Enable javascript in the webview
            enableScripts: true,
            // And restrict the webview to only loading content from our extension's `media` directory.
            localResourceRoots: [vscode_1.Uri.file(path.join(extensionPath, 'media'))]
        });
        CodeCoveragePanel.currentPanel = new CodeCoveragePanel(panel, extensionPath);
    }
    static revive(panel, extensionPath) {
        CodeCoveragePanel.currentPanel = new CodeCoveragePanel(panel, extensionPath);
    }
    setHtmlForWebview() {
        return __awaiter(this, void 0, void 0, function* () {
            const codeCoverage = getCoverageData();
            this._codeCoverage = codeCoverage;
            //this._panel.iconPath = Uri.file()
            this._panel.title = "Code Coverage";
            this._panel.webview.html = yield this.getHtmlForWebview(this._panel.webview, '', codeCoverage);
        });
    }
    updateHtmlForWebView() {
        return __awaiter(this, void 0, void 0, function* () {
            const codeCoverage = this._codeCoverage || getCoverageData();
            this._panel.webview.html = yield this.getHtmlForWebview(this._panel.webview, '', codeCoverage);
        });
    }
    getHtmlForWebview(webview, viewpath, codeCoverage) {
        return __awaiter(this, void 0, void 0, function* () {
            let content = '';
            if (!codeCoverage) {
                content = '<h2>No test coverage data exists. Please run tests to generate test coverage data</h2>';
            }
            else {
                content += `
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
                codeCoverage.coverage.coverage.sort((item1, item2) => {
                    return item1.name.localeCompare(item2.name);
                }).forEach((item) => {
                    if (this._lowCoverageFilter && item.coveredPercent >= 75) {
                        return;
                    }
                    const apexClassFile = path.join(apexClassesDirPath, `${item.name}.cls`);
                    const apexTriggerFile = path.join(apexTriggersDirPath, `${item.name}.trigger`);
                    if (this._projectFilesOnlyFilter && !fs.existsSync(apexClassFile) && !fs.existsSync(apexTriggerFile)) {
                        return;
                    }
                    if (this._fileNameFilter && !item.name.toLowerCase().includes(this._fileNameFilter.toLowerCase())) {
                        return;
                    }
                    let colorClass = "";
                    if (item.coveredPercent < 60) {
                        colorClass = "bg-danger";
                    }
                    else if (item.coveredPercent < 75) {
                        colorClass = "bg-warning";
                    }
                    else {
                        colorClass = "bg-success";
                    }
                    let coverage = Math.round(item.coveredPercent).toString();
                    content += `
					<tr>
						<td>${item.name}</td><td><div class="progress"><div class="progress-bar ${colorClass}" role="progressbar" style="width: ${coverage}%;" aria-valuenow="${coverage}" aria-valuemin="0" aria-valuemax="100">${coverage}%</div></div></td>
					</tr>`;
                });
                const fsPromises = fs.promises;
                const classes = yield fsPromises.readdir(apexClassesDirPath);
                classes.forEach(function (file) {
                    if (!file.endsWith('.cls'))
                        return;
                    const apexClass = file.replace(".cls", "");
                    const isTestClass = codeCoverage.tests.find((item) => item.ApexClass.Name == apexClass);
                    if (isTestClass !== undefined)
                        return;
                    const found = codeCoverage.coverage.coverage.find((item) => item.name == apexClass);
                    if (found === undefined) {
                        content += `
						<tr>
							<td>${apexClass}</td><td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage information</div></div></td>
						</tr>`;
                    }
                });
                const triggers = yield fsPromises.readdir(apexTriggersDirPath);
                triggers.forEach(function (file) {
                    if (!file.endsWith('.trigger'))
                        return;
                    const apexClass = file.replace(".trigger", "");
                    const found = codeCoverage.coverage.coverage.find((item) => item.name == apexClass);
                    if (found === undefined) {
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
        });
    }
    dispose() {
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
exports.CodeCoveragePanel = CodeCoveragePanel;
CodeCoveragePanel.viewType = 'codeCoverage';
function getTestRunId() {
    const testRunIdFile = path.join(apexDirPath, "test-run-id.txt");
    if (fs.existsSync(testRunIdFile)) {
        return fs.readFileSync(testRunIdFile, "utf8");
    }
    return null;
}
function getCoverageData() {
    const testRunId = getTestRunId();
    const testResultFilePath = path.join(apexDirPath, `test-result-${testRunId}.json`);
    if (!fs.existsSync(testResultFilePath)) {
        return null;
    }
    const testResultOutput = fs.readFileSync(testResultFilePath, "utf8");
    const codeCoverage = JSON.parse(testResultOutput);
    return codeCoverage;
}
function getCoverageForCurrentEditor() {
    const codeCoverage = getCoverageData();
    if (!codeCoverage || !codeCoverage.coverage) {
        return null;
    }
    let coveredPercent = null;
    codeCoverage.coverage.coverage.forEach((item) => {
        var _a;
        if ((_a = vscode_1.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.fileName.includes(item.name)) {
            coveredPercent = item.coveredPercent;
        }
    });
    return coveredPercent;
}
//# sourceMappingURL=codecoverage.js.map