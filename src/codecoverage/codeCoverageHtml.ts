import * as fs from "fs";
import * as path from "path";
import { CoverageTestResult, CoverageItem, CoverageItem2 } from './types';
import { CodeCoverage, apexClassesDirPath, getAllFiles } from './codeCoverage';

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
				</tr>
			</thead>
			<tbody>`;

		const files = await getAllFiles(apexClassesDirPath, [".cls",".trigger"]);

		if(codeCoverage.coverage) {
			codeCoverage.coverage.coverage.sort((item1, item2) => {
				return item1.name.localeCompare(item2.name);
			}).forEach((item: CoverageItem) => {
				const className : string | null = item.name;
				const percentage : number = item.coveredPercent;

				const contentItem : string | null = CodeCoverageHtml.calculateHtmlForItem(codeCoverage, isSmall, files, className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter);
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

				const contentItem : string | null = CodeCoverageHtml.calculateHtmlForItem(codeCoverage, isSmall, files, className, percentage, lowCoverageFilter, projectFilesOnlyFilter, fileNameFilter);
				if(!contentItem) {
					return;
				}

				content += contentItem;
			});
		}

		// calculate those that do not have any coverage

		files.forEach(function (file : string) {
			if(!file.endsWith('.cls')) {
				return;
			}
			if(fileNameFilter && !file.toLowerCase().includes(fileNameFilter.toLowerCase())) {
				return;
			}
			const apexClass = path.basename(file,".cls");
			const directory = path.dirname(file).replace(apexClassesDirPath, '');
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
						<td><span class="apexClassName" title="${apexClass}">${apexClass}
						${!isSmall ? '<br /><small title="' + directory + '">' + directory + '</small>' : ''}
						</span></td>
						<td><div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width: 100%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">No coverage</div></div></td>
					</tr>`;
			}
		});

		files.forEach(function (file : string) {
			if(!file.endsWith('.trigger')) {
				return;
			}
			if(fileNameFilter && !file.toLowerCase().includes(fileNameFilter.toLowerCase())) {
				return;
			}
			const apexClass = path.basename(file,".trigger");
			const directory = path.dirname(file).replace(apexClassesDirPath, '');
			const found = codeCoverage.coverage ?
				codeCoverage.coverage.coverage.find((item) => item.name === apexClass) :
				codeCoverage.codecoverage.find((item) => item.name === apexClass);
			if(found === undefined) {
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
	}

	private static calculateHtmlForItem(codeCoverage: CoverageTestResult | null, isSmall: boolean, files: string[] | null, className : string | null, percentage : number, lowCoverageFilter : boolean, projectFilesOnlyFilter : boolean, fileNameFilter : string | null) : string | null {
		if(!className) {
			return null;
		}

		if(lowCoverageFilter && percentage >= 75) {
			return null;
		}

		const apexClassFile : string | undefined = files?.find(file => file.endsWith(`${className}.cls`));
		const apexTriggerFile : string | undefined  = files?.find(file => file.endsWith(`${className}.trigger`));
		if(projectFilesOnlyFilter && (!apexClassFile || !fs.existsSync(apexClassFile)) && (!apexTriggerFile || !fs.existsSync(apexTriggerFile))) {
			return null;
		}

		if(fileNameFilter && !className.toLowerCase().includes(fileNameFilter.toLowerCase())) {
			return null;
		}

		let directory = (apexClassFile && path.dirname(apexClassFile)) || (apexTriggerFile && path.dirname(apexTriggerFile));
		if(directory) { directory = directory.replace(apexClassesDirPath, ''); }
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

		let testInfo = '';
		if(!isSmall) {
			if(hasTestInfo) {
				testClasses?.forEach(test => {
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