$(function () {
  //** get everything set up with all that fun config *//
  var drawLimit = $.clientConfig.drawLimit, //max number of events to show at once
    dateFormat = $.clientConfig.dateFormat, //format for dates
    apiBaseUrl = $.clientConfig.apiBaseUrl, //API url
    mapOptions =  $.clientConfig.mapOptions, //options for leaflet map
    chartOptions = $.clientConfig.chartOptions, //options for D3 chart
    tourOptions = $.clientConfig.tourOptions, //options for Bootstrap Tour
    datePickerOptions = $.clientConfig.datePickerOptions, //options for DateRangePicker
    search_params = new URLSearchParams(window.location.search), //url params
    datePickerContainer = $('input[name="date-range"]'),
    coloringSelector = $("#display-type"), //how map markers are colored
    minDate = $.clientConfig.minDate,
    dateRange = {
      "start": "",
      "end": ""
    },
    datePicker,
    tremorMap,
    timeChart,
    tour;

    console.log(coloringSelector.val())
  //** Set up page with any existing URL params */

  // Date ranges - get from URL or start from yesterday
  var start = search_params.get('start');
  var end = search_params.get('end');

  dateRange.start = start && moment.utc(start, dateFormat).isValid() ? moment.utc(start, dateFormat).format(dateFormat) : moment.utc().subtract(1, 'days').format(dateFormat);
  dateRange.end = end && moment.utc(end, dateFormat).isValid() ? moment.utc(end, dateFormat).format(dateFormat) : dateRange.start;
  
  var defaultColor;
  $.each($.clientConfig.mapOptions.coloringOptions.colors, function(id, color) {
    if(color.default){
      defaultColor = id;
    }
    coloringSelector.prepend(
      "<option value='" + id + "'>" + color.name + "</option>"
    );
  });
  // Coloring
  if (search_params.get('coloring')) {
    coloringSelector.val(search_params.get('coloring'));
  } else {
    if(defaultColor) {
      coloringSelector.val(defaultColor);
    } else {
      coloringSelector.val("red");
    }
  }

  //** Set up page elements */
  datePickerContainer.daterangepicker(
    Object.assign(datePickerOptions, {
    "startDate": dateRange.start,
    "endDate": dateRange.end,
    "maxDate": moment.utc(),
    "minDate": minDate
  }), function (start, end, label) {
    dateRange = {
      "start": start.format(dateFormat),
      "end": end.format(dateFormat)
    };
    timeChart.updateBounds(dateRange);
    timeChart.getTotal(dateRange);
    $("#submit").removeClass("inactive");
  });

  datePicker = datePickerContainer.data('daterangepicker'); //actual datePicker

  tremorMap = new TremorMap(mapOptions);
  timeChart = new TimeChart(chartOptions, datePicker, minDate);
  tour = new Tour(tourOptions);

    // Initial Bounds
    var bounds = {
      "lat_max" : search_params.get("lat_max"),
      "lat_min" : search_params.get("lat_min"),
      "lon_max" : search_params.get("lon_max"),
      "lon_min" : search_params.get("lon_min")
    };
  
    if(bounds.lat_min && bounds.lat_max && bounds.lon_min && bounds.lon_max){
      tremorMap.addBounds(bounds);
      $("#draw-filter").hide();
      $("#remove-filter").show();
    } else {
      bounds = null;
      $("#draw-filter-text").hide();
      $("#draw-filter").show();
      $("#remove-filter").hide();
    } 

  //** Get data and do stuff with it */
  $.ajax({
    url: apiBaseUrl + "/event/0",
    dataType: "json"
  }).done(function (response) {
    $("#updated span").text(moment.utc(response.properties.time).fromNow());
  });

  var allTremorCounts;
  getCounts(apiBaseUrl).done(function (response) {
    allTremorCounts = response;

    
    if(bounds) {
      getCounts(apiBaseUrl, getBoundsString(bounds)).done(function (response) {
        timeChart.addData(response);
      });
    } else {
      timeChart.addData(response);
    }

    $(window).on('resize', function () {
      timeChart.resize($("#control-bar").width() - $("#search").width() - 20);
    });
  });

  getEvents(apiBaseUrl, dateRange, getBoundsString(bounds)).done(function (response) {
    updateMarkers(response);
  });

  //** UI Events */
  $("#start-tour").click(function(){
    if(tour.ended()){
      tour.restart();
    } else {
      tour.start(true);
    }
  });

  $("#heatmap-warning span").text(drawLimit);
  $("#chart-buttons a").click(function () {
    var range = [];
    switch ($(this).attr("value")) {
    case "day":
      range = [moment.utc().subtract(1, 'days'), moment.utc().subtract(1, 'days')];
      break;

    case "week":
      range = [moment.utc().subtract(6, 'days'), moment.utc()];
      break;

    case "month":
      range = [moment.utc().startOf('month'), moment.utc().endOf('month')];
      break;

    default:
      timeChart.reset();
    }

    if (range.length > 0) {
      updateDateRange(range);
    }

  });

  $("#previous-day").click(function(){
    var range = [moment.utc(dateRange.start).subtract(1, 'days'), moment.utc(dateRange.end).subtract(1, 'days')];
    updateDateRange(range);

  });

  $("#next-day").click(function(){
    var range = [moment.utc(dateRange.start).add(1, 'days'), moment.utc(dateRange.end).add(1, 'days')];
    updateDateRange(range);
  });

  coloringSelector.change(function () {
    tremorMap.recolorMarkers(coloringSelector.val());
    $(".start").text(dateRange.start);
    $(".end").text(dateRange.end);
  });

  // $("#play-events").click(function () {
  //   $(this).prop("disabled", true);
  //   tremorMap.playFeatures();
  // });

  $("#draw-filter").click(function() {
    $(this).hide();
    $("#remove-filter").show();
    $("#draw-filter-text").show();
    $.when(tremorMap.startDrawing()).then(
      function( bounds ) {
        getCounts(apiBaseUrl, getBoundsString(bounds)).done(function (response) {
          timeChart.updateData(response);
        });
        //get new line
        console.log( status + ", things are going well" );
      },
      function( status ) {
        //do nothing
        console.log( status + ", you fail this time" );
      },
      function( status ) {
        console.log("pending")
      }
    );
    
    $("#submit").removeClass("inactive");
  });

  $("#remove-filter").click(function() {
    $(this).hide();
    $("#draw-filter").show();
    $("#draw-filter-text").hide();
    $("#submit").removeClass("inactive");
    tremorMap.removeBounds();

    timeChart.updateData(allTremorCounts);
    //put back normal line
  });

  $("#download-container button").click(function () {
    var dataFormat = $("#download-type").val();
    if (dataFormat === "json" || dataFormat === "csv") {
      var start = dateRange.start + "T00:00:00";
      var end = dateRange.end + "T23:59:59";
      var url = apiBaseUrl + "/events?starttime=" + start + "&endtime=" + end + "&format=" + dataFormat;
      window.open(url, "_blank");
    }
  });

  $("#submit").click(function () {
    $("#loading-overlay").show();
    $("#loading-gif").show();
    $("#loading-warning").hide();
    $("#play-events").prop('disabled', true);

    tremorMap.clearLayers();

    dateRange = {
      "start": datePicker.startDate.format(dateFormat),
      "end": datePicker.endDate.format(dateFormat)
    };

    var coloring = coloringSelector.val();

    var urlStr = "?start=" + dateRange.start + "&end=" + dateRange.end + "&coloring=" + coloring;

    var boundsStr = getBoundsString(tremorMap.getBounds());

    urlStr += boundsStr;

    if (window.history.replaceState) {
      window.history.replaceState({}, "Tremor Map", urlStr);
    }

    $("#event-nav ul").empty();
    getEvents(apiBaseUrl, dateRange, boundsStr).done(function (response) {
      updateMarkers(response);
    });

  });

  //** Helper functions */
  //** Updates UI and markers when new data requested */
  function updateMarkers(response) {
    tremorMap.updateMarkers(response, coloringSelector.val());

    $(".start").text(dateRange.start);
    $(".end").text(dateRange.end);

    // response.count

    $("#submit").addClass("inactive");
    if (response.count >= drawLimit) {
      $("#event-limit-warning").show();
    } else {
      $("#event-limit-warning").hide();
    }
    if (response.count > 5000) {
      $("#event-list").hide();
      $("#event-list-warning").show();
    } else {
      $("#event-list").show();
      $("#event-list-warning").hide();
    }
 
    $("#epicenters span").text(response.count);
    $("#play-events").prop("disabled", false);

    $("#loading-overlay").hide();
  }

  //** Updates the chart and datepicker with given range */
  function updateDateRange(range){
    dateRange = {
      "start": range[0].format(dateFormat),
      "end": range[1].format(dateFormat)
    };

    datePicker.setStartDate(dateRange.start);
    datePicker.setEndDate(dateRange.end);

    timeChart.updateBounds(dateRange);
    timeChart.getTotal(dateRange);

    $("#submit").removeClass("inactive");
  }
}); 

  //** Gets the day counts of tremor */
  function getCounts(apiBaseUrl, boundsStr) {
    var str = "";
    if(boundsStr && boundsStr.length > 0){
      str= "?" + boundsStr;
    }
    var request = $.ajax({
      url: apiBaseUrl + "/day_counts" + str,
      dataType: "json"
    });

    return request.done(function (response) {
      return response;
    }).fail(function (jqXHR, textStatus) {
      console.log(jqXHR.status);
      console.log("Request failed: " + textStatus + " ");
    }).promise();
  }

//** Returns a string form of the bounds */
function getBoundsString(bounds) {
  boundsStr = "";
  if( bounds ){
    $.each(bounds, function(key, value){
      boundsStr += "&" + key + "=" + value;
    });
  }
  return boundsStr;
}

//** Gets the events for a given start and end time */
function getEvents(apiBaseUrl, range, boundsStr) {
  var start = range.start,
      end = range.end;
  if (start && end) {
    //make it "end of day" since that is how old tremor is 
    start += "T00:00:00";
    end += "T23:59:59";
    var request = $.ajax({
      url: apiBaseUrl + "/events?starttime=" + start + "&endtime=" + end + boundsStr,
      dataType: "json"
    });

    return request.done(function (response) {
      $("#loading-warning").hide();
      return response;
    }).fail(function (jqXHR, textStatus) {
      $("#loading-gif").hide();
      $("#loading-warning").show();
      if(jqXHR.status === 404) {
        $("#err404").show();
      } else if (jqXHR.status === 500) {
        $("#err500").show();
      } else {
        $("#err").show();
      }

      console.log(jqXHR.status);
      console.log("Request failed: " + textStatus + " ");
    }).promise();
  }
}