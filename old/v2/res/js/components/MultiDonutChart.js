/* Expects data in the form of:
 *  [
 *    {
 *      label: <string>,
 *      data: [
 *        {
 *          name: <string>,
 *          value: <number>
 *        },
 *        {
 *          name: <string>,
 *          value: <number>
 *        }
 *      ]
 *    }
 *  ]
 *  Where each top-level array element represents a separate donut chart that expects a label, names, and values.
 */
class MultiDonutChart {
  constructor(chart, data, opts = {}) {
    const svg = chart.append("svg")
      .attr("width", "100%")
      .attr("height", "100%");

    const { width, height } = svg.node().getBoundingClientRect();

    const maxDonutsPerRow = 5;
    const margin = 15;
    const donutDiameter = (width / maxDonutsPerRow) - margin;
    const nRows = Math.ceil(data.length / maxDonutsPerRow);

    // setup colors for all non "other" department names
    let color = null;
    if (opts.useGlobalColors) {
      let allNames = new Set();
      data.forEach(donutData => donutData.data.forEach(donutPortion => allNames.add(donutPortion.name)));
      allNames = Array.from(allNames);
      color = d3.scaleOrdinal()
        .domain(allNames)
        .range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), allNames.length).reverse());
    }

    // create individual donut charts
    this.donuts = [];
    for (let i = 0; i < data.length; i++) {
      const col = i % maxDonutsPerRow;
      const row = Math.floor(i / maxDonutsPerRow);

      // offset for centering
      let offset = 0;
      if (row === nRows - 1) {
        const numInRow = data.length % maxDonutsPerRow;
        const widthOfRow = numInRow * donutDiameter + ((numInRow - 1) * margin);
        const leftoverWidth = width - widthOfRow;
        offset = leftoverWidth / 2;
      }

      let x = offset + (col * donutDiameter);
      if (x > 0) x += col * margin;
      let y = row * donutDiameter;
      if (y > 0) y += row * margin;

      this.donuts.push(new DonutChart(x, y, donutDiameter / 2, svg, data[i], Object.assign(opts, { color })));
    }
  }
}