/// <reference lib="dom" />

interface VsCodeApi<T = unknown> {
	postMessage(message: unknown): void;
	setState(state: T): void;
	getState(): T | undefined;
}

const vscode: VsCodeApi =
	// @ts-expect-error acquireVsCodeApi is injected by VS Code
	acquireVsCodeApi();

export class App {
	private canvas: HTMLCanvasElement;
	private container: HTMLElement;

	constructor(container: HTMLElement) {
		this.container = container;
		this.canvas = this.createCanvas();
		this.drawCanvas();
	}

	private createCanvas(): HTMLCanvasElement {
		const canvas = document.createElement("canvas");
		this.sizeCanvas(canvas);
		window.addEventListener("resize", () => {
			this.sizeCanvas(canvas);
			this.drawCanvas();
		});
		this.container.appendChild(canvas);
		return canvas;
	}

	private sizeCanvas(canvas: HTMLCanvasElement) {
		canvas.width = this.container.clientWidth;
		canvas.height = this.container.clientHeight - 3;
	}

	private drawCanvas() {
		const ctx = this.canvas.getContext("2d");
		if (!ctx) return;

		ctx.fillStyle = "blue";
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
	}
}
