import * as fs from "fs";
import * as path from "path";
import { CoverageTestResult, CoverageItem, CoverageItem2 } from './types';
import { CodeCoverage, apexClassesDirPath, apexTriggersDirPath } from './codeCoverage';

export class CodeCoverageHtml {
	public static async getHtmlForCoverage(codeCoverage: CoverageTestResult | null, isSmall: boolean, lowCoverageFilter : boolean, projectFilesOnlyFilter : boolean, fileNameFilter : string | null) : Promise<string> {
		if(!codeCoverage) {
			return '';
		}

		let content : string =`
		<table class="${!isSmall?"table table-striped":""}">
			<thead>
				<tr>
					<th style="width: 40%">Apex Class</th>
					<th style="width: 60%">Coverage</th>
					${!isSmall ? '<th>&nbsp;</th>' : ''}
				</tr>
			</thead>
			<tbody>`;

		if(codeCoverage.coverage) {
			codeCoverage.coverage.coverage.sort((item1, item2) => {
				return item1.name.localeCompare(item2.name);
			}).forEach((item: CoverageItem) => {
				const className : string | null = item.name;
				const percentage : number = item.coveredPercent;

				const contentItem : string | null = CodeCoverageHtml.calculateHtmlForItem(codeCoverage, isSmall, className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter);
				if(!contentItem) {
					return;
				}

				content += contentItem;
			});
		}
		else if(codeCoverage.codecoverage) {
			codeCoverage.codecoverage.sort((item1, item2) => {
				return item1.name.localeCompare(item2.name);
			}).forEach((item: CoverageItem2) => {
				const className : string | null = item.name;
				const percentage : number = item.percentage ? Number.parseFloat(item.percentage.replace('%','')) : 0;

				const contentItem : string | null = CodeCoverageHtml.calculateHtmlForItem(codeCoverage, isSmall, className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter);
				if(!contentItem) {
					return;
				}

				content += contentItem;
			});
		}

		// calculate those that do not have any coverage

		const fsPromises = fs.promises;
		const classes = await fsPromises.readdir(apexClassesDirPath);
		classes.forEach(function (file) {
			if(!file.endsWith('.cls')) {
				return;
			}
			if(fileNameFilter && !file.toLowerCase().includes(fileNameFilter.toLowerCase())) {
				return;
			}
			const apexClass = file.replace(".cls","");
			const isTestClass = codeCoverage.tests.find((item) => (item.ApexClass && item.ApexClass.Name === apexClass) || (item.apexClass && item.apexClass.name === apexClass));
			if(isTestClass !== undefined) {
				return;
			}
			const found = codeCoverage.coverage ?
				codeCoverage.coverage.coverage.find((item) => item.name === apexClass) :
				codeCoverage.codecoverage.find((item) => item.name === apexClass);
			if(found === undefined) {
				content += `
					<tr>
						<td><span class="apexClassName">${apexClass}</span></td>
						<td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage</div></div></td>
						${!isSmall ? '<td>&nbsp;</td>':''}
					</tr>`;
				if(!isSmall) {
					content += `
					<tr class="collapsible"><td colspan="3">&nbsp;</td></tr>`;
				}
			}
		});
		const triggers = await fsPromises.readdir(apexTriggersDirPath);
		triggers.forEach(function (file) {
			if(!file.endsWith('.trigger')) {
				return;
			}
			if(fileNameFilter && !file.toLowerCase().includes(fileNameFilter.toLowerCase())) {
				return;
			}
			const apexClass = file.replace(".trigger","");
			const found = codeCoverage.coverage ?
				codeCoverage.coverage.coverage.find((item) => item.name === apexClass) :
				codeCoverage.codecoverage.find((item) => item.name === apexClass);
			if(found === undefined) {
				content += `
					<tr>
						<td><span class="apexClassName">${apexClass}</span></td>
						<td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage</div></div></td>
						${!isSmall ? '<td>&nbsp;</td>':''}
					</tr>`;
				if(!isSmall) {
					content += `
					<tr class="collapsible"><td colspan="3">&nbsp;</td></tr>`;
				}
			}
		});

		content += `
			</tbody>
		</table>`;

		return content;
	}

	private static calculateHtmlForItem(codeCoverage: CoverageTestResult | null, isSmall: boolean, className : string | null, percentage : number, lowCoverageFilter : boolean, projectFilesOnlyFilter : boolean, fileNameFilter : string | null) : string | null {
		if(!className) {
			return null;
		}

		if(lowCoverageFilter && percentage >= 75) {
			return null;
		}

		const apexClassFile = path.join(apexClassesDirPath, `${className}.cls`);
		const apexTriggerFile = path.join(apexTriggersDirPath, `${className}.trigger`);
		if(projectFilesOnlyFilter && !fs.existsSync(apexClassFile) && !fs.existsSync(apexTriggerFile)) {
			return null;
		}

		if(fileNameFilter && !className.toLowerCase().includes(fileNameFilter.toLowerCase())) {
			return null;
		}

		let colorClass : string = "";

		if (percentage < 60) {
			colorClass = "bg-danger";
		} else if (percentage < 75) {
			colorClass = "bg-warning";
		} else {
			colorClass = "bg-success";
		}

		let coverage : string = Math.round(percentage).toString();

		let testClasses = CodeCoverage.getTestClassesForApexClass(className, codeCoverage);
		const hasTestInfo = testClasses !== null && testClasses.length > 0;

		let content = `
			<tr id="${className}">
				<td><span class="apexClassName">${className}</span></td>
				<td><div class="progress"><div class="progress-bar ${colorClass}" role="progressbar" style="width: ${coverage}%;" aria-valuenow="${coverage}" aria-valuemin="0" aria-valuemax="100">${coverage}%</div></div></td>
				${!isSmall && hasTestInfo ? '<td><i class="fas fa-chevron-circle-down" title="Show test class coverage contribution" onclick="showInfo(this)"></i></td>' : ""}</td>
				${!isSmall && !hasTestInfo ? '<td>&nbsp;</td>' : ''}
			</tr>`;

		if(!isSmall) {
			if(hasTestInfo) {
				let testInfo = '';
				testClasses?.forEach(test => {
					testInfo += `${test.apexClassOrTriggerName}.${test.apexTestMethodName}: ${test.percentage}<br />`;
				});
				content += `
				<tr id="${className}--test" class="collapsible">
					<td>&nbsp;</td>
					<td>${testInfo}</td>
					<td>&nbsp;</td>
				</tr>`;
			}
			else {
				content += `
				<tr class="collapsible"><td colspan="3">&nbsp;</td></tr>`;
			}
		}

		return content;
	}
}