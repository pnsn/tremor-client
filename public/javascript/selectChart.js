//This makes a D3 chart that can zoom in and select a period of time
function TimeChart(chartOptions, minDate) {
  var margin = {
      top: 8,
      right: 0,
      bottom: 12,
      left: 14
    },
    height = chartOptions.height - margin.top - margin.bottom,
    width = chartOptions.width - margin.right - margin.left,
    datePicker;
    
    
    minimumDate = minDate;
    dateFormat = chartOptions.format;

  var chartData;
  // all the d3 components
  var x, y, x0, y0, xAxis, yAxis, line, valueline, brush,
    idleTimeout, idleDelay,
    rawData;

  var svg = d3.select(chartOptions.container)
    .append("svg:svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);
  svg.append('defs')
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height);
  svg.append("g")
    .attr('clip-path', 'url(#clip)')
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  var bg = svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .attr("transform", "translate(" + margin.left  + ")");

    brush = d3.brushX()
    .extent([
      [0, 0],
      [width, height]
    ])
    .on("end", brushended)
    .handleSize(height);

    svg.append("g")
    .attr("class", "brush")
    .call(brush)
    .attr("transform", "translate(" + margin.left  + ")");

    
  svg.append("text")
    .attr("class", "y-axis-text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Counts");   


    // define the line
    valueline = d3.line()
      .x(function (d) {
        return x(d.date);
      })
      .y(function (d) {
        return y(d.count);
      });

  // Helper functions //

  //Figures out what user selected
  function brushended() {
    var s = d3.event.selection;
    if (s) {
      $("#submit").removeClass("inactive");

      x.domain(s.map(x.invert, x));
      svg.select(".brush").call(brush.move, null);
      var start = moment.utc(x.domain()[0]);
      var end = moment.utc(x.domain()[1]);
      datePicker.setStartDate(start);
      datePicker.setEndDate(end);
      getTotal({"start": start, "end":end});

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
    chartData = processData(data);

    // Scale the range of the data    
    x0 = d3.extent(chartData, function (d) {
      return d.date.toDate();
    });

    y0 = [0, d3.max(chartData, function (d) {
      return d.count;
    })];

    x = d3.scaleUtc().domain(x0).range([0, width]);

    y = d3.scaleLinear().domain(y0).range([height, 0]);

    idleDelay = 350;

    line = svg.append("path")
      .data([chartData])
      .attr("class", "line")
      .attr("d", valueline)
      .attr("transform", "translate(" + margin.left  + ")");

            // Add the X Axis
      xAxis = svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(" + margin.left  + "," + height + ")")
      .call(d3.axisBottom(x));
    // // Add the Y Axis
    yAxis = svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y))
      .attr("transform", "translate(" + margin.left +")");

    //do stuff with data
  }

  function processData(data) {
    rawData = data;

    var processedData = [],
    today = moment.utc(),
    firstMeas = moment.utc(minimumDate);
    for (var d = firstMeas; d <= today; d.add(1, "days")) {
      dString = d.format(dateFormat);
      hours = rawData[dString] ? rawData[dString] : 0;
      processedData.push({
        "date": moment.utc(d),
        "count": hours
      });
    }
    return processedData;
  }

  function updateData(data) {
    chartData = processData(data);

    // Select the section we want to apply our changes to
    var svg = d3.select("body").transition();


    line.data([chartData]);
    // Make the changes
    svg.select(".line")   // change the line
        .attr("d", valueline)
        .duration(750);

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

    svg.select(".brush").call(brush);
    
    svg.select('#clip rect')
      .attr('width', width)
      .attr('height', height);

    zoom();
  }

  return {
    addData: addData,
    updateData: updateData,
    //change start and end of chart
    updateBounds: updateBounds,
    //zoom chart out to full view
    reset: reset,
    getTotal: getTotal,
    resize: resize,
    setDatepicker: function(dElem){
      datePicker = dElem;
    }
  };
}