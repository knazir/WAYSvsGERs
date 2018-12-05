class BarChart {
  constructor(canvas, opts = {}, datasets = {}) {
    this.canvas = canvas;
    this.datasets = datasets;
    this.opts = opts;
    this.chart = this.createGraph();
  }

  createGraph() {
    const options = Object.assign({
      scales: {
        xAxes: [{ gridLines: { display: false } }],
        yAxes: [{ ticks: { beginAtZero: true }, gridLines: { display: false } }]
      },
      legend: { display: false },
      maintainAspectRatio: false
    }, this.opts.chartOpts || {});

    if (this.opts.xAxisLabel) options.scales.xAxes[0].scaleLabel = {
      display: true,
      labelString: this.opts.xAxisLabel
    };

    if (this.opts.yAxisLabel) options.scales.yAxes[0].scaleLabel = {
      display: true,
      labelString: this.opts.yAxisLabel
    };

    return new Chart(this.canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: this.createColumnLabels(),
        datasets: this.createGraphData()
      },
      options
    });
  }

  createColumnLabels() {
    const dataset = this.datasets[Object.keys(this.datasets)[0]];
    if (!dataset) return [];
    return Object.keys(dataset);
  }

  createGraphData() {
    return Object.entries(this.datasets).map(([label, dataset], i) => {
      let data = Object.values(dataset);
      if (this.opts.sorted) data = data.sort((a, b) => this.opts.reversed ? b - a : a - b);
      let res = { label, data };
      res.backgroundColor = getColors(11);
      if (this.opts.datasetOpts) res = Object.assign(res, this.opts.datasetOpts[i] || {});
      return res;
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