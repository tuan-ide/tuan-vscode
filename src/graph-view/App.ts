/// <reference lib="dom" />

import type { GraphDescription, Node } from "@tuan/core-graph";
import type { WebviewView } from "vscode";

interface VsCodeApi<T = unknown> {
	postMessage(message: unknown): void;
	setState(state: T): void;
	getState(): T | undefined;
}

// @ts-expect-error acquireVsCodeApi is injected by VS Code
const vscode: VsCodeApi = typeof acquireVsCodeApi !== "undefined"
	// @ts-expect-error acquireVsCodeApi is injected by VS Code
	? acquireVsCodeApi()
	: undefined!;

export class App {
	private canvas: HTMLCanvasElement;
	private container: HTMLElement;
	private graph: {
		nodes: Map<number, Node>;
		edges: Array<{ from: number; to: number }>;
	};
	private camera: Camera;
	private theme: App.Theme;

	private minPosition: [number, number] = [Infinity, Infinity];
	private maxPosition: [number, number] = [-Infinity, -Infinity];

	private readonly MIN_ZOOM = 0.1;
	private readonly MAX_ZOOM = 10;

	constructor(container: HTMLElement, graphData: string) {
		this.container = container;

		this.canvas = this.createCanvas();
		this.camera = new Camera();
		this.theme = this.getTheme();

		this.graph = { nodes: new Map(), edges: [] };
		this.updateGraphData(graphData);

		this.bindEvents();
		this.drawCanvas();
	}

	private getTheme(): App.Theme {
		const style = getComputedStyle(document.body);
		return {
			backgroundColor: style.getPropertyValue("--vscode-editor-background") || "#1e1e1e",
			nodeColor: style.getPropertyValue("--vscode-button-background") || "#0e639c",
			edgeColor: style.getPropertyValue("--vscode-contrastActiveBorder") || "#888888",
			textColor: style.getPropertyValue("--vscode-editor-foreground") || "#ffffff",
		};
	}

	private updateGraphData(graphData: string) {
		const parsedData: GraphDescription = JSON.parse(graphData);
		this.minPosition = [Infinity, Infinity];
		this.maxPosition = [-Infinity, -Infinity];

		this.graph.nodes.clear();
		for (const node of parsedData.nodes) {
			this.graph.nodes.set(node.id, node);

			const [x, y] = node.position;
			if (x < this.minPosition[0]) this.minPosition[0] = x;
			if (y < this.minPosition[1]) this.minPosition[1] = y;
			if (x > this.maxPosition[0]) this.maxPosition[0] = x;
			if (y > this.maxPosition[1]) this.maxPosition[1] = y;
		}
		this.graph.edges = parsedData.edges;
	}

	private toNormalizedCanvas(position: [number, number]): [number, number] {
		const [x, y] = position;
		const [minX, minY] = this.minPosition;
		const [maxX, maxY] = this.maxPosition;

		const spanX = maxX - minX || 1;
		const spanY = maxY - minY || 1;

		const nx = ((x - minX) / spanX) * (this.canvas.width - 40) + 20;
		const ny = ((y - minY) / spanY) * (this.canvas.height - 40) + 20;
		return [nx, ny];
	}

	private normalizePosition(position: [number, number]): [number, number] {
		const [nx, ny] = this.toNormalizedCanvas(position);
		const centerX = this.canvas.width / 2;
		const centerY = this.canvas.height / 2;

		const dx = nx - centerX;
		const dy = ny - centerY;

		const zoomedX = centerX + dx * this.camera.zoom;
		const zoomedY = centerY + dy * this.camera.zoom;

		const finalX = zoomedX + this.camera.position[0];
		const finalY = zoomedY + this.camera.position[1];

		return [finalX, finalY];
	}

	private screenToNormalizedCanvas(sx: number, sy: number): [number, number] {
		const centerX = this.canvas.width / 2;
		const centerY = this.canvas.height / 2;

		const dx = sx - centerX - this.camera.position[0];
		const dy = sy - centerY - this.camera.position[1];

		const nx = centerX + dx / this.camera.zoom;
		const ny = centerY + dy / this.camera.zoom;
		return [nx, ny];
	}

	private zoomAt(sx: number, sy: number, scale: number) {
		const oldZoom = this.camera.zoom;
		const newZoom = this.clamp(oldZoom * scale, this.MIN_ZOOM, this.MAX_ZOOM);
		const actualScale = newZoom / oldZoom;
		if (actualScale === 1) return;

		const centerX = this.canvas.width / 2;
		const centerY = this.canvas.height / 2;

		const [nx, ny] = this.screenToNormalizedCanvas(sx, sy);

		const px =
			sx - centerX - (nx - centerX) * newZoom;
		const py =
			sy - centerY - (ny - centerY) * newZoom;

		this.camera.zoom = newZoom;
		this.camera.position = [px, py];
	}

	private clamp(v: number, min: number, max: number) {
		return Math.max(min, Math.min(max, v));
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

		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.fillStyle = this.theme.backgroundColor;
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		ctx.strokeStyle = this.theme.edgeColor;
		ctx.lineWidth = 1;
		ctx.lineCap = "round";
		for (const edge of this.graph.edges) {
			const fromNode = this.graph.nodes.get(edge.from);
			const toNode = this.graph.nodes.get(edge.to);
			if (!fromNode || !toNode) continue;

			const [fromX, fromY] = this.normalizePosition(fromNode.position);
			const [toX, toY] = this.normalizePosition(toNode.position);

			ctx.beginPath();
			ctx.moveTo(fromX, fromY);
			ctx.lineTo(toX, toY);
			ctx.stroke();
		}

		ctx.fillStyle = this.theme.nodeColor;
		ctx.strokeStyle = this.theme.textColor;
		for (const node of this.graph.nodes.values()) {
			const [x, y] = this.normalizePosition(node.position);
			ctx.beginPath();
			ctx.arc(x, y, 10, 0, 2 * Math.PI);
			ctx.fill();
			ctx.strokeText(node.label, x + 12, y + 4);
		}
	}

