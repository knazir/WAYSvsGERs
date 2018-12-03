const w = window.innerWidth;
const h = window.innerHeight - 44;
const numNodes = 200;
const numGroups = 10;
const minNodeSize = 5;
const maxNodeSize = 10;
const intra = 2;
const inter = 15;

const svg = d3.select("#clusterBox")
  .append("svg")
  .attr("width", w)
  .attr("height", h);

function formatCourse(course) {
  //id,dept,number,title,description,units,ways,gers,terms,enrollmentAut,enrollmentWin,enrollmentSpr,enrollmentSum
  return {
    id: Number(course.id),
    dept: course.dept,
    number: course.number,
    title: course.title,
    description: course.description,
    units: Number(course.units),
    ways: course.ways ? course.ways.split(",") : null,
    gers: course.gers ? course.gers.split(",") : null,
    terms: course.terms,
    enrollment: {
      aut: Number(course.enrollmentAut),
      win: Number(course.enrollmentWin),
      spr: Number(course.enrollmentSpr),
      sum: Number(course.enrollmentSum)
    }
  };
}

async function getData() {
  const courses = await d3.csv("res/data/courses_2012_2013.csv", formatCourse);

  const nodes = courses.filter(course => {
    return course.dept && (course.gers || course.ways)
  }).map(course => {
    let summedEnrollment = 0;
    Object.values(course.enrollment).forEach(term => summedEnrollment += term);
    const totalEnrollment = Math.max(minNodeSize, summedEnrollment);
    return {
      id: course.id,
      group: course.dept,
      radius: Math.max(minNodeSize, Math.log2(totalEnrollment) * 1.5),
      course: course,
      x: Math.random(),
      y: Math.random()
    };
  });

  const groups = d3.map(nodes, d => d.group).keys();
  const colors = d3.quantize(d3.interpolateRainbow, groups.length + 1).slice(0, -1);
  const colorScale = d3.scaleOrdinal(colors).domain(groups);

  nodes.forEach(d => d.color = colorScale(d.group));

  return nodes
}

function drawNodes(nodes) {
  const tooltip = d3.select("#tooltip");

  return svg.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .style("fill", (d) => d.data.data.color)
    .attr("r", (d) => d.data.data.radius)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .on("mouseover", d => {
      const course = d.data.data.course;
      tooltip
        .transition()
        .duration(200)
        .style("opacity", 0.9);
      tooltip
        .html(`<strong>${course.dept}${course.number}:</strong> ${course.title}`)
        .style("left", `${d3.event.pageX}px`)
        .style("top", `${d3.event.pageY - 28}px`);
    })
    .on("mouseout", () => {
      tooltip
        .transition()
        .duration(500)
        .style("opacity", 0);
    });
}

function getClusters(nodes, prop) {
  const c = d3.nest()
    .key((d) => d[prop])
    .rollup((v) => v.sort((a, b) => a.radius - b.radius).slice(-1)[0])
    .entries(nodes);
  const x = {};
  c.forEach(function (d) {
    x[d.key] = d.value;
  });
  return x;
}

function moveLink(link) {
  link.attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);
}

function moveCircle(circle) {
  circle.attr("cx", function (d) {
    return (d.x =
      Math.max(d.data.data.radius, Math.min(w - d.data.data.radius, d.x)));
  })
    .attr("cy", function (d) {
      return (d.y =
        Math.max(d.data.data.radius, Math.min(h - d.data.data.radius, d.y)));
    })
}

function clusterNodes(nodeData, prop) {
  let nodes = nodeData.slice();
  const clusterCenters = getClusters(nodes, prop);
  nodes.push({
    id: 0,
    course: null,
    group: null,
    radius: null,
    x: null,
    y: null
  });
  nodes = nodes.map((d) => {
    if (d.id === 0) {
      d.parent = undefined;
    } else {
      const cc = clusterCenters[d[prop]].id;
      if (cc === d.id) {
        d.parent = 0;
      } else {
        d.parent = cc;
      }
    }
    return d;
  });
  const pack = d3.pack()
    .size([w, h])
    .padding(inter);
  const root = d3.hierarchy(d3.stratify()
    .parentId((d) => d.parent)(nodes))
    .sum((d) => d.data.radius)
    .sort((a, b) => a.data.radius - b.data.radius);
  pack(root);
  voronoi = d3.voronoi()
    .x((d) => d.x)
    .y((d) => d.y);
  root.children.map(function (g) {
    g.groupNodes = g.children === undefined ? [g] : [g].concat(g.children);
    // g.links = svg.append("g")
    //   .attr("class", "links")
    //   .selectAll("line")
    //   .data(voronoi.links(g.groupNodes))
    //   .enter().append("line")
    //   .call(moveLink);
    g.redraw = function () {
      const diagram = voronoi(g.groupNodes);
      // g.links = g.links.data(diagram.links());
      // g.links.exit().remove();
      // g.links = g.links.enter().append("line").merge(g.links).call(moveLink);
    };
    return g;
  });
  const shapes = drawNodes(root.descendants());
  const force = d3.forceSimulation()
    .force("x", d3.forceX(w / 2).strength(0.1))
    .force("y", d3.forceY(h / 2).strength(0.1))
    .force("collision", d3.forceCollide(d => d.data.data.radius + intra))
    .force("cluster", (alpha) => {
      root.descendants().forEach(function (d) {
        if (d.parent == null || d.parent.index === 0) {
          return
        }
        const cluster = d.parent;
        d.vx -= ((d.x + d.data.data.radius) - (cluster.x + cluster.data.data.radius)) * alpha;
        d.vy -= ((d.y + d.data.data.radius) - (cluster.y + cluster.data.data.radius)) * alpha;
      });
    })
    .on("tick", () => {
      root.children.forEach(g => g.redraw());
      shapes.call(moveCircle);
    })
    .nodes(root.descendants());
  shapes.call(d3.drag()
    .on("start", function (d) {
      {
        if (!d3.event.active) {
          force.alphaTarget(0.1).restart();
        }
        // move cluster centre
        if (d.parent == null) {
          return
        }
        const cc = d.parent.index === 0 ? d : d.parent;
        cc.fx = d.x;
        cc.fy = d.y;
      }
    })
    .on("drag", function (d) {
      if (d.parent == null) {
        return
      }
      const cc = d.parent.index === 0 ? d : d.parent;
      cc.fx = d3.event.x;
      cc.fy = d3.event.y;
    })
    .on("end", function (d) {
      if (!d3.event.active) {
        force.alphaTarget(0);
      }
      if (d.parent == null) {
        return
      }
      const cc = d.parent.index === 0 ? d : d.parent;
      cc.fx = null;
      cc.fy = null;
    }));
}

async function setup() {
  const nodeData = await getData();

  const btn = d3.select("#clusterProp");

  btn.on("change", function () {
    const prop = btn.property("checked") ? "radius" : "group";
    svg.selectAll("*").remove();
    clusterNodes(nodeData, prop)
  });

  clusterNodes(nodeData, "group");
}

setup();
