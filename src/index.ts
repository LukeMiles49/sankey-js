export type SankeyStyle = {
	numberFormat: Intl.NumberFormat;
	nodeSeparation: number;
	nodeWidth: number;
};

export class Sankey {
	nodes: SankeyNode[];
	edges: SankeyEdge[] = [];
	
	constructor() {
		this.nodes = [];
	}
	
	node(label: string = "", value: number | null = null, color: string | null = null): SankeyNode {
		const node = new SankeyNode(label, value, color);
		this.nodes.push(node);
		return node;
	}
	
	edge(from: SankeyNode, to: SankeyNode, value: number, color: string | null = null): SankeyEdge {
		const edge = new SankeyEdge(from, to, value, color);
		this.edges.push(edge);
		from.outputs.push(edge);
		from.currentOutput += value;
		to.inputs.push(edge);
		to.currentInput += value;
		return edge;
	}
	
	draw(
		ctx: CanvasRenderingContext2D,
		style: Partial<SankeyStyle> = {},
		x: number = 0,
		y: number = 0,
		width: number = ctx.canvas.width,
		height: number = ctx.canvas.height,
	) {
		const {
			numberFormat = null,
			nodeSeparation = height / 50,
			nodeWidth = width / 100,
		} = style;
		
		
		// Split into layers
		
		const layers: SankeyNode[][] = [];
		
		const dependencies = new Map<SankeyNode, number>();
		let nextLayer: SankeyNode[] = [];
		
		let minScale = Infinity;
		
		for (const node of this.nodes) {
			dependencies.set(node, node.inputs.length);
			if (node.inputs.length === 0) {
				nextLayer.push(node);
			}
		}
		
		while (nextLayer.length > 0) {
			const currentLayer = nextLayer;
			nextLayer = [];
			layers.push(currentLayer);
			let totalValue = 0;
			for (const node of currentLayer) {
				const value = node.value ?? Math.max(node.currentInput, node.currentOutput);
				if (
					(node.inputs.length > 0 && !equalEpsilon(node.currentInput, value))
					|| (node.outputs.length > 0 && !equalEpsilon(node.currentOutput, value))
				) {
					throw new Error(`Input and output of ${node.label} do not match (input ${node.currentInput}, output ${node.currentOutput})`);
				}
				totalValue += node.flow;
				for (const edge of node.outputs) {
					let deps = dependencies.get(edge.to)! - 1;
					dependencies.set(edge.to, deps);
					if (deps === 0) {
						nextLayer.push(edge.to);
					}
				}
			}
			const scale = (height - nodeSeparation * (currentLayer.length + 1)) / totalValue;
			if (scale < minScale) {
				minScale = scale;
			}
		}
		
		
		// Draw nodes
		
		const xPositions = new Map<SankeyNode, number>();
		const yInPositions = new Map<SankeyNode, number>();
		const yOutPositions = new Map<SankeyNode, number>();
		
		const layerWidth = (width - nodeSeparation * 2 - layers.length * nodeWidth) / (layers.length - 1);
		
		let curX = x + nodeSeparation;
		for (const layer of layers) {
			let totalHeight = nodeSeparation;
			for (const node of layer) {
				totalHeight += node.flow * minScale + nodeSeparation;
			}
			let curY = y + (height - totalHeight) / 2 + nodeSeparation;
			for (const node of layer) {
				xPositions.set(node, curX);
				yInPositions.set(node, curY);
				yOutPositions.set(node, curY);
				ctx.fillStyle = node.color || "rgba(0, 0, 0, 1)";
				ctx.fillRect(curX, curY, nodeWidth, node.flow * minScale);
				curY += node.flow * minScale + nodeSeparation;
			}
			curX += nodeWidth + layerWidth;
		}
		
		
		// Draw edges
		
		for (const edge of this.edges) {
			const thickness = edge.value * minScale;
			const fromX = xPositions.get(edge.from)! + nodeWidth;
			const fromYStart = yOutPositions.get(edge.from)!;
			yOutPositions.set(edge.from, fromYStart + thickness);
			const fromYEnd = fromYStart + thickness;
			const toX = xPositions.get(edge.to)!;
			const toYStart = yInPositions.get(edge.to)!;
			yInPositions.set(edge.to, toYStart + thickness);
			const toYEnd = toYStart + thickness;
			const middleX = (fromX + toX) / 2;
			const middleY = (fromYStart + toYEnd) / 2;
			
			ctx.beginPath();
			ctx.moveTo(fromX, fromYStart);
			ctx.bezierCurveTo(middleX, fromYStart, middleX, toYStart, toX, toYStart);
			ctx.lineTo(toX, toYEnd);
			ctx.bezierCurveTo(middleX, toYEnd, middleX, fromYEnd, fromX, fromYEnd);
			ctx.closePath();
			ctx.fillStyle = edge.color || "rgba(0, 0, 0, 0.25)";
			ctx.fill();
			
			const text = numberFormat ? numberFormat.format(edge.value) : edge.value.toString();
			ctx.fillStyle = "rgba(0, 0, 0, 1)";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(text, middleX, middleY);
		}
	}
}

export class SankeyNode {
	label: String;
	value: number | null;
	color: string | null;
	inputs: SankeyEdge[];
	outputs: SankeyEdge[];
	currentInput: number;
	currentOutput: number;
	
	constructor(label: string = "", value: number | null = null, color: string | null = null) {
		this.label = label;
		this.value = value;
		this.color = color;
		this.inputs = [];
		this.outputs = [];
		this.currentInput = 0;
		this.currentOutput = 0;
	}
	
	get requiredInput(): number {
		return this.value ?? this.currentOutput;
	}
	
	get requiredOutput(): number {
		return this.value ?? this.currentInput;
	}
	
	get remainingInput(): number {
		return this.requiredInput - this.currentInput;
	}
	
	get remainingOutput(): number {
		return this.requiredOutput - this.currentOutput;
	}
	
	get flow(): number {
		return Math.max(this.currentInput, this.currentOutput, this.value ?? 0);
	}
}

export class SankeyEdge {
	from: SankeyNode;
	to: SankeyNode;
	value: number;
	color: string | null;
	
	constructor(from: SankeyNode, to: SankeyNode, value: number, color: string | null = null) {
		this.from = from;
		this.to = to;
		this.value = value;
		this.color = color;
	}
}

function equalEpsilon(a: number, b: number) {
	return Math.abs(1 - a / b) < 1 / (1 << 24);
}
