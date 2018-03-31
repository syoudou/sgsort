//import * as d3 from 'd3';
import production from "./production.es6";
import idoldata from "./data.json";
import ResultView from "./resultView.es6";
import Base64 from "./Base64.es6";

const myproduction = new production(idoldata);
const resultView = new ResultView();
let orderList = [];
let idolList = {};
const preloadImage = new Array(183);

function finalizeTheater() {
  d3.select(".theater")
    .remove();
  resultView.result(myproduction.getStandings());
}

function initTheater() {
  const theater = d3.select(".container")
    .append("div")
    .classed("theater", true);

  const memo = theater.append("div").append("p");
  memo.append("span").text("上位から順番に選択してください");
  memo.append("br");
  memo.append("span").text("リタイアすると次から表示されません");
  theater.append("div")
    .classed("card-deck", true)
    .classed("stage", true);

  theater.append("div").classed("progress", true).attr("id", "sortProgress")
    .append("div").classed("progress-bar", true)
    .attr("role", "progressbar")
    .style("width", "0%")
    .attr("aria-valuenow", 0)
    .attr("aria-valuemin", 0)
    .attr("aria-valuemax", 100)
    .text("0%");

  const fixOrderModal = theater.append("div")
    .attr("class", "modal fade")
    .attr("id", "FixOrderModal")
    .attr("tabindex", -1)
    .attr("role", "dialog")
    .attr("aria-labelledby", "FixOrderModalLabel")
    .attr("aria-hidden", "true")
    .append("div")
    .classed("modal-dialog", true)
    .attr("role", "document")
    .append("div")
    .classed("modal-content", true);

  const foModalHeader = fixOrderModal
    .append("div")
    .classed("modal-header", true);
  foModalHeader
    .append("h5")
    .classed("modal-title", true)
    .attr("id", "FixOrderModalLabel")
    .text("確認");
  foModalHeader
    .append("button")
    .attr("type", "button")
    .classed("close", true)
    .attr("data-dismiss", "modal")
    .attr("aria-label", "Close")
    .append("span")
    .attr("aria-hidden", "true")
    .text("\u00D7");

  fixOrderModal
    .append("div")
    .classed("modal-body", true)
    .append("p")
    .attr("id", "FixOrderText")
    .text("まだ順位が確定してません");

  const foModalFooter = fixOrderModal
    .append("div")
    .classed("modal-footer", true);

  foModalFooter
    .append("button")
    .attr("class", "btn btn-secondary")
    .attr("data-dismiss", "modal")
    .text("キャラソートに戻る");

  foModalFooter
    .append("button")
    .attr("class", "btn btn-primary")
    .attr("data-dismiss", "modal")
    .text("順位を確定する")
    .on("click", () => {
      finalizeTheater();
    });

  theater.append("div")
    .classed("mt-3", true)
    .classed("row", true)
    .classed("justify-content-md-center", true)
    .append("div")
    .classed("col-md-6", true)
    .classed("col-sm-12", true)
    .append("button")
    .classed("btn", true).classed("btn-primary", true).classed("btn-lg", true).classed("btn-block", true)
    .attr("disabled", "")
    .attr("id", "nextStage")
    .text("次へ")
    .on("click", () => {
      orderList = [];
      myproduction.setdata(idolList);
      updateProgress(myproduction.getScore());
      idolList = myproduction.getdata();
      preload(myproduction.getSleevesOfStageIdolsNo());
      updateFixOrder();
      if (idolList.length == 0) {
        finalizeTheater();
      } else {
        update(idolList);
      }
    });

  const otherButtonRow = theater.append("div")
    .classed("mt-3", true)
    .classed("row", true)
    .classed("justify-content-md-center", true);

  otherButtonRow
    .append("div")
    .classed("col-md-4", true)
    .classed("col-sm-6", true)
    .append("button")
    .attr("class", "btn btn-secondary btn-block theaterOtherButton")
    .text("選択を解除する")
    .on("click", () => {
      idolList.forEach((d) => {
        d.model.select = "none";
      });
      orderList = [];
      orderChange(idolList);
    });

  otherButtonRow
    .append("div")
    .classed("col-md-4", true)
    .classed("col-sm-6", true)
    .append("button")
    .attr("class", "btn btn-success btn-block theaterOtherButton")
    .attr("data-toggle", "modal")
    .attr("data-target", "#FixOrderModal")
    .attr("id", "decision")
    .text("順位を確定する");

  otherButtonRow
    .append("div")
    .classed("col-md-4", true)
    .classed("col-sm-6", true)
    .append("button")
    .attr("class", "btn btn-warning btn-block theaterOtherButton")
    .text("未選択をリタイアにする")
    .on("click", () => {
      idolList.forEach((d) => {
        if (d.model.select === "none") {
          d.model.select = "drop";
        }
      });
      orderChange(idolList);
    });
}

