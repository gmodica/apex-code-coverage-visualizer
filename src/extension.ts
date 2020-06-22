// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CodeCoverage, CodeCoveragePanel } from './codecoverage';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('apex-code-coverage-visualizer.show-code-coverage', () => {
			CodeCoveragePanel.createOrShow(context.extensionPath);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('apex-code-coverage-visualizer.refresh-code-coverage', () => {
			if(CodeCoveragePanel.currentPanel) {
				CodeCoveragePanel.currentPanel.setHtmlForWebview();
			}
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(CodeCoveragePanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				CodeCoveragePanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}

	const codeCoverage = new CodeCoverage();
}

// this method is called when your extension is deactivated
export function deactivate() {}
