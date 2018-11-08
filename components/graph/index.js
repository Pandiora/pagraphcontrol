
const {
	map,
	values,
	flatten,
	memoizeWith,
	path,
	filter,
} = require('ramda');

const React = require('react');

const r = require('r-dom');

const { connect } = require('react-redux');
const { bindActionCreators } = require('redux');

const math = require('mathjs');

const { Edge } = require('react-digraph');

const d = require('../../utils/d');

const { pulse: pulseActions } = require('../../actions');

const { getPaiByTypeAndIndex } = require('../../selectors');

const {
	GraphView,
} = require('./satellites-graph');

Edge.calculateOffset = function (nodeSize, source, target) {
	const arrowVector = math.matrix([ target.x - source.x, target.y - source.y ]);
	const offsetLength = Math.max(0, Math.min((0.75 * size), (math.norm(arrowVector) / 2) - 40));
	const offsetVector = math.dotMultiply(arrowVector, (offsetLength / math.norm(arrowVector)) || 0);

	return {
		xOff: offsetVector.get([ 0 ]),
		yOff: offsetVector.get([ 1 ]),
	};
};

const weakmapId_ = new WeakMap();
const weakmapId = o => {
	if (!weakmapId_.has(o)) {
		weakmapId_.set(o, String(Math.random()));
	}
	return weakmapId_.get(o);
};

const dgoToPai = new WeakMap();

const memoize = memoizeWith(weakmapId);

const key = pao => `${pao.type}-${pao.index}`;

const sourceKey = pai => {
	if (pai.clientIndex === -1) {
		return `module-${pai.moduleIndex}`;
	}
	return `client-${pai.clientIndex}`;
};

const targetKey = pai => {
	if (pai.type === 'sinkInput') {
		return `sink-${pai.sinkIndex}`;
	}
	return `source-${pai.sourceIndex}`;
};

const paoToNode = memoize(pao => ({
	id: key(pao),
	index: pao.index,
	type: pao.type,
}));

const paiToEdge = memoize(pai => ({
	id: key(pai),
	source: sourceKey(pai),
	target: targetKey(pai),
	index: pai.index,
	type: pai.type,
}));

const graphConfig = {
	nodeTypes: {},

	nodeSubtypes: {},

	edgeTypes: {
		sinkInput: {
			shapeId: '#sinkInput',
			shape: r('symbol', {
				viewBox: '0 0 50 50',
				id: 'sinkInput',
				key: '0',
			}),
		},
		sourceOutput: {
			shapeId: '#sourceOutput',
			shape: r('symbol', {
				viewBox: '0 0 50 50',
				id: 'sourceOutput',
				key: '0',
			}),
		},
	},
};

const size = 120;
const s2 = size / 2;

const Sink = () => r.path({
	d: d()
		.moveTo(-s2, 0)
		.lineTo(-s2 * 1.3, -s2)
		.lineTo(s2, -s2)
		.lineTo(s2, s2)
		.lineTo(-s2 * 1.3, s2)
		.close()
		.toString(),
});

const Source = () => r.path({
	d: d()
		.moveTo(s2 * 1.3, 0)
		.lineTo(s2, s2)
		.lineTo(-s2, s2)
		.lineTo(-s2, -s2)
		.lineTo(s2, -s2)
		.close()
		.toString(),
});

const Client = () => r.path({
	d: d()
		.moveTo(s2 * 1.3, 0)
		.lineTo(s2, s2)
		.lineTo(-s2 * 1.3, s2)
		.lineTo(-s2, 0)
		.lineTo(-s2 * 1.3, -s2)
		.lineTo(s2, -s2)
		.close()
		.toString(),
});

const Module = Client;

const gridDotSize = 2;
const gridSpacing = 36;
const renderDefs = () => r(React.Fragment, [
	r.pattern({
		id: 'background-pattern',
		key: 'background-pattern',
		width: gridSpacing,
		height: gridSpacing,
		patternUnits: 'userSpaceOnUse',
	}, r.circle({
		className: 'grid-dot',
		cx: (gridSpacing || 0) / 2,
		cy: (gridSpacing || 0) / 2,
		r: gridDotSize,
	})),

	r('marker', {
		id: 'my-source-arrow',
		viewBox: '0 -8 16 16',
		refX: '16',
		markerWidth: '16',
		markerHeight: '16',
		orient: 'auto',
	}, r.path({
		className: 'arrow',
		d: 'M 16,-8 L 0,0 L 16,8',
	})),

	r('marker', {
		id: 'my-sink-arrow',
		viewBox: '0 -8 16 16',
		refX: '16',
		markerWidth: '16',
		markerHeight: '16',
		orient: 'auto',
	}, r.path({
		className: 'arrow',
		d: 'M 0,-8 L 16,0 L 0,8',
	})),
]);

const renderNode = (nodeRef, data, key, selected, hovered) => r({
	sink: Sink,
	source: Source,
	client: Client,
	module: Module,
}[data.type] || Module, {
	selected,
	hovered,
});

const DebugText = ({ dgo, pai, props }) => r.div({
	style: {
		fontSize: '50%',
	},
}, props.preferences.showDebugInfo ? [
	JSON.stringify(dgo, null, 2),
	JSON.stringify(pai, null, 2),
] : []);

const SinkText = ({ dgo, pai, props }) => r.div([
	r.div({
		title: pai.name,
	}, pai.description),
	r(DebugText, { dgo, pai, props }),
]);

