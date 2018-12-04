class MultiDonutChart {
  constructor(container, opts = {}, datasets = []) {
    container.innerHTML = "";

    this.canvasGrid = document.createElement("div");
    this.canvasGrid.classList.add("canvas-grid");

    const { width, height } = container.getBoundingClientRect();
    this.width = width;
    this.height = height;

    const maxDonutsPerRow = opts.maxDonutsPerRow || 5;
    const margin = opts.margin || 15;
    const donutDiameter = (this.width / (maxDonutsPerRow)) - margin;
    const nRows = Math.ceil(datasets.length / maxDonutsPerRow);

    const gridTemplate = [];
    for (let i = 0; i < maxDonutsPerRow; i++) gridTemplate.push(`${donutDiameter}px`);
    this.canvasGrid.style.gridTemplateColumns = gridTemplate.join(" ");
    this.canvasGrid.style.gridTemplateRows = gridTemplate.slice(0, nRows).join(" ");
    this.canvasGrid.style.gridRowGap = `${margin}px`;
    this.canvasGrid.style.gridColumnGap = `${margin}px`;

    container.append(this.canvasGrid);

    this.canvases = [];
    this.charts = [];
    datasets.forEach(dataset => {
      const canvas = document.createElement("canvas");
      canvas.style.width = canvas.width = donutDiameter;
      canvas.style.height = canvas.height = donutDiameter;
      this.canvasGrid.appendChild(canvas);
      this.canvases.push(canvas);

      const opts = {
        chartOpts: {
          title: { display: true, text: dataset.label }
        }
      };

      this.charts.push(new DonutChart(canvas, opts, dataset));
    });
  }
}