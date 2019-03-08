$(function () {

    //map
    TremorMap.init({
      mapContainer: 'tremor-map',
      center: [45.5122, -122.6587],
      leafletOptions: {
        minZoom: 5.5,
        zoomSnap: 0.5,
        preferCanvas: true
      }
    });
  
    // Get everything set up properly
    var rangeSelector = $("#range");
    var dateRange = dealWithDates(true);
  
    if (!rangeSelector.prop("checked")) {
      $("#end-date-parent").hide();
    } else {
      $("#end-date-parent").show();
    }
  
    $("#play-events").prop('disabled', true); //should be disabled in HTML, but its not working
  
    $("#seismometers, #past-tremor, #plate-contours").each(function () {
      TremorMap.toggleOverlays($(this).is(":checked"), $(this).val());
    });
  
    // UI Events
    $('input[type=radio][name=rangeSelect]').change(function () {
      if (!rangeSelector.prop("checked")) {
        TimeChart.reset();
        $("#end-date-parent").hide();
      } else {
        $("#end-date-parent").show();
      }
    });
  
    $("#seismometers, #past-tremor, #plate-contours").change(function () {
      TremorMap.toggleOverlays($(this).is(":checked"), $(this).val());
    });
  
    $("#play-events").click(function () {
      $(this).prop("disabled", true);
  
      TremorMap.playEvents();
    });
  
    $("#start-date, #end-date").change(function () {
      dateRange = dealWithDates();
  
      if (rangeSelector.prop("checked")) {
        TimeChart.updateBounds(dateRange.start, dateRange.end);
      }
    });
  
    //change to lose focus ?
    $("#submit").click(function () {
      $(".loading").show();
      $("#play-events").prop('disabled', true);
  
      dateRange = dealWithDates(true);
  
        if(new Date(dateRange.start) > new Date(dateRange.stop)) {
            var start = dateRange.end;
            dateRange.end = dateRange.start;
            dateRange.start = start;
        }

      $("#event-nav ul").empty();
  
      console.log(dateRange)
      getEvents(dateRange.start, dateRange.end).done(function (response) {
        TremorMap.updateMarkers(response, $('input[type=radio][name=coloringRadio]:checked').val());
        $("#start").text(dateRange.start);
        $("#end").text(dateRange.end);
        $("#epicenters span").text(response.length);
        if(response.length > 5000) {

           $("#event-limit-warning").show();
        }
        $("#play-events").prop('disabled', false);
        $(".loading").hide();
        //hide loading screen
      });
  
    });
  
    // Get some data
  
    //AUTOREFRESH THIS
    getEvents(dateRange.start, dateRange.end).done(function (response) {
      TremorMap.updateMarkers(response, $('input[type=radio][name=coloringRadio]:checked').val());
        $("#start").text(dateRange.start);
        $("#end").text(dateRange.end);
        if(response.length > 5000) {

            $("#event-limit-warning").show();
         }
      $("#epicenters span").text(response.length);
      $("#play-events").prop("disabled", false);
      $(".loading").hide();
    });
  
    getCounts().done(function (response) {
  
      var chartData = [],
        formatTime = d3.utcFormat("%Y-%m-%d"),
        today = new Date(),
        firstMeas = new Date(Object.keys(response)[0]);
  
      for (var d = firstMeas; d <= today; d.setDate(d.getDate() + 1)) {
        dString = formatTime(d);
        hours = response[dString] ? response[dString] : 0;
  
        chartData.push({
          "date": new Date(d),
          "count": hours
        });
      }
  
      //getTotalHours(dayCounts);
      TimeChart.init({
        container: "#chart",
        height: $("#chart").height(),
        width: $("#chart").width(),
        start: $("#start-date"),
        end: $("#end-date"),
        range: $("#range")
      }); //some height and some width;
  
      TimeChart.addData(chartData);
    });
  
    //change start times
  });
  
  //FIXME: change default date to today
  function dealWithDates(validate) {

    var timeFormat = d3.utcFormat("%Y-%m-%d");
    var start = $("#start-date").val() ? $("#start-date").val() : "2018-03-14";
    var end;

    var s = new Date(start);
    if ($('input[type=radio][name=rangeSelect]:checked').val() == "single") {
      end = timeFormat(s.setDate(s.getDate() + 1));
    } else {
      end = $("#end-date").val() ? $("#end-date").val() : "2018-02-01";
    }
    var e = new Date(end);

    //swaps start and end date if needed
    if(validate && s > e) {
        $("#start-date").val(end);
        $("#end-date").val(start);
        return {
          "start": end,
          "end": start
        };
    } else {
        $("#start-date").val(start);
        $("#end-date").val(end);
        return {
          "start": start,
          "end": end
        };

    }



  }
  
  //Fetches events for given start and endtime
  //Returns json object
  function getEvents(start, end) {
    var request = $.ajax({
      url: "https://tremorapi.pnsn.org/api/v1.0/events?starttime=" + start + "&endtime=" + end,
      headers: {
        "accept": "application/json",
        "Access-Control-Allow-Origin":"*"
        },
      dataType: "json"
    });
  
    return request.done(function (response) {
    $(".error").hide();
      console.log("got the request, processing now")
      return response;
    }).fail(function (jqXHR, textStatus) {
        $(".error").show();
      console.log(jqXHR.status);
      console.log("Request failed: " + textStatus + " ");
    }).promise();
  }
  
  //Fetches events for given start and endtime
  //Returns json object
  function getCounts() {
    var request = $.ajax({
      url: "https://tremorapi.pnsn.org/api/v1.0/day_counts",
      headers: {
        "accept": "application/json",
        "Access-Control-Allow-Origin":"*"
        },
      dataType: "json"
    });
  
    return request.done(function (response) {
      return response;
    }).fail(function (jqXHR, textStatus) {
      console.log(jqXHR.status);
      console.log("Request failed: " + textStatus + " ");
    }).promise();
  }