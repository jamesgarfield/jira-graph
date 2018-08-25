import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import React from 'react';
import ReactDOM from 'react-dom';

cytoscape.use(dagre);

function statusToRGB(s) {
    if (s == 'Backlog' || s == 'Ready for Dev') {
        return '#ffffff';
    }
    if (s == 'In Progress' || s == 'In QA on feature branch' || s == 'In Code Review' || s == 'Resolved, on staging') {
        return '#35e82c';
    }
    if (s == 'Closed') {
        return '#959595';
    }
    return '#000000';
}

class Popup extends React.Component {
    render() {
        if (this.props.selectedEpic == null) {
            return <div className="empty"></div>
        }

        //TODO: a hack until offsetHeight can be figured out
        const yOffset = 45;

        const style = {
            left: this.props.selectedEpic.popupPosition.x + 'px',
            top: (this.props.selectedEpic.popupPosition.y + yOffset) + 'px',
        }

        const epic = this.props.selectedEpic.epic;

        var className = 'popup';
        if (epic.flagged) {
            className = className + ' flagged';
        }

        return (
            <div className={className} style={style}>
            <div className="popup-summary">{epic.summary}</div>
            <div className="popup-container">
              <PopupIcon alt={'Type: ' + epic.type} imageURL={epic.typeImageURL} />
              <PopupIcon alt={'Priority: ' + epic.priority} imageURL={epic.priorityImageURL} />
              <span className="popup popup-flagged">{epic.flagged ? '⚑' : ''}</span>
              <PopupEstimate estimate={epic.estimate} />
              <PopupKey epicKey={epic.key} />
              <PopupAssignee assignee={epic.assignee} assigneeImageURL={epic.assigneeImageURL} />
              <div className="popup-status-text">{epic.status}</div>
              <PopupLabels labels={epic.labels} />
            </div>
            <PopupStatus status={epic.status} />
          </div>
        )
    }
}

class PopupIcon extends React.Component {
    render() {
        return (
            <span className="popup">
        <img src={this.props.imageURL} alt={this.props.alt} title={this.props.alt} />
      </span>
        )
    }
}

class PopupAssignee extends React.Component {
    render() {
        if (this.props.assignee === '') {
            return <span className="popup-avatar" />
        }

        const alt = 'Assignee: ' + this.props.assignee;
        return (
            <span className="popup-avatar">
        <img src={this.props.assigneeImageURL} alt={alt} title={alt} />
      </span>
        )
    }
}

class PopupKey extends React.Component {
    render() {
        const url = '/epics/' + this.props.epicKey + '/details';

        return (
            <span className="popup-key">
          <a href={url} target="_blank">{this.props.epicKey}</a>
        </span>
        );
    }
}

class PopupEstimate extends React.Component {
    render() {
        return (
            <span className="popup-estimate">{this.props.estimate === 0 ? "-" : this.props.estimate}</span>
        );
    }
}

class PopupStatus extends React.Component {
    render() {
        const style = {
            backgroundColor: statusToRGB(this.props.status),
        }
        return <div className="popup-status" style={style} />
    }
}

class PopupLabels extends React.Component {
    render() {
        var labelListItems = [];
        for (var i = 0; i < this.props.labels.length; i++) {
            labelListItems.push(<li>{this.props.labels[i]}</li>);
        }
        return (
            <div className="popup-labels">
        <ul>{labelListItems}</ul>
      </div>
        );
    }
}

class GraphApp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            epic: {},
        };
    }

    render() {
        if (this.state.error) {
            return <div>Error: failed to fetch the epic</div>
        } else if (!this.state.isLoaded) {
            return <div>Loading...</div>
        } else {
            return <Graph epic={this.state.epic} />
        }
    }

    componentDidMount() {
        const epicKey = this.props.epicKey;
        console.log('loading ' + epicKey);

        fetch("/api/epics/" + epicKey)
            .then(res => {
                if (!res.ok) {
                    throw new Error('not ok');
                }
                return res.json();
            }).then(result => {
                this.setState({
                    isLoaded: true,
                    epic: result,
                });
                console.log('loaded ' + epicKey);
            }).catch(() => {
                console.log('failed to load ' + epicKey);
                this.setState({
                    isLoaded: false,
                    error: true,
                });
            });
    }
}

class Menu extends React.Component {
    render() {
        return (
            <span className="menu-container">
      <label htmlFor="menu-toggle">&#9776;</label>
		<input type="checkbox" id="menu-toggle" />
		<div className="menu">
			Related epics
			<hr />
            <RelatedEpics epicKey={this.props.epicKey} />
		</div>
      </span>
        )
    }
}

