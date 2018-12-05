function clearText(chart) {

}

function drawText(chart, text) {
  const width = chart.chart.width;
  const height = chart.chart.height;
  const ctx = chart.chart.ctx;
  ctx.restore();
  const fontSize = (height / 180).toFixed(2);
  ctx.font = fontSize + "em sans-serif";
  ctx.textBaseline = "middle";
  const textX = Math.round((width - ctx.measureText(text).width) / 2);
  const textY = (height + 35) / 2;
  ctx.fillText(text, textX, textY);
  ctx.save();
}

Chart.pluginService.register({
  beforeDraw: function (chart) {
    if (!chart.config.options.elements.center) return;
    drawText(chart, chart.config.options.elements.center.text);
  }
});

class DonutChart {
  constructor(canvas, opts = {}, dataset = { label: "", data: [] }) {
    this.canvas = canvas;
    this.dataset = dataset;
    this.opts = opts;
    this.chart = this.createGraph();
  }

  createGraph() {
    const options = {
      legend: { display: false },
      maintainAspectRatio: false
    };

    if (this.opts.onMouseMove) {
      this.canvas.onmousemove = e => {
        const activePoint = this.chart.getElementsAtEvent(e)[0];
        this.opts.onMouseMove(activePoint, this.dataset, this, e);
      };
    }

    if (this.opts.onClick) {
      this.canvas.onclick = e => {
        const activePoint = this.chart.getElementsAtEvent(e)[0];
        this.opts.onClick(activePoint, this.dataset, this, e);
      }
    }

    return new Chart(this.canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: this.createLabels(),
        datasets: this.createGraphData()
      },
      options: Object.assign(options, this.opts.chartOpts),
    });
  }

  createLabels() {
    return this.dataset.data.map(d => d.name);
  }

  createGraphData() {
    return [{
      label: this.opts.seriesName || "",
      data: this.dataset.data.map(d => d.value),
      backgroundColor: getColors(this.opts.colorIndex)
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
    this.chart.update();
  }
}