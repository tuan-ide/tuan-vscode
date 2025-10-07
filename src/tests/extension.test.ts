import * as assert from "node:assert";
import * as vscode from "vscode";
import { getTuanExtension } from "./test-utils/getTuanExtension";
import { openGraphView } from "./test-utils/openGraphView";
import { waitUntilActive } from "./test-utils/waitUntilActive";

suite("Extension Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.");

	test("Extension is discoverable", async () => {
		const ext = getTuanExtension();
		assert.ok(ext, "The extension should be present in the list of extensions");
		assert.strictEqual(
			ext?.isActive,
			false,
			"The extension should not be active before the test",
		);
	});

	test("The extension activates when the graph view is opened", async () => {
		const ext = getTuanExtension();
		assert.ok(ext, "Unable to find the extension");
		await openGraphView();
		const isActive = await waitUntilActive(ext);
		assert.ok(
			isActive,
			"The extension should have activated after opening the view",
		);
	});
});
