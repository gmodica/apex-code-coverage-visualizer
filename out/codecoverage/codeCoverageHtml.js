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
exports.CodeCoverageHtml = void 0;
const fs = require("fs");
const path = require("path");
const codeCoverage_1 = require("./codeCoverage");
class CodeCoverageHtml {
    static getHtmlForCoverage(codeCoverage, isSmall, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!codeCoverage) {
                return '';
            }
            let content = `
		<table class="${!isSmall ? "table table-striped" : ""}">
			<thead>
				<tr>
					<th style="width: 40%">Apex Class</th>
					<th style="width: 60%">Coverage</th>
				</tr>
			</thead>
			<tbody>`;
            const files = yield codeCoverage_1.getAllFiles(codeCoverage_1.apexClassesDirPath, [".cls", ".trigger"]);
            if (codeCoverage.coverage) {
                codeCoverage.coverage.coverage.sort((item1, item2) => {
                    return item1.name.localeCompare(item2.name);
                }).forEach((item) => {
                    const className = item.name;
                    const percentage = item.coveredPercent;
                    const contentItem = CodeCoverageHtml.calculateHtmlForItem(codeCoverage, isSmall, files, className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter);
                    if (!contentItem) {
                        return;
                    }
                    content += contentItem;
                });
            }
            else if (codeCoverage.codecoverage) {
                codeCoverage.codecoverage.sort((item1, item2) => {
                    return item1.name.localeCompare(item2.name);
                }).forEach((item) => {
                    const className = item.name;
                    const percentage = item.percentage ? Number.parseFloat(item.percentage.replace('%', '')) : 0;
                    const contentItem = CodeCoverageHtml.calculateHtmlForItem(codeCoverage, isSmall, files, className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter);
                    if (!contentItem) {
                        return;
                    }
                    content += contentItem;
                });
            }
            // calculate those that do not have any coverage
            files.forEach(function (file) {
                if (!file.endsWith('.cls')) {
                    return;
                }
                if (fileNameFilter && !file.toLowerCase().includes(fileNameFilter.toLowerCase())) {
                    return;
                }
                const apexClass = path.basename(file, ".cls");
                const directory = path.dirname(file).replace(codeCoverage_1.apexClassesDirPath, '');
                const isTestClass = codeCoverage.tests.find((item) => (item.ApexClass && item.ApexClass.Name === apexClass) || (item.apexClass && item.apexClass.name === apexClass));
                if (isTestClass !== undefined) {
                    return;
                }
                const found = codeCoverage.coverage ?
                    codeCoverage.coverage.coverage.find((item) => item.name === apexClass) :
                    codeCoverage.codecoverage.find((item) => item.name === apexClass);
                if (found === undefined) {
                    content += `
					<tr>
						<td><span class="apexClassName" title="${apexClass}">${apexClass}
						${!isSmall ? '<br /><small title="' + directory + '">' + directory + '</small>' : ''}
						</span></td>
						<td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage</div></div></td>
					</tr>`;
                }
            });
            files.forEach(function (file) {
                if (!file.endsWith('.trigger')) {
                    return;
                }
                if (fileNameFilter && !file.toLowerCase().includes(fileNameFilter.toLowerCase())) {
                    return;
                }
                const apexClass = path.basename(file, ".trigger");
                const directory = path.dirname(file).replace(codeCoverage_1.apexClassesDirPath, '');
                const found = codeCoverage.coverage ?
                    codeCoverage.coverage.coverage.find((item) => item.name === apexClass) :
                    codeCoverage.codecoverage.find((item) => item.name === apexClass);
                if (found === undefined) {
                    content += `
					<tr>
						<td><span class="apexClassName" title="${apexClass}">${apexClass}
						${!isSmall ? '<br /><small title="' + directory + '">' + directory + '</small>' : ''}
						</span></td>
						<td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage</div></div></td>
					</tr>`;
                }
            });
            content += `
			</tbody>
		</table>`;
            return content;
        });
    }
    static calculateHtmlForItem(codeCoverage, isSmall, files, className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter) {
        if (!className) {
            return null;
        }
        if (lowCoverageFilter && percentage >= 75) {
            return null;
        }
        const apexClassFile = files === null || files === void 0 ? void 0 : files.find(file => file.endsWith(`${className}.cls`));
        const apexTriggerFile = files === null || files === void 0 ? void 0 : files.find(file => file.endsWith(`${className}.trigger`));
        if (projectFilesOnlyFilter && (!apexClassFile || !fs.existsSync(apexClassFile)) && (!apexTriggerFile || !fs.existsSync(apexTriggerFile))) {
            return null;
        }
        if (fileNameFilter && !className.toLowerCase().includes(fileNameFilter.toLowerCase())) {
            return null;
        }
        let directory = (apexClassFile && path.dirname(apexClassFile)) || (apexTriggerFile && path.dirname(apexTriggerFile));
        if (directory) {
            directory = directory.replace(codeCoverage_1.apexClassesDirPath, '');
        }
        let colorClass = "";
        if (percentage < 60) {
            colorClass = "bg-danger";
        }
        else if (percentage < 75) {
            colorClass = "bg-warning";
        }
        else {
            colorClass = "bg-success";
        }
        let coverage = Math.round(percentage).toString();
        let testClasses = codeCoverage_1.CodeCoverage.getTestClassesForApexClass(className, codeCoverage);
        const hasTestInfo = testClasses !== null && testClasses.length > 0;
        let testInfo = '';
        if (!isSmall) {
            if (hasTestInfo) {
                testClasses === null || testClasses === void 0 ? void 0 : testClasses.forEach(test => {
                    testInfo += `${test.apexClassOrTriggerName}.${test.apexTestMethodName}: ${test.percentage}<br />`;
                });
                testInfo = `
				<div id="${className}--test" class="collapsible">
					${testInfo}
				</div>`;
            }
        }
        let content = `
			<tr id="${className}">
				<td>
					<span class="apexClassName" title="${className}">${className}
					${!isSmall ? '<br /><small title="' + directory + '">' + directory + '</small>' : ''}
					</span>
				</td>
				<td>
					<div id="${className}">
						<div class="progress"><div class="progress-bar ${colorClass}" role="progressbar" style="width: ${coverage}%;" aria-valuenow="${coverage}" aria-valuemin="0" aria-valuemax="100">${coverage}%</div></div>
						${!isSmall && hasTestInfo ? '<div style="float: right"><i class="fas fa-chevron-circle-down" title="Show test class coverage contribution" onclick="showInfo(this)"></i></div>' + testInfo : ""}
					</div>
				</td>
			</tr>`;
        return content;
    }
}
exports.CodeCoverageHtml = CodeCoverageHtml;
//# sourceMappingURL=codeCoverageHtml.js.map