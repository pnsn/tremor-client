//This makes a D3 chart that can zoom in and select a period of time

var TimeChart = (function() {
  var formatTime = d3.utcFormat("%Y-%m-%d");
  var parseTime = d3.utcParse("%Y-%m-%d");
  //Sizes - keep out here for potential resizing?
  var margin, height, width;
  // set the ranges
  var x, y;
  var valueline, brush, svg;
  // Add the valueline path.
  var line;
  var x0, y0, xAxis, yAxis;
  // svg.append("path")
  //     .data([data])
  //     .attr("class", "area")
  //     .attr("d", area);
  var idleTimeout, idleDelay;

  var startSelect, endSelect;

  var drawLimit;

  var rawData;
  //Figures out what user selected
  function brushended() {
    var s = d3.event.selection;
    if (s) {
      x.domain(s.map(x.invert, x));
      svg.select(".brush").call(brush.move, null);
      var start = x.domain()[0];
      var end = x.domain()[1];
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

  // Add data to the chart
  function putDataInChart(data) {
    // Scale the range of the data
    x0 = d3.extent(data, function(d) {
      return d.date;
    });
    y0 = [0, d3.max(data, function(d) {
      return d.count;
    })];
    x.domain(x0);
    y.domain(y0);

    line = svg.append("path")
      .data([data])
      .attr("class", "line")
      .attr("d", valueline);
    var brushg = svg.append("g")
      .attr("class", "brush")
      .call(brush);
    // .call(brush.move, x.domain().map(x)); //make it have a starting selection
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

  function getTotal(start, end) {
    var total = 0;
    var firstMeas = new Date(start);
    if(start && end) {
      if (start == end){
        console.log("total");
        total = rawData[formatTime(firstMeas)]? rawData[formatTime(firstMeas)] :0; 
      } else {
        for (var d = firstMeas; d < new Date(end); d.setDate(d.getDate() + 1)) {
          dString = formatTime(d);
          hours = rawData[dString] ? rawData[dString] : 0;
    
          total += hours;
        }
      }
 
    } 
    $("#count-warning span").text(total);
    $("#count-warning").show();
    if (total > drawLimit) {
      $("#heatmap-warning").show();
    }


    return total;
  }

  return {

    //Build a chart with no data in the given element
    init: function(config) {
      startSelect = config.start;
      endSelect = config.end;
      rangeSelect = config.range;
      drawLimit = config.limit;
      datePicker = config.datePicker;
      //Gives chart room to breathe inside parent
      margin = {
        top: 8,
        right: 0,
        bottom: 12,
        left: 0
      };
      
      //actual Size of data area
      height = config.height - margin.top - margin.bottom;
      width = config.width - margin.right - margin.left;

      x = d3.scaleTime().range([0, width]);
      y = d3.scaleLinear().range([height, 0]);

      // define the line
      valueline = d3.line()
        .x(function(d) {
          return x(d.date);
        })
        .y(function(d) {
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

      svg = d3.select(config.container)
        .append("svg:svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
      svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height);
      svg.append("g")
        .attr('clip-path', 'url(#clipper)')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    },

    addData: function(data) {
      rawData = data;
      var chartData = [],
      today = new Date(),
      firstMeas = new Date(Object.keys(rawData)[0]);

      for (var d = firstMeas; d <= today; d.setDate(d.getDate() + 1)) {
        dString = formatTime(d);
        hours = rawData[dString] ? rawData[dString] : 0;

        chartData.push({
          "date": new Date(d),
          "count": hours
        });
      }

      putDataInChart(chartData);
    },

    //change start and end of chart
    updateBounds: function(start, end) {
      getTotal(start, end);
      svg.select(".brush").call(brush.move, null);
      if (start == end) {
        end = formatTime(moment.utc(start).add(1, "day"));
      } 
      x.domain([parseTime(start), parseTime(end)]);
      zoom();
    },

    //zoom chart out to full view
    reset: function() {
      x.domain(x0);
      y.domain(y0);
      zoom();
    },

    getTotal: function (start, end) {
      return getTotal(start, end);
    },

    resize: function(innerWidth){
      width = innerWidth - margin.right - margin.left;
      
      //update x and y scales to new dimensions
      x.range([0, width]);
      y.range([height, 0]);

      //update svg elements to new dimensions
      svg
        .attr('width', width + margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom);

      // //update the axis and line
      // xAxis.scale(x);
      // yAxis.scale(y);
      
      svg.select('.x-axis')
        .call(xAxis);

      svg.select('.y-axis')
        .call(yAxis);

      // path.attr('d', valueLine);
    }

  };
})();