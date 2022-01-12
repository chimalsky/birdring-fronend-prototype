const data = {
    "name": "year",
    "children": [
        {
            "name": "spring",
            "children": [
                {"name": "march", "value": 1},
                {"name": "april", "value": 1},
                {"name": "may", "value": 1}
            ]
        },
        {
            "name": "summer",
            "children": [
                {"name": "june", "value": 1},
                {"name": "july", "value": 1},
                {"name": "august", "value": 1}
            ]
        },
        {
            "name": "fall",
            "children": [
                {"name": "september", "value": 1},
                {"name": "october", "value": 1},
                {"name": "november", "value": 1}
            ]
        },
        {
            "name": "winter",
            "children": [
                {"name": "december", "value": 1},
                {"name": "january", "value": 1},
                {"name": "february", "value": 1}
            ]
        }
    ]
}

const width = 500;
const radius = width / 6;

const partition = () => {
    const root = d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
    return d3.partition().size([2 * Math.PI, root.height + 1])(root);
};

const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.039))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

const arcVisible = d => { return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0 };

const labelVisible = d => {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
};

const labelTransform = d => {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
};

const format = d3.format(",d");

export default function birdring() {
    const root = partition(data);
    root.each(d => d.current = d);

    const svg = d3.select('#birdring')
        .append("svg")
        .attr("viewBox", [0, 0, width, width])
        .attr('fill', 'white')
        .style("font", "12px sans-serif");

    const g = svg.append("g").attr("transform", `translate(${width / 2},${width / 2})`);

    const path = g.append("g")
        .selectAll("path")
        .data(root.descendants().slice(1))
        .join("path")
            .style("cursor", "pointer")
            .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
            .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
            .attr("d", d => arc(d.current))
            .on("click", clicked);
        
    path.filter(d => d.children)
        .style("cursor", "pointer")
        .on("click", clicked);

    path.append("title")
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);

    const label = g.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style("user-select", "none")
        .selectAll("text").data(root.descendants().slice(1)).join("text")
            .attr("dy", "0.35em")
            .attr('fill', '#333')
            .attr("fill-opacity", d => +labelVisible(d.current))
            .attr("transform", d => labelTransform(d.current))
            .style('text-transform', 'capitalize')
            .text(d => d.data.name);

    const center = g.append("circle")
        .datum(root)
        .attr("r", radius * .95)
        .attr("pointer-events", "all")
        .attr("text-anchor", "middle")
        .on("click", clicked);

    function clicked(event, p) {
        console.log(p, p.data);
        window.dispatchEvent(new CustomEvent("datumSelected", {detail: p.data}));
        center.datum(p.parent || root);
    
        root.each(d => d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth)
        });
    
        const t = g.transition().duration(700);
    
        if (p.depth === 0) {
            showData(t);
        }
        if (p.depth === 1) {
            showData(t);
        }
    }

    function showData(t) {
        // Transition the data on all arcs, even the ones that aren’t visible,
        // so that if this transition is interrupted, entering arcs will start
        // the next transition from the desired position.
        path.transition(t)
            .tween("data", d => {
            const i = d3.interpolate(d.current, d.target);
                return t => d.current = i(t);
            })
            .filter(function(d) {
                return +this.getAttribute("fill-opacity") || arcVisible(d.target);
            })
            .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
            .attrTween("d", d => () => arc(d.current));
    
        label.filter(function(d) {
                return +this.getAttribute("fill-opacity") || labelVisible(d.target);
            }).transition(t)
            .attr("fill-opacity", d => +labelVisible(d.target))
            .attrTween("transform", d => () => labelTransform(d.current));
    }
}