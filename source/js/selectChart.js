//** Makes a D3 chart that can zoom in and select a period of time */
//** Takes in config options and a minimum selectable date */
//** Can (optionally) integrate with a datepicker or other external date UI */
function TimeChart(config, minDate) {
  //** Instantiate some variables */

  var datePicker, chartData, rawData,
    svg, bg, x, y, x0, y0, xAxis, yAxis, line, valueline, brush,
    idleTimeout, mouseG, brushG, mouse, vertLine, countText, ticks,
    margin = { // Space for chart elements in chart container
      top: 8,
      right: 0,
      bottom: 12,
      left: 14
    },
    height = config.height - margin.top - margin.bottom,
    width = config.width - margin.right - margin.left,
    idleDelay = 350, // time to wait between clicks
    minimumDate = minDate, // lowest selectable date
    dateFormat = config.format, // format to display
    d3Format = d3.utcFormat(config.d3Format); // d3 format to display
    d3Parse = d3.utcParse(config.d3Format); // d3 parse format

  //** D3 Elements*/

  // Actual chart
  svg = d3.select(config.container)
    .append("svg:svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  // Clipping to prevent line going outside box
  svg.append('defs')
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', height);

  // Actual clip
  svg.append("g")
    .attr('clip-path', 'url(#clip)')
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Background rectangle
  bg = svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .attr("transform", "translate(" + margin.left + ")");

  // Y-axis label
  svg.append("text")
    .attr("class", "y-axis-text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Counts");

  // D3 brush for selecting
  brush = d3.brushX()
    .extent([
      [0, 0],
      [width, height]
    ])
    .on("brush", brushing)
    .on("end", brushended)
    .handleSize(height);

  // Brush element
  brushG = svg.append("g")
    .attr("class", "brush")
    .call(brush)
    .attr("transform", "translate(" + margin.left + ")");

  // Mouse over elements
  mouseG = svg.append("g")
    .attr("class", "mouse-over-effects");

  // Vertical line for mouseover
  vertLine = mouseG.append("path")
    .attr("class", "mouse-line")
    .attr("pointer-events", "none");

  // Text to indicate tremor count
  countText = mouseG.append("text")
    .attr("transform", "translate(20,15)");

  // Define the line
  valueline = d3.line()
    .x(function (d) {
      return x(d.date);
    })
    .y(function (d) {
      return y(d.count);
    });

  //** Helper functions */

  // Shows total counts in selected range
  function brushing() {
    var s = d3.event.selection;
    if (s) {
      var values = s.map(x.invert, x);
      var start = d3Format(values[0]);
      var end = d3Format(values[1]);
      var str = start + " - " + end + " : " + getTotal(start, end);

      countText.text(str);
    }
  }

  // Functions for brush & mouse move
  brushG.select("rect")
    // Hide line and text when mouse out of svg
    .on('mouseout', function () {
      vertLine.style("opacity", "0");
      countText.style("opacity", "0");
    })
    // Show line and text when mouse in svg
    .on('mouseover', function () {
      vertLine
        .style("opacity", "1");
      countText
        .style("opacity", "1");
    })
    // As mouse moves over canvas, update text value and line position
    .on('mousemove', function () {
      mouse = d3.mouse(this);
      var offset = mouse[0] + margin.left;

      // reposition line
      vertLine.attr("d", function () {
        var d = "M" + offset + "," + height;
        d += " " + offset + "," + 0;
        return d;
      });

      // get count for date at mouse position
      if (x) {
        var xDate = d3Format(x.invert(mouse[0]));
        var str = xDate + " : " + (rawData[xDate] ? rawData[xDate] : 0);
        countText.text(str);
      }
    });

  // Helps keep track of mouse state
  var justBrushed = false;
  var doubleClicked;

  // Figures out what user selected after brush/click events
  function brushended() {
    var s = d3.event.selection;

    // if there is a selection (brush)
    if (s) {

      $("#submit").removeClass("inactive");

      idleTimeout = null;

      svg.select(".brush").call(brush.move, null);

      var range = s.map(x.invert, x);

      var start = moment.utc(range[0]);
      var end = moment.utc(range[1]);

      // Prevent accidental selection
      justBrushed = true;
      setTimeout(function () {
        justBrushed = false;
      }, idleDelay);

      // Hide the vertical line
      vertLine.style("opacity", "0");

      // Prevent zooming in too far
      if(end.diff(start, "hours") < 24 ){
        start = start.startOf('day');
        end = end.endOf('day');
      }

      x.domain([start,end]);
      changeUIDates(start, end);
      zoom();

    } else { //double click or single click (no brush)

      doubleClicked = false;

      // Counted as double click if another click happens within
      // idleDelay seconds
      if (!idleTimeout) {
        idleTimeout = setTimeout(idled, idleDelay);
        return;
      }

      doubleClicked = true;

      // Zoom out
      reset();

      justBrushed = false;
    }
  }

  // Zoom the chart to specified range
  // Transitions the line
  function zoom() {
    //set up max zoom here


    xAxis.transition().call(d3.axisBottom(x).ticks(ticks));
    yAxis.transition().call(d3.axisLeft(y));

    line.transition().attr("d", valueline);
  }

  // If no second click and brush didn't just end
  // Treat as single click
  function idled() {
    idleTimeout = null;

    if (x && mouse && !doubleClicked && !justBrushed) {
      var xDate = d3Format(x.invert(mouse[0]));
      xDate = moment.utc(xDate)
      changeUIDates(xDate, xDate);
    }
  }

  // Sums day totals between given start and end  (inclusive)
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

  // Returns number of ticks for chart
  function getTicks(width) {
    return width / 65 < 10 ? 5 : 10;
  }

  // Adds data to the chart and populates remaining D3 elements
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
    y = d3.scaleLinear().domain(y0).range([height, 1]);

    ticks = getTicks(width);

    line = svg.append("path")
      .data([chartData])
      .attr("class", "line")
      .attr("d", valueline)
      .attr("pointer-events", "none")
      .attr("transform", "translate(" + margin.left + ")");

    // Add the X Axis
    xAxis = svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(" + margin.left + "," + height + ")")
      .call(d3.axisBottom(x).ticks(ticks));

    // Add the Y Axis
    yAxis = svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y))
      .attr("transform", "translate(" + margin.left + ")");
  }

  // Turns raw json into D3 acceptable format
  function processData(data) {
    rawData = data;

    var processedData = [],
      today = moment.utc(),
      firstMeas = moment.utc(minimumDate);

    // Goes through data and populates missing days with 0
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

  // Replace old data on chart with new data
  function updateData(data) {
    chartData = processData(data);

    var svg = d3.select("body").transition();

    line.data([chartData]);

    svg.select(".line") // change the line
      .attr("d", valueline)
      .duration(750);
  }

  // Changes start and end of chart to given start and end dates
  function updateBounds(start, end) {
    // Add a day if start and end are the same 
    if (start == end) {
      end = moment.utc(start).add(1, "day").format(dateFormat);
    }
    x.domain([moment.utc(start), moment.utc(end)]);
    zoom();
  }

  // Return chart to default position
  function reset() {
    x.domain(x0);
    y.domain(y0);
    zoom();
  }

  // Adjust chart sizing when chart size changed
  function resize(innerWidth) {
    width = innerWidth - margin.right - margin.left;

    //update x and y scales to new dimensions
    x.range([0, width]);
    y.range([height, 0]);

    ticks = getTicks(width);

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

  // Changes dates datepicker or other UI
  function changeUIDates(start, end) {
    $(config.container).trigger('dateChanged', {"start": start, "end":end});
  }

  //** Methods available for external use */

  return {
    addData: addData,
    updateData: updateData,
    updateBounds: updateBounds,
    reset: reset,
    getTotal: getTotal,
    resize: resize
  };
}