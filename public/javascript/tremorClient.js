$(function () {

    //map
    TremorMap.init({
      mapContainer: 'tremor-map',
      playbackSpeed: $('#playbackSpeed'),
      center: [45.5122, -122.6587],
      leafletOptions: {
        minZoom: 5.5,
        zoomSnap: 0.5,
        preferCanvas: true
      }
    });

    //Get dates from URL
    var search_params = new URLSearchParams(window.location.search); 
    
    var start = search_params.get('start');
    var end = search_params.get('end');
 
    if(start && new Date(start)) {
        $("#start-date").val(start);
    }

    // Get everything set up properly
    var rangeSelector = $("#range");

    if(end && new Date(end)) {
        $("#end-date").val(end);
        rangeSelector.prop("checked", true);
    }


    var dateRange = dealWithDates(true);
  
    if (!rangeSelector.prop("checked")) {
      $("#end-date-parent").hide();
    } else {
      $("#end-date-parent").show();
    }

    var coloring = search_params.get('coloring');
    if(coloring) {
        $('input[type=radio][name=coloringRadio][value='+ coloring+']').prop('checked', true);
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

    // UI Events
    $('input[type=radio][name=coloringRadio]').change(function () {
        TremorMap.recolorMarkers($('input[type=radio][name=coloringRadio]:checked').val());
    });
  
    $("#seismometers, #past-tremor, #plate-contours").change(function () {
      TremorMap.toggleOverlays($(this).is(":checked"), $(this).val());
    });
  
    $("#play-events").click(function () {
      $(this).prop("disabled", true);
  
      TremorMap.playFeatures();
    });
  
    $("#start-date, #end-date").change(function () {
      dateRange = dealWithDates();
  
      if (rangeSelector.prop("checked")) {
        TimeChart.updateBounds(dateRange.start, dateRange.end);
      }
    });

    $("#download").click(function(){
        alert("Jon hasn't enabled CSV download yet.");
    });
  
    //change to lose focus ?
    $("#submit").click(function () {
      $(".loading").show();
      $("#play-events").prop('disabled', true);
      console.log("before:", dateRange)
      dateRange = dealWithDates(true);
      console.log("after:", dateRange)
      var coloring = $('input[type=radio][name=coloringRadio]:checked').val();

      var url = "?start="+dateRange.start+"&end="+dateRange.end+"&coloring="+coloring;
    if (window.history.replaceState) {
        window.history.replaceState({}, "Tremor Map", url);
    }

      $("#event-nav ul").empty();
  
      getEvents(dateRange.start, dateRange.end).done(function(response) {
          updateMarkers(response);
      });
  
    });
  
    // Get some data
  
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

    //AUTOREFRESH THIS
    getEvents(dateRange.start, dateRange.end).done(function(response) {
        updateMarkers(response);
    });
    

    function updateMarkers(response){
        TremorMap.updateMarkers(response, $('input[type=radio][name=coloringRadio]:checked').val());
        $("#start").text(dateRange.start);
        $("#end").text(dateRange.end);


        if(response.features.length > 5000) {

            $("#event-limit-warning").show();
         }
      $("#epicenters span").text(response.features.length);
      $("#play-events").prop("disabled", false);
      $(".loading").hide();
    }
  
    //change start times
  });
  
  //FIXME: change default date to today
  function dealWithDates(validate) {

    var timeFormat = d3.utcFormat("%Y-%m-%d");
    var datePickerStart =  $("#start-date").val();

//FIXME: somethig happening iwth dates ehre

    var start;
    if(datePickerStart) {
        var offsetMiliseconds = new Date().getTimezoneOffset() * 60000;
        var date = new Date(datePickerStart);
        start = timeFormat(date.getTime() - offsetMiliseconds);
    } else {
        start = timeFormat(new Date());
    }
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
        var tmpS = end;
        end = start;
        start = tmpS;
    }

    $("#start-date").val(start);
    $("#end-date").val(end);

    return {
        "start": start,
        "end": end
    };
  }
  
  //Fetches events for given start and endtime
  //Returns json object
  function getEvents(start, end) {
    var request = $.ajax({
      url: "https://tremorapi.pnsn.org/api/v1.0/events?starttime=" + start + "&endtime=" + end,
    //   headers: {
    //     "accept": "application/json",
    //     "Access-Control-Allow-Origin":"*",
    //     },
      dataType: "json"
    });
  
    return request.done(function (response) {
    $(".error").hide();
      console.log("got the request, processing now");
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
    //   headers: {
    //     "accept": "application/json",
    //     "Access-Control-Allow-Origin":"*",
    //     },
      dataType: "json"
    });
  
    return request.done(function (response) {
      return response;
    }).fail(function (jqXHR, textStatus) {
      console.log(jqXHR.status);
      console.log("Request failed: " + textStatus + " ");
    }).promise();
  }