function updateFixOrder() {
  const fixOrder = myproduction.getFixOrderCount();
  let text = "まだ順位が確定してません";
  if (fixOrder > 0) text = `${fixOrder}位までの順位を確定します。`;
  d3.select("#FixOrderText").text(text);
}

function cardClick(d) {
  if (d.model.select === "none" || d.model.select === "drop") {
    d.model.select = "order";
    orderList.push(d.model.profile.name);
  } else if (d.model.select === "order") {
    const index = orderList.indexOf(d.model.profile.name);
    const selectIdol = orderList.splice(index, 1)[0];
    const insertIndex = index == 0 ? 1 : index - 1;
    orderList.splice(insertIndex, 0, selectIdol);
  }
  orderChange(idolList);
}

function updateOrder(d) {
  if (d.model.select === "none") {
    return "未選択";
  } else if (d.model.select === "order") {
    d.model.order = orderList.indexOf(d.model.profile.name) + 1;
    return `${d.model.order}位`;
  } else if (d.model.select === "drop") {
    return "リタイア";
  }
}

function update(list) {
  const deck = d3.select(".stage").selectAll(".card").data(list);

  deck.exit().remove();

  const card = deck.enter().append("div").classed("card", true).classed("text-center", true)
    .on("click", cardClick)
    .on("mouseover", function () {
      d3.select(this)
        .classed("card-outline-info", true);
    })
    .on("mouseout", function () {
      d3.select(this)
        .classed("card-outline-info", false);
    });

  card.append("div").classed("card-header", true).attr("id", "order");
  const img_warpper = card.append("div").classed("img-wrapper", true);
  const top = img_warpper.append("img")
    .classed("card-img-top", true);
  const cardblock = card.append("div").classed("card-block", true);
  const name = cardblock.append("p").attr("id", "name");

  top.merge(deck.select('img'))
    .attr("src", '');
  top.merge(deck.select('img'))
    .attr("src", (d) => `./img/${d.model.profile.id}.png`);

  name.merge(deck.select('#name')).text((d) => d.model.profile.name);

  orderChange(list);
}

function updateProgress(score) {
  const percent = Math.floor(score.value / score.max * 10000) / 100;
  d3.select("#sortProgress .progress-bar")
    .style("width", `${percent}%`)
    .attr("aria-valuenow", percent)
    .text(`${percent}(${score.value}/${score.max})`);
}

function preload(list) {
  list.forEach((id) => {
    if (preloadImage[id - 1] == null) {
      preloadImage[id - 1] = $("<img>").attr("src", `./img/${id}.png`);
    }
  });
}

function orderChange(list) {
  const deck = d3.select(".stage").selectAll(".card").data(list);
  deck.select('#order').text(updateOrder)
    .classed("order-1", (d) => {
      return d.model.select === "order" && d.model.order === 1;
    }).classed("order-2", (d) => {
      return d.model.select === "order" && d.model.order === 2;
    }).classed("order-3", (d) => {
      return d.model.select === "order" && d.model.order === 3;
    }).classed("order-retire", (d) => {
      return d.model.select === "drop";
    }).classed("order-unselected", (d) => {
      return d.model.select === "none";
    });
  let nextEnable = true;
  idolList.forEach((d) => {
    if (d.model.select === "none") {
      nextEnable = false;
    }
  });
  if (nextEnable) {
    d3.select("#nextStage").attr("disabled", null);
  } else {
    d3.select("#nextStage").attr("disabled", "");
  }
}

function paramToIdols(param) {
  const buf = Base64.decode(param);
  const ret = myproduction.bufToIdoles(buf);
  return ret;
}

function init() {
  const list = paramToIdols(document.location.search.substring(1));
  if (list.length !== 0) {
    resultView.result(list);
  } else {
    preload(myproduction.getSleevesOfStageIdolsNo());
    idolList = myproduction.getdata();
    initTheater();
    update(idolList);
    preload(myproduction.getSleevesOfStageIdolsNo());
  }
}

init();