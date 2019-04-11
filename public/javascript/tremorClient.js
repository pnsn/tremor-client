$(function () {
    var drawLimit = 50000;
    var dateFormat = "YYYY-MM-DD";
    $("#heatmap-warning span").text(drawLimit);
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
 
    var tremorCounts;
    // Get everything set up properly
    var rangeSelector = $("#range");

    var dateRange = {
      start: "",
      end: ""
    };

    dateRange.start = start && moment(start).isValid() ? start : moment.utc();
    dateRange.end = end && moment(end).isValid() ? end : dateRange.start;

  
    if (!rangeSelector.prop("checked")) {
      $("#end-date-parent").hide();
    } else {
      $("#end-date-parent").show();
    }

    $('input[name="date-range"]').daterangepicker({
      "showDropdowns": true,
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
          "applyLabel": "Apply",
          "cancelLabel": "Cancel",
          "fromLabel": "From",
          "toLabel": "To",
          "customRangeLabel": "Custom",
          "weekLabel": "W",
          "daysOfWeek": [
              "Su",
              "Mo",
              "Tu",
              "We",
              "Th",
              "Fr",
              "Sa"
          ],
          "monthNames": [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December"
          ],
          "firstDay": 1
      },
      "alwaysShowCalendars": true,
      "linkedCalendars" : false,
      "startDate": dateRange.start,
      "endDate": dateRange.end,
      "minDate": "2008/08/05",
      "maxDate": moment.utc()
  }, function(start, end, label) {

    dateRange = {
      "start": start.format(dateFormat),
      "end": end.format(dateFormat)
    };

    console.log(dateRange)
    TimeChart.updateBounds(dateRange.start, dateRange.end);
    TimeChart.getTotal(start.format(dateFormat), end.format(dateFormat));
    console.log('New date range selected: ' + start.format('YYYY-MM-DD') + ' to ' +end.format('YYYY-MM-DD') + ' (predefined range: ' + label + ')');
  });

    var coloring = search_params.get('coloring');
    var coloringSelector = $("#display-type");
    if(coloring) {
      coloringSelector.val(coloring);
    }
  
    $("#play-events").prop('disabled', true); //should be disabled in HTML, but its not working
  
    $("#seismometers, #past-tremor, #plate-contours").each(function () {
      TremorMap.toggleOverlays($(this).is(":checked"), $(this).val());
    });
  
    // UI Events
    coloringSelector.change(function () {
        TremorMap.recolorMarkers(coloringSelector.val());
    });
  
    $("#seismometers, #past-tremor, #plate-contours").change(function () {
      TremorMap.toggleOverlays($(this).is(":checked"), $(this).val());
    });
  
    $("#play-events").click(function () {
      $(this).prop("disabled", true);
  
      TremorMap.playFeatures();
    });

    $("#download").click(function(){
        alert("I haven't enabled CSV download yet.");
    });
  
    //change to lose focus ?
    $("#submit").click(function () {
      $("#loading-overlay").show();
      $("#play-events").prop('disabled', true);

      dateRange = {
        "start" : $('input[name="date-range"]').data('daterangepicker').startDate.format(dateFormat),
        "end" : $('input[name="date-range"]').data('daterangepicker').endDate.format(dateFormat)
      };
      

      var coloring = coloringSelector.val();

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
      // tremorCounts = response;

  
      //getTotalHours(dayCounts);
      TimeChart.init({
        container: "#chart",
        height: $("#chart").height(),
        width: $("#chart").width(),
        limit: drawLimit,
        datePicker: $('input[name="date-range"]').data('daterangepicker')
      }); //some height and some width;
  
      TimeChart.addData(response);

      TimeChart.getTotal(dateRange.start, dateRange.end);
      $(window).on('resize', function () {
        TimeChart.resize($("#chart-container").width())
      });

    });

    getEvents(dateRange.start, dateRange.end).done(function(response) {
        updateMarkers(response);
    });
    
    function geojsonify(response){
      console.log("got the request, processing now");
      var geojson = {
        "type": "FeatureCollection",
        "features": []
      };
      response.features.forEach(function(feature){
        var obj = {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [feature.lon, feature.lat]
          },
          "properties": {
            "amplitude": feature.amp,
            "time": feature.time,
            "id": feature.id
          }
        };
        geojson.features.push(obj);

      });
      // console.log(geojson)
      return geojson;
    }
    
    function updateMarkers(response){
      var geojson = geojsonify(response);

      $("#date-range #start").text(dateRange.start);
      $("#date-range #end").text(dateRange.end);

      // console.log(geojson)
      if (response.features.length >= drawLimit) {
        $("#count-warning").show();
        TremorMap.updateMarkers(geojson, "heat-map");
        $("#display-type").hide();
        $("#display-type-warning").show();
      } else {

        TremorMap.addKey(dateRange.start, dateRange.end);
        TremorMap.updateMarkers(geojson, coloringSelector.val());
        $(".display-type").show();
      }

      if(response.features.length > 5000) {
          $("#event-limit-warning").show();
      } 

      $("#epicenters span").text(response.features.length);
      $("#play-events").prop("disabled", false);
      
      $("#loading-overlay").hide();
    }

  });
  
  
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
      console.log("processing");
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