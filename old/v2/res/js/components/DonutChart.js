class DonutChart {
  constructor(x, y, radius, svg, data, opts = {}) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.svg = svg;
    this.label = data.label;
    this.data = data.data;
    this.opts = opts;

    let total = 0;
    this.data.forEach(d => total += d.value);

    const tooltip = d3.select("#tooltip");

    // d3 color
    const color = opts.color || d3.scaleOrdinal()
      .domain(this.data.map(d => d.name))
      .range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), this.data.length).reverse());

    // d3 pie
    const pie = d3.pie()
      .padAngle(0.005)
      .sort(null)
      .value(d => d.value);

    // d3 arc
    const arc = d3.arc().innerRadius(radius * 0.67).outerRadius(radius - 1);

    // render to svg
    this.create(tooltip, color, pie, arc, total, this.label, opts);
  }

  create(tooltip, color, pie, arc, total, label, opts) {
    const arcs = pie(this.data);
    const g = this.svg.append("g")
      .attr("transform", `translate(${this.x + this.radius}, ${this.y + this.radius})`);

    const title = g.append("text")
      .style("font-weight", "bold")
      .style("font-size", "0.9em")
      .attr("text-anchor", "middle")
      .text(this.label);

    if (this.opts.subtitle) title.attr("y", "-1em");

    if (this.opts.subtitle) {
      g.append("text")
        .style("font-size", "0.7em")
        .attr("text-anchor", "middle")
        .attr("y", "1em")
        .text(typeof this.opts.subtitle === "function" ? this.opts.subtitle(this.data, this.label) : this.opts.subtitle);

      if (this.opts.subSubtitle) {
        g.append("text")
          .style("font-size", "0.7em")
          .attr("text-anchor", "middle")
          .attr("y", "3em")
          .text(typeof this.opts.subSubtitle === "function" ? this.opts.subSubtitle(this.data, this.label) : this.opts.subSubtitle);
      }
    }


    g.selectAll("path")
      .data(arcs)
      .enter()
      .append("path")
      .attr("fill", d => color(d.data.name))
      .attr("d", arc)
      .on("mouseover", function(d) {
        d3.select(this)
          .style("fill", d3.select(this).attr("stroke"))
          .attr("fill-opacity", 0.6);
        tooltip
          .transition()
          .duration(200)
          // .style("z-index", 9001)
          .style("opacity", .95);
        tooltip
          .html(opts.tooltip ? opts.tooltip(d.data, total, label) : d.data.name)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this)
          .style("fill", color(d.data.name))
          .attr("fill-opacity", 1);
        tooltip
          .transition()
          .duration(500)
          // .style("z-index", -1)
          .style("opacity", 0);
      })
      .append("title");
      // .text(d => `${d.data.name}: ${d.data.value.toLocaleString()}`);

    if (this.opts.drawLabels) this.drawLabels(g, arc, arcs);
  }

  drawLabels(g, arc, arcs) {
    const text = g.selectAll("text")
      .data(arcs)
      .enter().append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("dy", "0.35em");

    text.append("tspan")
      .attr("x", 0)
      .attr("y", "-0.7em")
      .style("font-weight", "bold")
      .text(d => d.data.name);

    text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
      .attr("x", 0)
      .attr("y", "0.7em")
      .attr("fill-opacity", 0.7)
      .text(d => d.data.value.toLocaleString());
  }
}