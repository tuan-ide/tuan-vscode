import type * as vscode from "vscode";

export async function waitUntilActive(
	ext: vscode.Extension<unknown>,
	timeoutMs = 2000,
) {
	const start = Date.now();
	while (!ext.isActive) {
		await new Promise((r) => setTimeout(r, 100));
		if (Date.now() - start > timeoutMs) break;
	}
	return ext.isActive;
}
