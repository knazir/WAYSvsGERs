/*** Config ***/

const GER_BARS = "GER_BARS";
const GER_PIES = "GER_PIES";
const WAYS_BARS = "WAYS_BARS";
const WAYS_PIES_DEPTS = "WAYS_PIES_DEPTS";
const WAYS_PIES_GERS = "WAYS_PIES_GERS";
const COMPARISON = "COMPARISON";

const GERS = {
  DB_HUM: "DB-Hum",
  DB_MATH: "DB-Math",
  DB_SOC_SCI: "DB-SocSci",
  DB_ENGR_APP_SCI: "DB-EngrAppSci",
  DB_NAT_SCI: "DB-NatSci",
  EC_ETHIC_REAS: "EC-EthicReas",
  EC_GLOBAL_COM: "EC-GlobalCom",
  EC_AMER_CUL: "EC-AmerCul",
  EC_GENDER: "EC-Gender"
};

const WAYS = {
  AII: "A-II",
  AQR: "AQR",
  CE: "CE",
  ED: "ED",
  ER: "ER",
  FR: "FR",
  SI: "SI",
  SMA: "SMA"
};

const gerPieChartOtherCutoff = 0.03;
const graphicsOrder = [GER_BARS, WAYS_BARS, GER_PIES, WAYS_PIES_DEPTS, WAYS_PIES_GERS, COMPARISON];

// store results for each setup so we don't recompute
const existingData = {};
graphicsOrder.forEach(ger => existingData[ger] = null);

/*** Data Processing ***/

function formatCourse(course) {
  //id,dept,number,title,description,units,ways,gers,terms,enrollmentAut,enrollmentWin,enrollmentSpr,enrollmentSum
  return {
    id: Number(course.id),
    dept: course.dept,
    number: course.number,
    title: course.title,
    description: course.description,
    units: Number(course.units),
    ways: course.ways ? course.ways.split(",") : [],
    gers: course.gers ? course.gers.split(",") : [],
    terms: course.terms,
    enrollment: {
      aut: Number(course.enrollmentAut),
      win: Number(course.enrollmentWin),
      spr: Number(course.enrollmentSpr),
      sum: Number(course.enrollmentSum)
    }
  };
}

