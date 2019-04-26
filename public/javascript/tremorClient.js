$(function () {
  //get everything set up
  var drawLimit = 20000, //max number of events to show at once
    dateFormat = "YYYY-MM-DD", //format for dates
    baseUrl = "https://tremorapi.pnsn.org/api/v1.0", //API url
    search_params = new URLSearchParams(window.location.search), //url params
    datePickerContainer = $('input[name="date-range"]'),
    coloringSelector = $("#display-type"), //how map markers are colored
    mapOptions = {
      "mapContainer": 'tremor-map',
      "center": [45.5122, -122.6587],
      "leafletOptions": {
        "minZoom": 5.5,
        "zoomSnap": 0.5,
        "preferCanvas": true
      }
    },
    chartOptions = {
      "container": "#chart",
      "height": $("#chart").height() - $("#chart-info").height(),
      "width": $("#chart").width(),
      "format" : dateFormat
    },
    dateRange = {
      "start": "",
      "end": ""
    },
    datePicker,
    tremorMap,
    timeChart;

  // set up dates
  var start = search_params.get('start');
  var end = search_params.get('end');

  dateRange.start = start && moment.utc(start, dateFormat).isValid() ? moment.utc(start, "YYYY-MM-DD").format(dateFormat) : moment.utc().subtract(1, 'days').format(dateFormat);
  dateRange.end = end && moment.utc(end, dateFormat).isValid() ? moment.utc(end, "YYYY-MM-DD").format(dateFormat) : dateRange.start;

  // Datepicker needs to init before chart made //
  datePickerContainer.daterangepicker({
    "showDropdowns": true,
    "autoApply": true,
    "opens": "left",
    ranges: {
      'Today': [moment(), moment()],
      'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
      'Last 7 Days': [moment().subtract(6, 'days'), moment()],
      'Last 30 Days': [moment().subtract(29, 'days'), moment()],
      'This Month': [moment().startOf('month'), moment().endOf('month')],
      'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
    },
    "locale": {
      "format": dateFormat,
      "separator": " - ",
      "customRangeLabel": "Custom",
      "weekLabel": "W",
      "daysOfWeek": ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
      "monthNames": [
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
      ],
      "firstDay": 1
    },
    "alwaysShowCalendars": true,
    "linkedCalendars": false,
    "startDate": dateRange.start,
    "endDate": dateRange.end,
    // "minDate": "2008/08/05",
    "maxDate": moment.utc()
  }, function (start, end, label) {
    dateRange = {
      "start": start.format(dateFormat),
      "end": end.format(dateFormat)
    };
    timeChart.updateBounds(dateRange.start, dateRange.end);
    timeChart.getTotal(start.format(dateFormat), end.format(dateFormat));
  });

  datePicker = datePickerContainer.data('daterangepicker'); //actual datePicker

  tremorMap = new TremorMap(mapOptions);
  timeChart = new TimeChart(chartOptions, datePicker);

  if (search_params.get('coloring')) {
    coloringSelector.val(search_params.get('coloring'));
  }

  $("#heatmap-warning span").text(drawLimit);

  // Get data and do stuff with it //
  $.ajax({
    url: baseUrl + "/event/0",
    dataType: "json"
  }).done(function (response) {
    $("#updated span").text(moment.utc(response.time).fromNow());
  });

  getCounts(baseUrl).done(function (response) {
    timeChart.addData(response);
    timeChart.getTotal(dateRange.start, dateRange.end);

    $(window).on('resize', function () {
      timeChart.resize($("#control-bar").width() - $("#search").width() - 20);
    });

  });

  getEvents(baseUrl, dateRange.start, dateRange.end).done(function (response) {
    updateMarkers(response);
  });

  // UI events //
  $("#chart-buttons a").click(function () {
    var range = [];
    switch ($(this).attr("value")) {
    case "day":
      range = [moment().subtract(1, 'days'), moment().subtract(1, 'days')];
      break;

    case "week":
      range = [moment().subtract(6, 'days'), moment()];
      break;

    case "month":
      range = [moment().startOf('month'), moment().endOf('month')];
      break;

    default:
      timeChart.reset();
    }

    if (range.length > 0) {
      dateRange = {
        "start": range[0].format(dateFormat),
        "end": range[1].format(dateFormat)
      };

      datePicker.setStartDate(dateRange.start);
      datePicker.setEndDate(dateRange.end);

      timeChart.updateBounds(dateRange.start, dateRange.end);
      timeChart.getTotal(dateRange.start, dateRange.end);
    }

  });

  $("#seismometers, #past-tremor, #plate-contours").each(function () {
    tremorMap.toggleOverlays($(this).is(":checked"), $(this).val());
  });

  coloringSelector.change(function () {
    tremorMap.recolorMarkers(coloringSelector.val());
    $("#key-start").text(dateRange.start);
    $("#key-end").text(dateRange.end);
  });

  $("#seismometers, #past-tremor, #plate-contours").change(function () {
    tremorMap.toggleOverlays($(this).is(":checked"), $(this).val());
  });

  $("#play-events").click(function () {
    $(this).prop("disabled", true);

    tremorMap.playFeatures();
  });

  $("#filter-area").click(function() {
    //map/.startdraw
    tremorMap.startDrawing();
  });

  $("#download-container button").click(function () {
    format = $("#download-type").val();
    if (format === "json" || format === "csv") {
      var url = baseUrl + "/events?starttime=" + dateRange.start + "&endtime=" + dateRange.end + "&format=" + format;
      window.open(url, "_blank");
    }
  });

  $("#submit").click(function () {
    $("#loading-overlay").show();
    $("#loading-gif").show();
    $("#loading-warning").hide();
    $("#play-events").prop('disabled', true);
    tremorMap.clear();
    dateRange = {
      "start": datePicker.startDate.format(dateFormat),
      "end": datePicker.endDate.format(dateFormat)
    };

    var coloring = coloringSelector.val();

    var url = "?start=" + dateRange.start + "&end=" + dateRange.end + "&coloring=" + coloring;


    var boundsStr = "";
    var bounds = tremorMap.getBounds();
    if(bounds) {
      $.each(bounds, function(key, value){
        boundsStr += "&" + key + "=" + value;
      });
      url += boundsStr;
    }

    if (window.history.replaceState) {
      window.history.replaceState({}, "Tremor Map", url);
    }

    $("#event-nav ul").empty();
    getEvents(baseUrl, dateRange.start, dateRange.end, boundsStr).done(function (response) {
      updateMarkers(response);
    });

  });

  //End UI events//

  // Helper functions //
  function updateMarkers(response) {
    console.log("sort")
    response.features.sort(function(a, b){
      return new Date(a.properties.time) - new Date(b.properties.time);
    });

    tremorMap.updateMarkers(response, coloringSelector.val());

    $(".start").text(dateRange.start);
    $(".end").text(dateRange.end);

    if (response.features.length >= drawLimit) {
      $("#count-warning").show();
    } else {
      $("#count-warning").hide();
    }
    



    if (response.features.length > 5000) {
      $("#event-list").hide();
      $("#event-limit-warning").show();
    } else {
      $("#event-list").show();
      $("#event-limit-warning").hide();
    }
    console.log(response.features.length)
    $("#epicenters span").text(response.features.length);
    $("#play-events").prop("disabled", false);

    $("#loading-overlay").hide();
  }

  //Fetches events for given start and endtime
  //Returns json object
  function getCounts(baseUrl) {
    var request = $.ajax({
      url: baseUrl + "/day_counts",
      dataType: "json"
    });

    return request.done(function (response) {
      return response;
    }).fail(function (jqXHR, textStatus) {
      console.log(jqXHR.status);
      console.log("Request failed: " + textStatus + " ");
    }).promise();
  }



}); 
//Fetches events for given start and endtime
//Returns json object
function getEvents(baseUrl, start, end, bounds) {

  if (start && end) {
    //make it "end of day" since that is how old tremor is 
    start += "T00:00:00";
    end += "T23:59:59";
    var request = $.ajax({
      url: baseUrl + "/events?starttime=" + start + "&endtime=" + end + (bounds ? bounds:""),
      dataType: "json"
    });
    console.log(baseUrl + "/events?starttime=" + start + "&endtime=" + end + (bounds ? bounds:""))
    return request.done(function (response) {
      $("#loading-warning").hide();

      return response;
    }).fail(function (jqXHR, textStatus) {
      $("#loading-gif").hide();
      $("#loading-warning").show();
      console.log(jqXHR.status);
      console.log("Request failed: " + textStatus + " ");
    }).promise();
  }

}