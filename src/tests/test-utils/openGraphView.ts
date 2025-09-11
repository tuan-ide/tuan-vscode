import * as vscode from "vscode";
import { TuanGraphView } from "../../TuanGraphView";

export async function openGraphView() {
	await vscode.commands.executeCommand("workbench.action.focusPanel");

	await vscode.commands.executeCommand(
		`${TuanGraphView.viewId}.focus`,
		"tuan.graph",
		true,
	);
}
