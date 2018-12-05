class EnrollmentBreakdown {
  constructor(container, opts = {}, datasets = {}) {
    container.innerHTML = "";

    this.grid = document.createElement("div");
    this.grid.classList.add("enrollment-breakdown");

    const { width, height } = container.getBoundingClientRect();
    this.width = width;
    this.height = height;
    const margin = opts.margin || 15;

    const gridTemplate = [];
    this.canvasGrid.style.gridRowGap = `${margin}px`;
    this.canvasGrid.style.gridColumnGap = `${margin}px`;

    container.append(this.canvasGrid);
  }

  setThreshold(threshold) {

  }
}