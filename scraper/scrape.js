const { createObjectCsvWriter } = require("csv-writer");
const CliProgress = require("cli-progress");
const fetch = require("node-fetch");
const fs = require("fs");
const { JSDOM } = require("jsdom");

//////////// Config ////////////

const view = "catalog";
const q = "all+courses";
const startYear = 2016;
const academicYear = `${startYear}${startYear + 1}`;
const query = `view=${view}&page={PAGE_NUMBER}&q=${q}&academicYear=${academicYear}`;

const config = {
  urlTemplate: `https://explorecourses.stanford.edu/search?${query}`,
  quarters: {
    "Aut": "Autumn",
    "Win": "Winter",
    "Spr": "Spring",
    "Sum": "Summer"
  },
  waysRegex: /WAY-(A-II|AQR|CE|ED|ER|FR|SI|SMA)/g,
  gerRegex: /GER:((?:DB-(?:Hum|Math|SocSci|EngrAppSci|NatSci))|(?:EC-(?:EthicReas|GlobalCom|AmerCul|Gender)))/g,
  unitsRegex: /Units: ([^\s|]+)/,
  termsRegex: /Terms: ((?:(?:Aut|Win|Spr|Sum)(?:, )?)+)/,
  sectionTermRegex: /[0-9]{4}-[0-9]{4} (.+)/,
  newlineRegex: /\r?\n|\r/g,
  whitespaceRegex: /\s+/g,
  sectionTypeRegex: /(LEC|DIS)/,
  studentCountRegex: /Students enrolled: ([0-9]+)/
};

let id = 1;

//////////// Generic Helpers ////////////

function getTextContent(node, selector) {
  return node.querySelector(selector).textContent.trim();
}

//////////// Schedule Parsing ////////////

/* Currently returns just the enrollment count for that term */
function parseQuarterSections(sectionNode) {
  const sections = Array.from(sectionNode.querySelectorAll("li.sectionDetails"))
    .map(node => node.textContent.replace(config.newlineRegex, " "))
    .map(sectionStr => sectionStr.replace(config.whitespaceRegex, " "))
    .map(sectionStr => sectionStr.trim())
    .map(sectionStr => {
      const typeMatch = config.sectionTypeRegex.exec(sectionStr);
      const type = typeMatch ? typeMatch[1] : "Unknown";
      const enrollmentCountMatch = config.studentCountRegex.exec(sectionStr);
      const enrollmentCount = enrollmentCountMatch ? Number(enrollmentCountMatch[1]) : null;
      return { type, enrollmentCount };
    });
  if (sections.length === 0) return null;
  const type = sections[0].type;
  return sections.filter(s => s.type === type).map(s => s.enrollmentCount).reduce((tot, n) => tot + n);
}

/* Parses which academic quarter the section is for */
function parseQuarter(sectionNode) {
  const title = getTextContent(sectionNode, "h3");
  const match = config.sectionTermRegex.exec(title);
  if (!match) return "Unknown";
  switch (match[1]) {
    case "Autumn": return "Aut";
    case "Winter": return "Win";
    case "Spring": return "Spr";
    case "Summer": return "Sum";
    default: return "Unknown";
  }
}

/* Returns enrollment counts for quarters offered */
function parseSchedule(node, index) {
  const idSelector = `#schedule_${index + 1}`;
  const scheduleNode = node.querySelector(idSelector);
  if (!scheduleNode) return {};
  const sections = Array.from(scheduleNode.querySelectorAll(".sectionContainer"));
  const schedule = {};
  sections.forEach(sectionNode => {
    schedule[`enrollment${parseQuarter(sectionNode)}`] = parseQuarterSections(sectionNode)
  });
  return schedule;
}

//////////// Attribute Parsing ////////////

function parseTerms(str) {
  let terms = null;
  const match = config.termsRegex.exec(str);
  if (match) terms = match[1].split(",").map(t => t.trim());
  return terms;
}

function parseWays(str) {
  const ways = [];
  let match;
  do {
    match = config.waysRegex.exec(str);
    if (match) ways.push(match[1]);
  } while (match);
  return ways;
}

function parseGers(str) {
  const gers = [];
  let match;
  do {
    match = config.gerRegex.exec(str);
    if (match) gers.push(match[1]);
  } while (match);
  return gers;
}

