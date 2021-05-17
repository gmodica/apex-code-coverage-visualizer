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
exports.CodeCoverageSideViewPanelProvider = void 0;
const vscode = require("vscode");
const codeCoverage_1 = require("./codeCoverage");
const codeCoverageHtml_1 = require("./codeCoverageHtml");
class CodeCoverageSideViewPanelProvider {
    constructor(extensionUri) {
        this._codeCoverage = null;
        this._fileNameFilter = '';
        this._lowCoverageFilter = false;
        this._projectFilesOnlyFilter = true;
        this._extensionUri = extensionUri;
    }
    toggleLowCoverageFilter() {
        this._lowCoverageFilter = !this._lowCoverageFilter;
        this.setContextVariables();
        this.updateHtmlForWebView();
    }
    toggleProjectFilesOnlyFilter() {
        this._projectFilesOnlyFilter = !this._projectFilesOnlyFilter;
        this.setContextVariables();
        this.updateHtmlForWebView();
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };
        this.setContextVariables();
        this.setHtmlForWebview(null);
        webviewView.webview.onDidReceiveMessage(message => {
        });
        CodeCoverageSideViewPanelProvider.currentView = this;
    }
    setContextVariables() {
        vscode.commands.executeCommand('setContext', 'filterClassesProject', !this._projectFilesOnlyFilter);
        vscode.commands.executeCommand('setContext', 'filterClassesAll', this._projectFilesOnlyFilter);
        vscode.commands.executeCommand('setContext', 'filterCoverageWarning', this._lowCoverageFilter);
        vscode.commands.executeCommand('setContext', 'filterCoverageAll', !this._lowCoverageFilter);
    }
    setHtmlForWebview(codeCoverage) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._view) {
                return;
            }
            this._codeCoverage = codeCoverage || codeCoverage_1.CodeCoverage.getCoverage();
            this._view.title = "Code Coverage";
            this._view.webview.html = yield this.getHtmlForWebview(this._view.webview, '', this._codeCoverage);
        });
    }
    updateHtmlForWebView() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._view) {
                return;
            }
            const codeCoverage = this._codeCoverage || codeCoverage_1.CodeCoverage.getCoverage();
            this._view.webview.html = yield this.getHtmlForWebview(this._view.webview, '', codeCoverage);
        });
    }
    getHtmlForWebview(webview, viewpath, codeCoverage) {
        return __awaiter(this, void 0, void 0, function* () {
            let content = '';
            if (!codeCoverage) {
                content = '<p>No test coverage data exists. Please run tests to generate test coverage data</p>';
            }
            else {
                content = yield codeCoverageHtml_1.CodeCoverageHtml.getHtmlForCoverage(codeCoverage, true, this._lowCoverageFilter, this._projectFilesOnlyFilter, this._fileNameFilter);
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
			background-color: var(--vscode-sidebar-background);
		}
		.apexClassName {
			font-size: 9pt;
		}
		.container {
			padding: 0;
			margin: 0;
		}
	</style>
</head>
<body>
	<div class="container">
		${content}
	</div>
</body>
</html>`;
        });
    }
}
exports.CodeCoverageSideViewPanelProvider = CodeCoverageSideViewPanelProvider;
CodeCoverageSideViewPanelProvider.viewType = 'apex-code-coverage-visualizer.test-view';
//# sourceMappingURL=codeCoverageSideViewPanel.js.map