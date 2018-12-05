class EnrollmentBreakdown {
  constructor(container, opts = {}, data = []) {
    // Config
    this.data = data;
    this.opts = opts;
    this.threshold = opts.defaultThreshold;
    this.startYear = opts.defaultStartYear || 2012;
    this.endYear = opts.defaultEndYear || 2013;

    container.innerHTML = "";

    // DOM elements
    this.grid = document.createElement("div");
    this.grid.classList.add("enrollment-breakdown");

    this.lineChartCanvas = document.createElement("canvas");
    this.grid.appendChild(this.inContainer(this.lineChartCanvas));

    this.percentageText = document.createElement("div");
    this.grid.appendChild(this.percentageText);

    this.donutBreakdownCanvas = document.createElement("canvas");
    this.donutContainer = this.inContainer(this.donutBreakdownCanvas);
    this.grid.appendChild(this.donutContainer);

    // Charts
    this.lineChart = new LineChart(this.lineChartCanvas, opts.lineOpts || {});
    this.donutChart = new DonutChart(this.donutBreakdownCanvas, {});

    container.append(this.grid);

    this.update();
  }

  inContainer(el) {
    const container = document.createElement("div");
    container.append(el);
    return container;
  }

  setThreshold(threshold) {
    this.threshold = threshold;
    this.update();
  }

  setStartYear(startYear) {
    this.startYear = startYear;
    this.update();
  }

  setEndYear(endYear) {
    this.endYear = endYear;
    this.update();
  }

  update() {
    this.lineChart.clearData();
    let filteredData = this.data;

    // apply non-threshold filters
    (this.opts.filters || []).forEach(f => filteredData = filteredData.filter((d, i) => f(d, i, this)));
    const startingData = filteredData;

    // filter based on threshold
    filteredData = filteredData.filter(course => {
      return this.enrollmentChangedPercentBetween(course, this.threshold, this.startYear, this.endYear);
    });

    filteredData.forEach(course => {
        const data = {};
        Object.entries(course.enrollmentByYear).forEach(([year, enrollment]) => data[year] = enrollment.average);
        this.lineChart.addData(`${course.dept}${course.number}`, data);
      });

    const percentageOfClassesShown = ((filteredData.length / startingData.length) * 100).toFixed(1);
    this.percentageText.innerHTML = `
      <h3>${filteredData.length} classes (${percentageOfClassesShown}%)</h3>
      <div>
        had their enrollment ${this.threshold < 0 ? "decrease" : "increase"} by at least 
        <strong>${Math.abs(this.threshold)}%</strong>
        from <strong>${this.startYear}</strong> - <strong>${this.endYear}</strong>
      </div>
    `;

    this.donutChart.clearData();
    const reqBreakdown = {};
    filteredData.forEach(course => {
      const reqs = this.opts.system === GERS ? course.gers : course.ways;
      reqs.forEach(req => {
        if (!reqBreakdown[req]) reqBreakdown[req] = 0;
        reqBreakdown[req]++;
      });
    });
    const donutLabel = `${this.opts.system === GERS ? "GER" : "WAYS"} Breakdown of Displayed Courses`;
    const donutData = Object.entries(reqBreakdown).map(([req, count]) => {
      return { name: req, value: count };
    });

    const donutDataset = { label: donutLabel, data: donutData };

    if (!this.opts.donutOpts) this.opts.donutOpts = {};
    if (!this.opts.donutOpts.chartOpts) this.opts.donutOpts.chartOpts = {};
    Object.assign(this.opts.donutOpts.chartOpts, {
      elements: {
        center: {
          text: `${donutData.length} ${this.opts.system === GERS ? "GERs" : "WAYS"}`
        }
      }
    });

    this.donutContainer.innerHTML = "";
    this.donutBreakdownCanvas = document.createElement("canvas");
    this.donutContainer.appendChild(this.donutBreakdownCanvas);
    this.donutChart = new DonutChart(this.donutBreakdownCanvas, this.opts.donutOpts, donutDataset);
  }

  enrollmentChangedPercentBetween(course, percentage, startYear, endYear) {
    let enrollmentChange = 0;

    if (!course.enrollmentByYear[startYear] || !course.enrollmentByYear[endYear]) return false;

    const baseline = course.enrollmentByYear[startYear].average;
    const end = course.enrollmentByYear[endYear].average;

    const percentChange = ((end - baseline) / baseline) * 100;
    return percentage < 0 ? percentChange < percentage : percentChange > percentage;
  }
}