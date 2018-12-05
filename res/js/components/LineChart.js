const verticalLinePlugin = {
  getLinePosition: function (chart, pointIndex) {
    const meta = chart.getDatasetMeta(0); // first dataset is used to discover X coordinate of a point
    const data = meta.data;
    return data[pointIndex]._model.x;
  },

  renderVerticalLine: function (chartInstance, pointIndex, style) {
    const lineLeftOffset = this.getLinePosition(chartInstance, pointIndex);
    const scale = chartInstance.scales['y-axis-0'];
    const context = chartInstance.chart.ctx;

    // render vertical line
    context.beginPath();
    if (style.strokeStyle === "dashed") context.setLineDash([10, 5]);
    context.strokeStyle = style.strokeFill || '#ff0000';
    context.moveTo(lineLeftOffset, scale.top);
    context.lineTo(lineLeftOffset, scale.bottom);
    context.stroke();
    if (style.strokeStyle === "dashed") context.setLineDash([]);

    // write label
    context.fillStyle = style.labelFill || "#ff0000";
    context.textAlign = style.textAlign || 'center';
    const labelLeftOffset = lineLeftOffset + (style.labelPaddingLeft || 0);
    const labelTop = style.labelTop === undefined ?
      ((scale.bottom - scale.top) / 2 + scale.top) :
      (style.labelTop + scale.top);
    const labelTopOffset = (style.labelPaddingTop || 0) + labelTop;
    if (style.text) context.fillText(style.text, labelLeftOffset, labelTopOffset);
  },

  afterDatasetsDraw: function (chart, easing) {
    if (!chart.config.verticalLines) return;
    Object.entries(chart.config.verticalLines).forEach(([index, style]) => {
      this.renderVerticalLine(chart, index, style);
    });
  }
};

Chart.plugins.register(verticalLinePlugin);

class LineChart {
  constructor(canvas, opts = {}, datasets = {}) {
    this.canvas = canvas;
    this.datasets = datasets;
    this.opts = opts;
    this.chart = this.createGraph();
  }

  createGraph() {
    return new Chart(this.canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: this.createColumnLabels(),
        datasets: this.createGraphData()
      },
      verticalLines: this.opts.verticalLines || null,
      options: Object.assign({
        scales: {
          xAxes: [{ gridLines: { display: false } }],
          yAxes: [{ ticks: { beginAtZero: true }, gridLines: { display: false } }]
        },
        legend: { display: false },
        maintainAspectRatio: false
      }, this.opts.chartOpts || {})
    });
  }

  createColumnLabels() {
    const dataset = this.datasets[Object.keys(this.datasets)[0]];
    if (!dataset) return [];
    return Object.keys(dataset);
  }

  createGraphData() {
    return Object.entries(this.datasets).map(([label, dataset]) => {
      let data = Object.values(dataset);
      if (this.opts.sorted) data = data.sort((a, b) => this.opts.reversed ? b - a : a - b);
      return { label, data, fill: false };
    });
  }

  addData(key, dataset, update = true) {
    this.datasets[key] = dataset;
    if (update) this.update();
  }

  removeData(key, update = true) {
    delete this.datasets[key];
    if (update) this.update();
  }

  clearData(update = true) {
    this.datasets = {};
    if (update) this.update();
  }

  destroy() {
    this.chart.destroy();
    this.canvas.getContext("2d").clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  update() {
    this.chart.data.labels = this.createColumnLabels();
    this.chart.data.datasets = this.createGraphData();
    this.chart.update();
  }
}