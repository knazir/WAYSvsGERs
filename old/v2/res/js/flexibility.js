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
  const courses = await d3.csv("res/data/courses_2012_2013.csv", formatCourse);
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
  const counts = computeCounts(courses, GERS);
  new BarChart(d3.select(".flexibility .graphic"), counts);
}

/*** WAYS Bars ***/

function setupWaysBars(courses, visual) {
  console.log(WAYS_BARS);
  const counts = computeCounts(courses, WAYS);
  new BarChart(d3.select(".flexibility .graphic"), counts);
}

/*** GER Pies ***/

function setupGerPies(courses, visual) {
  console.log(GER_PIES);
  const { chartData } = computeDepartmentMakeup(courses, GERS);

  // sub and sub subtitles
  const subtitle = data => {
    let nDepartments = data.length;
    for (const dept of data) {
      if (dept.name === "OTHER") {
        nDepartments--;
        nDepartments += Object.keys(dept.breakdown).length;
      }
    }
    return `${nDepartments} Departments`;
  };

  const subSubtitle = data => {
    let nDepartments = data.length;
    let nCourses = 0;
    data.forEach(dept => nCourses += dept.value);
    return `${nCourses} Courses`;
  };

  const tooltip = (data, total) => {
    const percentage = n => `${(n * 100).toFixed(2)}%`;

    if (data.name === "OTHER") {
      const otherDepts = Object.entries(data.breakdown).map(([dept, count]) =>{
        return `<em>${dept}</em>: ${count} courses (${percentage(count / total)})`;
      }).join("<br/>");
      return `
      <strong>${Object.keys(data.breakdown).length} Other Departments (${percentage(data.value / total)})</strong>:<br/>
      ${otherDepts}
      `;
    }
    return `
    <strong>${data.name}</strong><br/>
    ${data.value} Courses<br/>
    ${percentage(data.value / total)}
    `;
  };

  const opts = { subtitle, subSubtitle, tooltip };

  new MultiDonutChart(d3.select(".flexibility .graphic"), chartData, opts);
}

/*** WAYS Pies Depts ***/

function setupWaysPiesDepts(courses, visual) {
  console.log(WAYS_PIES_DEPTS);
  const { chartData } = computeDepartmentMakeup(courses, WAYS);

  // sub and sub subtitles
  const subtitle = data => {
    let nDepartments = data.length;
    for (const dept of data) {
      if (dept.name === "OTHER") {
        nDepartments--;
        nDepartments += Object.keys(dept.breakdown).length;
      }
    }
    return `${nDepartments} Departments`;
  };

  const subSubtitle = data => {
    let nDepartments = data.length;
    let nCourses = 0;
    data.forEach(dept => nCourses += dept.value);
    return `${nCourses} Courses`;
  };

  const tooltip = (data, total) => {
    const percentage = n => `${(n * 100).toFixed(2)}%`;

    if (data.name === "OTHER") {
      const otherDepts = Object.entries(data.breakdown).map(([dept, count]) =>{
        return `<em>${dept}</em>: ${count} courses (${percentage(count / total)})`;
      }).join("<br/>");
      return `
      <strong>${Object.keys(data.breakdown).length} Other Departments (${percentage(data.value / total)})</strong>:<br/>
      ${otherDepts}
      `;
    }
    return `
    <strong>${data.name}</strong><br/>
    ${data.value} Courses<br/>
    ${percentage(data.value / total)}
    `;
  };

  const opts = { subtitle, subSubtitle, tooltip };

  new MultiDonutChart(d3.select(".flexibility .graphic"), chartData, opts);
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

  // sub and sub subtitles
  const subtitle = data => {
    let nGers = data.length;
    for (const ger of data) {
      if (ger.name === "NEW") nGers--;
    }
    return `${nGers} GERs`;
  };

  const subSubtitle = (data, way) => {
    let uniqueDepartments = new Set();
    Object.values(waysGerMakeup[way]).forEach(({ departments }) => departments.forEach(d => uniqueDepartments.add(d)));
    return `${uniqueDepartments.size} Departments`;
  };

  const tooltip = (data, total, way) => {
    const percentage = n => `${(n * 100).toFixed(2)}%`;

    if (data.name === "NEW") {
      const newDepts = Array.from(waysGerMakeup[way]["NEW"].departments);
      const descr = newDepts.map(dept => `<em>${dept}</em>`).join("<br/>");
      return `
      <strong>${newDepts.length} New Departments (${percentage(data.value / total)})</strong>:<br/>
      ${descr}
      `;
    }

    const depts = Array.from(waysGerMakeup[way][data.name].departments);
    const descr = depts.map(dept => `<em>${dept}</em>`).join("<br/>");
    return `
    <strong>
        ${data.name}<br/>
        ${data.value} Departments (${percentage(data.value / total)})<br/>
    </strong>
    ${descr}
    `;
  };

  const opts = { subtitle, subSubtitle, tooltip, useGlobalColors: true };

  new MultiDonutChart(d3.select(".flexibility .graphic"), chartData, opts);
}

/*** Main ***/

runMain(async function() {
  const courses = await fetchData();
  const visual = d3.select(".flexibility .graphic");
  const tooltip = d3.select("#tooltip");

  const setupGraphic = graphic => {
    visual.node().innerHTML = "";
    tooltip.html("").style("left", 0).style("top", 0);
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
    offset: 0.5,
    enter: element => {
      const index = Number(d3.select(element).attr("data-index"));
      setupGraphic(graphicsOrder[index]);
    },
    exit: element => {
      let index = Number(d3.select(element).attr("data-index"));
      index = Math.max(0, index - 1);
      setupGraphic(graphicsOrder[index]);
    }
  })

});
