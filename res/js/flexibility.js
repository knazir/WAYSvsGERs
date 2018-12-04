/*** Config ***/

const GER_BARS = "GER_BARS";
const GER_PIES = "GER_PIES";
const WAYS_BARS = "WAYS_BARS";
const WAYS_PIES_DEPTS = "WAYS_PIES_DEPTS";
const WAYS_PIES_GERS = "WAYS_PIES_GERS";

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
const graphicsOrder = [GER_BARS, WAYS_BARS, GER_PIES, WAYS_PIES_DEPTS, WAYS_PIES_GERS];
let activeChart = null;

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

/*** GER Bars ***/

function setupGerBars(courses, visual) {
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

function setupWaysBars(courses, visual) {
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

function setupGerPies(courses, visual) {
  console.log(GER_PIES);
  const { chartData } = computeDepartmentMakeup(courses, GERS);
  const chart = new MultiDonutChart(document.querySelector(".flexibility .graphic"), {}, chartData);
}

/*** WAYS Pies Depts ***/

function setupWaysPiesDepts(courses, visual) {
  console.log(WAYS_PIES_DEPTS);
  const { chartData } = computeDepartmentMakeup(courses, WAYS);
  const chart = new MultiDonutChart(document.querySelector(".flexibility .graphic"), {}, chartData);
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

function setupWaysPiesGers(courses, visual) {
  console.log(WAYS_PIES_GERS);
  const { waysGerMakeup, chartData } = computeWaysGerMakeup(courses);
  const chart = new MultiDonutChart(document.querySelector(".flexibility .graphic"), {}, chartData);
}

/*** Comparison ***/

function setupComparison(courses, visual) {

}

/*** Main ***/

runMain(async function() {
  const courses = await fetchData();
  const visual = d3.select(".flexibility .graphic");
  const setupGraphic = graphic => {
    visual.node().innerHTML = "<canvas></canvas>";
    switch (graphic) {
      case GER_BARS: return setupGerBars(courses, visual);
      case GER_PIES: return setupGerPies(courses, visual);
      case WAYS_BARS: return setupWaysBars(courses, visual);
      case WAYS_PIES_DEPTS: return setupWaysPiesDepts(courses, visual);
      case WAYS_PIES_GERS: return setupWaysPiesGers(courses, visual);
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
