class DonutChart {
  constructor(canvas, opts = {}, dataset = { label: "", data: [] }) {
    this.canvas = canvas;
    this.dataset = dataset;
    this.opts = opts;
    this.chart = this.createGraph();
    window.chart = this.chart;
  }

  createGraph() {

    const options = {
      legend: { display: false },
      responsive: false,
      maintainAspectRatio: false
    };

    return new Chart(this.canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: this.createLabels(),
        datasets: this.createGraphData()
      },
      options: Object.assign(options, this.opts.chartOpts)
    });
  }

  createLabels() {
    return this.dataset.data.map(d => d.name);
  }

  createGraphData() {
    return [{
      label: this.opts.seriesName || "",
      data: this.dataset.data.map(d => d.value)
    }];
  }

  setData(dataset, update = true) {
    this.dataset = dataset;
    if (update) this.update();
  }

  clearData(update = true) {
    this.dataset = { label: "", data: [] };
    if (update) this.update();
  }

  destroy() {
    this.chart.destroy();
    this.canvas.getContext("2d").clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  update() {
    this.chart.data.labels = this.createLabels();
    this.chart.data.datasets = this.createGraphData();
    this.chart.update();
  }
}