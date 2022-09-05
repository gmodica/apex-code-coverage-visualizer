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
exports.CodeCoveragePanel = void 0;
const path = require("path");
const vscode = require("vscode");
const codeCoverage_1 = require("./codeCoverage");
const codeCoverageHtml_1 = require("./codeCoverageHtml");
class CodeCoveragePanel {
    constructor(panel, extensionPath) {
        this._disposables = [];
        this._codeCoverage = null;
        this._fileNameFilter = '';
        this._lowCoverageFilter = false;
        this._projectFilesOnlyFilter = true;
        this._panel = panel;
        this._extensionPath = extensionPath;
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        this._panel.onDidChangeViewState(e => {
            vscode.commands.executeCommand('setContext', 'codeCoverageViewFocused', this._panel.visible);
            if (this._panel.visible) {
                this.setHtmlForWebview(null);
            }
        }, null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
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
        vscode.commands.executeCommand('setContext', 'codeCoverageViewFocused', this._panel.visible);
    }
    static createOrShow(extensionPath) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        // If we already have a panel, show it.
        if (CodeCoveragePanel.currentPanel) {
            CodeCoveragePanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(CodeCoveragePanel.viewType, 'Code Coverage', column || vscode.ViewColumn.One, {
            // Enable javascript in the webview
            enableScripts: true,
            // And restrict the webview to only loading content from our extension's `media` directory.
            localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
        });
        CodeCoveragePanel.currentPanel = new CodeCoveragePanel(panel, extensionPath);
        CodeCoveragePanel.currentPanel.setHtmlForWebview(null);
    }
    static revive(panel, extensionPath) {
        CodeCoveragePanel.currentPanel = new CodeCoveragePanel(panel, extensionPath);
    }
    setHtmlForWebview(codeCoverage) {
        return __awaiter(this, void 0, void 0, function* () {
            this._codeCoverage = codeCoverage || codeCoverage_1.CodeCoverage.getCoverage();
            this._panel.title = "Code Coverage";
            this._panel.webview.html = yield this.getHtmlForWebview(this._panel.webview, '', this._codeCoverage);
        });
    }
    updateHtmlForWebView() {
        return __awaiter(this, void 0, void 0, function* () {
            const codeCoverage = this._codeCoverage || codeCoverage_1.CodeCoverage.getCoverage();
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
			</div>`;
                content += yield codeCoverageHtml_1.CodeCoverageHtml.getHtmlForCoverage(codeCoverage, false, this._lowCoverageFilter, this._projectFilesOnlyFilter, this._fileNameFilter);
            }
            return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
	<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.0/css/all.css" integrity="sha384-lZN37f5QGtY3VHgisS14W3ExzMWZxybE1SJSEsQp9S+oqd12jhcu+A56Ebc1zFSJ" crossorigin="anonymous">
	<title>Code Coverage</title>
	<style>
		body {
			color: var(--vscode-editor-foreground);
			background-color: var(--vscode-editor-background);
		}
		.collapsible {
			display: none;
		}
		i {
			cursor: pointer;
		}
		small {
			font-size: 8pt;
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
			handler = setTimeout(filter, 600);
		}

		function filter() {
			handler = null;
			const text = document.getElementById('filterapex');
			vscode.postMessage({
				command: 'filterapex',
				filter: text.value
			});
		}

		function showInfo(element) {
			let id = element.parentElement.parentElement.id + '--test';
			let collapsibleElement = document.getElementById(id);
			if(collapsibleElement.style.display == 'block') {
				collapsibleElement.style.display = 'none';
				element.className = 'fas fa-chevron-circle-down';
			}
			else {
				collapsibleElement.style.display = 'block';
				element.className = 'fas fa-chevron-circle-up';
			}
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
CodeCoveragePanel.viewType = 'apex-code-coverage-visualizer.editor-view';
//# sourceMappingURL=codeCoverageViewPanel.js.map