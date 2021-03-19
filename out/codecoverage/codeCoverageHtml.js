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
    static getHtmlForCoverage(codeCoverage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!codeCoverage) {
                return '';
            }
            let content = `
		<table class="table table-striped">
			<thead>
				<tr>
					<th style="width: 40%">Apex Class</th>
					<th style="width: 60%">Coverage</th>
				</tr>
			</thead>
			<tbody>`;
            if (codeCoverage.coverage) {
                codeCoverage.coverage.coverage.sort((item1, item2) => {
                    return item1.name.localeCompare(item2.name);
                }).forEach((item) => {
                    const className = item.name;
                    const percentage = item.coveredPercent;
                    const contentItem = CodeCoverageHtml.calculateHtmlForItem(className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter);
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
                    const contentItem = CodeCoverageHtml.calculateHtmlForItem(className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter);
                    if (!contentItem) {
                        return;
                    }
                    content += contentItem;
                });
            }
            // calculate those that do not have any coverage
            const fsPromises = fs.promises;
            const classes = yield fsPromises.readdir(codeCoverage_1.apexClassesDirPath);
            classes.forEach(function (file) {
                if (!file.endsWith('.cls')) {
                    return;
                }
                if (fileNameFilter && !file.toLowerCase().includes(fileNameFilter.toLowerCase())) {
                    return;
                }
                const apexClass = file.replace(".cls", "");
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
						<td><span class="apexClassName">${apexClass}</span></td><td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage</div></div></td>
					</tr>`;
                }
            });
            const triggers = yield fsPromises.readdir(codeCoverage_1.apexTriggersDirPath);
            triggers.forEach(function (file) {
                if (!file.endsWith('.trigger')) {
                    return;
                }
                if (fileNameFilter && !file.toLowerCase().includes(fileNameFilter.toLowerCase())) {
                    return;
                }
                const apexClass = file.replace(".trigger", "");
                const found = codeCoverage.coverage ?
                    codeCoverage.coverage.coverage.find((item) => item.name === apexClass) :
                    codeCoverage.codecoverage.find((item) => item.name === apexClass);
                if (found === undefined) {
                    content += `
					<tr>
						<td><span class="apexClassName">${apexClass}</span></td><td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage</div></div></td>
					</tr>`;
                }
            });
            content += `
			</tbody>
		</table>`;
            return content;
        });
    }
    static calculateHtmlForItem(className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter) {
        if (!className) {
            return null;
        }
        if (lowCoverageFilter && percentage >= 75) {
            return null;
        }
        const apexClassFile = path.join(codeCoverage_1.apexClassesDirPath, `${className}.cls`);
        const apexTriggerFile = path.join(codeCoverage_1.apexTriggersDirPath, `${className}.trigger`);
        if (projectFilesOnlyFilter && !fs.existsSync(apexClassFile) && !fs.existsSync(apexTriggerFile)) {
            return null;
        }
        if (fileNameFilter && !className.toLowerCase().includes(fileNameFilter.toLowerCase())) {
            return null;
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
        const content = `
			<tr>
				<td><span class="apexClassName">${className}</span></td><td><div class="progress"><div class="progress-bar ${colorClass}" role="progressbar" style="width: ${coverage}%;" aria-valuenow="${coverage}" aria-valuemin="0" aria-valuemax="100">${coverage}%</div></div></td>
			</tr>`;
        return content;
    }
}
exports.CodeCoverageHtml = CodeCoverageHtml;
//# sourceMappingURL=codeCoverageHtml.js.map