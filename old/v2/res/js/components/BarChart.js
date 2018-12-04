class BarChart {
  constructor(chart, data, opts = {}) {
    this.data = data;

    const margin = {
      top: 20,
      left: 30,
      right: 30,
      bottom: 30
    };

    this.svg = chart.append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    let { width, height } = this.svg.node().getBoundingClientRect();
    width = width - margin.left - margin.right;
    height = height - margin.top - margin.bottom;

    this.width = width;
    this.height = height;

    console.log(width, height);

    const columns = Object.keys(data);
    const counts = Object.values(data);
    const selection = columns[0];
    let max = d3.max(counts);

    this.yscale = d3.scaleLinear()
      .range([height, 0])
      .domain([0, max]);

    this.xscale = d3.scaleBand()
      .range([0, width])
      .padding(0.1);

    this.duration = 1000;

    this.xaxis = d3.axisBottom(this.xscale);
    this.svg.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.top + 20})`)
      .style("text-anchor", "middle")
      .text("Requirement");

    this.yaxis = d3.axisLeft(this.yscale);
    this.svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Value");


    this.svg.append("g")
      .attr("transform", "translate(0, " + (height) + ")")
      .attr("class", "x axis");

    this.svg.append("g")
      .attr("class", "y axis");

    this.update();
  }

  update() {
    const { svg, data, width, height, xscale, yscale, xaxis, yaxis, duration } = this;
    const columns = Object.keys(data);
    const counts = Object.values(data);

    let max = d3.max(counts);

    xscale.domain(d3.range(counts.length));
    yscale.domain([0, max]);

    const bars = svg.selectAll(".bar")
      .data(counts);

    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", "#4682b4")
      .attr("width", xscale.bandwidth())
      .attr("height", 0)
      .attr("y", height)
      .merge(bars)
      .transition()
      .duration(duration)
      .attr("height", (d, i) => height - yscale(d))
      .attr("y", (d, i) => yscale(d))
      .attr("width", xscale.bandwidth())
      .attr("x", (d, i) => xscale(i));

    bars
      .exit()
      .transition()
      .duration(duration)
      .attr("height", 0)
      .attr("y", height)
      .remove();

    const labels = svg.selectAll(".label")
      .data(counts);

    const new_labels = labels
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("opacity", 0)
      .attr("y", height)
      .attr("fill", "white")
      .attr("text-anchor", "middle");

    new_labels.merge(labels)
      .transition()
      .duration(duration)
      .attr("opacity", 1)
      .attr("x", (d, i) => xscale(i) + xscale.bandwidth() / 2)
      .attr("y", d => yscale(d) + 20)
      .text(d => d);

    labels
      .exit()
      .transition()
      .duration(duration)
      .attr("y", height)
      .attr("opacity", 0)
      .remove();

    svg.select(".x.axis")
      .transition()
      .duration(duration)
      .call(xaxis);

    svg.select(".y.axis")
      .transition()
      .duration(duration)
      .call(yaxis);

  }
}