import Base64 from "./Base64.es6";

class resultView {

  result(list) {
    const type_color = { "キュート": "#FF55AA", "クール": "#5599EE", "パッション": "#FFBB66" };
    const c10 = d3.scaleOrdinal(d3.schemeCategory10);
    const serverURI = "https://odenpa.com/sgsort/";
    const result = d3.select(".container")
      .append("div")
      .classed("result", true);


    result.append("div")
      .append("h2")
      .text("結果");
    result.append("div")
      .append("hr");

    const table = result.append("div")
      .classed("row", true)
      .append("div")
      .classed("col-xl-6", true)
      .classed("offset-xl-3", true)
      .classed("col-lg-8", true)
      .classed("offset-lg-2", true)
      .classed("col-md-10", true)
      .classed("offset-md-1", true)
      .append("table")
      .classed("table", true);

    const thead_tr = table.append("thead").append("tr");

    const head = [
      { "class": "table-rank", "context": "順位" },
      { "class": "table-name", "context": "名前" },
      { "class": "table-image", "context": "" }
    ];

    thead_tr.selectAll("th")
      .data(head)
      .enter()
      .append("th")
      .text((d) => d.context);

    const tbody_tr = table.append("tbody").selectAll("tr").data(list).enter().append("tr");

    tbody_tr.selectAll("td").data(head).enter().append("td").attr("class", (d) => d.class);

    tbody_tr.select(".table-rank").text((d) => d.model.order + "位");
    tbody_tr.select(".table-image").filter((d) => d.model.order <= 10).append("img").attr("src", (d) => `./img/${d.model.profile.id}.png`).classed("table-img", true);
    tbody_tr.select(".table-name").text((d) => d.model.profile.name);

    //SNS
    let buf = [];
    list.forEach((d) => {
      buf.push(Number(d.model.profile.id));
    });

    //console.log(buf);
    const b64 = Base64.encode(buf);
    const b64_30 = Base64.encode(buf.slice(0, 30));
    // console.log(b64);
    // const nb64 = Base64.decode(b64);
    // console.log(nb64);

    let text = "【デレステキャラソート結果】";
    for (let i = 0; i < list.length; i++) {
      text += `${list[i].model.order}位 ${list[i].model.profile.name} `;
      if (text.length > 50) break;
    }
    let uri = `http://twitter.com/share?url=${serverURI}?${b64}&text=${text}&hashtags=デレステキャラソート`;
    let uri_30 = `http://twitter.com/share?url=${serverURI}?${b64_30}&text=${text}&hashtags=デレステキャラソート`;

    const snsblock = result.append("div")
      .classed("row", true)
      .classed("justify-content-md-center", true);
    const tw_30 = snsblock.append("div")
      .classed("col-lg-5", true)
      .classed("col-md-8", true)
      .append("a")
      .attr("href", uri_30)
      .attr("target", "_blank")
      .classed("btn", true).classed("twitter-share-button", true).classed("btn-block", true)
      .on("click", function () {
        d3.event.preventDefault();
        window.open(encodeURI(decodeURI(this.href)), 'TWwindow', 'width=600, height=500, menubar=no, toolbar=no, scrollbars=yes');
        return false;
      });
    tw_30.append("img").attr("src", "./img/twitter_icon.svg");
    tw_30.append("span").text("結果をツイートする(上位30位)");
    const tw = snsblock.append("div")
      .classed("col-lg-5", true)
      .classed("col-md-8", true)
      .append("a")
      .attr("href", uri)
      .attr("target", "_blank")
      .classed("btn", true).classed("twitter-share-button", true).classed("btn-block", true)
      .on("click", function () {
        d3.event.preventDefault();
        window.open(encodeURI(decodeURI(this.href)), 'TWwindow', 'width=600, height=500, menubar=no, toolbar=no, scrollbars=yes');
        return false;
      });
    tw.append("img").attr("src", "./img/twitter_icon.svg");
    tw.append("span").text("結果をツイートする(全て)");

    //リンク

    result.append("div")
      .classed("row", true)
      .classed("justify-content-md-center", true)
      .classed("row", true)
      .append("div")
      .classed("col-lg-6", true)
      .classed("col-md-10", true)
      .classed("mt-3", true)
      .append("h2")
      .append("a")
      .attr("class", "btn btn-block btn-success btn-lg")
      .attr("href", serverURI)
      .text("最初からキャラソートを始める");

    //グラフ表示始め
    result.append("div")
      .classed("mt-3", true)
      .append("h2")
      .text("結果のグラフ")
      .append("hr");


    const ChartSelectGroup = result.append("div")
      .classed("row", true)
      .append("div")
      .classed("btn-group", true)
      .attr("id", "ChartSelect")
      .attr("data-toggle", "buttons");
    const label_all = ChartSelectGroup
      .append("button")
      .attr("class", "btn chart-select-button btn-outline-info")
      .attr("value", "all");
    label_all.append("span").text("全て");
    const label_30 = ChartSelectGroup
      .append("button")
      .attr("class", "btn chart-select-button btn-outline-info active")
      .attr("value", "30");
    label_30.append("span").text("TOP30");
    const label_20 = ChartSelectGroup
      .append("button")
      .attr("class", "btn chart-select-button btn-outline-info")
      .attr("value", "20");
    label_20.append("span").text("TOP20");
    const label_10 = ChartSelectGroup
      .append("button")
      .attr("class", "btn chart-select-button btn-outline-info")
      .attr("value", "10");
    label_10.append("span").text("TOP10");

    ChartSelectGroup.selectAll("button").on("click", function () {
      d3.select("#ChartSelect").select(".active").classed("active", false);
      const selectedValue = d3.select(this).attr('value');

      let chartLiest = list;

      if (Number(selectedValue)) {
        chartLiest = chartList.slice(0, Number(selectedValue));
      }
      pieDataChange(chartLiest);
      plotDataChange(chartLiest);
      resultUpdate(true);
    });

    //図表
    const chartList = list.slice(0, 30);

    const pie = d3.pie()
      .sort(null)
      .value((d) => d.values.length);

    piechart(chartList);

    //身長・年齢チャート
    const plotlist = [].concat(chartList);
    (d3.nest()
      .key((d) => d.model.profile.age_num)
      .key((d) => d.model.profile.height_num)
      .entries(plotlist))
      .forEach((d) => {
        d.values.forEach((d) => {
          if (d.values.length > 1) {
            for (let i = 0; i < d.values.length; i++) {
              d.values[i].model["dupl_count"] = d.values.length;
              d.values[i].model["dupl_index"] = i;
            }
          }
        });
      });

    const plotDiv = result.append("div")
      .classed("row", true);

    const svgplot = plotDiv.append("div")
      .classed("col-lg-10", true)
      .classed("offset-lg-1", true)
      .append("svg").attr("id", "PlotChart")
      .append("g");


    let x_plot = d3.scaleLinear()
      .domain([d3.min(plotlist, (d) => d.model.profile.age_num) - 1, d3.max(plotlist, (d) => d.model.profile.age_num) + 1]);

    let y_plot = d3.scaleLinear()
      .domain([d3.min(plotlist, (d) => d.model.profile.height_num) - 1, d3.max(plotlist, (d) => d.model.profile.height_num) + 1]);
    svgplot.append('g')
      .attr('class', 'x axis');

    svgplot.append('g')
      .attr('class', 'y axis');
    svgplot
      .append("g").classed("circle_g", true).selectAll("circle")
      .data(plotlist)
      .enter()
      .append("circle");

    const tooltip_g = svgplot.append("g")
      .attr("id", "tooltip")
      .style("opacity", 0);
    const tooltip_rect = tooltip_g.append("rect")
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("width", "120")
      .attr("height", "60");
    const tooltip_text_name = tooltip_g.append("text")
      .attr("dx", ".35em")
      .attr("dy", "1.35em")
      .style("fill", "white");
    const tooltip_text_age = tooltip_g.append("text")
      .attr("dx", ".35em")
      .attr("dy", "2.5em")
      .style("fill", "white");
    const tooltip_text_height = tooltip_g.append("text")
      .attr("dx", ".35em")
      .attr("dy", "3.75em")
      .style("fill", "white");

    resultUpdate();
    const win = d3.select(window);
    win.on("resize", resultUpdate);

    function resultUpdate(flag) {
      pieUpdate(flag);
      plotUpdate(flag);
    }

    function plotUpdate() {
      const svg = d3.select("#PlotChart");
      const size = parseInt(svg.style("width"));
      const margin = {
        left: 45,
        right: 45,
        top: 65,
        bottom: 50
      };
      var width = size - margin.left - margin.right;
      var height = (size * 0.75) - margin.top - margin.bottom;

      svg.attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

      const svgplot = svg.select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      let xScale = x_plot.range([0, width]);
      let yScale = y_plot.range([height, 0]);

      let xAxis = d3.axisBottom()
        .scale(xScale)
        .tickSize(-height)
        .ticks(Math.ceil(size / 100) > chartList.length ? chartList.length : Math.ceil(size / 100))
        .tickFormat((d) => `${d} 歳`);

      let yAxis = d3.axisLeft()
        .scale(yScale)
        .tickSize(-width)
        .tickFormat((d) => `${d} cm`);

      svgplot.select(".x")
        .attr('transform', 'translate( 0, ' + height + ')')
        .call(xAxis);

      svgplot.select(".y")
        .call(yAxis);

      svgplot.selectAll("circle")
        .attr("r", size / 80)
        .attr("fill", (d) => type_color[d.model.profile.type])
        .attr("cx", function (d) {
          if (d.model.dupl_count) {
            const r = d3.select(this).attr("r");
            return xScale(d.model.profile.age_num) - ((d.model.dupl_count - 1) * r) + (d.model.dupl_index * 2 * r);
          }
          return xScale(d.model.profile.age_num);
        })
        .attr("cy", (d) => yScale(d.model.profile.height_num))
        .on("mouseover", function (d) {
          tooltip_g
            .transition()
            .duration(200)
            .style("opacity", .9);
          tooltip_rect
            .transition()
            .duration(200)
            .attr("x", d3.select(this).attr("cx") - 60)
            .attr("y", d3.select(this).attr("cy") - 70)
            .attr("fill", type_color[d.model.profile.type]);
          tooltip_text_name
            .transition()
            .duration(200)
            .attr("x", d3.select(this).attr("cx") - 60)
            .attr("y", d3.select(this).attr("cy") - 70)
            .text(d.model.profile.name);
          tooltip_text_age
            .transition()
            .duration(200)
            .attr("x", d3.select(this).attr("cx") - 60)
            .attr("y", d3.select(this).attr("cy") - 70)
            .text(d.model.profile.age);
          tooltip_text_height
            .transition()
            .duration(200)
            .attr("x", d3.select(this).attr("cx") - 60)
            .attr("y", d3.select(this).attr("cy") - 70)
            .text(d.model.profile.height_num + "cm");

        })
        .on("mouseout", function () {
          tooltip_g.transition()
            .duration(300)
            .style("opacity", 0);
        });

    }

    function piechart(list) {
      const listType = d3.nest()
        .key((d) => d.model.profile.type)
        .entries(list);

      const listBloodtype = d3.nest()
        .key((d) => d.model.profile.bloodtype)
        .entries(list);

      const result = d3.select(".result");

      const row = result.append("div")
        .classed("mt-3", true)
        .classed("row", true)
        .classed("justify-content-md-center", true);

      const svgType = row
        .append("div")
        .classed("col-lg-6", true)
        .classed("col-md-8", true)
        .append("svg").attr("id", "TypeChart").attr("class", "PieChart");

      const gType = svgType.selectAll(".arc")
        .data(pie(listType))
        .enter()
        .append("g")
        .attr("class", "arc");

      gType.append("path")
        .attr("stroke", "white")
        .style("fill", (d) => type_color[d.data.key])
        .each(function (d) { this._current = d; });

      gType.append("text")
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .style("fill", "white")
        .text((d) => `${d.data.key} : ${d.data.values.length}人`);

      const svgBloodtype = row
        .append("div")
        .classed("col-lg-6", true)
        .classed("col-md-8", true)
        .append("svg").attr("id", "BloodtypeChart").attr("class", "PieChart");

      const gBloodtype = svgBloodtype.selectAll(".arc")
        .data(pie(listBloodtype))
        .enter()
        .append("g")
        .attr("class", "arc");

      gBloodtype.append("path")
        .attr("stroke", "white")
        .style("fill", (d, i) => c10(i))
        .each(function (d) { this._current = d; });

      gBloodtype.append("text")
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .style("fill", "white")
        .text((d) => `${d.data.key} : ${d.data.values.length}人`);
    }

    function pieUpdate(animation) {
      const svg = d3.selectAll(".PieChart");
      const piesize = parseInt(svg.style("width"));

      const arc = d3.arc()
        .innerRadius(piesize / 10);

      arc.outerRadius(piesize / 2);

      svg.attr("width", piesize).attr("height", piesize);


      const g = svg.selectAll(".arc").attr("transform", "translate(" + (piesize / 2) + "," + (piesize / 2) + ")");

      g.selectAll("text")
        .attr("font-size", piesize / 25);

      if (animation) {
        g.selectAll("path")
          .transition()
          .duration(1000)
          .attrTween("d", function (d) {
            var interpolate = d3.interpolate(
              this._current,
              d
            );
            this._current = interpolate(0);
            return function (t) {
              return arc(interpolate(t));
            };
          });
      } else {
        g.selectAll("path").attr("d", arc);
      }

      if (animation) {
        g.selectAll("text")
          .transition()
          .duration(1000)
          .attr("transform", function (d) { return "translate(" + arc.centroid(d) + ")"; });
      }
      else {
        g.selectAll("text").attr("transform", function (d) { return "translate(" + arc.centroid(d) + ")"; });
      }
    }

    function pieDataChange(list) {
      const svgType = d3.select("#TypeChart");
      const listType = d3.nest()
        .key((d) => d.model.profile.type)
        .entries(list);

      const arcType = svgType.selectAll(".arc")
        .data(pie(listType));

      arcType.exit().remove();

      const gType = arcType.enter()
        .append("g")
        .attr("class", "arc");

      gType.append("path")
        .attr("stroke", "white");

      gType.append("text")
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .style("fill", "white");

      gType.merge(arcType).select("path").style("fill", (d) => type_color[d.data.key]);
      gType.merge(arcType).select("text").text((d) => `${d.data.key} : ${d.data.values.length}人`);


      const svgBloodtype = d3.select("#BloodtypeChart");
      const listBloodtype = d3.nest()
        .key((d) => d.model.profile.bloodtype)
        .entries(list);
      const arcBloodtype = svgBloodtype.selectAll(".arc")
        .data(pie(listBloodtype));

      arcBloodtype.exit().remove();

      const gBloodtype = arcBloodtype.enter()
        .append("g")
        .attr("class", "arc");

      gBloodtype.append("path")
        .attr("stroke", "white");

      gBloodtype.append("text")
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .style("fill", "white");

      gBloodtype.merge(arcBloodtype).select("path").style("fill", (d, i) => c10(i));
      gBloodtype.merge(arcBloodtype).select("text").text((d) => `${d.data.key} : ${d.data.values.length}人`);
    }

    function plotDataChange(list) {
      const plotlist = [].concat(list);
      (d3.nest()
        .key((d) => d.model.profile.age_num)
        .key((d) => d.model.profile.height_num)
        .entries(plotlist))
        .forEach((d) => {
          d.values.forEach((d) => {
            if (d.values.length > 1) {
              for (let i = 0; i < d.values.length; i++) {
                d.values[i].model["dupl_count"] = d.values.length;
                d.values[i].model["dupl_index"] = i;
              }
            }
          });
        });

      const svgplot = d3.select("#PlotChart").select(".circle_g");

      x_plot = d3.scaleLinear()
        .domain([d3.min(plotlist, (d) => d.model.profile.age_num) - 1, d3.max(plotlist, (d) => d.model.profile.age_num) + 1]);

      y_plot = d3.scaleLinear()
        .domain([d3.min(plotlist, (d) => d.model.profile.height_num) - 1, d3.max(plotlist, (d) => d.model.profile.height_num) + 1]);

      const circle = svgplot.selectAll("circle")
        .data(plotlist);

      circle.exit().remove();

      circle.enter().append("circle");
    }
  }
}

export default resultView;