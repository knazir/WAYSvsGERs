class EnrollmentBreakdown {
  constructor(container, opts = {}, data = []) {
    // Config
    this.freeze = {};
    this.data = data;
    this.opts = opts;
    this.threshold = opts.defaultThreshold;
    this.startYear = opts.defaultStartYear || 2012;
    this.endYear = opts.defaultEndYear || 2013;
    this.requirementFilters = {};
    this.focusedCourseFilters = [];

    this.applyNonThresholdFilters();

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
    this.lineChart = new LineChart(this.lineChartCanvas, opts.lineOpts || {}, {}, this);
    this.donutChart = new DonutChart(this.donutBreakdownCanvas, {});

    container.append(this.grid);

    this.update();
  }

  applyNonThresholdFilters() {
    let filteredData = this.data;
    (this.opts.filters || []).forEach(f => filteredData = filteredData.filter((d, i) => f(d, i, this)));
    this.startingData = filteredData;
  }

  inContainer(el) {
    const container = document.createElement("div");
    container.append(el);
    return container;
  }

  setThreshold(threshold) {
    this.threshold = threshold;
    this.freezeData();
    this.update();
  }

  setStartYear(startYear) {
    this.startYear = startYear;
    this.freezeData();
    this.update();
  }

  setEndYear(endYear) {
    this.endYear = endYear;
    this.freezeData();
    this.update();
  }

  update() {
    this.lineChart.clearData();
    let filteredData = this.startingData;

    // run requirement filters
    Object.values(this.requirementFilters).forEach(f => filteredData = filteredData.filter(f));

    // run focused course filters
    this.focusedCourseFilters.forEach(f => filteredData = filteredData.filter(f));

    // filter based on threshold
    filteredData = filteredData.filter(course => {
      return this.enrollmentChangedPercentBetween(course, this.threshold, this.startYear, this.endYear);
    });

    filteredData.forEach((course, i) => {
        const data = {};
        Object.entries(course.enrollmentByYear).forEach(([year, enrollment]) => data[year] = enrollment.average);
        this.lineChart.addData(`${course.dept}${course.number}`, data, i === filteredData.length - 1);
      });

    if (Object.keys(this.lineChart.datasets).length === 1) {
      const name = Object.keys(this.lineChart.datasets)[0];
      const course = this.data.find(c => `${c.dept}${c.number}` === name);
      let unitStr = "";
      if (course.minUnits) unitStr = `${course.minUnits}`;
      if (course.minUnits !== course.maxUnits) unitStr += `-${course.maxUnits}`;
      this.percentageText.innerHTML = `
      <h4>${name}: ${course.title}</h4>
      `;
      this.donutContainer.innerHTML = `
        <h5>Description:</h5> ${course.description.substring(0, 400)}${course.description.length >= 400 ? "..." : ""}<br/>
        ${course.ways.length > 0 ? `<strong>WAYS:</strong> ${course.ways.join(", ")}<br/>` : ""}
        ${course.gers.length > 0 ? `<strong>GERs:</strong> ${course.gers.join(", ")}<br/>` : ""}
        ${course.minUnits && course.maxUnits ? `<strong>Units:</strong> ${unitStr}<br/>` : ""}
        <strong><a href="https://carta.stanford.edu/course/${name}/1184" target="_blank">View on Carta</a></strong>
      `;
    } else {
      const percentageOfClassesShown = ((filteredData.length / this.startingData.length) * 100).toFixed(1);
      this.percentageText.innerHTML = `
      <h3>${filteredData.length} ${filteredData.length === 1 ? "class" : "classes"} (${percentageOfClassesShown}%)</h3>
      <div>
        had ${filteredData.length === 1 ? "its" : "their"} enrollment ${this.threshold < 0 ? "decrease" : "increase"} 
        by at least <strong>${Math.abs(this.threshold)}%</strong>
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
      Object.assign(this.opts.donutOpts, {
        colorMapping: this.opts.system === GERS ? GER_COLORS : WAYS_COLORS
      });
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
  }

  enrollmentChangedPercentBetween(course, percentage, startYear, endYear) {
    if (!percentage) return true;
    if (!course.enrollmentByYear[startYear] || !course.enrollmentByYear[endYear]) return false;

    const baseline = course.enrollmentByYear[startYear].average;
    const end = course.enrollmentByYear[endYear].average;
    if (!baseline || !end) return false;

    const percentChange = ((end - baseline) / baseline) * 100;
    return percentage < 0 ? percentChange < percentage : percentChange > percentage;
  }

  freezeData() {
    this.freeze = {
      data: this.data,
      startingData: this.startingData,
      threshold: this.threshold,
      startYear: this.startYear,
      endYear: this.endYear
    };
  }

  clearData() {
    this.startingData = [];
    this.update();
  }

  addRequirementFilter(key, f) {
    this.requirementFilters[key] = f;
    this.update();
  }

  removeRequirementFilter(key) {
    delete this.requirementFilters[key];
    this.update();
  }

  focusRequirement(req) {
    this.applyNonThresholdFilters();
    const filter = course => {
      if (this.opts.system === GERS) return course.gers.indexOf(req) !== -1;
      else return course.ways.indexOf(req) !== -1;
    };
    this.addRequirementFilter(req, filter);
  }

  addFocusedCourseFilter(f) {
    this.focusedCourseFilters.push(f);
    this.update();
  }

  focusCourses(courseData) {
    this.lineChart.clearData();
    this.addFocusedCourseFilter(course => {
      return courseData.find(c => c.label === `${course.dept}${course.number}`);
    });
  }

  reset() {
    Object.assign(this, this.freeze);
    this.focusedCourseFilters = [];
    this.requirementFilters = {};
    this.lineChart.resetColors();
    this.update();
  }
}