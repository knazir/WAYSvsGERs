enterView({
  selector: ".flexibility .text .step",
  offset: 0.5,
  enter: el => {
    const index = Number(d3.select(el).attr('data-index'));
    console.log("Enter", el, index);
  },
  exit: el => {
    let index = Number(d3.select(el).attr('data-index'));
    index = Math.max(0, index - 1);
    console.log("Exit", el, index);
  }
});