class RelatedEpics extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            epics: [],
        };
    }

    render() {
        if (this.state.error) {
            return <div>Error: failed to fetch related epics</div>;
        } else if (!this.state.isLoaded) {
            return <div>Loading...</div>;
        } else {
            const epics = this.state.epics;
            if (epics.length == 0) {
                return <div>none!</div>;
            }

            var anchors = [];
            for (var i = 0; i < epics.length; i++) {
                const url = '/epics/' + epics[i].key;
                anchors.push(
                    <a href={url}>
                    <img src={epics[i].typeImageURL} />
                    {epics[i].key} - {epics[i].summary}
                  </a>
                );
            }

            return <div>{anchors}</div>;
        }
    }

    componentDidMount() {
        const epicKey = this.props.epicKey

        console.log('loading related epics for ' + epicKey);
        fetch("/api/epics/" + epicKey + "/related")
            .then(res => {
                if (!res.ok) {
                    throw new Error('not ok');
                }
                return res.json();
            })
            .then(result => {
                this.setState({
                    isLoaded: true,
                    epics: result,
                });
                console.log('loaded related epics for ' + epicKey);
            }).catch(
                () => {
                    console.log('failed to load related epics for ' + epicKey);
                    this.setState({
                        isLoaded: false,
                        error: true,
                        epics: [],
                    });
                });
    }
}

class Graph extends React.Component {
    constructor(props) {
        super(props);
        this.myRef = React.createRef();
        this.state = {
            selectedEpic: null,
        };
    }

    render() {
        return (
            <div>
          <div className = "cy" ref = {this.myRef} />
          <Popup selectedEpic={this.state.selectedEpic} />
        </div>
        );
    }

    componentDidMount() {
        this.renderGraph(this.props.epic);
    }

    renderGraph(data) {
        const root = this.myRef.current;
        var issues = data.issues.map(function(elem) {
            return {
                data: Object.assign({
                    id: elem.key
                }, elem)
            }
        });

        var issueEdges = [];
        for (var i = 0; i < issues.length; i++) {
            var blockingIssue = issues[i].data.id;
            var blockedIssues = data.graph[blockingIssue];
            for (var j = 0; j < blockedIssues.length; j++) {
                var id = blockingIssue + '_blocks_' + blockedIssues[j];
                issueEdges.push({
                    data: {
                        id: id,
                        source: blockingIssue,
                        target: blockedIssues[j]
                    }
                });
            }
        }

        var cy = cytoscape({
            container: root,

            boxSelectionEnabled: false,
            autounselectify: true,

            layout: {
                name: 'dagre',
                directed: true
            },

            style: [{
                    selector: 'node',
                    style: {
                        'content': 'data(id)',
                        'text-opacity': 0.8,
                        'color': '#000000',
                        'font-size': 18,
                        'font-weight': 'bold',
                        'background-color': function(ele) {
                            return statusToRGB(ele.data('status'))
                        },
                        'border-width': 1,
                        'border-color': '#000000'
                    }
                },

                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'width': 4,
                        'target-arrow-shape': 'triangle',
                        'line-color': '#9dbaea',
                        'target-arrow-color': '#9dbaea'
                    }
                }
            ],

            elements: {
                nodes: issues,
                edges: issueEdges,
            },
        });

        cy.on('tap', (evt) => {
            if (evt.target === cy) {
                this.setState({
                    selectedEpic: null,
                });
            }
        });

        cy.on('tap', 'node', (evt) => {
            const epic = evt.target.data();
            const position = evt.renderedPosition;
            console.log(position);
            this.setState({
                selectedEpic: {
                    epic: epic,
                    popupPosition: position,
                }
            });
        });

        cy.on('mouseover', 'node', function(evt) {
            document.body.style.cursor = 'pointer';
        });

        cy.on('mouseout', 'node', function() {
            document.body.style.cursor = 'default';
        });
    }
}

class App extends React.Component {
    render() {
        const issueURL = "https://" + this.props.jiraHost + "/browse/" + this.props.epicKey;
        const issueLabel = this.props.epicKey + " - " + this.props.issueSummary;
        return (
            <div>
				<h1>
					<Menu epicKey={this.props.epicKey} />
					<a href={issueURL} target="_blank">{issueLabel}</a>
				</h1>
				<GraphApp epicKey={this.props.epicKey} />
			</div>
        )
    }
}

var root = document.getElementById('root');
ReactDOM.render(<App epicKey={root.dataset.issueKey}
		issueSummary={root.dataset.issueSummary}
		jiraHost={root.dataset.jiraHost} />, root);