(function() {
  /*** Config ***/

  const GER_NO_WAYS = "GER_NO_WAYS";
  const NO_GER_WAYS = "NO_GER_WAYS";

  const enrollmentGraphicsOrder = [GER_NO_WAYS, NO_GER_WAYS];

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
        const yearEnrollmentAverage = Math.floor(yearEnrollmentTotal / quartersOffered.length);
        const courseName = `${course.dept}${course.number}`;
        course.enrollmentByYear = {};
        if (!courses[courseName]) courses[courseName] = course;
        courses[courseName].enrollmentByYear[year] = { total: yearEnrollmentTotal, average: yearEnrollmentAverage };
      });
    });
    return Object.values(courses);
  }

  /*** Generic Line Chart ***/

  function getEnrollmentChart(coursesByYear, title) {
    const data = computeEnrollmentOverTime(coursesByYear);
    const opts = {
      chartOpts: {
        title: title ? { display: true, text: title } : null
      },
      verticalLines: getWaysTransitionVerticalLine()
    };
    const chart = new LineChart(document.querySelector(".enrollment .graphic canvas"), opts);
    return { data, chart };
  }

  function getWaysTransitionVerticalLine() {
    return {
      4: {
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

  function courseOfferedBetween(course, startYear, endYear) {
    for (let i = startYear; i <= endYear; i++) {
      if (!course.enrollmentByYear[i] || !course.enrollmentByYear[i].total) return false;
    }
    return true;
  }

  function enrollmentChangedPercentBetween(course, percentage, startYear, endYear) {
    let enrollmentChange = 0;

    if (!course.enrollmentByYear[startYear] || !course.enrollmentByYear[endYear]) return false;

    const baseline = course.enrollmentByYear[startYear].average;
    const end = course.enrollmentByYear[endYear].average;

    const percentChange = ((end - baseline) / baseline) * 100;
    return percentage < 0 ? percentChange < percentage : percentChange > percentage;
  }

  function setupGerNoWays(coursesByYear) {
    console.log(GER_NO_WAYS);
    const title = "Enrollment Changes for Classes Satisfying GERs but no WAYS Requirements";
    const { data, chart } = getEnrollmentChart(coursesByYear, title);
    data
      .filter(course => hasGerButNoWays(course))
      .filter(course => courseOfferedBetween(course, 2011, 2015))
      .filter(course => enrollmentChangedPercentBetween(course, -50, 2013, 2014))
      .forEach(course => {
        const data = {};
        Object.entries(course.enrollmentByYear).forEach(([year, enrollment]) => data[year] = enrollment.average);
        chart.addData(`${course.dept}${course.number}`, data);
      });
  }

  /*** No GER Ways ***/

  function hasWaysButNoGers(course) {
    return course.gers.length === 0 && course.ways.length > 0;
  }

  function setupNoGerWays(coursesByYear) {
    console.log(NO_GER_WAYS);
    const title = "Enrollment Changes for Classes NOT Satisfying GERs but Gaining WAYS Requirements";
    const { data, chart } = getEnrollmentChart(coursesByYear, title);
    data
      .filter(course => hasWaysButNoGers(course))
      .filter(course => courseOfferedBetween(course, 2011, 2015))
      .filter(course => enrollmentChangedPercentBetween(course, 50, 2013, 2014))
      .forEach(course => {
        const data = {};
        Object.entries(course.enrollmentByYear).forEach(([year, enrollment]) => data[year] = enrollment.average);
        chart.addData(`${course.dept}${course.number}`, data);
      });
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
    })

  });
})();