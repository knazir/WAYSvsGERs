class MultiChart {
  constructor(container, producer, opts = {}, datasets = []) {
    container.innerHTML = "";

    this.canvasGrid = document.createElement("div");
    this.canvasGrid.classList.add("canvas-grid");

    const { width, height } = container.getBoundingClientRect();
    this.width = width;
    this.height = height;

    const maxChartsPerRow = opts.maxChartsPerRow || 5;
    const margin = opts.margin || 15;
    const chartSize = (this.width / (maxChartsPerRow)) - margin;
    const nRows = Math.ceil(datasets.length / maxChartsPerRow);

    const gridTemplate = [];
    for (let i = 0; i < maxChartsPerRow; i++) gridTemplate.push(`${chartSize}px`);
    this.canvasGrid.style.gridTemplateColumns = gridTemplate.join(" ");
    this.canvasGrid.style.gridTemplateRows = gridTemplate.slice(0, nRows).join(" ");
    this.canvasGrid.style.gridRowGap = `${margin}px`;
    this.canvasGrid.style.gridColumnGap = `${margin}px`;

    container.append(this.canvasGrid);

    this.canvases = [];
    this.charts = [];
    datasets.forEach((dataset, datasetIndex) => {
      const canvas = document.createElement("canvas");
      canvas.style.width = canvas.width = chartSize;
      canvas.style.height = canvas.height = chartSize;
      this.canvasGrid.appendChild(canvas);
      this.canvases.push(canvas);

      const chartOpts = { onClick: opts.onClick };
      chartOpts.chartOpts = Object.assign({}, opts.chartOpts || {}, {
        title: { display: true, text: dataset.label },
        responsive: false,
        maintainAspectRatio: false
      });

      this.charts.push(producer(canvas, chartOpts, dataset, datasetIndex));
    });
  }
}