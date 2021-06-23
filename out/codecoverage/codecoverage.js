"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeCoverage = exports.apexTriggersDirPath = exports.apexClassesDirPath = exports.apexDirPath = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const codeCoverageViewPanel_1 = require("./codeCoverageViewPanel");
const codeCoverageSideViewPanel_1 = require("./codeCoverageSideViewPanel");
exports.apexDirPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, ".sfdx", "tools", "testresults", "apex");
exports.apexClassesDirPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "force-app", "main", "default", "classes");
exports.apexTriggersDirPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "force-app", "main", "default", "triggers");
class CodeCoverage {
    constructor() {
        this._codeCoverage = null;
        this.statusBarItem = vscode.window.createStatusBarItem();
        this.statusBarItem.command = 'apex-code-coverage-visualizer.show-code-coverage';
        const testResultOutput = path.join(exports.apexDirPath, "*.json");
        const testResultFileWatcher = vscode.workspace.createFileSystemWatcher(testResultOutput);
        testResultFileWatcher.onDidCreate((uri) => {
            this.refresh();
            this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
        });
        vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this);
        this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    }
    static getCoverage() {
        return getCoverageData();
    }
    static getTestClassesForApexClass(apexClass, codeCoverage) {
        var _a;
        if (codeCoverage === null) {
            codeCoverage = this.getCoverage();
        }
        let tests = [];
        (_a = codeCoverage === null || codeCoverage === void 0 ? void 0 : codeCoverage.tests) === null || _a === void 0 ? void 0 : _a.forEach(test => {
            if (!test.perClassCoverage)
                return;
            test.perClassCoverage.forEach(coverage => {
                if (coverage.apexClassOrTriggerName === apexClass) {
                    let testCoverage = {
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
    refresh() {
        this._codeCoverage = getCoverageData();
        if (codeCoverageViewPanel_1.CodeCoveragePanel.currentPanel) {
            codeCoverageViewPanel_1.CodeCoveragePanel.currentPanel.setHtmlForWebview(this._codeCoverage);
        }
        if (codeCoverageSideViewPanel_1.CodeCoverageSideViewPanelProvider.currentView) {
            codeCoverageSideViewPanel_1.CodeCoverageSideViewPanelProvider.currentView.setHtmlForWebview(this._codeCoverage);
        }
    }
    onDidChangeActiveTextEditor(editor) {
        if (editor && (editor.document.fileName.toLowerCase().endsWith("cls") || editor.document.fileName.toLowerCase().endsWith("trigger"))) {
            let coverage = getCoverageForCurrentEditor(this._codeCoverage);
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
function getTestRunId() {
    const testRunIdFile = path.join(exports.apexDirPath, "test-run-id.txt");
    if (fs.existsSync(testRunIdFile)) {
        return fs.readFileSync(testRunIdFile, "utf8");
    }
    return null;
}
function getCoverageData() {
    const testRunId = getTestRunId();
    const testResultFilePath = path.join(exports.apexDirPath, `test-result-${testRunId}.json`);
    if (!fs.existsSync(testResultFilePath)) {
        return null;
    }
    const testResultOutput = fs.readFileSync(testResultFilePath, "utf8");
    const codeCoverage = JSON.parse(testResultOutput);
    return codeCoverage;
}
function getCoverageForCurrentEditor(codeCoverage) {
    if (!codeCoverage) {
        codeCoverage = getCoverageData();
    }
    if (!codeCoverage) {
        return null;
    }
    let coveredPercent = null;
    if (codeCoverage.coverage) {
        codeCoverage.coverage.coverage.forEach((item) => {
            var _a;
            if ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.fileName.includes(item.name)) {
                coveredPercent = item.coveredPercent;
            }
        });
    }
    else if (codeCoverage.codecoverage) {
        codeCoverage.codecoverage.forEach((item) => {
            var _a;
            if ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.fileName.includes(item.name)) {
                coveredPercent = Number.parseFloat(item.percentage.replace('%', ''));
            }
        });
    }
    return coveredPercent;
}
//# sourceMappingURL=codeCoverage.js.map