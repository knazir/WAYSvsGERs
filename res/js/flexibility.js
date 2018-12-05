(function() {
  /*** Config ***/

  const GER_BARS = "GER_BARS";
  const GER_PIES = "GER_PIES";
  const WAYS_BARS = "WAYS_BARS";
  const WAYS_PIES_DEPTS = "WAYS_PIES_DEPTS";
  const WAYS_PIES_GERS = "WAYS_PIES_GERS";
  const COMPARISON = "COMPARISON";

  const pieChartOtherCutoff = 0.035;
  const flexibilityGraphicsOrder = [GER_BARS, WAYS_BARS, GER_PIES, WAYS_PIES_DEPTS, COMPARISON, WAYS_PIES_GERS];

  /*** Data Processing ***/

  async function fetchData() {
    let gerCourses = await d3.csv("res/data/courses_2012_2013.csv", formatCourse);
    gerCourses = gerCourses.filter(course => course.ways.length > 0 || course.gers.length > 0);
    let waysCourses = await d3.csv("res/data/courses_2017_2018.csv", formatCourse);
    waysCourses = waysCourses.filter(course => course.ways.length > 0 || course.gers.length > 0);
    return { gerCourses, waysCourses };
  }

  function computeCounts(courses, system) {
    const counts = {};
    Object.values(system).forEach(req => counts[req] = 0);
    courses.forEach(course => {
      const list = system === GERS ? course.gers : course.ways;
      list.forEach(req => counts[req]++);
    });
    return counts;
  }

  function computeDepartmentMakeup(courses, system) {
    const depts = {};
    Object.values(system).forEach(req => depts[req] = {});

    courses.forEach(course => {
      const list = system === GERS ? course.gers : course.ways;
      list.forEach(req => {
        if (!depts[req][course.dept]) depts[req][course.dept] = new Set();
        depts[req][course.dept].add(`${course.dept}${course.number}`);
      });
    });

    let totalClassCount = 0;
    const reqClassCount = {};

    Object.entries(depts).forEach(([req, deptCourses]) => {
      let total = 0;
      Object.values(deptCourses).forEach(courseSet => total += courseSet.size);
      reqClassCount[req] ? reqClassCount[req] += total : reqClassCount[req] = total;
      totalClassCount += total;
    });

    // convert to format for MultiChart
    const chartData = Object.entries(depts).map(([req, deptCourses]) => {
      const reqTotal = reqClassCount[req];
      const other = { name: "OTHER", value: 0, breakdown: {} };

      const data = Object.entries(deptCourses).map(([dept, courseSet]) => {
        if (courseSet.size >= Math.round(reqTotal * pieChartOtherCutoff)) return { name: dept, value: courseSet.size };
        other.value += courseSet.size;
        other.breakdown[dept] = courseSet.size;
        return null;
      }).filter(d => d);

      if (other.value > 0) data.push(other);

      return { label: req, data };
    });

    return { totalClassCount, reqClassCount, chartData, }
  }

  /*** Generic Pie Helpers ***/

  function setupMultiPie(chartData, courses, setupCallback, colorIndex, useConsistentColors = false) {
    const multiOpts = {
      onClick: (activePoint, dataset) => {
        // if (!activePoint) return;
        clearGraphic();
        setupCallback(courses, dataset);
      }
    };

    const producer = (canvas, chartOpts, dataset) => {
      chartOpts.colorIndex = colorIndex;
      if (!chartOpts.chartOpts) chartOpts.chartOpts = {};
      let nSections = 0;
      let isDepartments = false;
      let isRequirements = false;
      dataset.data.forEach(({ name, value, breakdown }) => {
        if (name === "OTHER") {
          nSections += Object.values(breakdown).length;
          isDepartments = true;
        } else if (name === "NEW") {
          isRequirements = true;
        }
        else nSections++;
      });
      if (!isDepartments && !isRequirements) isDepartments = true;

      let text = `${nSections} `;
      if (isDepartments) {
        text += "Depts";
        chartOpts.pieceUnits = "courses";
      }
      if (isRequirements) {
        text += "GERs";
        chartOpts.pieceUnits = "departments";
      }

      if (useConsistentColors) chartOpts.colorMapping = GER_COLORS;
      chartOpts.chartOpts.elements = {
        center: {
          text: text.trim()
        }
      };

      return new DonutChart(canvas, chartOpts, dataset);
    };

    return new MultiChart(document.querySelector(".flexibility .graphic"), producer, multiOpts, chartData);
  }

  function setupGerPies(courses, focusedDataset = null) {
    const {chartData} = computeDepartmentMakeup(courses, GERS);
    focusedDataset ?
      setupFocusedPie(focusedDataset, courses, setupGerPies) :
      setupMultiPie(chartData, courses, setupGerPies);
  }

  /*** GER Bars ***/

  function setupGerBars(courses) {
    const counts = computeCounts(courses, GERS);
    const opts = {
      chartOpts: { title: { display: true, text: "Distribution of GERs (2012)", fontSize: 18 } },
      sorted: true,
      reversed: true,
      yAxisLabel: "Number of Courses"
    };
    const chart = new BarChart(document.querySelector(".flexibility .graphic canvas"), opts);
    chart.addData("GERs", counts);
  }

  /*** WAYS Bars ***/

  function setupWaysBars(courses) {
    const counts = computeCounts(courses, WAYS);
    const opts = {
      chartOpts: {
        title: { display: true, text: "Distribution of WAYS Requirements (2017)", fontSize: 18 }
      },
      sorted: true,
      reversed: true,
      yAxisLabel: "Number of Courses"
    };
    const chart = new BarChart(document.querySelector(".flexibility .graphic canvas"), opts);
    chart.addData("WAYS", counts);
  }

  /*** GER Pies ***/

  function setupFocusedPie(focusedDataset, courses, setupCallback, colorIndex, useConsistentColors = false) {
    let nSections = 0;
    let isDepartments = false;
    let isRequirements = false;
    focusedDataset.data.forEach(({ name, value, breakdown}) => {
      if (name === "OTHER") {
        isDepartments = true;
        nSections += Object.keys(breakdown).length;
      } else if (name === "NEW") {
        isRequirements = true;
      }
      else nSections++;
    });


    let text = `${nSections} `;
    let pieceUnits = "";
    if (isDepartments) {
      text += "Depts";
      pieceUnits = "courses";
    }
    if (isRequirements) {
      text += "GERs";
      pieceUnits = "departments";
    }

    const focusedOpts = {
      onClick: (activePoint, _, chart) => {
        if (activePoint) return;
        clearGraphic();
        setupCallback(courses);
      },
      colorMapping: useConsistentColors ? GER_COLORS : null,
      colorIndex: colorIndex,
      pieceUnits: pieceUnits,
      chartOpts: {
        title: { display: true, text: focusedDataset.label, fontSize: 24 },
        elements: {
          center: {
            text: text.trim()
          }
        }
      }
    };
    return new DonutChart(document.querySelector(".flexibility .graphic canvas"), focusedOpts, focusedDataset);
  }

  /*** WAYS Pies Depts ***/

  function setupWaysPiesDepts(courses, focusedDataset = null) {
    const {chartData} = computeDepartmentMakeup(courses, WAYS);
    focusedDataset ?
      setupFocusedPie(focusedDataset, courses, setupWaysPiesDepts) :
      setupMultiPie(chartData, courses, setupWaysPiesDepts);
  }

  /*** WAYS Pies GERs ***/

  function computeWaysGerMakeup(courses) {
    const waysGerMakeup = {};
    Object.values(WAYS).forEach(way => waysGerMakeup[way] = {});
    courses.forEach(course => {
      course.ways.forEach(way => {
        if (course.gers.length === 0) {
          if (!waysGerMakeup[way]["NEW"]) waysGerMakeup[way]["NEW"] = {classes: new Set(), departments: new Set()};
          waysGerMakeup[way]["NEW"].classes.add(`${course.dept}${course.number}`);
          waysGerMakeup[way]["NEW"].departments.add(course.dept);
        }
        course.gers.forEach(ger => {
          if (!waysGerMakeup[way][ger]) waysGerMakeup[way][ger] = {classes: new Set(), departments: new Set()};
          waysGerMakeup[way][ger].classes.add(`${course.dept}${course.number}`);
          waysGerMakeup[way][ger].departments.add(course.dept);
        });
      });
    });

    const chartData = Object.entries(waysGerMakeup).map(([way, gerCounts]) => {
      const data = Object.entries(gerCounts).map(([ger, {departments}]) => {
        return {name: ger, value: departments.size};
      });
      return {label: way, data};
    });

    return {waysGerMakeup, chartData};
  }

  function setupWaysPiesGers(courses, focusedDataset = null) {
    const {waysGerMakeup, chartData} = computeWaysGerMakeup(courses);
    focusedDataset ?
      setupFocusedPie(focusedDataset, courses, setupWaysPiesGers, 14, true) :
      setupMultiPie(chartData, courses, setupWaysPiesGers, 10, true);
  }

  /*** Comparison ***/

  function getAverageDepartmentCount(chartData) {
    let sum = 0;
    chartData.forEach(d => {
      let nDepts = 0;
      d.data.forEach(({ name, value, breakdown }) => {
        if (name === "OTHER") nDepts += Object.keys(breakdown).length;
        else nDepts++;
      });
      sum += nDepts;
    });
    return Math.floor(sum / chartData.length);
  }

  function getAverageCourseCount(reqClassCount) {
    let sum = 0;
    Object.values(reqClassCount).forEach(n => sum += n);
    return Math.round(sum / Object.keys(reqClassCount).length);
  }

  function setupComparison(gerCourses, waysCourses) {
    const gerDepartmentMakeup = computeDepartmentMakeup(gerCourses, GERS);
    const waysDepartmentMakeup = computeDepartmentMakeup(waysCourses, WAYS);

    const opts = { maxChartsPerRow: 3, titleSize: 14 };

    const percentage = n => {
      const p = (n * 100).toFixed(1);
      return p < 0 ? `${p}%` : `+${p}%`;
    };

    const avgDeptCounts = {
      GERs: getAverageDepartmentCount(gerDepartmentMakeup.chartData),
      WAYS: getAverageDepartmentCount(waysDepartmentMakeup.chartData)
    };
    const avgDeptCountChange = (avgDeptCounts.WAYS - avgDeptCounts.GERs) / avgDeptCounts.GERs;

    const avgCourseCounts = {
      GERs: getAverageCourseCount(gerDepartmentMakeup.reqClassCount),
      WAYS: getAverageCourseCount(waysDepartmentMakeup.reqClassCount)
    };
    const avgCourseCountChange = (avgCourseCounts.WAYS - avgCourseCounts.GERs) / avgCourseCounts.GERs;

    const totalCourseCounts = {
      GERs: gerDepartmentMakeup.totalClassCount,
      WAYS: waysDepartmentMakeup.totalClassCount
    };
    const totalCourseCountChange = (totalCourseCounts.WAYS - totalCourseCounts.GERs) / totalCourseCounts.GERs;

    const chartData = [
      {
        label: `Average Departments Per Requirement (${percentage(avgDeptCountChange)})`,
        data: avgDeptCounts
      },
      {
        label: `Average Courses Per Requirement (${percentage(avgCourseCountChange)})`,
        data: avgCourseCounts
      },
      {
        label: `Total Courses Offered (${percentage(totalCourseCountChange)})`,
        data: totalCourseCounts
      }
    ];

    const producer = (canvas, opts, dataset, datasetIndex) => {
      opts.datasetOpts = [{ backgroundColor: ["#118888", "#665577"] }];

      return new BarChart(canvas, opts, { data: dataset.data });
    };

    const chart = new MultiChart(document.querySelector(".flexibility .graphic"), producer, opts, chartData);
  }

  /*** Main ***/

  function clearGraphic() {
    const visual = d3.select(".flexibility .graphic");
    visual.node().innerHTML = "<canvas></canvas>";
  }

  runMain(async function () {
    const { gerCourses, waysCourses } = await fetchData();
    const setupGraphic = graphic => {
      clearGraphic();
      switch (graphic) {
        case GER_BARS:
          return setupGerBars(gerCourses);
        case GER_PIES:
          return setupGerPies(gerCourses);
        case WAYS_BARS:
          return setupWaysBars(waysCourses);
        case WAYS_PIES_DEPTS:
          return setupWaysPiesDepts(waysCourses);
        case WAYS_PIES_GERS:
          return setupWaysPiesGers(waysCourses);
        case COMPARISON:
          return setupComparison(gerCourses, waysCourses);
        default:
          return;
      }
    };

    enterView({
      selector: ".flexibility .text .step",
      offset: 0.6,
      enter: element => {
        const index = Number(d3.select(element).attr("data-index"));
        setupGraphic(flexibilityGraphicsOrder[index]);
      },
      exit: element => {
        let index = Number(d3.select(element).attr("data-index")) - 1;
        setupGraphic(flexibilityGraphicsOrder[index]);
      }
    });
  });
})();
