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


  //Figures out what user selected
  function brushended() {
    var s = d3.event.selection;
    if (s) {
      x.domain(s.map(x.invert, x));
      svg.select(".brush").call(brush.move, null);
      var start = x.domain()[0];
      var end = x.domain()[1];
      if(startSelect && endSelect) {

        startSelect.val(formatTime(start));
        endSelect.val(formatTime(end));
        endSelect.parent().show();
        rangeSelect.prop("checked",true);
      }

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
  return {

    //Build a chart with no data in the given element
    init: function(config) {
      startSelect = config.start;
      endSelect = config.end;
      rangeSelect = config.range;
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
      svg.append("g")
        .attr('clip-path', 'url(#clipper)')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      







    },

    // Add data to the chart
    addData: function(data) {
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

      var display_range_group = svg.append("g")
      .attr("id", "buttons_group")
      .attr("transform", "translate(" + 0 + ","+ 0 +")");
  
  var expl_text = display_range_group.append("text")
      .text("Showing data from: ")
      .style("text-anchor", "start")
      .attr("transform", "translate(" + 0 + ","+ 10 +")");
  
  display_range_group.append("text")
      .attr("id", "displayDates")
      .text(formatTime(x.domain()[0]) + " - " + formatTime(x.domain()[1]))
      .style("text-anchor", "start")
      .attr("transform", "translate(" + 82 + ","+ 10 +")");
  
  var expl_text = display_range_group.append("text")
      .text("Zoom to: ")
      .style("text-anchor", "start")
      .attr("transform", "translate(" + 180 + ","+ 10 +")");
  
  
      var button_width = 40;
      var button_height = 14;
      
      // don't show year button if < 1 year of data
      var dateRange  = x.domain()[1] - x.domain()[0],
          ms_in_year = 31540000000;
      
      if (dateRange < ms_in_year)   {
          var button_data =["month","data"];
      } else {
          var button_data =["year","month","data"];
      };
      
      var button = display_range_group.selectAll("g")
          .data(button_data)
          .enter().append("g")
          .attr("class", "scale_button")
          .attr("transform", function(d, i) { return "translate(" + (220 + i*button_width + i*10) + ",0)"; });
      
      button.append("rect")
          .attr("width", button_width)
          .attr("height", button_height)
          .attr("rx", 1)
          .attr("ry", 1);
      
      button.append("text")
          .attr("dy", (button_height/2 + 3))
          .attr("dx", button_width/2)
          .style("text-anchor", "middle")
          .text(function(d) { return d; });
    },

    //change start and end of chart
    updateBounds: function(start, end) {
      svg.select(".brush").call(brush.move, null);

      x.domain([parseTime(start), parseTime(end)]);

      zoom();
    },

    //zoom chart out to full view
    reset: function() {
    x.domain(x0);
      y.domain(y0);
      zoom();
    }

  };
})();