$(function () {
  //** get everything set up with all that fun config *//
  var drawLimit = $.clientConfig.drawLimit, //max number of events to show at once
    apiBaseUrl = $.clientConfig.apiBaseUrl, //API url
    mapOptions = $.clientConfig.mapOptions, //options for leaflet map
    chartOptions = $.clientConfig.chartOptions, //options for D3 chart
    tourOptions = $.clientConfig.tourOptions, //options for Bootstrap Tour
    datePickerOptions = $.clientConfig.datePickerOptions, //options for DateRangePicker
    search_params = new URLSearchParams(window.location.search), //url params
    datePickerContainer = $('input[name="date-range"]'),
    coloringSelector = $("#display-type"), //how map markers are colored
    minDate = $.clientConfig.minDate,
    datePicker,
    tremorMap,
    timeChart,
    tour,
    allTremorCounts;

  //** Set up page with any existing URL params */

  // Date ranges - get from URL or start from yesterday

  var dateRange = new DateRange(search_params.get('start'), search_params.get('end'), $.clientConfig.dateFormat);

  // Coloring
  var defaultColor;
  $.each($.clientConfig.mapOptions.coloringOptions.colors, function (id, color) {
    if (color.default) {
      defaultColor = id;
    }
    coloringSelector.prepend(
      "<option value='" + id + "'>" + color.name + "</option>"
    );
  });

  var paramColor = search_params.get('coloring');
  if (paramColor && $("#display-type option[value='" + paramColor + "']").length > 0) {
    coloringSelector.val(paramColor);
  } else {
    if (defaultColor) {
      coloringSelector.val(defaultColor);
    } else {
      coloringSelector.val("red");
    }
  }

  //** Set up page elements */

  tremorMap = new TremorMap(mapOptions);
  timeChart = new TimeChart(chartOptions, minDate);
  tour = new Tour(tourOptions);

  // set up datepicker
  datePickerContainer.daterangepicker(
    Object.assign(datePickerOptions, {
      "startDate": dateRange.getStart(),
      "endDate": dateRange.getEnd(),
      "maxDate": moment.utc(),
      "minDate": minDate
    }),
    function (start, end, label) {
      dateRange.setRange(start, end);
      timeChart.updateBounds(dateRange.getStart(), dateRange.getEnd());
      $("#submit").removeClass("inactive");
    });

  datePicker = datePickerContainer.data('daterangepicker'); //actual datePicker
  timeChart.setDatepicker(datePicker);

  // Initial Bounds - needs to happen after map set up
  var bounds = {
    "lat_max": parseFloat(search_params.get("lat_max")),
    "lat_min": parseFloat(search_params.get("lat_min")),
    "lon_max": parseFloat(search_params.get("lon_max")),
    "lon_min": parseFloat(search_params.get("lon_min"))
  };

  if (bounds.lat_min && bounds.lat_max && bounds.lon_min && bounds.lon_max) {
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

  //Get updated at time
  $.ajax({
    url: apiBaseUrl + "/event/0",
    dataType: "json"
  }).done(function (response) {
    $("#updated span").text(moment.utc(response.properties.time).fromNow());
  });

  // Total counts for time chart
  getCounts(apiBaseUrl).done(function (response) {
    allTremorCounts = response;
    timeChart.addData(response);
    // Grab new counts if there are bounds
    if (bounds) {
      getCounts(apiBaseUrl, getBoundsString(bounds)).done(function (response) {
        timeChart.updateData(response);
        $("path.line").addClass("modified");
      });
    }

    $(window).on('resize', function () {
      timeChart.resize($("#control-bar").width() - $("#search").width() - 20);
    });
  });
  console.log(dateRange.toString());
  // Get actual tremor
  getEvents(apiBaseUrl, dateRange.toString(), getBoundsString(bounds)).done(function (response) {
    updateMarkers(response);
  });

  //** UI Events and Prepping */
  $("#start-tour").click(function () {
    if (tour.ended()) {
      tour.restart();
    } else {
      tour.start(true);
    }
  });

  $("#heatmap-warning span").text(drawLimit);

  // Buttons on chart for quick zooming
  $("#chart-buttons a").click(function () {
    var range = [];
    switch ($(this).attr("value")) {
    case "day":
      range = [moment.utc().subtract(1, 'days'), moment.utc()];
      break;

    case "week":
      range = [moment.utc().subtract(6, 'days'), moment.utc()];
      break;

    case "month":
      range = [moment.utc().subtract(1, 'month'), moment.utc()];
      break;

    default:
      range = [moment.utc(minDate), moment.utc()];
    }

    if (range.length > 0) {
      updateDateRange(range);
    }
  });

  // Shift range back a day
  $("#previous-day").click(function () {
    var range = [moment.utc(dateRange.getStart()).subtract(1, 'days'), moment.utc(dateRange.getEnd()).subtract(1, 'days')];
    updateDateRange(range);

  });

  // Shift range forward a day
  $("#next-day").click(function () {
    var range = [moment.utc(dateRange.getStart()).add(1, 'days'), moment.utc(dateRange.getEnd()).add(1, 'days')];
    updateDateRange(range);
  });

  // Change coloring
  coloringSelector.change(function () {
    tremorMap.recolorMarkers(coloringSelector.val());
    $(".start").text(dateRange.getStart());
    $(".end").text(dateRange.getEnd());
  });

  // Add a geographic filter on the map
  $("#draw-filter").click(function (e) {
    e.preventDefault();
    $(this).hide();
    $("#remove-filter").show();
    $("#draw-filter-text").show();

    // Wait for filter to be drawn, then act
    $.when(tremorMap.startDrawing()).then(
      // draw completed
      function (bounds) {
        getCounts(apiBaseUrl, getBoundsString(bounds)).done(function (response) {
          timeChart.updateData(response);
          $("path.line").addClass("modified");
        });
      },
      // draw canceled 
      function (status) {
        $("#remove-filter").hide();
        $("#draw-filter").show();
        $("#draw-filter-text").hide();
      }
    );

    $("#submit").removeClass("inactive");
  });

  // Remove geographic filter
  $("#remove-filter").click(function () {
    $(this).hide();
    $("path.line").removeClass("modified");
    $("#draw-filter").show();
    $("#draw-filter-text").hide();
    $("#submit").removeClass("inactive");
    tremorMap.removeBounds();
    timeChart.updateData(allTremorCounts);
    //put back normal line
  });

  // Select data format
  $("#download-container button").click(function () {
    var dataFormat = $("#download-type").val();
    if (dataFormat === "json" || dataFormat === "csv") {
      var url = apiBaseUrl + "/events?" + dateRange.toString() + "&format=" + dataFormat;
      window.open(url, "_blank");
    }
  });

  // Submit changes and get new data
  $("#submit").click(function () {
    $("#loading-overlay").show();
    $("#loading-gif").show();
    $("#loading-warning").hide();
    $("#play-events").prop('disabled', true);

    tremorMap.clearLayers();

    dateRange.setRange(datePicker.startDate, datePicker.endDate);

    var coloring = coloringSelector.val();

    var urlStr = "?" + dateRange.toString() + "&coloring=" + coloring;

    var boundsStr = getBoundsString(tremorMap.getBounds());

    urlStr += boundsStr;

    if (window.history.replaceState) {
      window.history.replaceState({}, "Tremor Map", urlStr);
    }

    $("#event-nav ul").empty();
    getEvents(apiBaseUrl, dateRange.toString(), boundsStr).done(function (response) {
      updateMarkers(response);
    });

  });

  //** Helper functions */
  //** Updates UI and markers when new data requested */
  function updateMarkers(response) {
    tremorMap.updateMarkers(response, coloringSelector.val());

    $(".start").text(dateRange.getStart());
    $(".end").text(dateRange.getEnd());

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
  function updateDateRange(range) {

    dateRange.setRange(range[0], range[1]);

    var start = dateRange.getStart();
    var end = dateRange.getEnd();
    datePicker.setStartDate(start);
    datePicker.setEndDate(end);

    timeChart.updateBounds(start, end);

    $("#submit").removeClass("inactive");
  }
});

//** Gets the day counts of tremor */
function getCounts(apiBaseUrl, boundsStr) {
  var str = "";
  if (boundsStr && boundsStr.length > 0) {
    str = "?" + boundsStr;
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
  if (bounds) {
    $.each(bounds, function (key, value) {
      boundsStr += "&" + key + "=" + value;
    });
  }
  return boundsStr;
}

//** Gets the events for a given start and end time */
function getEvents(apiBaseUrl, rangeStr, boundsStr) {
  var request = $.ajax({
    url: apiBaseUrl + "/events?" + rangeStr + boundsStr,
    dataType: "json"
  });

  return request.done(function (response) {
    $("#loading-warning").hide();
    return response;
  }).fail(function (jqXHR, textStatus) {
    $("#loading-gif").hide();
    $("#loading-warning").show();
    if (jqXHR.status === 404) {
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

// Stores date range as strings
function DateRange(startStr, endStr, dateFormat) {

  var start = startStr && moment.utc(startStr, dateFormat).isValid() ? moment.utc(startStr, dateFormat).format(dateFormat) : moment.utc().subtract(1, 'days').format(dateFormat);
  var end = endStr && moment.utc(endStr, dateFormat).isValid() ? moment.utc(endStr, dateFormat).format(dateFormat) : start;

  return {
    getStart: function () {
      return start;
    },

    getEnd: function () {
      return end;
    },

    //take in date as moment object
    setRange: function (s, e) {
      start = s.format(dateFormat);
      end = e.format(dateFormat);
    },

    toString: function () {
      return "starttime=" + start + "T00:00:00&endtime=" + end + "T23:59:59";
    }
  };

}