	private bindEvents() {
		this.canvas.addEventListener(
			"wheel",
			(event) => {
				event.preventDefault();

				const isPinchZoom = event.ctrlKey;
				if (isPinchZoom) {
					const scale = Math.exp(-event.deltaY * 0.02);
					const rect = this.canvas.getBoundingClientRect();
					const sx = event.clientX - rect.left;
					const sy = event.clientY - rect.top;

					this.zoomAt(sx, sy, scale);
					this.drawCanvas();
					return;
				}

				const panX = -event.deltaX;
				const panY = -event.deltaY;

				const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.canvas.height : 1;
				this.camera.pan(panX * factor, panY * factor);
				this.drawCanvas();
			},
			{ passive: false }
		);

		let isPinching = false;
		let initialDistance = 0;
		let isTouchPanning = false;
		let lastTouchX = 0;
		let lastTouchY = 0;

		this.canvas.addEventListener("touchstart", (event) => {
			if (event.touches.length === 2) {
				isPinching = true;
				const t1 = event.touches[0];
				const t2 = event.touches[1];
				initialDistance = Math.hypot(
					t1.clientX - t2.clientX,
					t1.clientY - t2.clientY
				);
			} else if (event.touches.length === 1) {
				isTouchPanning = true;
				lastTouchX = event.touches[0].clientX;
				lastTouchY = event.touches[0].clientY;
			}
			event.preventDefault();
		});

		this.canvas.addEventListener("touchmove", (event) => {
			if (isPinching && event.touches.length === 2) {
				const t1 = event.touches[0];
				const t2 = event.touches[1];
				const currentDistance = Math.hypot(
					t1.clientX - t2.clientX,
					t1.clientY - t2.clientY
				);
				const scale = currentDistance / initialDistance;
				initialDistance = currentDistance;

				const rect = this.canvas.getBoundingClientRect();
				const sx = (t1.clientX + t2.clientX) / 2 - rect.left;
				const sy = (t1.clientY + t2.clientY) / 2 - rect.top;

				this.zoomAt(sx, sy, scale);
				this.drawCanvas();
			} else if (isTouchPanning && event.touches.length === 1) {
				const dx = event.touches[0].clientX - lastTouchX;
				const dy = event.touches[0].clientY - lastTouchY;
				this.camera.pan(dx, dy);
				lastTouchX = event.touches[0].clientX;
				lastTouchY = event.touches[0].clientY;
				this.drawCanvas();
			}
			event.preventDefault();
		});

		this.canvas.addEventListener("touchend", (event) => {
			if (event.touches.length < 1) {
				isPinching = false;
				isTouchPanning = false;
			}
		});

		let isPanning = false;
		let lastX = 0;
		let lastY = 0;

		this.canvas.addEventListener("mousedown", (event) => {
			isPanning = true;
			lastX = event.clientX;
			lastY = event.clientY;
		});

		this.canvas.addEventListener("mousemove", (event) => {
			if (!isPanning) return;
			const dx = event.clientX - lastX;
			const dy = event.clientY - lastY;
			this.camera.pan(dx, dy);
			lastX = event.clientX;
			lastY = event.clientY;
			this.drawCanvas();
		});

		this.canvas.addEventListener("mouseup", () => {
			isPanning = false;
		});

		this.canvas.addEventListener("mouseleave", () => {
			isPanning = false;
		});

		this.canvas.addEventListener("click", (event) => {
			const rect = this.canvas.getBoundingClientRect();
			const sx = event.clientX - rect.left;
			const sy = event.clientY - rect.top;

			const node = this.getClickedNode(sx, sy);
			if (node) {
				AppChannel.send({ type: "openFile", path: node.filePath });
			}
		});
	}

	private getClickedNode(sx: number, sy: number): Node | null {
		const clickRadius = 10;
		for (const node of this.graph.nodes.values()) {
			const [nx, ny] = this.normalizePosition(node.position);
			const dx = sx - nx;
			const dy = sy - ny;
			if (dx * dx + dy * dy <= clickRadius * clickRadius) {
				return node;
			}
		}
		return null;
	}
}

class Camera {
	public position: [number, number];
	public zoom: number;

	constructor() {
		this.position = [0, 0];
		this.zoom = 1;
	}

	pan(dx: number, dy: number) {
		this.position[0] += dx;
		this.position[1] += dy;
	}
}

namespace App {
	export interface Theme {
		backgroundColor: string;
		nodeColor: string;
		edgeColor: string;
		textColor: string;
	}
}

export class AppChannel {
	private webviewView: WebviewView;

	constructor(webviewView: WebviewView) {
		this.webviewView = webviewView;
	}

	static send(message: AppChannel.Message) {
		vscode.postMessage(message);
	}

	onMessage(callback: (message: AppChannel.Message) => void) {
		this.webviewView.webview.onDidReceiveMessage(callback);
	}
}

export namespace AppChannel {
	export type Message = OpenFileMessage;

	export interface OpenFileMessage {
		type: "openFile";
		path: string;
	}
}