function parseUnits(str) {
  const match = config.unitsRegex.exec(str);
  return match ? match[1].trim() : null;
}

function parseAttributes(node) {
  const attributeStrs = Array.from(node.querySelectorAll(".courseAttributes")).map(n => n.textContent.trim());
  const attributes = { ways: null, gers: null, units: null, terms: null };
  attributeStrs.forEach(str => {
    if (!attributes.units) attributes.units = parseUnits(str) || null;
    if (!attributes.ways) attributes.ways = parseWays(str);
    if (!attributes.gers) attributes.gers = parseGers(str);
    if (!attributes.terms) attributes.terms = parseTerms(str);
  });
  return attributes;
}

//////////// Course Parsing ////////////

/* Removes trailing colon */
function parseFullName(str) {
  return str.substring(0, str.length - 1);
}

/* Removes cross-listed course numbers */
function parseTitle(str) {
  if (str.indexOf("(") === -1) return str;
  return str.substring(0, str.indexOf("(")).trim();
}

/* Removes all new lines */
function parseDescription(str) {
  return str.replace(config.newlineRegex, " ");
}

function parseCourse(node, index) {
  const course = { id: id++ };
  const fullName = parseFullName(getTextContent(node, ".courseNumber"));
  course.dept = fullName.substring(0, fullName.indexOf(" ")).trim();
  course.number = fullName.substring(fullName.indexOf(" ") + 1);
  course.title = parseTitle(getTextContent(node, ".courseTitle"));
  course.description = parseDescription(getTextContent(node, ".courseDescription"));
  Object.assign(course, parseAttributes(node));
  Object.assign(course, parseSchedule(node, index));
  return course;
}

//////////// Scraper Loop ////////////

async function scrape(url) {
  try {
    const html = await (await fetch(url)).text();
    const { document } = new JSDOM(html).window;
    const courses = Array.from(document.querySelectorAll(".courseInfo"));
    return courses.map(parseCourse);
  } catch (err) {
    console.log(`Error while fetching URL ${url}: ${err}`);
    return [];
  }
}

async function getPageCount() {
  try {
    const url = config.urlTemplate.replace("{PAGE_NUMBER}", "0");
    const html = await (await fetch(url)).text();
    const { document } = new JSDOM(html).window;
    return Array.from(document.querySelector("#pagination").querySelectorAll("a")).length;
  } catch (err) {
    console.log(`Error while fetching URL ${url}: ${err}`);
    return 0;
  }
}

function createProgressBar(pageCount) {
  const format = "[{bar}] {percentage}% | ETA: {eta}s | {value}/{total} pages";
  const progressBar = new CliProgress.Bar({ format }, CliProgress.Presets.shades_classic);
  progressBar.start(pageCount, 0);
  return progressBar;
}

async function fetchCourseData() {
  const fetches = [];
  const pageCount = await getPageCount();
  const progressBar = createProgressBar(pageCount);
  for (let i = 0; i < pageCount; i++) {
    const url = config.urlTemplate.replace("{PAGE_NUMBER}", i);
    const pageCourses = await scrape(url);
    progressBar.update(i + 1);
    fetches.push(pageCourses);
  }
  progressBar.stop();
  return fetches;
}

function getHeaders() {
  let headers = ["id", "dept", "number", "title", "description", "units", "ways", "gers", "terms"];
  Object.keys(config.quarters).forEach(q => headers.push(`enrollment${q}`));
  return headers.map(name => {
    return { id: name, title: name};
  });
}

async function writeFile(courseData) {
  const headers = getHeaders();
  const csvWriter = createObjectCsvWriter({
    path: `data/courses_${startYear}_${startYear + 1}.csv`,
    header: headers
  });
  courseData.forEach(c => {
    if (!c.dept || !c.number || !c.title || !c.units) console.log(c);
  });
  await csvWriter.writeRecords(courseData);
  console.log("Done.");
}

(async function() {
  const pagedCourseData = await fetchCourseData();
  const courseData = [];
  pagedCourseData.forEach(page => courseData.push(...page));
  console.log(`Parsed ${courseData.length} courses.`);
  writeFile(courseData);
})();
