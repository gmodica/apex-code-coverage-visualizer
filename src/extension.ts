// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CodeCoverage, CodeCoveragePanel, CodeCoverageSideViewPanelProvider } from './codecoverage';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const codeCoverage = new CodeCoverage();

	context.subscriptions.push(
		vscode.commands.registerCommand('apex-code-coverage-visualizer.show-code-coverage', () => {
			CodeCoveragePanel.createOrShow(context.extensionPath);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('apex-code-coverage-visualizer.refresh-code-coverage', () => {
			codeCoverage.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('apex-code-coverage-visualizer.filter-classes-project', () => {
			CodeCoverageSideViewPanelProvider.currentView?.toggleProjectFilesOnlyFilter();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('apex-code-coverage-visualizer.filter-classes-all', () => {
			CodeCoverageSideViewPanelProvider.currentView?.toggleProjectFilesOnlyFilter();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('apex-code-coverage-visualizer.filter-coverage-warning', () => {
			CodeCoverageSideViewPanelProvider.currentView?.toggleLowCoverageFilter();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('apex-code-coverage-visualizer.filter-coverage-all', () => {
			CodeCoverageSideViewPanelProvider.currentView?.toggleLowCoverageFilter();
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

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(CodeCoverageSideViewPanelProvider.viewType, new CodeCoverageSideViewPanelProvider(context.extensionUri))
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}