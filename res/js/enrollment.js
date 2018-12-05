(function() {
  /*** Config ***/

  const GER_NO_WAYS = "GER_NO_WAYS";
  const NO_GER_WAYS = "NO_GER_WAYS";

  const enrollmentGraphicsOrder = [GER_NO_WAYS, NO_GER_WAYS];

  let storedData = null;

  /*** Data Processing ***/

  async function fetchData() {
    const coursesByYear = {};
    for (let i = 2010; i <= 2017; i++) {
      let courses = await d3.csv(`res/data/courses_${i}_${i + 1}.csv`, formatCourse);
      courses = courses.filter(course => course.ways.length > 0 || course.gers.length > 0);
      coursesByYear[i] = courses;
    }
    return coursesByYear;
  }

  function computeEnrollmentOverTime(coursesByYear) {
    const courses = {};
    Object.entries(coursesByYear).forEach(([year, yearCourses]) => {
      yearCourses.forEach(course => {
        let yearEnrollmentTotal = 0;
        const quartersOffered = Object.keys(course.enrollment).filter(term => course.enrollment[term]);
        quartersOffered.forEach(term => yearEnrollmentTotal += course.enrollment[term]);
        const yearEnrollmentAverage = Math.round(yearEnrollmentTotal / quartersOffered.length);
        const courseName = `${course.dept}${course.number}`;
        course.enrollmentByYear = {};
        if (!courses[courseName]) courses[courseName] = course;
        courses[courseName].enrollmentByYear[year] = { total: yearEnrollmentTotal, average: yearEnrollmentAverage };
      });
    });
    return Object.values(courses);
  }

  /*** Generic Line Chart ***/

  function getEnrollmentBreakdown(data, title, defaultThreshold, system, filters) {
    const opts = {
      defaultThreshold: defaultThreshold,
      defaultStartYear: 2012,
      defaultEndYear: 2017,
      system: system,
      filters: filters || [],
      chartOpts: { maintainAspectRatio: true },
      lineOpts: {
        chartOpts: { title: { display: true, text: title, fontSize: 14 } },
        verticalLines: getWaysTransitionVerticalLine(),
        xAxisLabel: "Year",
        yAxisLabel: "Number of Students"
      },
      donutOpts: {
        chartOpts: {
          title: {
            display: true,
            text: `Breakdown of ${system === GERS ? "GERs" : "WAYS"} for Courses Shown`
          }
        },
        pieceUnits: "courses",
        colorIndex: 12
      }
    };
    return new EnrollmentBreakdown(document.querySelector(".enrollment .graphic"), opts, data);
  }

  function getWaysTransitionVerticalLine() {
    return {
      3: {
        text: "WAYS Introduced",
        textAlign: "left",
        labelFill: "black",
        labelPaddingLeft: 5,
        labelPaddingTop: 20,
        labelTop: 0,

        strokeStyle: "dashed"
      }
    };
  }

  /*** GER No Ways ***/

  function hasGerButNoWays(course) {
    return course.gers.length > 0 && course.ways.length === 0;
  }

  function courseOfferedThroughout(course, startYear, endYear) {
    for (let i = startYear; i <= endYear; i++) {
      if (!course.enrollmentByYear[i] || !course.enrollmentByYear[i].total) return false;
    }
    return true;
  }

  function setupGerNoWays(coursesByYear) {
    console.log(GER_NO_WAYS);
    let data;
    if (storedData) data = storedData;
    storedData = data = computeEnrollmentOverTime(coursesByYear);
    const title = "Enrollment Changes for Classes Satisfying GERs but no WAYS Requirements";
    const filters =[
      course => hasGerButNoWays(course),
      course => courseOfferedThroughout(course, 2013, 2015)
    ];

    const updateThreshold = e => {
      const threshold = Number(e.target.value);
      if (threshold !== chart.threshold) chart.setThreshold(threshold);
    };

    const thresholdInput = document.querySelector("#inEnBr0");
    thresholdInput.addEventListener("keyup", updateThreshold);
    thresholdInput.addEventListener("change", updateThreshold);

    const startYearSelect = document.querySelector("#sel0EnBr0");
    const endYearSelect = document.querySelector("#sel1EnBr0");

    startYearSelect.addEventListener("change", e => {
      const startYear = Number(e.target.value);
      if (startYear !== chart.startYear) chart.setStartYear(startYear);
      Array.from(endYearSelect.querySelectorAll("option")).forEach(option => {
        option.disabled = Number(option.textContent) <= chart.startYear;
      });
    });

    document.querySelector("#sel1EnBr0").addEventListener("change", e => {
      const endYear = Number(e.target.value);
      if (endYear !== chart.endYear) chart.setEndYear(endYear);
      Array.from(startYearSelect.querySelectorAll("option")).forEach(option => {
        option.disabled = Number(option.textContent) >= chart.endYear;
      });
    });

    const chart = getEnrollmentBreakdown(data, title, -30, GERS, filters);
  }

  /*** No GER Ways ***/

  function hasWaysButNoGers(course) {
    return course.gers.length === 0 && course.ways.length > 0;
  }

  function setupNoGerWays(coursesByYear) {
    console.log(NO_GER_WAYS);
    let data;
    if (storedData) data = storedData;
    storedData = data = computeEnrollmentOverTime(coursesByYear);
    const title = "Enrollment Changes for Classes NOT Satisfying GERs but Gaining WAYS Requirements";
    const filters =[
      course => hasWaysButNoGers(course),
      course => courseOfferedThroughout(course, 2013, 2015)
    ];

    const updateThreshold = e => {
      const threshold = Number(e.target.value);
      if (threshold !== chart.threshold) chart.setThreshold(threshold);
    };

    const thresholdInput = document.querySelector("#inEnBr1");
    thresholdInput.addEventListener("keyup", updateThreshold);
    thresholdInput.addEventListener("change", updateThreshold);

    const startYearSelect = document.querySelector("#sel0EnBr1");
    const endYearSelect = document.querySelector("#sel1EnBr1");

    startYearSelect.addEventListener("change", e => {
      const startYear = Number(e.target.value);
      if (startYear !== chart.startYear) chart.setStartYear(startYear);
      Array.from(endYearSelect.querySelectorAll("option")).forEach(option => {
        option.disabled = Number(option.textContent) <= chart.startYear;
      });
    });

    document.querySelector("#sel1EnBr1").addEventListener("change", e => {
      const endYear = Number(e.target.value);
      if (endYear !== chart.endYear) chart.setEndYear(endYear);
      Array.from(startYearSelect.querySelectorAll("option")).forEach(option => {
        option.disabled = Number(option.textContent) >= chart.endYear;
      });
    });

    const chart = getEnrollmentBreakdown(data, title, 30, WAYS, filters);
  }

  /*** Main ***/

  function clearGraphic() {
    const visual = d3.select(".enrollment .graphic");
    visual.node().innerHTML = "<canvas></canvas>";
  }

  runMain(async function () {
    const coursesByYear = await fetchData();
    const setupGraphic = graphic => {
      clearGraphic();
      switch (graphic) {
        case GER_NO_WAYS:
          return setupGerNoWays(coursesByYear);
        case NO_GER_WAYS:
          return setupNoGerWays(coursesByYear);
        default:
          return;
      }
    };

    enterView({
      selector: ".enrollment .text .step",
      offset: 0.6,
      enter: element => {
        const index = Number(d3.select(element).attr("data-index"));
        setupGraphic(enrollmentGraphicsOrder[index]);
      },
      exit: element => {
        let index = Number(d3.select(element).attr("data-index")) - 1;
        setupGraphic(enrollmentGraphicsOrder[index]);
      }
    });

    setupGerNoWays(coursesByYear);
  });
})();