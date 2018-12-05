const verticalLinePlugin = {
  getLinePosition: function (chart, pointIndex) {
    if (chart.data.datasets.length === 0) return Number.MAX_SAFE_INTEGER;
    const meta = chart.getDatasetMeta(0); // first dataset is used to discover X coordinate of a point
    const data = meta.data;
    return data[pointIndex]._model.x;
  },

  renderVerticalLine: function (chartInstance, pointIndex, style) {
    const lineLeftOffset = this.getLinePosition(chartInstance, pointIndex);
    if (lineLeftOffset === Number.MIN_SAFE_INTEGER) return;
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
  constructor(canvas, opts = {}, datasets = {}, parent = null) {
    this.canvas = canvas;
    this.datasets = datasets;
    this.opts = opts;
    this.parent = parent;
    this.colorMap = {};
    this.chart = this.createGraph();
  }

  createGraph() {
    if (this.opts.onClick) this.canvas.onclick = e => {
      const activePoints = this.chart.getElementsAtEvent(e);
      this.opts.onClick(e, activePoints, this);
    };

    const options = Object.assign({
      scales: {
        xAxes: [{ gridLines: { display: false } }],
        yAxes: [{ ticks: { beginAtZero: true }, gridLines: { display: false } }]
      },
      legend: { display: false, position: "right" },
      maintainAspectRatio: false,
      tooltips: {
        mode: 'point',
      }
    }, this.opts.chartOpts || {});

    if (this.opts.xAxisLabel) options.scales.xAxes[0].scaleLabel = {
      display: true,
      labelString: this.opts.xAxisLabel
    };

    if (this.opts.yAxisLabel) options.scales.yAxes[0].scaleLabel = {
      display: true,
      labelString: this.opts.yAxisLabel
    };

    const chart = new Chart(this.canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: this.createColumnLabels(),
        datasets: this.createGraphData()
      },
      verticalLines: this.opts.verticalLines || null,
      options: options
    });

    if (chart.data.datasets.length <= 14) {
      chart.options.legend.display = true;
      chart.update();
    }
    return chart;
  }

  createColumnLabels() {
    const dataset = this.datasets[Object.keys(this.datasets)[0]];
    if (!dataset) return [];
    return Object.keys(dataset);
  }

  createGraphData() {
    const colors = getColors(7);
    const useColor = Object.keys(this.datasets).length <= 14;
    return Object.entries(this.datasets).map(([label, dataset], i) => {
      let color = null;
      if (useColor) {
        if (this.colorMap[label]) color = this.colorMap[label];
        else this.colorMap[label] = color = colors[i];
      }
      let data = Object.values(dataset);
      if (this.opts.sorted) data = data.sort((a, b) => this.opts.reversed ? b - a : a - b);
      return { label, data, fill: false, borderColor: color, backgroundColor: color };
    });
  }

  addData(key, dataset, update = true, updateParent = false) {
    this.datasets[key] = dataset;
    if (update) this.update();
    if (updateParent && this.parent) this.parent.update();
  }

  removeData(key, update = true, updateParent = false) {
    delete this.datasets[key];
    if (update) this.update();
    if (updateParent && this.parent) this.parent.update();
  }

  clearData(update = true, updateParent = false) {
    this.datasets = {};
    if (update) this.update();
    if (updateParent && this.parent) this.parent.update();
  }

  resetColors() {
    this.colorMap = {};
  }

  destroy() {
    this.chart.destroy();
    this.canvas.getContext("2d").clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  update() {
    this.chart.data.labels = this.createColumnLabels();
    this.chart.data.datasets = this.createGraphData();
    this.chart.options.legend.display = this.chart.data.datasets.length <= 14;
    this.chart.update();
  }
}