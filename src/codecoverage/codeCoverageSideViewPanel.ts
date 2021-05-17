import * as vscode from 'vscode';
import { CoverageTestResult } from './types';
import { CodeCoverage } from './codeCoverage';
import { CodeCoverageHtml } from './codeCoverageHtml';


export class CodeCoverageSideViewPanelProvider implements vscode.WebviewViewProvider {
	public static currentView: CodeCoverageSideViewPanelProvider | undefined;

	public static readonly viewType = 'apex-code-coverage-visualizer.test-view';

	private _view?: vscode.WebviewView;
	private readonly _extensionUri: vscode.Uri;
	private _codeCoverage: CoverageTestResult | null = null;
	private _fileNameFilter: string | null = '';
	private _lowCoverageFilter: boolean = false;
	private _projectFilesOnlyFilter: boolean = true;


	constructor(extensionUri: vscode.Uri) {
		this._extensionUri = extensionUri;
	}

	public toggleLowCoverageFilter() {
		this._lowCoverageFilter = !this._lowCoverageFilter;
		this.setContextVariables();
		this.updateHtmlForWebView();
	}

	public toggleProjectFilesOnlyFilter() {
		this._projectFilesOnlyFilter = !this._projectFilesOnlyFilter;
		this.setContextVariables();
		this.updateHtmlForWebView();
	}

	public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
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

	private setContextVariables() {
		vscode.commands.executeCommand('setContext', 'filterClassesProject', !this._projectFilesOnlyFilter);
		vscode.commands.executeCommand('setContext', 'filterClassesAll', this._projectFilesOnlyFilter);
		vscode.commands.executeCommand('setContext', 'filterCoverageWarning', this._lowCoverageFilter);
		vscode.commands.executeCommand('setContext', 'filterCoverageAll', !this._lowCoverageFilter);
	}

	public async setHtmlForWebview(codeCoverage: CoverageTestResult | null) {
		if(!this._view) {
			return;
		}

		this._codeCoverage = codeCoverage || CodeCoverage.getCoverage();

		this._view.title = "Code Coverage";
		this._view.webview.html = await this.getHtmlForWebview(this._view.webview, '', this._codeCoverage);
	}

	private async updateHtmlForWebView() {
		if(!this._view) {
			return;
		}

		const codeCoverage: CoverageTestResult | null = this._codeCoverage || CodeCoverage.getCoverage();
		this._view.webview.html = await this.getHtmlForWebview(this._view.webview, '', codeCoverage);
	}

	private async getHtmlForWebview(webview: vscode.Webview, viewpath: string, codeCoverage: CoverageTestResult | null) {
		let content :string = '';

		if(!codeCoverage) {
			content = '<p>No test coverage data exists. Please run tests to generate test coverage data</p>';
		}
		else {
			content = await CodeCoverageHtml.getHtmlForCoverage(codeCoverage, true, this._lowCoverageFilter, this._projectFilesOnlyFilter, this._fileNameFilter);
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
	}
}