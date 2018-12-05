/*** Util ***/

async function runMain(f) {
  return f();
}

function formatCourse(course) {
  //id,dept,number,title,description,units,ways,gers,terms,enrollmentAut,enrollmentWin,enrollmentSpr,enrollmentSum
  let unitStr = course.units.replace(/\s+/, "");
  let minUnits, maxUnits;
  if (unitStr.indexOf("-") === -1) {
    minUnits = Number(unitStr);
    maxUnits = Number(unitStr);
  } else {
    minUnits = Number(unitStr.substring(0, unitStr.indexOf("-")));
    maxUnits = Number(unitStr.substring(unitStr.indexOf("-") + 1));
  }
  return {
    id: Number(course.id),
    dept: course.dept,
    number: course.number,
    title: course.title,
    description: course.description,
    minUnits: minUnits,
    maxUnits: maxUnits,
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
