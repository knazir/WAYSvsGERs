class BarChart {
  constructor(canvas, opts = {}, datasets = {}) {
    this.canvas = canvas;
    this.datasets = datasets;
    this.opts = opts;
    this.chart = this.createGraph();
  }

  createGraph() {
    return new Chart(this.canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: this.createColumnLabels(),
        datasets: this.createGraphData()
      },
      options: Object.assign({
        scales: {
          yAxes: [{ ticks: { beginAtZero: true } }]
        },
        legend: { display: false },
        maintainAspectRatio: false
      }, this.opts.chartOpts || {})
    });
  }

  createColumnLabels() {
    const columns = [];
    Object.values(this.datasets).forEach(dataset => columns.push(...Object.keys(dataset)));
    return columns;
  }

  createGraphData() {
    return Object.entries(this.datasets).map(([label, dataset]) => {
      let data = Object.values(dataset);
      if (this.opts.sorted) data = data.sort((a, b) => this.opts.reversed ? b - a : a - b);
      return { label, data };
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