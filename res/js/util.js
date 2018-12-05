async function runMain(f) {
  return f();
}

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

const colors = [
  // PROBABLY TOO LIGHT
  "#eeffff", "#f2f2f2", "#f0f0ee", "#e7f2da", "#eae3e3", "#ffccce", "#ddd7d7", "#bcf279",
  // MEDIUM
  "#c5d8ad", "#ccbbdd", "#ff999e", "#a092be", "#aa8888", "#669922", "#637f3f", "#118888", "#665577", "#4c3d3e", "#b1040e",
  // PROBABLY TOO DARK
  "#881111", "#A80009", "#441188", "#2b2b2b", "#660000", "#112200", "#111110"];

function getColors(startIndex = 9) {
  return [...colors.slice(startIndex), ...colors.slice(0, startIndex)];
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
