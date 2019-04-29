//This makes a D3 chart that can zoom in and select a period of time
function TimeChart(chartOptions, datePickerElem) {
  var margin = {
      top: 8,
      right: 0,
      bottom: 12,
      left: 0
    },
    height = chartOptions.height - margin.top - margin.bottom,
    width = chartOptions.width - margin.right - margin.left,
    datePicker = datePickerElem;
    dateFormat = chartOptions.format;

  // all the d3 components
  var x, y, x0, y0, xAxis, yAxis, line, valueline, brush,
    idleTimeout, idleDelay,
    rawData;

  var svg = d3.select(chartOptions.container)
    .append("svg:svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);
  svg.append("g")
    .attr('clip-path', 'url(#clipper)')
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  var bg = svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height);

  // Helper functions //

  //Figures out what user selected
  function brushended() {
    var s = d3.event.selection;
    if (s) {
      x.domain(s.map(x.invert, x));
      svg.select(".brush").call(brush.move, null);
      var start = moment.utc(x.domain()[0]);
      var end = moment.utc(x.domain()[1]);

      datePicker.setStartDate(start);
      datePicker.setEndDate(end);
      getTotal(start, end);

    } else {
      if (!idleTimeout) {
        return idleTimeout = setTimeout(idled, idleDelay);
      }
      x.domain(x0);
      y.domain(y0);
    }
    zoom();
  }

  //zoom the chart in
  function zoom() {
    xAxis.transition().call(d3.axisBottom(x));
    yAxis.transition().call(d3.axisLeft(y));
    line.transition().attr("d", valueline);
  }

  function idled() {
    idleTimeout = null;
  }

  function getTotal(start, end) {
    var total = 0;
    var firstMeas = moment.utc(start);
    if (start && end) {
      if (start == end) {

        total = rawData[firstMeas.format(dateFormat)] ? rawData[firstMeas.format(dateFormat)] : 0;
      } else {
        // just < because dates start at end of day?
        for (var d = firstMeas; d <= moment.utc(end); d.add(1, 'days')) {
          dString = d.format(dateFormat);
          hours = rawData[dString] ? rawData[dString] : 0;
          total += hours;
        }
      }
    }
    return total;
  }

  function addData(data) {
    rawData = data;
    var chartData = [],
      today = moment.utc(),
      firstMeas = moment.utc(Object.keys(rawData)[0]);
    for (var d = firstMeas; d <= today; d.add(1, "days")) {
      dString = d.format(dateFormat);
      hours = rawData[dString] ? rawData[dString] : 0;
      chartData.push({
        "date": moment.utc(d),
        "count": hours
      });
    }

    // Scale the range of the data    
    x0 = d3.extent(chartData, function (d) {
      return d.date.toDate();
    });

    y0 = [0, d3.max(chartData, function (d) {
      return d.count;
    })];

    x = d3.scaleUtc().domain(x0).range([0, width]);

    y = d3.scaleLinear().domain(y0).range([height, 0]);

    // define the line
    valueline = d3.line()
      .x(function (d) {
        return x(d.date);
      })
      .y(function (d) {
        return y(d.count);
      });
    brush = d3.brushX()
      .extent([
        [0, 0],
        [width, height]
      ])
      .on("end", brushended)
      .handleSize(height);

    idleDelay = 350;

    line = svg.append("path")
      .data([chartData])
      .attr("class", "line")
      .attr("d", valueline);
    svg.append("g")
      .attr("class", "brush")
      .call(brush);

    // Add the X Axis
    xAxis = svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));
    // // Add the Y Axis
    yAxis = svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y));
    //do stuff with data
  }

  function updateBounds(start, end) {
    getTotal(start, end);
    svg.select(".brush").call(brush.move, null);
    if (start == end) {
      end = moment.utc(start).add(1, "day").format(dateFormat);
    }
    x.domain([moment.utc(start), moment.utc(end)]);
    zoom();
  }

  function reset() {
    x.domain(x0);
    y.domain(y0);
    zoom();
  }

  function resize(innerWidth) {
    width = innerWidth - margin.right - margin.left;

    //update x and y scales to new dimensions
    x.range([0, width]);
    y.range([height, 0]);

    //update svg elements to new dimensions
    svg
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom);

    bg
      .attr('width', width)
      .attr('height', height);

    brush = d3.brushX()
      .extent([
        [0, 0],
        [width, height]
      ])
      .on("end", brushended)
      .handleSize(height);

    zoom();
  }

  return {
    addData: addData,
    //change start and end of chart
    updateBounds: updateBounds,
    //zoom chart out to full view
    reset: reset,
    getTotal: getTotal,
    resize: resize
  };
}