const SourceText = ({ dgo, pai, props }) => r.div([
	r.div({
		title: pai.name,
	}, pai.description),
	r(DebugText, { dgo, pai, props }),
]);

const ClientText = ({ dgo, pai, props }) => r.div([
	r.div({
		title: path('properties.application.process.binary'.split('.'), pai),
	}, pai.name),
	r(DebugText, { dgo, pai, props }),
]);

const ModuleText = ({ dgo, pai, props }) => r.div([
	r.div({
		title: pai.properties.module.description,
	}, pai.name),
	r(DebugText, { dgo, pai, props }),
]);

const renderNodeText = props => dgo => r('foreignObject', {
	x: -s2,
	y: -s2,
}, r.div({
	style: {
		width: size,
		height: size,

		padding: 2,

		whiteSpace: 'pre',
	},
}, r({
	sink: SinkText,
	source: SourceText,
	client: ClientText,
	module: ModuleText,
}[dgo.type] || ModuleText, {
	dgo,
	pai: dgoToPai.get(dgo),
	props,
})));

const afterRenderEdge = (id, element, edge, edgeContainer) => {
	if (edge.type) {
		edgeContainer.classList.add(edge.type);
	}
	//const edgeOverlay = edgeContainer.querySelector('.edge-overlay-path');
};

class Graph extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			selected: null,
		};

		Object.assign(this, {
			onSelectNode: this.onSelectNode.bind(this),
			onCreateNode: this.onCreateNode.bind(this),
			onUpdateNode: this.onUpdateNode.bind(this),
			onDeleteNode: this.onDeleteNode.bind(this),
			onSelectEdge: this.onSelectEdge.bind(this),
			onCreateEdge: this.onCreateEdge.bind(this),
			onSwapEdge: this.onSwapEdge.bind(this),
			onDeleteEdge: this.onDeleteEdge.bind(this),
		});
	}

	shouldComponentUpdate(nextProps, nextState) {
		return !(
			(nextProps.objects === this.props.objects) &&
				(nextProps.infos === this.props.infos) &&
				(nextProps.preferences === this.props.preferences) &&
				(nextState.selected === this.state.selected)
		);
	}

	onSelectNode(selected) {
		this.setState({ selected });
	}

	onCreateNode() {
	}

	onUpdateNode() {
	}

	onDeleteNode(selected) {
		if (selected.type === 'client') {
			this.props.killClientByIndex(selected.index);
		}
	}

	onSelectEdge() {
	}

	onCreateEdge() {
	}

	onSwapEdge(sourceNode, targetNode, edge) {
		if (edge.type === 'sinkInput') {
			this.props.moveSinkInput(edge.index, targetNode.index);
		} else {
			this.props.moveSourceOutput(edge.index, targetNode.index);
		}
	}

	onDeleteEdge() {
	}

	render() {
		const edges = map(paiToEdge, flatten(map(values, [
			this.props.infos.sinkInputs,
			this.props.infos.sourceOutputs,
		])));

		const connectedNodeKeys = {};
		edges.forEach(edge => {
			connectedNodeKeys[edge.source] = true;
			connectedNodeKeys[edge.target] = true;
		});

		const nodes = filter(node => {
			if ((this.props.preferences.hideDisconnectedClients && node.type === 'client') ||
				(this.props.preferences.hideDisconnectedModules && node.type === 'module') ||
				(this.props.preferences.hideDisconnectedSources && node.type === 'source') ||
				(this.props.preferences.hideDisconnectedSinks && node.type === 'sink')
			) {
				return connectedNodeKeys[node.id];
			}
			return true;
		}, map(paoToNode, flatten(map(values, [
			this.props.objects.sinks,
			this.props.objects.sources,
			this.props.objects.clients,
			this.props.objects.modules,
		]))));

		nodes.forEach(node => {
			if (node.x !== undefined) {
				return;
			}

			if (node.type === 'source') {
				node.x = 0 * size;
			} else if (node.type === 'sink') {
				node.x = 10 * size;
			} else {
				node.x = (2 * size) + (Math.round(6 * Math.random()) * size);
			}

			node.y = Math.random() * 1200;
		});

		nodes.forEach(node => {
			const pai = getPaiByTypeAndIndex(node.type, node.index)({ pulse: this.props });
			dgoToPai.set(node, pai);
		});

		return r.div({
			id: 'graph',
			style: {},
		}, r(GraphView, {
			nodeKey: 'id',
			edgeKey: 'id',

			nodes,
			edges,

			selected: this.state.selected,

			...graphConfig,

			onSelectNode: this.onSelectNode,
			onCreateNode: this.onCreateNode,
			onUpdateNode: this.onUpdateNode,
			onDeleteNode: this.onDeleteNode,
			onSelectEdge: this.onSelectEdge,
			onCreateEdge: this.onCreateEdge,
			onSwapEdge: this.onSwapEdge,
			onDeleteEdge: this.onDeleteEdge,

			showGraphControls: false,

			edgeArrowSize: 128,

			backgroundFillId: '#background-pattern',

			renderDefs,
			renderNode,
			renderNodeText: renderNodeText(this.props),
			afterRenderEdge,
		}));
	}
}

module.exports = connect(
	state => ({
		objects: state.pulse.objects,
		infos: state.pulse.infos,

		preferences: state.preferences,
	}),
	dispatch => bindActionCreators(pulseActions, dispatch),
)(Graph);