async function fetchData() {
  const courses = await d3.csv("res/data/courses_2013_2014.csv", formatCourse);
  return courses.filter(course => course.ways.length > 0 || course.gers.length > 0);
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

  // convert to format for MultiDonutChart
  const chartData = Object.entries(depts).map(([req, deptCourses]) => {
    const reqTotal = reqClassCount[req];
    const other = { name: "OTHER", value: 0, breakdown: {} };

    const data = Object.entries(deptCourses).map(([dept, courseSet]) => {
      if (courseSet.size >= Math.floor(reqTotal * gerPieChartOtherCutoff)) return { name: dept, value: courseSet.size };
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

function setupMultiPie(chartData, courses) {
  const multiOpts = {
    onClick: (activePoint, dataset) => {
      if (!activePoint) return;
      clearGraphic();
      setupGerPies(courses, dataset);
    }
  };

  const producer = (canvas, chartOpts, dataset) => new DonutChart(canvas, chartOpts, dataset);
  return new MultiChart(document.querySelector(".flexibility .graphic"), producer, multiOpts, chartData);
}

function setupGerPies(courses, focusedDataset = null) {
  console.log(GER_PIES);
  const { chartData } = computeDepartmentMakeup(courses, GERS);
  focusedDataset ? setupFocusedPie(focusedDataset, courses) : setupMultiPie(chartData, courses);
}

/*** GER Bars ***/

function setupGerBars(courses) {
  console.log(GER_BARS);
  const counts = computeCounts(courses, GERS);
  const opts = {
    chartOpts: { title: { display: true, text: "Distribution of GERs" } },
    sorted: true,
    reversed: true
  };
  const chart = new BarChart(document.querySelector(".flexibility .graphic canvas"), opts);
  chart.addData("GERs", counts);
}

/*** WAYS Bars ***/

function setupWaysBars(courses) {
  console.log(WAYS_BARS);
  const counts = computeCounts(courses, WAYS);
  const opts = {
    chartOpts: {
      title: { display: true, text: "Distribution of WAYS Requirements" }
    },
    sorted: true,
    reversed: true
  };
  const chart = new BarChart(document.querySelector(".flexibility .graphic canvas"), opts);
  chart.addData("WAYS", counts);
}

/*** GER Pies ***/

function setupFocusedPie(focusedDataset, courses) {
  const focusedOpts = {
    onClick: activePoint => {
      if (activePoint) return;
      clearGraphic();
      setupGerPies(courses);
    },
    chartOpts: { title: { display: true, text: focusedDataset.label } }
  };
  return new DonutChart(document.querySelector(".flexibility .graphic canvas"), focusedOpts, focusedDataset);
}

/*** WAYS Pies Depts ***/

function setupWaysPiesDepts(courses, focusedDataset = null) {
  console.log(WAYS_PIES_DEPTS);
  const { chartData } = computeDepartmentMakeup(courses, WAYS);
  focusedDataset ? setupFocusedPie(focusedDataset, courses) : setupMultiPie(chartData, courses);
}

/*** WAYS Pies GERs ***/

function computeWaysGerMakeup(courses) {
  const waysGerMakeup = {};
  Object.values(WAYS).forEach(way => waysGerMakeup[way] = {});
  courses.forEach(course => {
    course.ways.forEach(way => {
      if (course.gers.length === 0) {
        if (!waysGerMakeup[way]["NEW"]) waysGerMakeup[way]["NEW"] = { classes: new Set(), departments: new Set() };
        waysGerMakeup[way]["NEW"].classes.add(`${course.dept}${course.number}`);
        waysGerMakeup[way]["NEW"].departments.add(course.dept);
      }
      course.gers.forEach(ger => {
        if (!waysGerMakeup[way][ger]) waysGerMakeup[way][ger] = { classes: new Set(), departments: new Set() };
        waysGerMakeup[way][ger].classes.add(`${course.dept}${course.number}`);
        waysGerMakeup[way][ger].departments.add(course.dept);
      });
    });
  });

  const chartData = Object.entries(waysGerMakeup).map(([way, gerCounts]) => {
    const data = Object.entries(gerCounts).map(([ger, { departments }]) => {
      return { name: ger, value: departments.size };
    });
    return { label: way, data };
  });

  return { waysGerMakeup, chartData };
}

function setupWaysPiesGers(courses, focusedDataset = null) {
  console.log(WAYS_PIES_GERS);
  const { waysGerMakeup, chartData } = computeWaysGerMakeup(courses);
  focusedDataset ? setupFocusedPie(focusedDataset, courses) : setupMultiPie(chartData, courses);
}

/*** Comparison ***/

function getAverageDepartmentCount(reqClassCount) {
  let sum = 0;
  Object.values(reqClassCount).forEach(n => sum += n);
  return Math.floor(sum / Object.keys(reqClassCount).length);
}

function setupComparison(courses) {
  const gerDepartmentMakeup = computeDepartmentMakeup(courses, GERS);
  const waysDepartmentMakeup = computeDepartmentMakeup(courses, WAYS);
  const waysGerMakeup = computeWaysGerMakeup(courses);

  const opts = { maxChartsPerRow: 2 };

  const chartData = [
    {
      label: "Average Departments Per Requirement",
      data: {
        GERs: getAverageDepartmentCount(gerDepartmentMakeup.reqClassCount),
        WAYS: getAverageDepartmentCount(waysDepartmentMakeup.reqClassCount)
      }
    },
    {
      label: "Total Courses Offered",
      data: {
        GERs: gerDepartmentMakeup.totalClassCount,
        WAYS: waysDepartmentMakeup.totalClassCount
      }
    }
  ];

  const producer = (canvas, chartOpts, dataset) => {
    return new BarChart(canvas, chartOpts, { data: dataset.data });
  };
  const chart = new MultiChart(document.querySelector(".flexibility .graphic"), producer, opts, chartData);
}

/*** Main ***/

function clearGraphic() {
  const visual = d3.select(".flexibility .graphic");
  visual.node().innerHTML = "<canvas></canvas>";
}

runMain(async function() {
  const courses = await fetchData();
  const setupGraphic = graphic => {
    clearGraphic();
    switch (graphic) {
      case GER_BARS: return setupGerBars(courses);
      case GER_PIES: return setupGerPies(courses);
      case WAYS_BARS: return setupWaysBars(courses);
      case WAYS_PIES_DEPTS: return setupWaysPiesDepts(courses);
      case WAYS_PIES_GERS: return setupWaysPiesGers(courses);
      case COMPARISON: return setupComparison(courses);
      default: return;
    }
  };

  enterView({
    selector: ".flexibility .text .step",
    offset: 0.6,
    enter: element => {
      const index = Number(d3.select(element).attr("data-index"));
      setupGraphic(graphicsOrder[index]);
    },
    exit: element => {
      let index = Number(d3.select(element).attr("data-index")) - 1;
      setupGraphic(graphicsOrder[index]);
    }
  })

});
