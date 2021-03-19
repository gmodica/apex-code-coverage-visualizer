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
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const codecoverage_1 = require("./codecoverage");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    const codeCoverage = new codecoverage_1.CodeCoverage();
    context.subscriptions.push(vscode.commands.registerCommand('apex-code-coverage-visualizer.show-code-coverage', () => {
        codecoverage_1.CodeCoveragePanel.createOrShow(context.extensionPath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('apex-code-coverage-visualizer.refresh-code-coverage', () => {
        codeCoverage.refresh();
    }));
    if (vscode.window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        vscode.window.registerWebviewPanelSerializer(codecoverage_1.CodeCoveragePanel.viewType, {
            deserializeWebviewPanel(webviewPanel, state) {
                return __awaiter(this, void 0, void 0, function* () {
                    codecoverage_1.CodeCoveragePanel.revive(webviewPanel, context.extensionPath);
                });
            }
        });
    }
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map